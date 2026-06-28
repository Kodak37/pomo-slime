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

const DECAY_PER_MIN = 2 / 5
function workTabTimer(hunger: number, updatedAt: string): string {
  const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 60000
  const eff = Math.max(0, hunger - elapsed * DECAY_PER_MIN)
  const thresholds = [
    { value: 35, label: 'ちょっと元気がなくなる' },
    { value: 15, label: '瀕死になる' },
  ]
  const next = thresholds.find(t => eff > t.value)
  if (!next) return '⚠ 今すぐごはんを！'
  const min = (eff - next.value) / DECAY_PER_MIN
  if (min < 1)  return `まもなく${next.label}！`
  if (min < 60) return `⏱ 約 ${Math.floor(min)} 分後に${next.label}`
  return `⏱ 約 ${Math.floor(min / 60)}時間${Math.floor(min % 60)}分後に${next.label}`
}

export default function App() {
  const [tab,          setTab]          = useState<Tab>('work')
  const [slime,        setSlime]        = useState<SlimeData | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [slimeAlert,   setSlimeAlert]   = useState(false)

  const fetchSlime = useCallback(async () => {
    const res  = await fetch('/api/slime')
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
    const res  = await fetch('/api/pomodoro/done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pomodoroCount: count }),
    })
    const data = await res.json()
    setSlime(data)
    showNotif('🍅 ポモドーロ完了！コインをゲット！')
  }

  function handleBreakStart() {
    showNotif('☕ 休憩タイム！スライムにごはんをあげよう')
    setTimeout(() => setTab('slime'), 1600)
  }

  async function handleFeed(cost: number) {
    if (!slime || slime.coins < cost) { showNotif('コインが足りない…'); return }
    const res  = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost }),
    })
    const data = await res.json()
    setSlime(data)
    showNotif('😋 スライムが喜んでいる！')
  }

  if (!slime) return (
    <div className="room-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 14, color: 'var(--accent)' }}>よみこみ中…</div>
    </div>
  )

  const timer = workTabTimer(slime.hunger, slime.updatedAt)

  return (
    <div className="room-bg">
      {/* 夜窓の装飾 */}
      <div className="pixel-window" />

      {/* ─── ヘッダー ─── */}
      <div style={{ textAlign: 'center', padding: '28px 0 20px', position: 'relative', zIndex: 2 }}>
        <h1 style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 18,
          color: 'var(--text)',
          letterSpacing: 3,
          textShadow: '0 0 20px rgba(245,158,11,0.6)',
          margin: 0,
        }}>
          🍅 ポモスライム
        </h1>
      </div>

      {/* ─── タブ ─── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 24, position: 'relative', zIndex: 2 }}>
        {(['work', 'slime'] as Tab[]).map(t => {
          const active = tab === t
          const isWork = t === 'work'
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pixel-btn"
              style={{
                padding: '12px 32px',
                fontSize: 12,
                background: active ? (isWork ? 'var(--accent)' : 'var(--green)') : '#1a0f06',
                color:      active ? '#000'  : 'var(--text-muted)',
                borderColor: active ? (isWork ? 'var(--accent)' : 'var(--green)') : 'var(--border)',
                position: 'relative',
              }}
            >
              {isWork ? '⏱ 作業' : '🟢 スライム'}
              {!isWork && slimeAlert && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 13, height: 13,
                  background: 'var(--red)',
                  borderRadius: '50%',
                  border: '2px solid var(--bg-wall)',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ─── 通知 ─── */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--pixel-font)', fontSize: 11,
          background: 'var(--accent)', color: '#000',
          padding: '12px 22px',
          border: '3px solid #fde68a',
          boxShadow: '4px 4px 0 #000',
          zIndex: 100,
          whiteSpace: 'nowrap',
        }}>
          {notification}
        </div>
      )}

      {/* ─── コンテンツ ─── */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 16px 48px', position: 'relative', zIndex: 2 }}>
        {tab === 'work' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PomodoroTimer
              onPomodoroComplete={handlePomodoroComplete}
              pomodoroCount={slime.pomodoroCount}
              onBreakStart={handleBreakStart}
            />

            {/* スライム簡易ステータス */}
            <div className="pixel-box" style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)' }}>
                  スライムのようす
                </div>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--accent)' }}>
                    🪙 {slime.coins}
                  </span>
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: slimeAlert ? 'var(--red)' : 'var(--green)' }}>
                    {slimeAlert ? '⚠ おなかすいた' : '♥ 元気'}
                  </span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: slimeAlert ? 'var(--red)' : 'var(--text-muted)', lineHeight: 1.8 }}>
                {timer}
              </div>
            </div>

            {/* 遊び方 */}
            <div className="pixel-box" style={{ padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
                📖 遊び方
              </div>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 2.4 }}>
                <div>▸ 25分タイマーを回してコインをゲット</div>
                <div>▸ 3回以上続けるとボーナスコイン</div>
                <div>▸ 休憩中にスライムにごはんをあげよう</div>
                <div>▸ ごはんをあげないと干からびちゃう…</div>
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
