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
  const [nickname, setNickname] = useState("")
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
useEffect(() => {
  let active = true

  async function loadNickname() {
    setNickname("")

    if (!userEmail) return

    const { data: { user }, error: authError } =
      await supabase.auth.getUser()

    if (!active || authError || !user) return

    const { data, error } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle()

    if (active && !error) {
      setNickname(data?.nickname ?? "")
    }
  }

  void loadNickname().catch(() => {
    if (active) setNickname("")
  })

  return () => {
    active = false
  }
}, [userEmail])
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
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">👤</span>

          <span className="max-w-32 truncate">
            {nickname || "내 계정"}
          </span>

          <span
            aria-hidden="true"
            className="text-xs text-gray-400"
          >
            ▼
          </span>
        </summary>

        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <Link
            href="/account"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            마이페이지
          </Link>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            {loading ? "처리 중..." : "로그아웃"}
          </button>
        </div>
      </details>

      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  )
}
