"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError("")

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        )

      if (resetError) {
        setError("이메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.")
        return
      }

      setSent(true)
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="text-2xl font-extrabold text-blue-600"
        >
          📚 MyAnki
        </Link>

        <h1 className="mt-8 text-2xl font-bold text-gray-900">
          비밀번호 찾기
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          가입한 이메일을 입력하면 비밀번호 재설정 링크를
          보내드립니다.
        </p>

        {sent ? (
          <div className="mt-8 space-y-5">
            <div
              role="status"
              className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-700"
            >
              해당 이메일로 등록된 계정이 있다면
              비밀번호 재설정 링크가 발송됩니다.
              받은편지함과 스팸함을 확인해 주세요.
            </div>

            <Link
              href="/login"
              className="block rounded-lg bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700"
              >
                이메일
              </label>

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "전송 중..." : "재설정 이메일 보내기"}
            </button>

            <p className="text-center text-sm text-gray-500">
              비밀번호가 기억나셨나요?
              <Link
                href="/login"
                className="ml-2 font-semibold text-blue-600 hover:underline"
              >
                로그인
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
