interface Props {
  coins: number
  onFeed: (cost: number) => void
}

const FOODS = [
  { name: 'MUSHROOM', emoji: '🍄', cost: 5,  desc: 'HUNGER +10' },
  { name: 'ONIGIRI',  emoji: '🍙', cost: 15, desc: 'HUNGER +30' },
  { name: 'STEAK',    emoji: '🥩', cost: 30, desc: 'HUNGER +60' },
]

export function FeedPanel({ coins, onFeed }: Props) {
  return (
    <div className="pixel-box p-5">
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: '#a0aec0', marginBottom: 16, letterSpacing: 2 }}>
        ▸ FEED SLIME
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FOODS.map(food => {
          const canAfford = coins >= food.cost
          return (
            <button
              key={food.name}
              onClick={() => onFeed(food.cost)}
              disabled={!canAfford}
              className="pixel-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: canAfford ? '#1a1a35' : '#12121f',
                color: canAfford ? '#e0e0e0' : '#4b5563',
                borderColor: canAfford ? '#4a4a8a' : '#2d2d4e',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{food.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, marginBottom: 4 }}>{food.name}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 7, color: '#6b7280' }}>{food.desc}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: '#fbbf24' }}>
                🪙{food.cost}
              </div>
            </button>
          )
        })}
      </div>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, color: '#4b5563', marginTop: 12, textAlign: 'right' }}>
        COINS: {coins}
      </div>
    </div>
  )
}
