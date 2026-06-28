
const THEMES = [
  { id: 'warm',   label: '暖かい部屋',  wall: '#2c1a0e', floor: '#160b03', dot: 'rgba(255,180,80,0.10)' },
  { id: 'forest', label: '夜の森',      wall: '#0d1f0d', floor: '#050e05', dot: 'rgba(80,200,80,0.08)'  },
  { id: 'ocean',  label: '海辺',        wall: '#0d1a2c', floor: '#050a16', dot: 'rgba(80,160,255,0.10)' },
  { id: 'sakura', label: '桜の部屋',    wall: '#2c1020', floor: '#160608', dot: 'rgba(255,120,160,0.10)'},
  { id: 'night',  label: '宇宙',        wall: '#0a0a1f', floor: '#040410', dot: 'rgba(160,80,255,0.10)' },
]

interface Props {
  currentTheme: string
  onThemeChange: (theme: string) => void
}

export function RoomSettings({ currentTheme, onThemeChange }: Props) {
  async function setTheme(id: string) {
    await fetch('/api/room', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: id }),
    })
    onThemeChange(id)
  }

  return (
    <div className="pixel-box" style={{ padding: '18px 20px' }}>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
        🎨 部屋のテーマ
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="pixel-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 14px',
              background: currentTheme === t.id ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.2)',
              borderColor: currentTheme === t.id ? 'var(--accent)' : 'var(--border)',
              textAlign: 'left',
            }}
          >
            {/* プレビュー */}
            <div style={{
              width: 40, height: 28, flexShrink: 0,
              background: t.wall,
              border: '2px solid rgba(255,255,255,0.1)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
                background: t.floor,
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `radial-gradient(circle, ${t.dot} 1px, transparent 1px)`,
                backgroundSize: '6px 6px',
              }} />
            </div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: currentTheme === t.id ? 'var(--accent)' : 'var(--text)' }}>
              {t.label} {currentTheme === t.id && '✓'}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export { THEMES }
