import { useState, useEffect, useRef, useCallback } from 'react'

interface FoodItem {
  id: number
  x: number
  y: number
  emoji: string
  speed: number
  caught: boolean
}

const FOODS = ['🍄', '🍙', '🍎', '🫐', '🌽', '🍓', '🥕', '🍞']
const GAME_DURATION = 30
const REWARD_PER_FOOD = 3

interface Props {
  onClose: () => void
  onReward: (coins: number) => void
}

export function MiniGame({ onClose, onReward }: Props) {
  const [phase, setPhase]   = useState<'ready' | 'playing' | 'result'>('ready')
  const [items, setItems]   = useState<FoodItem[]>([])
  const [score, setScore]   = useState(0)
  const [timeLeft, setTime] = useState(GAME_DURATION)
  const nextId = useRef(0)
  const areaRef = useRef<HTMLDivElement>(null)

  const spawnItem = useCallback(() => {
    const x = 5 + Math.random() * 80
    const emoji = FOODS[Math.floor(Math.random() * FOODS.length)]
    const speed = 2 + Math.random() * 3
    setItems(prev => [...prev, { id: nextId.current++, x, y: -8, emoji, speed, caught: false }])
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const spawn = setInterval(spawnItem, 800)
    const timer = setInterval(() => {
      setTime(t => {
        if (t <= 1) { clearInterval(spawn); clearInterval(timer); setPhase('result'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { clearInterval(spawn); clearInterval(timer) }
  }, [phase, spawnItem])

  useEffect(() => {
    if (phase !== 'playing') return
    const fall = setInterval(() => {
      setItems(prev => prev
        .map(it => ({ ...it, y: it.y + it.speed }))
        .filter(it => it.y < 108)
      )
    }, 50)
    return () => clearInterval(fall)
  }, [phase])

  function catchFood(id: number) {
    setItems(prev => prev.filter(it => it.id !== id))
    setScore(s => s + 1)
  }

  async function claimReward() {
    const coins = score * REWARD_PER_FOOD
    await fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost: -coins }),
    })
    onReward(coins)
    onClose()
  }

  const coins = score * REWARD_PER_FOOD

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="pixel-box" style={{ width: 380, padding: 24 }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, color: 'var(--accent)', textAlign: 'center', marginBottom: 16 }}>
          🎮 食べ物キャッチ！
        </div>

        {phase === 'ready' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 2.2 }}>
              <div>落ちてくる食べ物をタップしよう</div>
              <div>制限時間: {GAME_DURATION}秒</div>
              <div>1個 = 🪙{REWARD_PER_FOOD}コイン</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setPhase('playing')} className="pixel-btn" style={{ padding: '12px 24px', fontSize: 11, background: 'var(--green)', color: '#000', borderColor: 'var(--green)' }}>
                スタート！
              </button>
              <button onClick={onClose} className="pixel-btn" style={{ padding: '12px 16px', fontSize: 11, background: '#1a0f06', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                もどる
              </button>
            </div>
          </div>
        )}

        {phase === 'playing' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--accent)' }}>スコア: {score}</div>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: timeLeft <= 10 ? 'var(--red)' : 'var(--text-dim)' }}>⏱ {timeLeft}秒</div>
            </div>
            <div
              ref={areaRef}
              style={{
                position: 'relative', width: '100%', height: 240,
                background: '#0d0800', border: '2px solid var(--border)',
                overflow: 'hidden', cursor: 'default',
              }}
            >
              {items.map(it => (
                <div
                  key={it.id}
                  onClick={() => catchFood(it.id)}
                  style={{
                    position: 'absolute',
                    left: `${it.x}%`,
                    top: `${it.y}%`,
                    fontSize: 28,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transform: 'translateX(-50%)',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  }}
                >
                  {it.emoji}
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'result' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)' }}>ゲーム終了！</div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 32, color: 'var(--accent)' }}>{score}<span style={{ fontSize: 12 }}> 個</span></div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, color: 'var(--accent)' }}>🪙 {coins} コイン獲得！</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={claimReward} className="pixel-btn" style={{ padding: '12px 24px', fontSize: 11, background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' }}>
                うけとる！
              </button>
              <button onClick={onClose} className="pixel-btn" style={{ padding: '12px 16px', fontSize: 10, background: '#1a0f06', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                とじる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
