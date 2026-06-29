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

const STATUS_CFG: Record<SlimeStatus, { gif: string; label: string; color: string; extraFilter: string; opacity: number }> = {
  dying:          { gif: '/slime/idle.gif', label: '元気がない…',       color: '#64748b', extraFilter: 'grayscale(85%) brightness(0.45)', opacity: 0.55 },
  hungry:         { gif: '/slime/idle.gif', label: 'ちょっと元気がない', color: '#94a3b8', extraFilter: 'saturate(0.55) brightness(0.75)',  opacity: 0.8  },
  normal:         { gif: '/slime/idle.gif', label: 'ふつう',             color: '#86efac', extraFilter: '',                                opacity: 1    },
  slightly_happy: { gif: '/slime/jump.gif', label: 'ちょっと元気！',     color: '#34d399', extraFilter: '',                                opacity: 1    },
  happy:          { gif: '/slime/move.gif', label: '元気いっぱい！！',   color: '#fbbf24', extraFilter: '',                                opacity: 1    },
}

const BASE_HUE = 200

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = 0
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else                h = ((r - g) / d + 4) / 6
  return Math.round(h * 360)
}

function buildFilter(bodyColor: string, status: SlimeStatus): string {
  const cfg = STATUS_CFG[status]
  if (status === 'dying') return cfg.extraFilter
  const hue = hexToHue(bodyColor)
  const rotate = hue - BASE_HUE
  const desat = bodyColor === '#94a3b8' ? ' saturate(0.25)' : ''
  const extra = cfg.extraFilter ? ` ${cfg.extraFilter}` : ''
  return `hue-rotate(${rotate}deg)${desat}${extra}`
}

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

function Hat({ type }: { type: string }) {
  if (type === 'crown')  return <div style={{ fontSize: 22, textAlign: 'center', marginBottom: -8, zIndex: 1 }}>👑</div>
  if (type === 'santa')  return <div style={{ fontSize: 22, textAlign: 'center', marginBottom: -8, zIndex: 1 }}>🎅</div>
  if (type === 'helmet') return <div style={{ fontSize: 22, textAlign: 'center', marginBottom: -8, zIndex: 1 }}>⛑️</div>
  return null
}

export function Slime({ slime, bodyColor = '#4ade80', hatType = 'none', onNameUpdate }: Props) {
  const [editing, setEditing]   = useState(false)
  const [nameInput, setNameInput] = useState(slime.name)
  const cfg      = STATUS_CFG[slime.status] ?? STATUS_CFG.normal
  const timeMsg  = calcTimeUntil(slime.hunger, slime.updatedAt)
  const isCritical = slime.status === 'hungry' || slime.status === 'dying'
  const imgFilter  = buildFilter(bodyColor, slime.status)

  const segs   = 10
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
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Hat type={hatType} />
        <img
          src={cfg.gif}
          alt="slime"
          style={{
            width: 160,
            height: 160,
            objectFit: 'contain',
            imageRendering: 'pixelated',
            filter: imgFilter,
            opacity: cfg.opacity,
            transition: 'filter 0.4s ease, opacity 0.4s ease',
          }}
        />
      </div>

      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: cfg.color, textAlign: 'center' }}>
        {cfg.label}
      </div>

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
