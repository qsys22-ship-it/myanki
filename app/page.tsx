'use client'

import { useEffect, useState } from 'react'

// 덱 데이터의 타입을 정의합니다.
interface Deck {
  id: string | number
  category?: string
  title: string
  description?: string
}

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchDecksDirectly() {
      try {
        const supabaseUrl = 'https://ypeiixbxmpjubkqjiew.supabase.co'
        const supabaseKey = 'sb_publishable_f3KIOc59edOm1Ro03BVBhW_Y1E-dzTQ'

        // Supabase REST API로 직접 요청 (라이브러리 충돌 우회)
        const response = await fetch(`${supabaseUrl}/rest/v1/decks?select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        })

        if (!response.ok) {
          throw new Error(`서버 응답 에러: ${response.status}`)
        }

        const data = await response.json()
        setDecks(data || [])
      } catch (err: unknown) {
        // err 타입을 안전하게 처리
        if (err instanceof Error) {
          setErrorMessage(err.message)
        } else {
          setErrorMessage(String(err))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDecksDirectly()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">MyAnki 📚</h1>
        <p className="text-gray-600 mb-8">나만의 안키(Anki) 덱을 공유하고 다운로드하세요!</p>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>연결 오류 발생: </strong> {errorMessage}
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">등록된 덱 목록</h2>
          {loading ? (
            <p className="text-gray-400">불러오는 중...</p>
          ) : decks.length === 0 && !errorMessage ? (
            <p className="text-gray-500">아직 등록된 덱이 없습니다. 첫 번째 덱을 공유해 보세요!</p>
          ) : (
            <div className="space-y-4">
              {decks.map((deck) => (
                <div key={deck.id} className="p-4 border rounded-lg hover:shadow-md transition">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                    {deck.category || '기타'}
                  </span>
                  <h3 className="text-lg font-bold mt-2 text-gray-800">{deck.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{deck.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}