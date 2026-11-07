"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const categories = [
  "영어·외국어",
  "일본어·JLPT",
  "중국어",
  "기타어학",
  "공무원",
  "경찰·소방",
  "한국사",
  "기사·산업기사",
  "기능사·실무",
  "전문자격",
  "수능·내신",
  "초중등",
  "의학·간호",
  "대학 전공",
  "취업·IT",
  "교양·생활",
  "기타",
];

export default function UploadPage() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setLoggedIn(!error && !!data.user);
      setChecking(false);
    }).catch(() => {
      if (active) setChecking(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const validFile =
    file !== null &&
    file.name.toLowerCase().endsWith(".apkg") &&
    file.size <= 50 * 1024 * 1024;

  if (checking) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center text-gray-500">
        로그인 상태를 확인하고 있어요...
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          로그인이 필요해요
        </h1>
        <p className="mt-3 text-gray-500">
          덱을 공유하려면 먼저 로그인해 주세요.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          로그인하기
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← 홈으로 돌아가기
          </Link>
          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            덱 공유하기
          </h1>
          <p className="mt-2 text-gray-500">
            직접 만든 안키 덱을 다른 학습자들과 공유해 보세요.
          </p>
        </div>

        <div className="space-y-7 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
          <div>
            <label htmlFor="deck-title" className="mb-2 block font-semibold text-gray-800">
              덱 제목 <span className="text-red-500">*</span>
            </label>
            <input
              id="deck-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="예: 토익 필수 영단어 1000개"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="deck-category" className="mb-2 block font-semibold text-gray-800">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              id="deck-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            >
              <option value="">카테고리를 선택해 주세요</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="deck-description" className="mb-2 block font-semibold text-gray-800">
              덱 설명
            </label>
            <textarea
              id="deck-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="덱의 학습 내용과 특징을 소개해 주세요."
              className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {description.length}/2000
            </p>
          </div>

          <div>
            <label htmlFor="deck-file" className="mb-2 block font-semibold text-gray-800">
              안키 덱 파일 <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5">
              <input
                id="deck-file"
                type="file"
                accept=".apkg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-700"
              />
              <p className="mt-3 text-xs text-gray-500">
                .apkg 파일만 선택할 수 있어요. 최대 50MB
              </p>
              {file && (
                <p className={`mt-2 text-sm ${validFile ? "text-blue-600" : "text-red-600"}`}>
                  {validFile
                    ? `선택한 파일: ${file.name}`
                    : "파일 형식 또는 크기를 확인해 주세요."}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-blue-600"
              />
              <span>
                직접 제작했거나 공유 권한이 있는 덱이며,
                타인의 저작권을 침해하지 않음을 확인합니다.
              </span>
            </label>
          </div>

          <div>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl bg-gray-300 px-5 py-3.5 font-bold text-gray-600"
            >
              안전한 업로드 기능 준비 중
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">
              현재는 화면 테스트 단계입니다. 파일이 서버로 전송되지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
