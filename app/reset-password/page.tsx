"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [checking, setChecking] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return

        if (event === "PASSWORD_RECOVERY" && session) {
          setCanReset(true)
          setChecking(false)
        } else if (event === "INITIAL_SESSION") {
          setChecking(false)
        }
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading || !canReset) return

    setError("")

    if (password.length < 8) {
      setError("비밀번호는 8자 이상 입력해 주세요.")
      return
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    setLoading(true)

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        })

      if (updateError) {
        setError("비밀번호 변경에 실패했습니다. 다시 시도해 주세요.")
        return
      }

      setPassword("")
      setConfirmPassword("")
      setSuccess(true)

      // 새 비밀번호로 다시 로그인하도록 현재 세션 종료
      await supabase.auth.signOut({ scope: "local" })
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
          새 비밀번호 설정
        </h1>

        {success ? (
          <div className="mt-6 space-y-5">
            <p
              role="status"
              className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700"
            >
              비밀번호가 변경되었습니다.
              새 비밀번호로 로그인해 주세요.
            </p>

            <Link
              href="/login"
              className="block rounded-lg bg-blue-600 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : checking ? (
          <p className="mt-6 text-sm text-gray-500">
            재설정 링크를 확인하고 있습니다...
          </p>
        ) : !canReset ? (
          <div className="mt-6 space-y-5">
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-600"
            >
              유효한 비밀번호 재설정 인증을 확인하지 못했습니다.
              이메일로 받은 재설정 링크를 다시 열어 주세요.
            </p>

            <Link
              href="/forgot-password"
              className="block rounded-lg bg-blue-600 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
              재설정 이메일 다시 요청하기
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700"
              >
                새 비밀번호
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-700"
              >
                새 비밀번호 확인
              </label>

              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
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
              {loading ? "변경 중..." : "비밀번호 변경하기"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
