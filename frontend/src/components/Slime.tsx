type SlimeStatus = 'happy' | 'slightly_happy' | 'normal' | 'hungry' | 'dying'

interface SlimeData {
  name: string
  hunger: number
  coins: number
  pomodoroCount: number
  status: SlimeStatus
}

interface Props {
  slime: SlimeData
}

const STATUS_CONFIG: Record<SlimeStatus, {
  label: string
  color: string
  bodyColor: string
  eyeStyle: string
  animation: string
  animDuration: string
  shadow: string
  opacity: number
}> = {
  dying: {
    label: '元気がない…',
    color: '#64748b',
    bodyColor: 'radial-gradient(ellipse at 40% 35%, #b0c8e8 0%, #7eafd6 40%, #4a8abf 100%)',
    eyeStyle: 'closed',
    animation: 'slime-dying',
    animDuration: '3s',
    shadow: 'rgba(74,138,191,0.2)',
    opacity: 0.55,
  },
  hungry: {
    label: 'ちょっと元気がない',
    color: '#94a3b8',
    bodyColor: 'radial-gradient(ellipse at 40% 35%, #a8c5a0 0%, #6b9e63 40%, #4a7a43 100%)',
    eyeStyle: 'sad',
    animation: 'slime-hungry',
    animDuration: '2.5s',
    shadow: 'rgba(107,158,99,0.3)',
    opacity: 0.75,
  },
  normal: {
    label: 'ふつう',
    color: '#86efac',
    bodyColor: 'radial-gradient(ellipse at 40% 35%, #bbf7d0 0%, #4ade80 45%, #16a34a 100%)',
    eyeStyle: 'normal',
    animation: 'slime-normal',
    animDuration: '1.8s',
    shadow: 'rgba(74,222,128,0.35)',
    opacity: 1,
  },
  slightly_happy: {
    label: 'ちょっと元気！',
    color: '#34d399',
    bodyColor: 'radial-gradient(ellipse at 40% 30%, #d1fae5 0%, #34d399 40%, #059669 100%)',
    eyeStyle: 'happy',
    animation: 'slime-slightly-happy',
    animDuration: '1.2s',
    shadow: 'rgba(52,211,153,0.5)',
    opacity: 1,
  },
  happy: {
    label: '元気いっぱい！！',
    color: '#fbbf24',
    bodyColor: 'radial-gradient(ellipse at 38% 28%, #fef9c3 0%, #4ade80 35%, #16a34a 100%)',
    eyeStyle: 'excited',
    animation: 'slime-happy',
    animDuration: '0.75s',
    shadow: 'rgba(74,222,128,0.7)',
    opacity: 1,
  },
}

function SlimeEyes({ style }: { style: string }) {
  if (style === 'closed') {
    return (
      <div className="flex gap-3 justify-center mb-1">
        <div style={{ width: 10, height: 3, background: '#1e3a5f', borderRadius: 2 }} />
        <div style={{ width: 10, height: 3, background: '#1e3a5f', borderRadius: 2 }} />
      </div>
    )
  }
  if (style === 'sad') {
    return (
      <div className="flex gap-3 justify-center mb-1">
        <div style={{ width: 8, height: 8, background: '#1e3a5f', borderRadius: '50%', marginTop: 4 }} />
        <div style={{ width: 8, height: 8, background: '#1e3a5f', borderRadius: '50%', marginTop: 4 }} />
      </div>
    )
  }
  if (style === 'normal') {
    return (
      <div className="flex gap-3 justify-center mb-1">
        <div style={{ width: 9, height: 9, background: '#1e3a5f', borderRadius: '50%' }} />
        <div style={{ width: 9, height: 9, background: '#1e3a5f', borderRadius: '50%' }} />
      </div>
    )
  }
  if (style === 'happy') {
    return (
      <div className="flex gap-3 justify-center mb-1">
        <div style={{ width: 10, height: 6, background: '#1e3a5f', borderRadius: '50% 50% 0 0', transform: 'rotate(-5deg)' }} />
        <div style={{ width: 10, height: 6, background: '#1e3a5f', borderRadius: '50% 50% 0 0', transform: 'rotate(5deg)' }} />
      </div>
    )
  }
  // excited
  return (
    <div className="flex gap-2 justify-center mb-1">
      <div style={{ width: 12, height: 12, background: '#1e3a5f', borderRadius: '50%', border: '2px solid #fef9c3' }} />
      <div style={{ width: 12, height: 12, background: '#1e3a5f', borderRadius: '50%', border: '2px solid #fef9c3' }} />
    </div>
  )
}

export function Slime({ slime }: Props) {
  const cfg = STATUS_CONFIG[slime.status] ?? STATUS_CONFIG.normal

  const hungerSegments = 10
  const filled = Math.round((slime.hunger / 100) * hungerSegments)
  const hungerBarColor = slime.hunger >= 60 ? '#22c55e'
    : slime.hunger >= 30 ? '#f59e0b'
    : '#ef4444'

  return (
    <div className="pixel-box flex flex-col items-center gap-5 p-6">
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: '#a0aec0', letterSpacing: 2 }}>
        {slime.name}
      </div>

      {/* スライム本体 */}
      <div style={{ height: 140, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div
          style={{
            width: 110,
            height: 110,
            background: cfg.bodyColor,
            borderRadius: '50% 50% 46% 54% / 60% 60% 40% 40%',
            animation: `${cfg.animation} ${cfg.animDuration} ease-in-out infinite`,
            opacity: cfg.opacity,
            boxShadow: `0 8px 24px ${cfg.shadow}, inset 0 -8px 16px rgba(0,0,0,0.2)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* ハイライト */}
          <div style={{
            position: 'absolute', top: 18, left: 22,
            width: 24, height: 14,
            background: 'rgba(255,255,255,0.45)',
            borderRadius: '50%',
            transform: 'rotate(-25deg)',
          }} />
          <SlimeEyes style={cfg.eyeStyle} />
          {/* 口 */}
          {slime.status === 'dying' ? null : (
            <div style={{
              width: slime.status === 'happy' || slime.status === 'slightly_happy' ? 22 : 14,
              height: 6,
              background: '#1e3a5f',
              borderRadius: '0 0 8px 8px',
              marginTop: 3,
            }} />
          )}
        </div>
      </div>

      {/* ステータステキスト */}
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: cfg.color, textAlign: 'center' }}>
        {cfg.label}
      </div>

      {/* 空腹度バー（ピクセル風） */}
      <div style={{ width: '100%' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: '#6b7280', marginBottom: 6 }}>
          HUNGER
        </div>
        <div style={{ display: 'flex' }}>
          {Array.from({ length: hungerSegments }).map((_, i) => (
            <div
              key={i}
              className="pixel-bar-segment"
              style={{
                background: i < filled ? hungerBarColor : '#2d2d4e',
                border: '1px solid #1a1a35',
              }}
            />
          ))}
        </div>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: '#4b5563', marginTop: 4, textAlign: 'right' }}>
          {slime.hunger}/100
        </div>
      </div>

      {/* コイン */}
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: '#fbbf24' }}>
        🪙 {slime.coins}
      </div>
    </div>
  )
}
