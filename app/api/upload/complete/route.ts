import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { validateApkg } from "../../../../lib/validateApkg";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function reply(
  data: Record<string, unknown>,
  status: number
) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function fail(message: string, status: number) {
  return reply({ error: message }, status);
}

export async function POST(request: Request) {
  let processingUpload: { id: string; userId: string } | null = null;

  try {
    // 1. 업로드 기능 잠금 유지
    if (process.env.ENABLE_DECK_UPLOADS !== "true") {
      return fail("업로드 기능 준비 중입니다.", 503);
    }

    // 2. 로그인 토큰 확인
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return fail("로그인이 필요합니다.", 401);
    }

    const token = authorization.slice(7).trim();

    if (!token || token.length > 8192) {
      return fail("인증 정보가 올바르지 않습니다.", 401);
    }

    // 3. 업로드 ID 확인
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return fail("JSON 요청만 허용됩니다.", 415);
    }

    const requestSize = Number(
      request.headers.get("content-length") ?? 0
    );

    if (requestSize > 2048) {
      return fail("요청 크기가 너무 큽니다.", 413);
    }

    const raw = await request.text();

    if (Buffer.byteLength(raw, "utf8") > 2048) {
      return fail("요청 크기가 너무 큽니다.", 413);
    }

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return fail("잘못된 요청 형식입니다.", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return fail("업로드 정보를 확인해 주세요.", 400);
    }

    const uploadId = (body as Record<string, unknown>)
      .uploadId;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      typeof uploadId !== "string" ||
      !uuidPattern.test(uploadId)
    ) {
      return fail("업로드 ID가 올바르지 않습니다.", 400);
    }

    // 4. Supabase 회원 인증
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return fail("서버 설정을 확인해야 합니다.", 503);
    }

    const authClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !authData.user) {
      return fail("로그인 정보가 유효하지 않습니다.", 401);
    }

    const userId = authData.user.id;
    const admin = getSupabaseAdmin();

    // 5. 본인이 만든 업로드 기록인지 확인
    const { data: upload, error: uploadError } =
      await admin
        .from("deck_uploads")
        .select("id, uploader_id, storage_path, status")
        .eq("id", uploadId)
        .eq("uploader_id", userId)
        .maybeSingle();

    if (uploadError) {
      return fail("업로드 기록 확인에 실패했습니다.", 503);
    }

    if (!upload) {
      return fail("업로드 기록을 찾을 수 없습니다.", 404);
    }

    if (upload.status !== "pending") {
      return fail("검사할 수 없는 업로드 상태입니다.", 409);
    }

    const expectedPath = `${userId}/${uploadId}.apkg`;

    if (upload.storage_path !== expectedPath) {
      return fail("파일 저장 경로가 일치하지 않습니다.", 409);
    }
  // 동일한 업로드의 중복 완료 요청 방지
    const { data: claimed, error: claimError } = await admin
      .from("deck_uploads")
      .update({ status: "processing" })
      .eq("id", uploadId)
      .eq("uploader_id", userId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError) {
      return fail("업로드 처리 상태 변경에 실패했습니다.", 503);
    }

    if (!claimed) {
      return fail("이미 처리 중이거나 완료된 업로드입니다.", 409);
    }
    processingUpload = { id: uploadId, userId };
    // 6. 비공개 저장소에서 실제 파일 읽기
    const { data: file, error: fileError } =
      await admin.storage
        .from("apkg-pending")
        .download(expectedPath);

       if (fileError || !file) {
      const { error: statusError } = await admin
        .from("deck_uploads")
        .update({ status: "failed" })
        .eq("id", uploadId)
        .eq("uploader_id", userId)
        .eq("status", "processing");

      if (statusError) {
        return fail("파일 확인 및 업로드 상태 변경에 실패했습니다.", 503);
      }

      return fail("업로드된 파일을 찾지 못했습니다.", 409);
    }
     if (file.size < 22 || file.size > MAX_FILE_SIZE) {
      const { error: statusError } = await admin
        .from("deck_uploads")
        .update({ status: "failed" })
        .eq("id", uploadId)
        .eq("uploader_id", userId)
        .eq("status", "processing");

      if (statusError) {
        return fail("파일 크기 및 업로드 상태 처리에 실패했습니다.", 503);
      }

      return fail("허용되지 않는 파일 크기입니다.", 422);
    }

    const bytes = Buffer.from(
      await file.arrayBuffer()
    );

    // 7. 우리가 만든 APKG 검사기 실행
    const result = validateApkg(
      bytes,
      `${uploadId}.apkg`
    );

    if (!result.valid) {
      const { error: statusError } = await admin
        .from("deck_uploads")
        .update({ status: "failed" })
        .eq("id", uploadId)
        .eq("uploader_id", userId)
        .eq("status", "processing");

      if (statusError) {
        return fail("파일 검사 및 업로드 상태 처리에 실패했습니다.", 503);
      }

      return reply(
        {
          valid: false,
          published: false,
          reason: result.reason,
          message: "덱 파일 형식 검사에 실패했습니다.",
        },
        422
      );
    }
      
 // 8. 파일 형식 검사 완료 상태 기록 (공개하지 않음)
    const { data: checked, error: checkedError } = await admin
      .from("deck_uploads")
      .update({ status: "format_checked" })
      .eq("id", uploadId)
      .eq("uploader_id", userId)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();

    if (checkedError || !checked) {
      return fail("파일 검사 완료 상태 기록에 실패했습니다.", 503);
    }

    // 8. 검사 결과만 반환
    // 아직 데이터베이스 상태 변경 및 공개는 하지 않음
    return reply(
      {
        valid: true,
        published: false,
        format: result.format,
        fileCount: result.fileCount,
        message:
          "1차 파일 형식 검사를 통과했습니다. 추가 검증이 필요합니다.",
      },
      200
    );
  } catch (error) {
    console.error("APKG 검사 중 서버 오류:", error);

    if (processingUpload) {
      try {
        const { error: recoveryError } = await getSupabaseAdmin()
          .from("deck_uploads")
          .update({ status: "failed" })
          .eq("id", processingUpload.id)
          .eq("uploader_id", processingUpload.userId)
          .eq("status", "processing");

        if (recoveryError) {
          console.error("업로드 상태 복구 실패:", recoveryError);
        }
      } catch (recoveryError) {
        console.error("업로드 상태 복구 중 오류:", recoveryError);
      }
    }

    return fail(
      "파일 검사 중 서버 오류가 발생했습니다.",
      503
    );
  }
}
