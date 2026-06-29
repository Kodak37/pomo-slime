import { useState, useEffect, useRef, useCallback } from 'react'
import { Customization } from './Customization'
import { Shop } from './Shop'
import { RoomSettings } from './RoomSettings'

type SlimeStatus = 'happy' | 'slightly_happy' | 'normal' | 'hungry' | 'dying'
type ActivePanel = 'feed' | 'outfit' | 'furniture' | 'room' | null

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
  onThemeChange?: (theme: string) => void
  onUpdate?: () => void
}

// ────────────── 定数 ──────────────
const WALL_RATIO  = 0.65
const FLOOR_RATIO = 0.35

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

// ────────────── パネルモーダル ──────────────
function PanelModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(3px)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        margin: '16px 12px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)' }}>{title}</div>
        <button
          onClick={onClose}
          className="pixel-btn"
          style={{ padding: '4px 12px', fontSize: 10 }}
        >✕ とじる</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px' }}>
        {children}
      </div>
    </div>
  )
}

// ────────────── メインコンポーネント ──────────────
export function SlimeRoom({
  slime, bodyColor = '#4ade80', hatType = 'none', themeId = 'warm',
  onNameUpdate, onFeed, onGameOpen, onThemeChange, onUpdate,
}: Props) {
  const roomRef        = useRef<HTMLDivElement>(null)
  const [editing, setEditing]       = useState(false)
  const [nameInput, setNameInput]   = useState(slime.name)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef               = useRef(false)

  const floorY = WALL_RATIO * 100 + 5
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

  const pickTarget = useCallback(() => {
    setTarget({ x: 8 + Math.random() * 78, y: floorY })
  }, [floorY])

  useEffect(() => {
    idleScheduled.current = false
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }

    const TICK = 50
    const interval = setInterval(() => {
      if (isDraggingRef.current) return
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

  const activeGif = isIdle
    ? '/slime/idle.gif'
    : (slime.status === 'dying' || slime.status === 'hungry') ? '/slime/idle.gif'
    : slime.status === 'happy' ? '/slime/move.gif'
    : slime.status === 'slightly_happy' && !isIdle ? '/slime/jump.gif'
    : '/slime/idle.gif'

  function handleSlimePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    isDraggingRef.current = true
    setIsDragging(true)
    setIsIdle(false)
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }
    idleScheduled.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handleSlimePointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current || !roomRef.current) return
    const rect = roomRef.current.getBoundingClientRect()
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(5, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100))
    posRef.current = { x, y }
    setPos({ x, y })
  }

  function handleSlimePointerUp() {
    isDraggingRef.current = false
    setIsDragging(false)
    posRef.current = { ...posRef.current, y: floorY }
    setPos(p => ({ ...p, y: floorY }))
    pickTarget()
  }

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

  function togglePanel(panel: ActivePanel) {
    setActivePanel(v => v === panel ? null : panel)
  }

  const btnBase: React.CSSProperties = {
    padding: '6px 12px', fontSize: 9,
    background: 'rgba(0,0,0,0.4)',
    borderColor: 'var(--border-lit)',
    color: 'var(--text)',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(245,158,11,0.15)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
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

      {/* ────── スライム（徘徊・ドラッグ） ────── */}
      <div
        onPointerDown={handleSlimePointerDown}
        onPointerMove={handleSlimePointerMove}
        onPointerUp={handleSlimePointerUp}
        onPointerCancel={handleSlimePointerUp}
        style={{
          position: 'absolute',
          left:   `${pos.x}%`,
          top:    `${pos.y}%`,
          transform: `translate(-50%, -100%) scale(${isDragging ? 1.15 : 1})`,
          zIndex: isDragging ? 15 : 5,
          transition: isDragging
            ? 'transform 0.1s'
            : 'left 0.06s linear, top 0.06s linear, transform 0.2s',
          cursor: isDragging ? 'grabbing' : 'grab',
          filter: isDragging ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))' : undefined,
          touchAction: 'none',
        }}
      >
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

        <div style={{
          width: 60, height: 8, marginTop: -4,
          background: 'rgba(0,0,0,0.25)',
          borderRadius: '50%',
          filter: 'blur(3px)',
          marginLeft: 'auto', marginRight: 'auto',
        }} />
      </div>

      {/* ────── オーバーレイパネル ────── */}
      {activePanel === 'feed' && (
        <PanelModal title="🍽 ごはんをあげる" onClose={() => setActivePanel(null)}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 8 }}>
            {FOODS.map(food => {
              const ok = slime.coins >= food.cost
              return (
                <button
                  key={food.name}
                  onClick={() => { onFeed(food.cost); setActivePanel(null) }}
                  disabled={!ok}
                  className="pixel-btn"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '12px 20px',
                    background: ok ? 'rgba(30,14,4,0.9)' : 'rgba(18,8,3,0.9)',
                    color: ok ? 'var(--text)' : 'var(--text-muted)',
                    borderColor: ok ? 'var(--border-lit)' : 'var(--border)',
                    minWidth: 90,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{food.emoji}</span>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9 }}>{food.name}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: 'var(--text-muted)' }}>満腹{food.desc}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: ok ? 'var(--accent)' : 'var(--text-muted)' }}>🪙{food.cost}</div>
                </button>
              )
            })}
          </div>
        </PanelModal>
      )}

      {activePanel === 'outfit' && (
        <PanelModal title="👗 きせかえ" onClose={() => setActivePanel(null)}>
          <Customization coins={slime.coins} onUpdate={() => { onUpdate?.(); setActivePanel(null) }} />
        </PanelModal>
      )}

      {activePanel === 'furniture' && (
        <PanelModal title="🪑 かぐショップ" onClose={() => setActivePanel(null)}>
          <Shop coins={slime.coins} onUpdate={onUpdate ?? (() => {})} />
        </PanelModal>
      )}

      {activePanel === 'room' && onThemeChange && (
        <PanelModal title="🏠 へやのテーマ" onClose={() => setActivePanel(null)}>
          <RoomSettings currentTheme={themeId} onThemeChange={t => { onThemeChange(t); }} />
        </PanelModal>
      )}

      {/* ────── HUD: 下部 ────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 10,
        background: 'rgba(0,0,0,0.6)',
        borderTop: '2px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(4px)',
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => togglePanel('feed')}
            className="pixel-btn"
            style={activePanel === 'feed' ? btnActive : { ...btnBase, padding: '6px 14px', fontSize: 10 }}
          >
            🍽 ごはん
          </button>
          <button
            onClick={() => togglePanel('outfit')}
            className="pixel-btn"
            style={activePanel === 'outfit' ? btnActive : btnBase}
          >
            👗 きせかえ
          </button>
          <button
            onClick={() => togglePanel('furniture')}
            className="pixel-btn"
            style={activePanel === 'furniture' ? btnActive : btnBase}
          >
            🪑 かぐ
          </button>
          {onThemeChange && (
            <button
              onClick={() => togglePanel('room')}
              className="pixel-btn"
              style={activePanel === 'room' ? btnActive : btnBase}
            >
              🏠 へや
            </button>
          )}
          {onGameOpen && (
            <button
              onClick={onGameOpen}
              className="pixel-btn"
              style={{
                ...btnBase,
                background: 'rgba(124,58,237,0.15)',
                borderColor: '#7c3aed',
                color: '#c084fc',
              }}
            >
              🎮 あそぶ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
