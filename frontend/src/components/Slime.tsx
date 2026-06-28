import { useState } from 'react'

type SlimeStatus = 'happy' | 'slightly_happy' | 'normal' | 'hungry' | 'dying'

interface SlimeData {
  name: string
  hunger: number
  coins: number
  pomodoroCount: number
  status: SlimeStatus
  updatedAt: string
}

interface Props {
  slime: SlimeData
  bodyColor?: string
  hatType?: string
  onNameUpdate: (name: string) => void
}

const DECAY_PER_MIN = 2 / 5
const THRESHOLDS = [
  { value: 35, label: 'ちょっと元気がなくなる' },
  { value: 15, label: '瀕死になる' },
]

function calcTimeUntil(hunger: number, updatedAt: string): string | null {
  const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 60000
  const eff = Math.max(0, hunger - elapsed * DECAY_PER_MIN)
  const next = THRESHOLDS.find(t => eff > t.value)
  if (!next) return null
  const min = (eff - next.value) / DECAY_PER_MIN
  if (min < 1)  return `まもなく${next.label}！`
  if (min < 60) return `約 ${Math.floor(min)} 分後に${next.label}`
  return `約 ${Math.floor(min / 60)}時間${Math.floor(min % 60) > 0 ? `${Math.floor(min % 60)}分` : ''}後に${next.label}`
}

const STATUS_CFG: Record<SlimeStatus, { label: string; color: string; eye: string; anim: string; dur: string; shadow: string; opacity: number }> = {
  dying:          { label: '元気がない…',       color: '#64748b', eye: 'closed',  anim: 'slime-dying',          dur: '3s',    shadow: 'rgba(74,138,191,0.2)',  opacity: 0.5  },
  hungry:         { label: 'ちょっと元気がない', color: '#94a3b8', eye: 'sad',     anim: 'slime-hungry',         dur: '2.5s',  shadow: 'rgba(107,158,99,0.3)',  opacity: 0.75 },
  normal:         { label: 'ふつう',             color: '#86efac', eye: 'normal',  anim: 'slime-normal',         dur: '1.8s',  shadow: 'rgba(74,222,128,0.35)', opacity: 1    },
  slightly_happy: { label: 'ちょっと元気！',     color: '#34d399', eye: 'happy',   anim: 'slime-slightly-happy', dur: '1.2s',  shadow: 'rgba(52,211,153,0.5)', opacity: 1    },
  happy:          { label: '元気いっぱい！！',   color: '#fbbf24', eye: 'excited', anim: 'slime-happy',          dur: '0.75s', shadow: 'rgba(74,222,128,0.7)', opacity: 1    },
}

function buildBodyGradient(baseColor: string, status: SlimeStatus): string {
  if (status === 'dying') return `radial-gradient(ellipse at 40% 35%, #b0c8e8 0%, #7eafd6 40%, #4a8abf 100%)`
  return `radial-gradient(ellipse at 40% 30%, #ffffff55 0%, ${baseColor} 40%, ${baseColor}aa 100%)`
}

function Eyes({ style }: { style: string }) {
  const base: React.CSSProperties = { background: '#1e3a5f', borderRadius: '50%' }
  if (style === 'closed') return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 2 }}>
      {[0,1].map(i => <div key={i} style={{ width: 12, height: 4, background: '#1e3a5f', borderRadius: 2 }} />)}
    </div>
  )
  if (style === 'sad') return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 2 }}>
      {[0,1].map(i => <div key={i} style={{ ...base, width: 9, height: 9, marginTop: 5 }} />)}
    </div>
  )
  if (style === 'normal') return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 2 }}>
      {[0,1].map(i => <div key={i} style={{ ...base, width: 10, height: 10 }} />)}
    </div>
  )
  if (style === 'happy') return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 2 }}>
      {[-5,5].map((r,i) => <div key={i} style={{ ...base, width: 12, height: 7, borderRadius: '50% 50% 0 0', transform: `rotate(${r}deg)` }} />)}
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 2 }}>
      {[0,1].map(i => <div key={i} style={{ ...base, width: 13, height: 13, border: '2px solid #fef9c3' }} />)}
    </div>
  )
}

function Hat({ type }: { type: string }) {
  if (type === 'crown') return <div style={{ fontSize: 18, textAlign: 'center', marginBottom: -4 }}>👑</div>
  if (type === 'santa') return <div style={{ fontSize: 18, textAlign: 'center', marginBottom: -4 }}>🎅</div>
  if (type === 'helmet') return <div style={{ fontSize: 18, textAlign: 'center', marginBottom: -4 }}>⛑️</div>
  return null
}

export function Slime({ slime, bodyColor = '#4ade80', hatType = 'none', onNameUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(slime.name)
  const cfg = STATUS_CFG[slime.status] ?? STATUS_CFG.normal
  const timeMsg = calcTimeUntil(slime.hunger, slime.updatedAt)
  const isCritical = slime.status === 'hungry' || slime.status === 'dying'

  const segs = 10
  const filled = Math.round((slime.hunger / 100) * segs)
  const barColor = slime.hunger >= 60 ? 'var(--green)' : slime.hunger >= 30 ? 'var(--accent)' : 'var(--red)'

  async function saveName() {
    if (!nameInput.trim()) return
    await fetch('/api/slime/name', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    })
    onNameUpdate(nameInput.trim())
    setEditing(false)
  }

  const bodyGrad = buildBodyGradient(bodyColor, slime.status)

  return (
    <div className="pixel-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24 }}>
      {/* 名前 */}
      {editing ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            maxLength={12}
            style={{
              fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text)',
              background: '#1a0f06', border: '2px solid var(--border-lit)',
              padding: '6px 10px', outline: 'none', width: 160,
            }}
            autoFocus
          />
          <button onClick={saveName} className="pixel-btn" style={{ padding: '6px 10px', fontSize: 9, background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' }}>✓</button>
          <button onClick={() => setEditing(false)} className="pixel-btn" style={{ padding: '6px 10px', fontSize: 9, background: '#1a0f06', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>✕</button>
        </div>
      ) : (
        <div
          onClick={() => { setNameInput(slime.name); setEditing(true) }}
          style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer', letterSpacing: 1 }}
          title="クリックして名前を変更"
        >
          {slime.name} ✏️
        </div>
      )}

      {/* スライム本体 */}
      <div style={{ height: 155, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Hat type={hatType} />
        <div style={{
          width: 120, height: 120,
          background: bodyGrad,
          borderRadius: '50% 50% 46% 54% / 60% 60% 40% 40%',
          animation: `${cfg.anim} ${cfg.dur} ease-in-out infinite`,
          opacity: cfg.opacity,
          boxShadow: `0 10px 28px ${cfg.shadow}, inset 0 -10px 18px rgba(0,0,0,0.2)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 20, left: 24, width: 26, height: 15, background: 'rgba(255,255,255,0.42)', borderRadius: '50%', transform: 'rotate(-25deg)' }} />
          <Eyes style={cfg.eye} />
          {slime.status !== 'dying' && (
            <div style={{ width: slime.status === 'happy' || slime.status === 'slightly_happy' ? 24 : 16, height: 7, background: '#1e3a5f', borderRadius: '0 0 8px 8px', marginTop: 4 }} />
          )}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: cfg.color, textAlign: 'center' }}>{cfg.label}</div>

      {/* 空腹度バー */}
      <div style={{ width: '100%' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>おなかの満腹度</div>
        <div style={{ display: 'flex' }}>
          {Array.from({ length: segs }).map((_, i) => (
            <div key={i} className="pixel-seg" style={{ background: i < filled ? barColor : '#1a0f06', flex: 1, marginRight: i < segs-1 ? 3 : 0 }} />
          ))}
        </div>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>{slime.hunger} / 100</div>
      </div>

      {timeMsg && (
        <div style={{ width: '100%', fontFamily: 'var(--pixel-font)', fontSize: 10, color: isCritical ? 'var(--red)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.9, padding: '8px 12px', background: 'rgba(0,0,0,0.28)', border: `1px solid ${isCritical ? '#7f1d1d' : 'var(--border)'}` }}>
          ⏱ {timeMsg}
        </div>
      )}

      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 14, color: 'var(--accent)' }}>🪙 {slime.coins} コイン</div>
    </div>
  )
}
