import Link from "next/link"

export default function SignupPage() {
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
          회원가입
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          MyAnki에 가입하고 나만의 Anki 덱을 공유해 보세요.
        </p>

        <form className="mt-8 space-y-5">
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
              placeholder="example@email.com"
              autoComplete="email"
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
              placeholder="8자 이상 입력"
              autoComplete="new-password"
              minLength={8}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-gray-700"
            >
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-blue-400 py-3 font-semibold text-white"
          >
            회원가입 기능 준비 중
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?
          <span className="ml-2 font-semibold text-blue-600">
            로그인 기능 준비 중
          </span>
        </p>
      </div>
    </main>
  )
}
