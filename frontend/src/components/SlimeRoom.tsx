import { useState, useEffect, useRef, useCallback } from 'react'
import { Customization } from './Customization'
import { Shop } from './Shop'
import { RoomSettings } from './RoomSettings'
import { apiFetch } from '../lib/api'

type SlimeStatus = 'happy' | 'slightly_happy' | 'normal' | 'hungry' | 'dying'
type ActivePanel = 'feed' | 'outfit' | 'furniture' | 'room' | null

interface PlacedFurniture {
  id: number
  name: string
  emoji: string
  x: number   // 左端 % (room width 基準)
  y: number   // 上端 % (room height 基準)
  w: number   // 幅 %
  h: number   // 高さ %
  floorOnly: boolean
}

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
const FLOOR_MAX_Y = 88  // 床エリアの下限（%）。ボトムバー分を除く

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
function RoomDecorations({ themeId: _themeId }: { themeId: string }) {
  return (
    <>



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

// ────────────── 配置済み家具（ドラッグ＆リサイズ） ──────────────
function PlacedItem({
  item, roomRef, selected, onSelect, onChange, onSave,
}: {
  item: PlacedFurniture
  roomRef: React.RefObject<HTMLDivElement | null>
  selected: boolean
  onSelect: () => void
  onChange: (u: Partial<PlacedFurniture>) => void
  onSave: (pos: { x: number; y: number; w: number; h: number }) => void
}) {
  const bodyDrag = useRef<{ smx: number; smy: number; sx: number; sy: number } | null>(null)
  const resDrag  = useRef<{ smx: number; smy: number; sx: number; sy: number; sw: number; sh: number; dir: string } | null>(null)
  const latest   = useRef({ x: item.x, y: item.y, w: item.w, h: item.h })
  latest.current = { x: item.x, y: item.y, w: item.w, h: item.h }

  function pct(e: React.PointerEvent) {
    const r = roomRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

  function applyFloor(ny: number, nh: number) {
    if (!item.floorOnly) return ny
    return Math.max(WALL_RATIO * 100 - nh, ny)
  }

  // ─── body drag ───
  function onBodyDown(e: React.PointerEvent) {
    e.stopPropagation()
    onSelect()
    const { x: mx, y: my } = pct(e)
    bodyDrag.current = { smx: mx, smy: my, sx: item.x, sy: item.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onBodyMove(e: React.PointerEvent) {
    if (!bodyDrag.current) return
    const { x: mx, y: my } = pct(e)
    let nx = clamp(bodyDrag.current.sx + (mx - bodyDrag.current.smx), 0, 100 - item.w)
    let ny = clamp(bodyDrag.current.sy + (my - bodyDrag.current.smy), 0, 100 - item.h)
    ny = applyFloor(ny, item.h)
    onChange({ x: nx, y: ny })
  }
  function onBodyUp() {
    if (!bodyDrag.current) return
    bodyDrag.current = null
    onSave(latest.current)
  }

  // ─── resize ───
  function onHandleDown(e: React.PointerEvent, dir: string) {
    e.stopPropagation()
    e.preventDefault()
    const { x: mx, y: my } = pct(e)
    resDrag.current = { smx: mx, smy: my, sx: item.x, sy: item.y, sw: item.w, sh: item.h, dir }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onHandleMove(e: React.PointerEvent) {
    if (!resDrag.current) return
    const { x: mx, y: my } = pct(e)
    const dx = mx - resDrag.current.smx
    const dy = my - resDrag.current.smy
    const { sx, sy, sw, sh, dir } = resDrag.current
    const MIN = 4
    let nx = sx, ny = sy, nw = sw, nh = sh

    if (dir.includes('e')) nw = Math.max(MIN, sw + dx)
    if (dir.includes('s')) nh = Math.max(MIN, sh + dy)
    if (dir.includes('w')) { nw = Math.max(MIN, sw - dx); nx = sx + sw - nw }
    if (dir.includes('n')) { nh = Math.max(MIN, sh - dy); ny = sy + sh - nh }

    nx = Math.max(0, nx); ny = Math.max(0, ny)
    nw = Math.min(nw, 100 - nx); nh = Math.min(nh, 100 - ny)
    ny = applyFloor(ny, nh)
    onChange({ x: nx, y: ny, w: nw, h: nh })
  }
  function onHandleUp() {
    if (!resDrag.current) return
    resDrag.current = null
    onSave(latest.current)
  }

  const handle: React.CSSProperties = {
    position: 'absolute', width: 10, height: 10,
    background: 'var(--accent)', border: '2px solid rgba(0,0,0,0.7)',
    zIndex: 31, touchAction: 'none',
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${item.x}%`, top: `${item.y}%`,
        width: `${item.w}%`, height: `${item.h}%`,
        zIndex: selected ? 12 : 8,
        cursor: 'grab',
        outline: selected ? '2px dashed rgba(251,191,36,0.8)' : '1px dashed rgba(255,255,255,0.07)',
        outlineOffset: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'none', userSelect: 'none',
      }}
      onPointerDown={onBodyDown}
      onPointerMove={onBodyMove}
      onPointerUp={onBodyUp}
      onPointerCancel={onBodyUp}
      onClick={e => e.stopPropagation()}
    >
      <span style={{ fontSize: `min(${Math.min(item.w, item.h * 2) * 1.1}vw, ${Math.min(item.h * 1.5, item.w * 0.6) * 1.0}vh)`, lineHeight: 1, pointerEvents: 'none' }}>
        {item.emoji}
      </span>

      {selected && (['nw','ne','sw','se'] as const).map(dir => (
        <div
          key={dir}
          style={{
            ...handle,
            ...(dir.includes('n') ? { top: 4 } : { bottom: 4 }),
            ...(dir.includes('w') ? { left: 4 } : { right: 4 }),
            cursor: `${dir}-resize`,
          }}
          onPointerDown={e => onHandleDown(e, dir)}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          onClick={e => e.stopPropagation()}
        />
      ))}
    </div>
  )
}

// ────────────── パネルモーダル ──────────────
function PanelModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [height, setHeight] = useState(320)
  const dragging = useRef(false)
  const startY   = useRef(0)
  const startH   = useRef(0)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function onDragDown(e: React.PointerEvent) {
    dragging.current = true
    startY.current   = e.clientY
    startH.current   = height
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onDragMove(e: React.PointerEvent) {
    if (!dragging.current) return
    const newH = Math.max(120, Math.min(560, startH.current + (startY.current - e.clientY)))
    setHeight(newH)
  }
  function onDragUp() { dragging.current = false }

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />
      {/* パネル本体 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height, zIndex: 21,
        background: 'rgba(10,5,1,0.96)',
        borderTop: '2px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* ドラッグハンドル */}
        <div
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
          style={{
            width: '100%', height: 22, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'ns-resize', touchAction: 'none',
          }}
        >
          <div style={{ width: 44, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
        </div>
        {/* ヘッダー */}
        <div style={{
          padding: '0 16px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)' }}>{title}</div>
          <button onClick={onClose} className="pixel-btn" style={{ padding: '4px 12px', fontSize: 10 }}>✕ とじる</button>
        </div>
        {/* コンテンツ */}
        <div style={{ flex: 1, overflowY: 'scroll', padding: '0 12px 24px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </>
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

  // ── 配置家具 ──
  const [placedItems, setPlacedItems]   = useState<PlacedFurniture[]>([])
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<number | null>(null)

  const fetchFurniture = useCallback(() => {
    apiFetch('/api/furniture')
      .then(r => r.json())
      .then((items: Array<{ id: number; name: string; emoji: string; owned: boolean; equipped: boolean; x: number; y: number; w: number; h: number; floorOnly: boolean }>) => {
        setPlacedItems(items.filter(f => f.owned && f.equipped).map(f => ({
          id: f.id, name: f.name, emoji: f.emoji,
          x: f.x, y: f.y, w: f.w, h: f.h, floorOnly: f.floorOnly,
        })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchFurniture() }, [fetchFurniture])

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
    setTarget({
      x: 8 + Math.random() * 78,
      y: floorY + Math.random() * (FLOOR_MAX_Y - floorY),
    })
  }, [floorY])

  useEffect(() => {
    idleScheduled.current = false
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }

    const TICK = 50
    const interval = setInterval(() => {
      if (isDraggingRef.current) return
      const cur  = posRef.current
      const dx   = target.x - cur.x
      const dy   = target.y - cur.y
      const dist = Math.sqrt(dx * dx + dy * dy)

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

      setFacingLeft(dx > 0)
      const newX = cur.x + (dx / dist) * speed
      const newY = cur.y + (dy / dist) * speed
      posRef.current = { x: newX, y: newY }
      setPos({ x: newX, y: newY })
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

  function updatePlacedItem(id: number, updates: Partial<PlacedFurniture>) {
    setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  function saveLayout(id: number, pos: { x: number; y: number; w: number; h: number }) {
    apiFetch(`/api/furniture/${id}/layout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pos),
    }).catch(() => {})
  }

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
    const clampedY = Math.max(floorY, Math.min(FLOOR_MAX_Y, posRef.current.y))
    posRef.current = { ...posRef.current, y: clampedY }
    setPos(p => ({ ...p, y: clampedY }))
    pickTarget()
  }

  async function saveName() {
    if (!nameInput.trim()) return
    await apiFetch('/api/slime/name', {
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
      onClick={() => setSelectedFurnitureId(null)}
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 155px)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <RoomDecorations themeId={themeId} />

      {/* ────── 配置済み家具 ────── */}
      {placedItems.map(item => (
        <PlacedItem
          key={item.id}
          item={item}
          roomRef={roomRef}
          selected={selectedFurnitureId === item.id}
          onSelect={() => setSelectedFurnitureId(item.id)}
          onChange={u => updatePlacedItem(item.id, u)}
          onSave={pos => saveLayout(item.id, pos)}
        />
      ))}

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
              style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, color: 'var(--text-dim)', cursor: 'pointer', marginBottom: 10 }}
            >
              {slime.name} ✏️
            </div>
          )}

          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>おなか</div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 5 }}>
            {Array.from({ length: segs }).map((_, i) => (
              <div key={i} style={{
                width: 13, height: 10,
                background: i < filled ? barColor : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.06)',
              }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-muted)' }}>{slime.hunger}/100</div>

          {timeMsg && (
            <div style={{ marginTop: 8, fontFamily: 'var(--pixel-font)', fontSize: 11, color: isCritical ? 'var(--red)' : 'var(--text-muted)', maxWidth: 240 }}>
              ⏱ {timeMsg}
            </div>
          )}
        </div>

        {/* 右: コイン */}
        <div style={{
          background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.1)',
          padding: '12px 16px', backdropFilter: 'blur(2px)',
        }}>
          <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-muted)' }}>COIN</span>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 18, color: 'var(--accent)', marginTop: 6 }}>{slime.coins}</div>
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
          zIndex: isDragging ? 20 : 10,
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
                  onClick={() => { onFeed(food.cost) }}
                  disabled={!ok}
                  className="pixel-btn"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '12px 20px',
                    background: ok ? 'rgba(30,14,4,0.9)' : 'rgba(18,8,3,0.9)',
                    color: ok ? 'var(--text)' : 'var(--text-muted)',
                    borderColor: ok ? 'var(--border-lit)' : 'var(--border)',
                    opacity: ok ? 1 : 0.35,
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
          <Customization coins={slime.coins} onUpdate={() => { onUpdate?.() }} />
        </PanelModal>
      )}

      {activePanel === 'furniture' && (
        <PanelModal title="🪑 かぐショップ" onClose={() => { fetchFurniture(); setActivePanel(null) }}>
          <Shop coins={slime.coins} onUpdate={() => { onUpdate?.(); fetchFurniture() }} />
        </PanelModal>
      )}

      {activePanel === 'room' && onThemeChange && (
        <PanelModal title="🏠 へやのテーマ" onClose={() => setActivePanel(null)}>
          <RoomSettings currentTheme={themeId} onThemeChange={t => { onThemeChange(t); }} />
        </PanelModal>
      )}

      {/* ────── 家具選択中ヒント ────── */}
      {selectedFurnitureId !== null && (
        <div style={{
          position: 'absolute', bottom: 58, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.12)',
          padding: '4px 14px', zIndex: 15, whiteSpace: 'nowrap',
          fontFamily: 'var(--pixel-font)', fontSize: 8, color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}>
          📦 空きスペースをクリックで選択解除
        </div>
      )}

      {/* ────── HUD: 下部 ────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 25,
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
