import { useState, useEffect, useRef } from 'react'

type Phase = 'work' | 'break'

interface Props {
  onPomodoroComplete: (count: number) => void
  pomodoroCount: number
  onBreakStart?: () => void
}

const WORK_SEC = 25 * 60
const BREAK_SEC = 5 * 60

export function PomodoroTimer({ onPomodoroComplete, pomodoroCount, onBreakStart }: Props) {
  const [phase, setPhase] = useState<Phase>('work')
  const [seconds, setSeconds] = useState(WORK_SEC)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            handlePhaseEnd()
            return 0
          }
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
      const newCount = pomodoroCount + 1
      onPomodoroComplete(newCount)
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

  function reset() {
    setRunning(false)
    setPhase('work')
    setSeconds(WORK_SEC)
  }

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  const totalSec = phase === 'work' ? WORK_SEC : BREAK_SEC
  const elapsed = totalSec - seconds
  const segments = 20
  const filledSeg = Math.floor((elapsed / totalSec) * segments)
  const barColor = phase === 'work' ? '#7c3aed' : '#06b6d4'
  const phaseLabel = phase === 'work' ? '▸ WORK' : '▸ BREAK'
  const phaseColor = phase === 'work' ? '#7c3aed' : '#06b6d4'

  return (
    <div className="pixel-box flex flex-col items-center gap-6 p-8">
      {/* フェーズ表示 */}
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: phaseColor, letterSpacing: 3 }}>
        {phaseLabel}
      </div>

      {/* 時間表示（大きいピクセルフォント） */}
      <div style={{
        fontFamily: 'var(--pixel-font)',
        fontSize: 48,
        color: '#ffffff',
        letterSpacing: 4,
        textShadow: `0 0 20px ${phaseColor}`,
        lineHeight: 1,
      }}>
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      {/* ピクセル進捗バー */}
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 18,
              background: i < filledSeg ? barColor : '#2d2d4e',
              border: '1px solid #1a1a35',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* ボタン */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={toggle}
          className="pixel-btn"
          style={{
            padding: '10px 24px',
            background: running ? '#1e3a5f' : barColor,
            color: '#ffffff',
            borderColor: running ? '#4a8abf' : phaseColor,
          }}
        >
          {running ? '⏸ PAUSE' : '▶ START'}
        </button>
        <button
          onClick={reset}
          className="pixel-btn"
          style={{
            padding: '10px 16px',
            background: '#2d2d4e',
            color: '#9ca3af',
            borderColor: '#4a4a8a',
          }}
        >
          ↺ RST
        </button>
      </div>

      {/* カウンター */}
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: '#6b7280' }}>
        TODAY: <span style={{ color: '#fbbf24' }}>{pomodoroCount}</span> / COMBO BONUS AT 3+
      </div>
    </div>
  )
}
