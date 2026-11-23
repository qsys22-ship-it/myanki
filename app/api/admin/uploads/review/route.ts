import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { validateApkg } from "../../../../../lib/validateApkg";

export const runtime = "nodejs";

function reply(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function fail(message: string, status: number) {
  return reply({ error: message }, status);
}

export async function POST(request: Request) {
  try {
    const adminUserId = process.env.ADMIN_USER_ID;

    if (!adminUserId) {
      return fail("관리자 설정이 없습니다.", 503);
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return fail("로그인이 필요합니다.", 401);
    }

    const token = authorization.slice(7).trim();

    if (!token || token.length > 8192) {
      return fail("인증 정보가 올바르지 않습니다.", 401);
    }

    const admin = getSupabaseAdmin();

    const { data: authData, error: authError } =
      await admin.auth.getUser(token);

    if (authError || !authData.user) {
      return fail("로그인 정보가 유효하지 않습니다.", 401);
    }

    if (authData.user.id !== adminUserId) {
      return fail("관리자만 접근할 수 있습니다.", 403);
    }

    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return fail("JSON 요청만 허용됩니다.", 415);
    }

    const raw = await request.text();

    if (Buffer.byteLength(raw, "utf8") > 2048) {
      return fail("요청 크기가 너무 큽니다.", 413);
    }

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return fail("요청 형식이 올바르지 않습니다.", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("요청 내용을 확인해 주세요.", 400);
    }

    const input = body as Record<string, unknown>;
    const uploadId = input.uploadId;
    const action = input.action;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      typeof uploadId !== "string" ||
      !uuidPattern.test(uploadId) ||
      (action !== "approve" && action !== "reject")
    ) {
      return fail("업로드 ID 또는 처리 방식이 올바르지 않습니다.", 400);
    }

    const { data: upload, error: uploadError } = await admin
      .from("deck_uploads")
      .select(
        "id, uploader_id, title, description, category, storage_path, status"
      )
      .eq("id", uploadId)
      .maybeSingle();

    if (uploadError) {
      return fail("업로드 기록 확인에 실패했습니다.", 500);
    }

    if (!upload) {
      return fail("업로드 기록을 찾을 수 없습니다.", 404);
    }

    if (upload.status !== "format_checked") {
      return fail("검사 완료 상태의 덱만 검토할 수 있습니다.", 409);
    }

    const expectedPath =
      `${upload.uploader_id}/${upload.id}.apkg`;

    if (upload.storage_path !== expectedPath) {
      return fail("파일 저장 경로가 올바르지 않습니다.", 409);
    }

    if (action === "reject") {
      const { data: rejected, error: rejectError } = await admin
        .from("deck_uploads")
        .update({ status: "rejected" })
        .eq("id", uploadId)
        .eq("status", "format_checked")
        .select("id")
        .maybeSingle();

      if (rejectError) {
        return fail("반려 처리에 실패했습니다.", 500);
      }

      if (!rejected) {
        return fail("이미 처리 중이거나 검토가 완료된 덱입니다.", 409);
      }

      return reply({
        success: true,
        action: "reject",
        message: "덱이 반려되었습니다.",
      });
    }

    const { data: claimed, error: claimError } = await admin
      .from("deck_uploads")
      .update({ status: "processing" })
      .eq("id", uploadId)
      .eq("status", "format_checked")
      .select("id")
      .maybeSingle();

    if (claimError) {
      return fail("승인 작업 시작에 실패했습니다.", 500);
    }

    if (!claimed) {
      return fail("이미 처리 중이거나 검토가 완료된 덱입니다.", 409);
    }

    const publicPath =
      `${upload.uploader_id}/${upload.id}.apkg`;

    let publicUploaded = false;
    let deckId: string | null = null;

    try {
      const { data: file, error: fileError } =
        await admin.storage
          .from("apkg-pending")
          .download(expectedPath);

      if (fileError || !file) {
        throw new Error("비공개 덱 파일을 읽지 못했습니다.");
      }

      const bytes = Buffer.from(await file.arrayBuffer());

      const validation = validateApkg(
        bytes,
        `${upload.id}.apkg`
      );

      if (!validation.valid) {
        throw new Error("APKG 파일 재검사에 실패했습니다.");
      }

      const { error: storageError } = await admin.storage
        .from("apkg-files")
        .upload(publicPath, bytes, {
          contentType: "application/octet-stream",
          upsert: false,
        });

      if (storageError) {
        throw new Error("공개 파일 저장에 실패했습니다.");
      }

      publicUploaded = true;

      const { data: publicUrlData } = admin.storage
        .from("apkg-files")
        .getPublicUrl(publicPath);

      const { data: profile } = await admin
        .from("profiles")
        .select("nickname")
        .eq("id", upload.uploader_id)
        .maybeSingle();

      const { data: deck, error: deckError } = await admin
        .from("decks")
        .insert({
          title: upload.title,
          description: upload.description,
          category: upload.category,
          file_url: publicUrlData.publicUrl,
          author_name: profile?.nickname || "익명",
          uploader_id: upload.uploader_id,
          is_published: false,
        })
        .select("id")
        .single();

      if (deckError || !deck) {
        throw new Error("덱 정보 생성에 실패했습니다.");
      }

      deckId = deck.id;

      const { data: linked, error: linkError } = await admin
        .from("deck_uploads")
        .update({
          status: "published",
          published_deck_id: deckId,
        })
        .eq("id", uploadId)
        .eq("status", "processing")
        .select("id")
        .maybeSingle();

      if (linkError || !linked) {
        throw new Error("업로드 기록 연결에 실패했습니다.");
      }

      const { data: visible, error: publishError } = await admin
        .from("decks")
        .update({ is_published: true })
        .eq("id", deckId)
        .eq("is_published", false)
        .select("id")
        .maybeSingle();

      if (publishError || !visible) {
        throw new Error("덱 공개 처리에 실패했습니다.");
      }

      return reply({
        success: true,
        action: "approve",
        deckId,
        message: "덱이 승인되어 공개되었습니다.",
      });
    } catch (error) {
      console.error("덱 승인 실패:", error);

      if (deckId) {
        const { error: hideError } = await admin
          .from("decks")
          .update({ is_published: false })
          .eq("id", deckId);

        if (hideError) {
          console.error("덱 비공개 복구 실패:", hideError);
        }

        const { error: deleteError } = await admin
          .from("decks")
          .delete()
          .eq("id", deckId);

        if (deleteError) {
          console.error("덱 기록 정리 실패:", deleteError);
        }
      }

      if (publicUploaded) {
        const { error: removeError } = await admin.storage
          .from("apkg-files")
          .remove([publicPath]);

        if (removeError) {
          console.error("공개 파일 정리 실패:", removeError);
        }
      }

      const { error: restoreError } = await admin
        .from("deck_uploads")
        .update({
          status: "format_checked",
          published_deck_id: null,
        })
        .eq("id", uploadId)
        .in("status", ["processing", "published"]);

      if (restoreError) {
        console.error("업로드 상태 복구 실패:", restoreError);
      }

      return fail(
        "승인 처리에 실패했습니다. 운영자 확인이 필요합니다.",
        500
      );
    }
  } catch (error) {
    console.error("관리자 검토 API 오류:", error);
    return fail("서버 오류가 발생했습니다.", 500);
  }
}
