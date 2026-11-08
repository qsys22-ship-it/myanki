"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  
  async function runTest(withLogin: boolean) {
    setLoading(true);
    setResult("서버 응답을 확인하고 있어요...");

    try {
      const headers: Record<string, string> = {};

      if (withLogin) {
        const { data, error } =
          await supabase.auth.getSession();

        if (error || !data.session?.access_token) {
          setResult(
            "로그인 정보가 없어요. 먼저 로그인해 주세요."
          );
          return;
        }

        headers["Authorization"] =
          `Bearer ${data.session.access_token}`;
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        headers,
        cache: "no-store",
      });

      const data = await response.json();

      // 인증 토큰은 결과 화면에 표시하지 않음
      setResult(
        JSON.stringify(
          {
            httpStatus: response.status,
            authenticated: data.authenticated ?? false,
            uploadsEnabled: data.uploadsEnabled ?? false,
            message: data.message ?? data.error ?? "",
          },
          null,
          2
        )
      );
    } catch {
      setResult(
        "서버 연결에 실패했어요. 잠시 후 다시 테스트해 주세요."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        <Link
          href="/upload"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← 업로드 페이지로 돌아가기
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          MyAnki 회원 인증 테스트
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          서버가 로그인 회원과 비회원을 정확하게
          구분하는지 테스트합니다.
          실제 파일 업로드는 진행되지 않습니다.
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => runTest(false)}
            className="w-full rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            비회원 요청 테스트
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => runTest(true)}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            로그인 회원 테스트
          </button>
        </div>

        <div className="mt-7 rounded-xl bg-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-800">
            서버 응답 결과
          </h2>

          <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-700">
            {result || "버튼을 누르면 결과가 표시됩니다."}
          </pre>
        </div>

        <p className="mt-5 text-xs leading-5 text-gray-500">
          테스트가 완료되면 이 임시 페이지는 삭제합니다.
          인증 토큰이나 비밀 키는 화면에 표시하지 않습니다.
        </p>
      </div>
    </main>
  );
}
