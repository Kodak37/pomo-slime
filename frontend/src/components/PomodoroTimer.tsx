import { useState, useEffect, useRef } from 'react'

type Phase = 'work' | 'break'

interface Props {
  onPomodoroComplete: (count: number) => void
  pomodoroCount: number
}

export function PomodoroTimer({ onPomodoroComplete, pomodoroCount }: Props) {
  const [phase, setPhase] = useState<Phase>('work')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const WORK_SEC = 25 * 60
  const BREAK_SEC = 5 * 60

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
      onPomodoroComplete(pomodoroCount + 1)
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
  const progress = phase === 'work'
    ? ((WORK_SEC - seconds) / WORK_SEC) * 100
    : ((BREAK_SEC - seconds) / BREAK_SEC) * 100

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gray-800 rounded-2xl shadow-xl">
      <div className="text-sm font-bold tracking-widest uppercase text-purple-400">
        {phase === 'work' ? '🍅 作業タイム' : '☕ 休憩タイム'}
      </div>

      {/* 円形プログレス */}
      <div className="relative w-48 h-48">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={phase === 'work' ? '#a855f7' : '#34d399'}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-mono font-bold text-white">
            {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={toggle}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors"
        >
          {running ? '⏸ 一時停止' : '▶ スタート'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
        >
          ↺ リセット
        </button>
      </div>

      <div className="text-gray-400 text-sm">
        今日の完了: <span className="text-yellow-400 font-bold">{pomodoroCount}</span> 回
      </div>
    </div>
  )
}
