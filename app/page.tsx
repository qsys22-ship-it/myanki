'use client'

import { useEffect, useMemo, useState } from 'react'

type Deck = {
  id: string | number
  title: string
  description?: string | null
  category?: string | null
}

const categories = [
  '전체', '영어·영어시험', '일본어·JLPT', '중국어·HSK', '기타 외국어', '공무원',
  '경찰·소방', '한국사', '기사·산업기사', '기능사·실무', '전문자격',
  '수능·내신', '초중등', '의학·간호', '대학 전공', '취업·IT', '교양·생활', '기타',
]

function matchesCategory(deck: Deck, selected: string) {
  if (selected === '전체') return true

  const category = (deck.category || '기타').toLowerCase()
  const text = `${deck.title} ${deck.description || ''} ${category}`.toLowerCase()
  const hasAny = (words: string[]) => words.some(word => text.includes(word))

  // 예전 데이터에 저장된 포괄적인 "외국어" 분류도 덱 제목을 참고합니다.
  if (selected === '영어·영어시험') {
    return category === '영어·영어시험' || hasAny(['영어', '영단어', '토익', 'toeic', 'toefl', 'ielts', 'opic', '오픽', 'teps', 'english'])
  }
  if (selected === '일본어·JLPT') {
    return hasAny(['일본어', 'jlpt', 'jpt', 'eju', '일본 한자'])
  }
  if (selected === '중국어·HSK') {
    return hasAny(['중국어', 'hsk', 'tsc', '중국 한자'])
  }
  if (selected === '기타 외국어') {
    const otherLanguages = ['기타 외국어', '기타어학', '프랑스어', '독일어', '스페인어', '러시아어', '베트남어', '태국어', '아랍어', '이탈리아어', '포르투갈어', '라틴어', 'topik']
    if (hasAny(otherLanguages)) return true
    return category === '외국어' && !hasAny(['영어', '영단어', '토익', 'toeic', 'toefl', 'ielts', 'opic', '오픽', 'teps', 'english', '일본어', 'jlpt', 'jpt', '중국어', 'hsk'])
  }
  if (selected === '기사·산업기사') {
    return ['기사', '산업기사', '기술자격'].some(word => category.includes(word))
  }
  return category.includes(selected.toLowerCase())
}

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('전체')

  useEffect(() => {
    async function loadDecks() {
      try {
        // 현재 작동 중인 Supabase 공개 연결을 유지합니다.
        const supabaseUrl = 'https://ypeiixbxmprjubkqjiew.supabase.co'
        const supabaseKey = 'sb_publishable_f3KIoC59edOm1Ro03BVBhw_Y1E-dzTQ'
        const response = await fetch(`${supabaseUrl}/rest/v1/decks?select=*`, {
          headers: { apikey: supabaseKey },
        })
        if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`)
        const data: Deck[] = await response.json()
        setDecks(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러오지 못했어요.')
      } finally {
        setLoading(false)
      }
    }
    loadDecks()
  }, [])

  const visibleDecks = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return decks.filter(deck => {
      const content = `${deck.title} ${deck.description || ''} ${deck.category || ''}`.toLowerCase()
      return matchesCategory(deck, selected) && (!keyword || content.includes(keyword))
    })
  }, [decks, query, selected])

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-blue-600">
            <span aria-hidden="true">📚</span> MyAnki
          </a>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
            <a href="#decks" className="hover:text-blue-600">덱 탐색</a>
            <a href="#categories" className="hover:text-blue-600">카테고리</a>
            <a href="https://docs.ankiweb.net/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">안키 가이드 ↗</a>
            <a href="https://apps.ankiweb.net/" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100">안키 설치 ↗</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6">
        <section className="mx-auto mb-12 max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1.5 text-xs font-semibold text-blue-700">한국어 안키 덱 공유 플랫폼</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">공부에 필요한 안키 덱, 한곳에서.</h1>
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">과목과 시험에 맞는 덱을 쉽게 찾고, 무료로 공유하며 함께 공부해요.</p>
          <label className="mt-7 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm focus-within:border-blue-500">
            <span aria-hidden="true" className="text-lg">🔎</span>
            <span className="sr-only">안키 덱 검색</span>
            <input value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400" placeholder="토익, JLPT, 공무원, 기사시험 등 검색" />
          </label>
        </section>

        <section id="categories" className="mb-12 scroll-mt-8">
          <div className="mb-4 flex items-end justify-between gap-2">
            <h2 className="text-xl font-bold">분야별 카테고리</h2>
            <p className="text-xs text-gray-500">분야를 누르면 아래 덱을 찾아줘요</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button key={category} type="button" onClick={() => { setSelected(category); document.getElementById('decks')?.scrollIntoView({ behavior: 'smooth' }) }}
                aria-pressed={selected === category}
                className={`rounded-xl border px-4 py-2.5 text-sm transition ${selected === category ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                {category}
              </button>
            ))}
          </div>
        </section>

        <section id="decks" className="scroll-mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">무료 안키 덱 둘러보기</h2>
              <p className="mt-1 text-sm text-gray-500">현재 등록된 덱을 확인해 보세요.</p>
            </div>
            <span className="text-sm text-gray-500">검색 결과 {visibleDecks.length}개</span>
          </div>
          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">연결 오류: {error}</div>}
          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500">덱 목록을 불러오는 중이에요...</div>
          ) : visibleDecks.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <p className="font-semibold text-gray-800">조건에 맞는 덱이 아직 없어요.</p>
              <p className="mt-2 text-sm text-gray-500">검색어를 바꾸거나 다른 카테고리를 선택해 보세요.</p>
              <button type="button" onClick={() => { setQuery(''); setSelected('전체') }} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">전체 덱 보기</button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleDecks.map(deck => (
                <article key={deck.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                  <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{deck.category || '기타'}</span>
                  <h3 className="mt-4 text-lg font-bold text-gray-900">{deck.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{deck.description || '덱 설명이 아직 등록되지 않았어요.'}</p>
                 <div className="mt-5 border-t border-gray-100 pt-3">
  <a href={`/decks/${encodeURIComponent(String(deck.id))}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
    덱 상세 보기 →
  </a>
</div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 rounded-2xl bg-blue-50 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-blue-900">안키가 처음이신가요?</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900/80">안키 설치부터 복습까지, 공식 안내를 참고해 쉽게 시작해 보세요.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="https://apps.ankiweb.net/" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">안키 설치하기 ↗</a>
            <a href="https://docs.ankiweb.net/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">사용법 알아보기 ↗</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-8 text-center text-xs leading-6 text-gray-500">
        <p>© MyAnki · 학습 덱 공유 플랫폼</p>
        <p>MyAnki는 Anki 및 AnkiWeb 공식 운영 서비스가 아닌 독립 플랫폼입니다.</p>
      </footer>
    </div>
  )
}
