"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Upload = {
  id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  published_deck_id: string | null;
  created_at: string;
};

const statusNames: Record<string, string> = {
  pending: "업로드 대기",
  processing: "검사 중",
  format_checked: "파일 검사 완료",
  published: "공개 완료",
  rejected: "반려됨",
  failed: "검사 실패",
};

export default function AdminUploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUploads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session?.access_token) {
        throw new Error("먼저 MyAnki에 로그인해 주세요.");
      }

      const response = await fetch("/api/admin/uploads", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "업로드 목록을 불러오지 못했습니다."
        );
      }

      setUploads(Array.isArray(result.uploads) ? result.uploads : []);
    } catch (err) {
      setUploads([]);
      setError(
        err instanceof Error
          ? err.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              ← MyAnki 홈으로
            </Link>

            <h1 className="mt-4 text-3xl font-bold">
              덱 업로드 관리
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              운영자 전용 · 회원이 업로드한 덱을 확인합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadUploads()}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "불러오는 중..." : "목록 새로고침"}
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            업로드 목록을 불러오는 중입니다...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8">
            <h2 className="font-bold text-red-600">
              접근 또는 조회 오류
            </h2>
            <p className="mt-3 text-sm text-gray-700">
              {error}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              관리자 계정으로 로그인했는지 확인해 주세요.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                최근 업로드 기록
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {uploads.length}건
              </p>
              <p className="mt-2 text-xs text-gray-400">
                최신 기록 최대 50건 표시
              </p>
            </div>

            {uploads.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <h2 className="text-lg font-bold">
                  아직 업로드된 덱이 없습니다.
                </h2>
                <p className="mt-3 text-sm text-gray-500">
                  회원이 덱을 업로드하면 이곳에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {uploads.map((upload) => (
                  <article
                    key={upload.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {upload.category}
                        </span>
                        <h2 className="mt-3 text-xl font-bold">
                          {upload.title}
                        </h2>
                      </div>

                      <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                        {statusNames[upload.status] || upload.status}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                      {upload.description || "덱 설명이 없습니다."}
                    </p>

                    <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                      <p>업로드 ID: {upload.id}</p>
                      <p>업로더 ID: {upload.uploader_id}</p>
                      <p>
                        업로드 일시:{" "}
                        {new Date(upload.created_at).toLocaleString("ko-KR")}
                      </p>

                      {upload.published_deck_id && (
                        <p>
                          <Link
                            href={`/decks/${upload.published_deck_id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            공개된 덱 보기 →
                          </Link>
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
