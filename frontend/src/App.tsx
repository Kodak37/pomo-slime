import { useState, useEffect, useCallback } from 'react'
import { PomodoroTimer } from './components/PomodoroTimer'
import { Slime } from './components/Slime'
import { FeedPanel } from './components/FeedPanel'
import './index.css'

interface SlimeData {
  id: number
  name: string
  hunger: number
  coins: number
  pomodoroCount: number
  status: 'happy' | 'normal' | 'hungry' | 'dying'
}

export default function App() {
  const [slime, setSlime] = useState<SlimeData | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const fetchSlime = useCallback(async () => {
    const res = await fetch('/api/slime')
    const data = await res.json()
    setSlime(data)
  }, [])

  useEffect(() => {
    fetchSlime()
    const id = setInterval(fetchSlime, 10000)
    return () => clearInterval(id)
  }, [fetchSlime])

  function showNotif(msg: string) {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  async function handlePomodoroComplete(count: number) {
    const res = await fetch('/api/pomodoro/done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pomodoroCount: count }),
    })
    const data = await res.json()
    setSlime(data)
    showNotif('🍅 ポモドーロ完了！コインを獲得しました')
  }

  async function handleFeed(cost: number) {
    if (!slime || slime.coins < cost) {
      showNotif('コインが足りません…')
      return
    }
    const res = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost }),
    })
    const data = await res.json()
    setSlime(data)
    showNotif('😋 スライムがよろこんでいる！')
  }

  if (!slime) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <div className="text-2xl animate-pulse">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <h1 className="text-center text-3xl font-bold text-white mb-8">
        🍅 ポモドーロ × スライム育成
      </h1>

      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
          {notification}
        </div>
      )}

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <Slime slime={slime} />
          <FeedPanel coins={slime.coins} onFeed={handleFeed} />
        </div>

        <div>
          <PomodoroTimer
            onPomodoroComplete={handlePomodoroComplete}
            pomodoroCount={slime.pomodoroCount}
          />
          <div className="mt-6 p-4 bg-gray-800 rounded-xl text-gray-400 text-sm">
            <p className="font-bold text-white mb-2">📖 遊び方</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>25分の作業タイマーをスタート</li>
              <li>完了するとコインがもらえる</li>
              <li>連続でこなすほどボーナスUP</li>
              <li>コインでスライムにえさをあげよう</li>
              <li>えさをあげないと弱ってしまう…</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
