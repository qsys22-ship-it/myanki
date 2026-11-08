import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";



// API 작동 상태 확인용
export async function GET() {
  return NextResponse.json(
    {
      status: "ready",
      uploadsEnabled: false,
      message: "MyAnki 업로드 API가 준비되었습니다.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// 회원 인증 확인용
// 실제 파일 업로드는 아직 허용하지 않음
export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const token = authorization.slice(7).trim();

  if (!token || token.length > 8192) {
    return NextResponse.json(
      { error: "유효하지 않은 인증 정보입니다." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "서버 설정을 확인해야 합니다." },
      { status: 503 }
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  try {
    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data.user) {
      return NextResponse.json(
        { error: "로그인 정보가 유효하지 않습니다." },
        { status: 401 }
      );
    }

    // 파일 검사 기능이 완성되기 전까지 업로드 차단
    return NextResponse.json(
      {
        authenticated: true,
        uploadsEnabled: false,
        message: "회원 인증 성공. 업로드 기능 준비 중입니다.",
      },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { error: "인증 서버 연결에 실패했습니다." },
      { status: 503 }
    );
  }
}
