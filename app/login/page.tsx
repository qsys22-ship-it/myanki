"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    supabase.auth.getUser()
      .then(({ data }) => {
        if (active) {
          setUserEmail(data.user?.email ?? null)
        }
      })
      .catch(() => {
        if (active) setUserEmail(null)
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (loginError) {
        setError(loginError.message)
        return
      }

      if (data.user) {
  setPassword("")
  router.replace("/")
}
    } catch {
      setError("로그인 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setError("")
    setLoading(true)

    try {
      const { error: logoutError } =
        await supabase.auth.signOut({ scope: "local" })

      if (logoutError) {
        setError(logoutError.message)
        return
      }

      setUserEmail(null)
      setEmail("")
      setPassword("")
    } catch {
      setError("로그아웃 중 오류가 발생했습니다.")
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
          로그인
        </h1>

        {checking ? (
          <p className="mt-6 text-sm text-gray-500">
            로그인 상태 확인 중...
          </p>
        ) : userEmail ? (
          <div className="mt-8 space-y-5">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="font-semibold text-blue-700">
                로그인 성공!
              </p>
              <p className="mt-2 break-all text-sm text-gray-700">
                {userEmail}
              </p>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Link
              href="/"
              className="block rounded-lg bg-blue-600 py-3 text-center font-semibold text-white"
            >
              홈페이지로 이동
            </Link>

            <button
              type="button"
              disabled={loading}
              onClick={handleLogout}
              className="w-full rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 disabled:opacity-60"
            >
              {loading ? "처리 중..." : "로그아웃"}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-500">
              MyAnki에 로그인하고 나만의 덱을 관리하세요.
            </p>

            <form
              onSubmit={handleLogin}
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
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
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
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              계정이 없으신가요?
              <Link
                href="/signup"
                className="ml-2 font-semibold text-blue-600"
              >
                회원가입
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
