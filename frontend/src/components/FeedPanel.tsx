interface Props {
  coins: number
  onFeed: (cost: number) => void
}

const FOODS = [
  { name: 'きのこ',   emoji: '🍄', cost: 5,  desc: '満腹度 +10' },
  { name: 'おにぎり', emoji: '🍙', cost: 15, desc: '満腹度 +30' },
  { name: 'ステーキ', emoji: '🥩', cost: 30, desc: '満腹度 +60' },
]

export function FeedPanel({ coins, onFeed }: Props) {
  return (
    <div className="pixel-box" style={{ padding: 20 }}>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, letterSpacing: 1 }}>
        🍽 ごはんをあげる
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FOODS.map(food => {
          const ok = coins >= food.cost
          return (
            <button
              key={food.name}
              onClick={() => onFeed(food.cost)}
              disabled={!ok}
              className="pixel-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: ok ? '#1e0e04' : '#120803',
                color: ok ? 'var(--text)' : 'var(--text-muted)',
                borderColor: ok ? 'var(--border-lit)' : 'var(--border)',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 22 }}>{food.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, marginBottom: 5 }}>{food.name}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)' }}>{food.desc}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--accent)' }}>
                🪙{food.cost}
              </div>
            </button>
          )
        })}
      </div>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', marginTop: 12, textAlign: 'right' }}>
        所持コイン: {coins}
      </div>
    </div>
  )
}
