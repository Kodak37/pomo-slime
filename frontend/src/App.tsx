import { useState, useEffect, useCallback } from 'react'
import { PomodoroTimer } from './components/PomodoroTimer'
import { Slime } from './components/Slime'
import { FeedPanel } from './components/FeedPanel'
import './index.css'

type Tab = 'work' | 'slime'

interface SlimeData {
  id: number
  name: string
  hunger: number
  coins: number
  pomodoroCount: number
  status: 'happy' | 'slightly_happy' | 'normal' | 'hungry' | 'dying'
  updatedAt: string
}

// Slime.tsx と同じ計算
const DECAY_PER_MIN = 2 / 5
function calcWorkTabWarning(hunger: number, updatedAt: string): string {
  const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 60000
  const effective = Math.max(0, hunger - elapsed * DECAY_PER_MIN)
  const thresholds = [
    { value: 35, label: 'ちょっと元気がなくなる' },
    { value: 15, label: '瀕死' },
  ]
  const next = thresholds.find(t => effective > t.value)
  if (!next) return '⚠ CRITICAL'
  const min = (effective - next.value) / DECAY_PER_MIN
  if (min < 1) return `まもなく${next.label}！`
  if (min < 60) return `⏱ ${Math.floor(min)}分後に${next.label}`
  return `⏱ ${Math.floor(min / 60)}h${Math.floor(min % 60)}m後に${next.label}`
}

export default function App() {
  const [tab, setTab] = useState<Tab>('work')
  const [slime, setSlime] = useState<SlimeData | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [slimeAlert, setSlimeAlert] = useState(false)

  const fetchSlime = useCallback(async () => {
    const res = await fetch('/api/slime')
    const data = await res.json()
    setSlime(data)
    setSlimeAlert(data.status === 'dying' || data.status === 'hungry')
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
    showNotif('POMODORO DONE! +COINS')
  }

  function handleBreakStart() {
    showNotif('BREAK TIME! CHECK YOUR SLIME →')
    setTimeout(() => setTab('slime'), 1500)
  }

  async function handleFeed(cost: number) {
    if (!slime || slime.coins < cost) {
      showNotif('NOT ENOUGH COINS...')
      return
    }
    const res = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost }),
    })
    const data = await res.json()
    setSlime(data)
    showNotif('SLIME IS HAPPY!')
  }

  if (!slime) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 14, color: '#7c3aed' }}>
          LOADING...
        </div>
      </div>
    )
  }

  const workTabWarning = calcWorkTabWarning(slime.hunger, slime.updatedAt)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--pixel-font)', fontSize: 16, color: '#ffffff',
          letterSpacing: 3, textShadow: '0 0 16px #7c3aed', margin: 0,
        }}>
          🍅 POMO-SLIME
        </h1>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        {(['work', 'slime'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pixel-btn"
            style={{
              padding: '10px 28px',
              background: tab === t ? (t === 'work' ? '#7c3aed' : '#059669') : '#1a1a2e',
              color: tab === t ? '#ffffff' : '#6b7280',
              borderColor: tab === t ? (t === 'work' ? '#7c3aed' : '#059669') : '#4a4a8a',
              fontSize: 10,
              position: 'relative',
            }}
          >
            {t === 'work' ? '⏱ WORK' : '🟢 SLIME'}
            {t === 'slime' && slimeAlert && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                width: 12, height: 12,
                background: '#ef4444',
                borderRadius: '50%',
                border: '2px solid var(--color-bg)',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* 通知 */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--pixel-font)', fontSize: 10,
          background: '#7c3aed', color: '#ffffff',
          padding: '10px 20px',
          border: '3px solid #a78bfa',
          boxShadow: '4px 4px 0 #000',
          zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {tab === 'work' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PomodoroTimer
              onPomodoroComplete={handlePomodoroComplete}
              pomodoroCount={slime.pomodoroCount}
              onBreakStart={handleBreakStart}
            />
            {/* スライムの状態を小さく表示 */}
            <div className="pixel-box" style={{ padding: '12px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: '#6b7280' }}>SLIME STATUS</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: '#fbbf24' }}>🪙 {slime.coins}</span>
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: slimeAlert ? '#ef4444' : '#22c55e' }}>
                    {slimeAlert ? '⚠ HUNGRY' : '♥ OK'}
                  </span>
                </div>
              </div>
              {/* 空腹タイマー */}
              <div style={{
                fontFamily: 'var(--pixel-font)', fontSize: 8,
                color: slimeAlert ? '#ef4444' : '#4b5563',
                lineHeight: 1.6,
              }}>
                {workTabWarning}
              </div>
            </div>
            <div className="pixel-box" style={{ padding: '14px 20px' }}>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: '#4b5563', lineHeight: 2.2 }}>
                <div>▸ 25MIN WORK → COINS EARNED</div>
                <div>▸ 3+ COMBO = BONUS COINS</div>
                <div>▸ FEED SLIME DURING BREAK</div>
                <div>▸ SLIME GETS HUNGRY OVER TIME</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Slime slime={slime} />
            <FeedPanel coins={slime.coins} onFeed={handleFeed} />
          </div>
        )}
      </div>
    </div>
  )
}
