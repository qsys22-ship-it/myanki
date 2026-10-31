"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthNav() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    supabase.auth.getUser()
      .then(({ data, error }) => {
        if (active) {
          setUserEmail(error ? null : data.user?.email ?? null)
        }
      })
      .catch(() => {
        if (active) setUserEmail(null)
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return

        if (event === "SIGNED_OUT") {
          setUserEmail(null)
        } else if (session?.user) {
          setUserEmail(session.user.email ?? null)
        }
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    setLoading(true)
    setError("")

    try {
      const { error: logoutError } =
        await supabase.auth.signOut({ scope: "local" })

      if (logoutError) {
        setError("로그아웃에 실패했습니다. 다시 시도해 주세요.")
        return
      }

      setUserEmail(null)
    } catch {
      setError("로그아웃 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <span className="text-xs text-gray-400">
        확인 중...
      </span>
    )
  }

  if (!userEmail) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          로그인
        </Link>

        <Link
          href="/signup"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          회원가입
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/login"
        className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
      >
        내 계정
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
      >
        {loading ? "처리 중..." : "로그아웃"}
      </button>

      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  )
}
