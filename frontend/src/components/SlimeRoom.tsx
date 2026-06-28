import { useState, useEffect, useRef, useCallback } from 'react'

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
  themeId?: string
  onNameUpdate: (name: string) => void
  onFeed: (cost: number) => void
  onGameOpen?: () => void
}

// ────────────── 定数 ──────────────
const WALL_RATIO  = 0.65  // 上 65% が壁
const FLOOR_RATIO = 0.35  // 下 35% が床

const SPEED: Record<SlimeStatus, number> = {
  dying: 0.04, hungry: 0.14, normal: 0.28, slightly_happy: 0.48, happy: 0.82,
}

const STATUS_CFG: Record<SlimeStatus, { gif: string; label: string; color: string; extraFilter: string; opacity: number }> = {
  dying:          { gif: '/slime/idle.gif', label: '元気がない…',       color: '#64748b', extraFilter: 'grayscale(85%) brightness(0.45)', opacity: 0.5  },
  hungry:         { gif: '/slime/idle.gif', label: 'おなかすいた…',     color: '#f87171', extraFilter: 'saturate(0.5) brightness(0.7)',   opacity: 0.8  },
  normal:         { gif: '/slime/idle.gif', label: 'ふつう〜',           color: '#86efac', extraFilter: '',                                opacity: 1    },
  slightly_happy: { gif: '/slime/jump.gif', label: 'たのしいな！',       color: '#34d399', extraFilter: '',                                opacity: 1    },
  happy:          { gif: '/slime/move.gif', label: '元気いっぱい！！',   color: '#fbbf24', extraFilter: '',                                opacity: 1    },
}

const FOODS = [
  { name: 'きのこ',   emoji: '🍄', cost: 5,  desc: '+10' },
  { name: 'おにぎり', emoji: '🍙', cost: 15, desc: '+30' },
  { name: 'ステーキ', emoji: '🥩', cost: 30, desc: '+60' },
]

const DECAY_PER_MIN = 2 / 5
const THRESHOLDS    = [
  { value: 35, label: 'ちょっと元気がなくなる' },
  { value: 15, label: '瀕死になる' },
]

// ────────────── ユーティリティ ──────────────
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
  const extra = STATUS_CFG[status].extraFilter
  if (status === 'dying') return extra
  const hue    = hexToHue(bodyColor)
  const rotate = hue - BASE_HUE
  const desat  = bodyColor === '#94a3b8' ? ' saturate(0.25)' : ''
  return `hue-rotate(${rotate}deg)${desat}${extra ? ' ' + extra : ''}`
}

function calcTimeMsg(hunger: number, updatedAt: string): string | null {
  const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 60000
  const eff     = Math.max(0, hunger - elapsed * DECAY_PER_MIN)
  const next    = THRESHOLDS.find(t => eff > t.value)
  if (!next) return null
  const min = (eff - next.value) / DECAY_PER_MIN
  if (min < 1)  return `まもなく${next.label}！`
  if (min < 60) return `約${Math.floor(min)}分後に${next.label}`
  return `約${Math.floor(min / 60)}時間後に${next.label}`
}

// ────────────── 帽子 ──────────────
function Hat({ type }: { type: string }) {
  if (type === 'crown')  return <div style={{ fontSize: 20, textAlign: 'center', marginBottom: -6, lineHeight: 1 }}>👑</div>
  if (type === 'santa')  return <div style={{ fontSize: 20, textAlign: 'center', marginBottom: -6, lineHeight: 1 }}>🎅</div>
  if (type === 'helmet') return <div style={{ fontSize: 20, textAlign: 'center', marginBottom: -6, lineHeight: 1 }}>⛑️</div>
  return null
}

// ────────────── 部屋デコレーション ──────────────
function RoomDecorations({ themeId }: { themeId: string }) {
  const windowPaneStyle: React.CSSProperties = {
    flex: 1, background: themeId === 'ocean' ? 'rgba(80,180,255,0.18)'
           : themeId === 'night'  ? 'rgba(160,100,255,0.18)'
           : themeId === 'forest' ? 'rgba(60,160,60,0.18)'
           : themeId === 'sakura' ? 'rgba(255,160,200,0.18)'
           : 'rgba(255,200,100,0.18)',
  }
  return (
    <>
      {/* 窓 */}
      <div style={{
        position: 'absolute', top: '12%', right: '8%',
        width: 72, height: 60,
        border: '3px solid rgba(255,255,255,0.18)',
        background: 'rgba(0,0,0,0.25)',
        display: 'grid', gridTemplate: '1fr 1fr / 1fr 1fr',
        gap: 3, padding: 3,
        imageRendering: 'pixelated',
      }}>
        {[0,1,2,3].map(i => <div key={i} style={{ ...windowPaneStyle, border: '1px solid rgba(255,255,255,0.1)' }} />)}
        {/* 窓枠の十字 */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3, background: 'rgba(255,255,255,0.18)', transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.18)', transform: 'translateY(-50%)' }} />
      </div>

      {/* 棚 */}
      <div style={{
        position: 'absolute', top: '22%', left: '6%',
        width: 80, height: 8,
        background: 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.1)',
        borderBottom: '3px solid rgba(0,0,0,0.3)',
      }}>
        {/* 棚の上の小物 */}
        <div style={{ position: 'absolute', bottom: 8, left: 4, fontSize: 14, lineHeight: 1 }}>📚</div>
        <div style={{ position: 'absolute', bottom: 8, left: 36, fontSize: 12, lineHeight: 1 }}>🕯️</div>
      </div>

      {/* 壁と床の境界（巾木）*/}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: `calc(${WALL_RATIO * 100}% - 4px)`,
        height: 8,
        background: 'rgba(255,255,255,0.06)',
        borderTop: '2px solid rgba(255,255,255,0.1)',
        borderBottom: '2px solid rgba(0,0,0,0.3)',
      }} />

      {/* 床の木目ライン */}
      {[15, 30, 45, 60, 75].map(pct => (
        <div key={pct} style={{
          position: 'absolute',
          left: `${pct}%`,
          top: `${WALL_RATIO * 100}%`,
          bottom: 0,
          width: 1,
          background: 'rgba(255,255,255,0.04)',
        }} />
      ))}

      {/* 床のラグ（ドット模様） */}
      <div style={{
        position: 'absolute',
        bottom: '10%', left: '22%', right: '22%',
        height: '9%',
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 10px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 2,
      }} />
    </>
  )
}

// ────────────── メインコンポーネント ──────────────
export function SlimeRoom({ slime, bodyColor = '#4ade80', hatType = 'none', themeId = 'warm', onNameUpdate, onFeed, onGameOpen }: Props) {
  const roomRef        = useRef<HTMLDivElement>(null)
  const [editing, setEditing]     = useState(false)
  const [nameInput, setNameInput] = useState(slime.name)
  const [showFeed, setShowFeed]   = useState(false)

  // スライムの位置 — x のみ変動、y は床ラインに固定
  const floorY = WALL_RATIO * 100 + 5    // 65+5 = 70%（GIFの透明余白を考慮）
  const [pos, setPos]         = useState({ x: 45, y: floorY })
  const posRef                = useRef({ x: 45, y: floorY })
  const [target, setTarget]   = useState({ x: 65, y: floorY })
  const [facingLeft, setFacingLeft] = useState(false)
  const [isIdle, setIsIdle]   = useState(false)
  const idleTimer             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleScheduled         = useRef(false)

  const cfg        = STATUS_CFG[slime.status] ?? STATUS_CFG.normal
  const imgFilter  = buildFilter(bodyColor, slime.status)
  const timeMsg    = calcTimeMsg(slime.hunger, slime.updatedAt)
  const isCritical = slime.status === 'hungry' || slime.status === 'dying'
  const speed      = SPEED[slime.status] ?? 0.3

  const segs   = 12
  const filled = Math.round((slime.hunger / 100) * segs)
  const barColor = slime.hunger >= 60 ? 'var(--green)' : slime.hunger >= 30 ? 'var(--accent)' : 'var(--red)'

  // 新しい目標地点を選ぶ（床ライン上、x のみランダム）
  const pickTarget = useCallback(() => {
    setTarget({ x: 8 + Math.random() * 78, y: floorY })
  }, [floorY])

  // 徘徊ループ — posRef で副作用を setPos の外に出す
  useEffect(() => {
    idleScheduled.current = false
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }

    const TICK = 50
    const interval = setInterval(() => {
      const cur  = posRef.current
      const dx   = target.x - cur.x
      const dist = Math.abs(dx)

      if (dist < 1.5) {
        if (!idleScheduled.current) {
          idleScheduled.current = true
          setIsIdle(true)
          idleTimer.current = setTimeout(() => {
            idleScheduled.current = false
            setIsIdle(false)
            pickTarget()
          }, 1200 + Math.random() * 2000)
        }
        return
      }

      setFacingLeft(dx < 0)
      const newX = cur.x + (dx / dist) * speed
      posRef.current = { x: newX, y: floorY }
      setPos({ x: newX, y: floorY })
    }, TICK)

    return () => {
      clearInterval(interval)
      if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }
      idleScheduled.current = false
    }
  }, [target, speed, pickTarget, floorY])

  // 表示するGIF（停止中はidle固定）
  const activeGif = isIdle
    ? '/slime/idle.gif'
    : (slime.status === 'dying' || slime.status === 'hungry') ? '/slime/idle.gif'
    : slime.status === 'happy' ? '/slime/move.gif'
    : slime.status === 'slightly_happy' && !isIdle ? '/slime/jump.gif'
    : '/slime/idle.gif'

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
    <div
      ref={roomRef}
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 155px)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 部屋デコレーション */}
      <RoomDecorations themeId={themeId} />

      {/* ────── HUD: 上部 ────── */}
      <div style={{
        position: 'absolute', top: 14, left: 14, right: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        zIndex: 10, pointerEvents: 'none',
      }}>
        {/* 左: 名前 + 空腹 */}
        <div style={{
          background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.1)',
          padding: '10px 14px', backdropFilter: 'blur(2px)',
          pointerEvents: 'auto',
        }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
                maxLength={12}
                autoFocus
                style={{
                  fontFamily: 'var(--pixel-font)', fontSize: 9,
                  color: 'var(--text)', background: 'rgba(0,0,0,0.6)',
                  border: '1px solid var(--border-lit)', padding: '4px 8px',
                  outline: 'none', width: 120,
                }}
              />
              <button onClick={saveName}    className="pixel-btn" style={{ padding: '4px 8px', fontSize: 8, background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' }}>✓</button>
              <button onClick={() => setEditing(false)} className="pixel-btn" style={{ padding: '4px 8px', fontSize: 8 }}>✕</button>
            </div>
          ) : (
            <div
              onClick={() => { setNameInput(slime.name); setEditing(true) }}
              style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer', marginBottom: 8 }}
            >
              {slime.name} ✏️
            </div>
          )}

          {/* 空腹バー */}
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: 'var(--text-muted)', marginBottom: 5 }}>おなか</div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
            {Array.from({ length: segs }).map((_, i) => (
              <div key={i} style={{
                width: 10, height: 7,
                background: i < filled ? barColor : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.06)',
              }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: 'var(--text-muted)' }}>{slime.hunger}/100</div>

          {/* 時間警告 */}
          {timeMsg && (
            <div style={{ marginTop: 6, fontFamily: 'var(--pixel-font)', fontSize: 8, color: isCritical ? 'var(--red)' : 'var(--text-muted)', maxWidth: 200 }}>
              ⏱ {timeMsg}
            </div>
          )}
        </div>

        {/* 右: コイン */}
        <div style={{
          background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.1)',
          padding: '10px 14px', backdropFilter: 'blur(2px)',
        }}>
          <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)' }}>COIN</span>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 14, color: 'var(--accent)', marginTop: 4 }}>{slime.coins}</div>
        </div>
      </div>

      {/* ────── スライム（徘徊） ────── */}
      <div style={{
        position: 'absolute',
        left:   `${pos.x}%`,
        top:    `${pos.y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: 5,
        transition: 'left 0.06s linear, top 0.06s linear',
      }}>
        {/* ステータスバブル */}
        <div style={{
          fontFamily: 'var(--pixel-font)', fontSize: 8, color: cfg.color,
          textAlign: 'center', marginBottom: 2,
          textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </div>

        <Hat type={hatType} />
        <img
          src={activeGif}
          alt="slime"
          style={{
            width: 120,
            height: 120,
            objectFit: 'contain',
            imageRendering: 'pixelated',
            filter: imgFilter,
            opacity: cfg.opacity,
            transform: facingLeft && !isIdle ? 'scaleX(-1)' : 'scaleX(1)',
            transition: 'opacity 0.4s',
            display: 'block',
          }}
        />

        {/* 影 */}
        <div style={{
          width: 60, height: 8, marginTop: -4,
          background: 'rgba(0,0,0,0.25)',
          borderRadius: '50%',
          filter: 'blur(3px)',
          marginLeft: 'auto', marginRight: 'auto',
        }} />
      </div>

      {/* ────── HUD: 下部（ごはん + ボタン） ────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 10,
        background: 'rgba(0,0,0,0.6)',
        borderTop: '2px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(4px)',
        padding: '10px 16px',
      }}>
        {/* ごはんパネル（展開時） */}
        {showFeed && (
          <div style={{
            display: 'flex', gap: 10, marginBottom: 10, justifyContent: 'center',
          }}>
            {FOODS.map(food => {
              const ok = slime.coins >= food.cost
              return (
                <button
                  key={food.name}
                  onClick={() => { onFeed(food.cost); setShowFeed(false) }}
                  disabled={!ok}
                  className="pixel-btn"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '8px 14px',
                    background: ok ? 'rgba(30,14,4,0.9)' : 'rgba(18,8,3,0.9)',
                    color: ok ? 'var(--text)' : 'var(--text-muted)',
                    borderColor: ok ? 'var(--border-lit)' : 'var(--border)',
                    minWidth: 72,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{food.emoji}</span>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9 }}>{food.name}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: 'var(--text-muted)' }}>満腹{food.desc}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: ok ? 'var(--accent)' : 'var(--text-muted)' }}>🪙{food.cost}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* ボタン行 */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => setShowFeed(v => !v)}
            className="pixel-btn"
            style={{
              padding: '8px 20px', fontSize: 10,
              background: showFeed ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.4)',
              borderColor: showFeed ? 'var(--accent)' : 'var(--border-lit)',
              color: showFeed ? 'var(--accent)' : 'var(--text)',
            }}
          >
            🍽 ごはんをあげる
          </button>
          {onGameOpen && (
            <button
              onClick={onGameOpen}
              className="pixel-btn"
              style={{
                padding: '8px 20px', fontSize: 10,
                background: 'rgba(124,58,237,0.15)',
                borderColor: '#7c3aed',
                color: '#c084fc',
              }}
            >
              🎮 遊ぶ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
