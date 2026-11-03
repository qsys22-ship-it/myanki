"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AccountPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const { data: { user }, error: authError } =
          await supabase.auth.getUser()

        if (!active) return

        if (authError || !user) {
          router.replace("/login")
          return
        }

        const { data, error: profileError } =
          await supabase
            .from("profiles")
            .select("nickname, bio")
            .eq("id", user.id)
            .single()

        if (!active) return

        if (profileError || !data) {
          setError("프로필을 불러오지 못했습니다.")
          return
        }

        setUserId(user.id)
        setEmail(user.email ?? "")
        setNickname(data.nickname)
        setBio(data.bio ?? "")
      } catch {
        if (active) {
          setError("프로필 조회 중 오류가 발생했습니다.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [router])

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving || !userId) return

    setError("")
    setMessage("")

    const name = nickname.trim()
    const introduction = bio.trim()

    if (name.length < 2 || name.length > 30) {
      setError("닉네임은 2~30자로 입력해 주세요.")
      return
    }

    if (introduction.length > 300) {
      setError("자기소개는 300자 이하로 입력해 주세요.")
      return
    }

    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          nickname: name,
          bio: introduction || null,
        })
        .eq("id", userId)
        .select("id")
        .single()

      if (updateError) {
        setError("프로필 저장에 실패했습니다.")
        return
      }

      setNickname(name)
      setBio(introduction)
      setMessage("프로필이 저장되었습니다!")
    } catch {
      setError("저장 중 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="text-2xl font-extrabold text-blue-600"
        >
          📚 MyAnki
        </Link>

        <h1 className="mt-8 text-2xl font-bold text-gray-900">
          내 계정
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          MyAnki에서 사용할 프로필을 관리하세요.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-gray-500">
            프로필을 불러오는 중...
          </p>
        ) : (
          <form onSubmit={handleSave} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                이메일
              </label>
              <div className="mt-2 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600">
                {email || "확인할 수 없음"}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                이메일은 이 페이지에서 변경할 수 없습니다.
              </p>
            </div>

            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-semibold text-gray-700"
              >
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                required
                minLength={2}
                maxLength={30}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-semibold text-gray-700"
              >
                자기소개
              </label>
              <textarea
                id="bio"
                rows={4}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="나를 소개해 보세요."
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-right text-xs text-gray-500">
                {bio.length}/300자
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !userId}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>

            <Link
              href="/"
              className="block text-center text-sm font-medium text-gray-600 hover:text-blue-600"
            >
              ← 홈페이지로 돌아가기
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
