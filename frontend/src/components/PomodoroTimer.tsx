import { useState, useEffect, useRef } from 'react'

type Phase = 'work' | 'break'

interface Props {
  onPomodoroComplete: (count: number, durationMin: number) => void
  pomodoroCount: number
  onBreakStart?: () => void
}

const BREAK_SEC = 5 * 60

function coinMultiplier(min: number): number {
  const dev = Math.abs(min - 25)
  return Math.max(0.2, 1 - dev * 0.04)
}

export function PomodoroTimer({ onPomodoroComplete, pomodoroCount, onBreakStart }: Props) {
  const [durationMin, setDurationMin] = useState(25)
  const [phase,   setPhase]   = useState<Phase>('work')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const workSec = durationMin * 60

  // interval のコールバックから常に最新の handlePhaseEnd を呼ぶための ref
  const handlePhaseEndRef = useRef(handlePhaseEnd)
  useEffect(() => { handlePhaseEndRef.current = handlePhaseEnd })

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) { clearInterval(intervalRef.current!); handlePhaseEndRef.current(); return 0 }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, phase])

  function handlePhaseEnd() {
    if (phase === 'work') {
      onPomodoroComplete(pomodoroCount + 1, durationMin)
      onBreakStart?.()
      setPhase('break')
      setSeconds(BREAK_SEC)
      setRunning(true)
    } else {
      setPhase('work')
      setSeconds(workSec)
      setRunning(false)
    }
  }

  function toggle() { setRunning(r => !r) }
  function reset()  { setRunning(false); setPhase('work'); setSeconds(workSec) }

  // 設定ボタンは停止中の作業フェーズしか表示されないので、残り時間も一緒に更新してよい
  function changeDuration(delta: number) {
    const next = Math.min(60, Math.max(5, durationMin + delta))
    setDurationMin(next)
    setSeconds(next * 60)
  }

  const minutes = Math.floor(seconds / 60)
  const secs    = seconds % 60
  const total   = phase === 'work' ? workSec : BREAK_SEC
  const elapsed = total - seconds
  const segments = 20
  const filled   = Math.floor((elapsed / total) * segments)
  const color    = phase === 'work' ? 'var(--accent)' : 'var(--green)'
  const mult     = coinMultiplier(durationMin)
  const isOptimal = durationMin === 25

  return (
    <div className="pixel-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: 28 }}>
      {/* フェーズ */}
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 14, color, letterSpacing: 2 }}>
        {phase === 'work' ? '🍅 作業タイム' : '☕ 休憩タイム'}
      </div>

      {/* 時間設定（停止中のみ） */}
      {!running && phase === 'work' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, color: 'var(--text-muted)' }}>作業時間を設定</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => changeDuration(-5)} className="pixel-btn" style={{ padding: '8px 14px', fontSize: 14, background: '#1a0f06', color: 'var(--text-dim)', borderColor: 'var(--border)' }}>－</button>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 22, color: 'var(--text)', minWidth: 60, textAlign: 'center' }}>
              {durationMin}<span style={{ fontSize: 13 }}>分</span>
            </div>
            <button onClick={() => changeDuration(5)} className="pixel-btn" style={{ padding: '8px 14px', fontSize: 14, background: '#1a0f06', color: 'var(--text-dim)', borderColor: 'var(--border)' }}>＋</button>
          </div>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: isOptimal ? 'var(--green)' : 'var(--accent)' }}>
            {isOptimal ? '✦ 最高効率（25分）' : `コイン効率: ${Math.round(mult * 100)}%`}
          </div>
        </div>
      )}

      {/* カウントダウン */}
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 52, color: '#fff', letterSpacing: 4, textShadow: `0 0 24px ${color}`, lineHeight: 1 }}>
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      {/* プログレスバー */}
      <div style={{ display: 'flex' }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="pixel-seg" style={{ background: i < filled ? color : '#2a1208' }} />
        ))}
      </div>

      {/* ボタン */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={toggle} className="pixel-btn" style={{ padding: '13px 30px', fontSize: 14, background: running ? '#1a0f06' : color, color: running ? 'var(--text-dim)' : '#000', borderColor: color }}>
          {running ? '⏸ 一時停止' : '▶ スタート'}
        </button>
        <button onClick={reset} className="pixel-btn" style={{ padding: '13px 18px', fontSize: 13, background: '#1a0f06', color: 'var(--text-dim)', borderColor: 'var(--border)' }}>
          ↺ リセット
        </button>
      </div>

      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 2 }}>
        本日: <span style={{ color: 'var(--accent)' }}>{pomodoroCount}</span> 回完了
        {pomodoroCount >= 3 && <span style={{ color: 'var(--green)' }}>&nbsp;✦ボーナス中</span>}
      </div>
    </div>
  )
}
