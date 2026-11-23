import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";



function fail(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(request: Request) {
  try {
    const adminUserId = process.env.ADMIN_USER_ID;

    if (!adminUserId) {
      return fail("관리자 설정이 완료되지 않았습니다.", 503);
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

    const { data: uploads, error: queryError } = await admin
      .from("deck_uploads")
      .select(
        "id, uploader_id, title, description, category, status, published_deck_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (queryError) {
      return fail("업로드 목록을 불러오지 못했습니다.", 500);
    }

    return NextResponse.json(
      { uploads: uploads ?? [] },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    return fail("서버 오류가 발생했습니다.", 500);
  }
}
