import Link from 'next/link'
export const instant = false
type Deck = {
  id: number | string
  title: string
  description?: string | null
  category?: string | null
}

type PageProps = {
  params: Promise<{ id: string }>
}

// Supabase에 저장된 기존 덱 정보를 읽기만 합니다.
const supabaseUrl = 'https://ypeiixbxmprjubkqjiew.supabase.co'
const supabaseKey = 'sb_publishable_f3KIoC59edOm1Ro03BVBhw_Y1E-dzTQ'

export default async function DeckDetailPage({ params }: PageProps) {
  const { id } = await params
  let deck: Deck | null = null
  let error = ''

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/decks`)
    url.searchParams.set('select', 'id,title,description,category')
    url.searchParams.set('id', `eq.${id}`)
    url.searchParams.set('limit', '1')

    const response = await fetch(url.toString(), {
      headers: { apikey: supabaseKey },
      cache: 'no-store',
    })

    if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`)
    const data: Deck[] = await response.json()
    deck = data[0] ?? null
  } catch (err) {
    error = err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.'
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-2xl font-extrabold text-blue-600">📚 MyAnki</Link>
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-blue-600">← 덱 목록으로</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8">
            <h1 className="text-xl font-bold">덱을 불러오지 못했어요.</h1>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue-600">홈으로 돌아가기 →</Link>
          </div>
        ) : !deck ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <h1 className="text-xl font-bold">해당 덱을 찾을 수 없어요.</h1>
            <p className="mt-2 text-sm text-gray-500">삭제되었거나 주소가 변경되었을 수 있어요.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue-600">전체 덱 보기 →</Link>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <span className="inline-block rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{deck.category || '기타'}</span>
              <h1 className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">{deck.title}</h1>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-600">{deck.description || '덱 설명은 아직 등록되지 않았어요.'}</p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold">덱 미리보기</h2>
              <div className="mt-4 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <div>
                  <p className="font-medium text-gray-700">미리보기 준비 중</p>
                  <p className="mt-2 text-sm text-gray-500">추후 대표 이미지와 최대 5장의 미리보기를 제공할 예정이에요.</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold">덱 다운로드</h2>
              <p className="mt-2 text-sm text-gray-600">현재는 상세 페이지를 시험하는 중이며, 실제 파일 다운로드 기능은 아직 연결하지 않았어요.</p>
              <button type="button" disabled className="mt-5 cursor-not-allowed rounded-lg bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-500">다운로드 준비 중</button>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
