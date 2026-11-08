import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DAILY_LIMIT = 10;

function fail(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  try {
    // 자동 파일 검사 완성 전까지 업로드 잠금
    if (process.env.ENABLE_DECK_UPLOADS !== "true") {
      return fail("업로드 기능 준비 중입니다.", 503);
    }
    // 1. 회원 인증 정보 확인
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return fail("로그인이 필요합니다.", 401);
    }

    const token = authorization.slice(7).trim();

    if (!token || token.length > 8192) {
      return fail("인증 정보가 올바르지 않습니다.", 401);
    }

    // 2. 요청 데이터 확인
    const contentLength = Number(
      request.headers.get("content-length") ?? 0
    );

    if (contentLength > 16384) {
      return fail("요청 크기가 너무 큽니다.", 413);
    }

    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return fail("JSON 요청만 허용됩니다.", 415);
    }

    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("입력 정보를 확인해 주세요.", 400);
    }

    const input = body as Record<string, unknown>;

    const title =
      typeof input.title === "string" ? input.title.trim() : "";

    const description =
      typeof input.description === "string"
        ? input.description.trim()
        : "";

    const category =
      typeof input.category === "string"
        ? input.category.trim()
        : "";

    const fileName =
      typeof input.fileName === "string"
        ? input.fileName
        : "";

    const fileSize = input.fileSize;

    if (title.length < 2 || title.length > 100) {
      return fail("덱 제목은 2~100자로 입력해 주세요.", 400);
    }

    if (description.length > 2000) {
      return fail("덱 설명은 2000자 이하로 입력해 주세요.", 400);
    }

    if (category.length < 1 || category.length > 60) {
      return fail("카테고리를 확인해 주세요.", 400);
    }

    if (
      fileName.length > 150 ||
      !fileName.toLowerCase().endsWith(".apkg") ||
      typeof fileSize !== "number" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize < 1 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return fail(".apkg 파일은 최대 50MB까지 허용됩니다.", 400);
    }

    if (input.copyrightConfirmed !== true) {
      return fail("저작권 확인 동의가 필요합니다.", 400);
    }

    // 3. Supabase를 통해 실제 로그인 회원인지 검증
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return fail("서버 설정을 확인해야 합니다.", 503);
    }

    const authClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !data.user) {
      return fail("로그인 정보가 유효하지 않습니다.", 401);
    }

    // 4. 하루 업로드 준비 요청 횟수 제한
    const admin = getSupabaseAdmin();

    const oneDayAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { count, error: countError } = await admin
      .from("deck_uploads")
      .select("id", { count: "exact", head: true })
      .eq("uploader_id", data.user.id)
      .gte("created_at", oneDayAgo);

    if (countError) {
      return fail("업로드 제한 확인에 실패했습니다.", 503);
    }

    if ((count ?? 0) >= DAILY_LIMIT) {
      return fail("24시간 동안 최대 10회까지 준비할 수 있습니다.", 429);
    }

    // 5. 회원별로 고유한 비공개 파일 경로 생성
    const uploadId = crypto.randomUUID();
    const storagePath = `${data.user.id}/${uploadId}.apkg`;

    const { error: insertError } = await admin
      .from("deck_uploads")
      .insert({
        id: uploadId,
        uploader_id: data.user.id,
        title,
        description,
        category,
        storage_path: storagePath,
        status: "pending",
      });

    if (insertError) {
      return fail("업로드 기록 생성에 실패했습니다.", 503);
    }

    // 6. 비공개 저장소에만 사용할 업로드 토큰 발급
    const { data: signed, error: signedError } = await admin
      .storage
      .from("apkg-pending")
      .createSignedUploadUrl(storagePath);

    if (signedError || !signed) {
      await admin
        .from("deck_uploads")
        .update({ status: "failed" })
        .eq("id", uploadId);

      return fail("임시 업로드 권한 발급에 실패했습니다.", 503);
    }

    return NextResponse.json(
      {
        uploadId,
        path: signed.path,
        token: signed.token,
        bucket: "apkg-pending",
        status: "pending",
        message: "비공개 업로드 준비가 완료되었습니다.",
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    return fail("업로드 준비 중 서버 오류가 발생했습니다.", 503);
  }
}
