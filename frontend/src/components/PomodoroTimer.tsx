import { useState, useEffect, useRef } from 'react'

type Phase = 'work' | 'break'

interface Props {
  onPomodoroComplete: (count: number) => void
  pomodoroCount: number
  onBreakStart?: () => void
}

const WORK_SEC  = 25 * 60
const BREAK_SEC =  5 * 60

export function PomodoroTimer({ onPomodoroComplete, pomodoroCount, onBreakStart }: Props) {
  const [phase,   setPhase]   = useState<Phase>('work')
  const [seconds, setSeconds] = useState(WORK_SEC)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) { clearInterval(intervalRef.current!); handlePhaseEnd(); return 0 }
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
      onPomodoroComplete(pomodoroCount + 1)
      onBreakStart?.()
      setPhase('break')
      setSeconds(BREAK_SEC)
      setRunning(true)
    } else {
      setPhase('work')
      setSeconds(WORK_SEC)
      setRunning(false)
    }
  }

  function toggle() { setRunning(r => !r) }
  function reset()  { setRunning(false); setPhase('work'); setSeconds(WORK_SEC) }

  const minutes = Math.floor(seconds / 60)
  const secs    = seconds % 60
  const total   = phase === 'work' ? WORK_SEC : BREAK_SEC
  const elapsed = total - seconds
  const segments = 20
  const filled   = Math.floor((elapsed / total) * segments)
  const color    = phase === 'work' ? 'var(--accent)' : 'var(--green)'
  const phaseLabel = phase === 'work' ? '🍅 作業タイム' : '☕ 休憩タイム'

  return (
    <div className="pixel-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, color, letterSpacing: 2 }}>
        {phaseLabel}
      </div>

      <div style={{
        fontFamily: 'var(--pixel-font)',
        fontSize: 52,
        color: '#fff',
        letterSpacing: 4,
        textShadow: `0 0 24px ${color}`,
        lineHeight: 1,
      }}>
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      <div style={{ display: 'flex' }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="pixel-seg" style={{ background: i < filled ? color : '#2a1208' }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={toggle}
          className="pixel-btn"
          style={{
            padding: '12px 28px',
            fontSize: 12,
            background: running ? '#1a0f06' : color,
            color: running ? 'var(--text-dim)' : '#000',
            borderColor: color,
          }}
        >
          {running ? '⏸ 一時停止' : '▶ スタート'}
        </button>
        <button
          onClick={reset}
          className="pixel-btn"
          style={{
            padding: '12px 16px',
            fontSize: 11,
            background: '#1a0f06',
            color: 'var(--text-dim)',
            borderColor: 'var(--border)',
          }}
        >
          ↺ リセット
        </button>
      </div>

      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 2 }}>
        本日: <span style={{ color: 'var(--accent)' }}>{pomodoroCount}</span> 回完了
        {pomodoroCount >= 3 && <span style={{ color: 'var(--green)' }}>&nbsp;✦ボーナス中</span>}
      </div>
    </div>
  )
}
