import { useState, useEffect } from 'react'

interface Outfit {
  id: number
  name: string
  description: string
  cost: number
  bodyColor: string
  hatType: string
  owned: boolean
  equipped: boolean
}

interface Props {
  coins: number
  onUpdate: () => void
}

export function Customization({ coins, onUpdate }: Props) {
  const [outfits, setOutfits] = useState<Outfit[]>([])

  const load = () => fetch('/api/outfits').then(r => r.json()).then(setOutfits)
  useEffect(() => { load() }, [])

  async function buy(id: number) {
    const res = await fetch(`/api/outfits/${id}/buy`, { method: 'POST' })
    setOutfits(await res.json())
    onUpdate()
  }

  async function equip(id: number) {
    const res = await fetch(`/api/outfits/${id}/equip`, { method: 'POST' })
    setOutfits(await res.json())
    onUpdate()
  }

  return (
    <div className="pixel-box" style={{ padding: '18px 20px' }}>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
        👗 着せ替え
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {outfits.map(o => {
          const canBuy   = !o.owned && coins >= o.cost
          const cantAfford = !o.owned && coins < o.cost
          return (
            <div key={o.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: o.equipped ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.2)',
              border: `2px solid ${o.equipped ? 'var(--accent)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* カラープレビュー */}
                <div style={{
                  width: 24, height: 24,
                  background: o.bodyColor || '#4ade80',
                  borderRadius: '50% 50% 45% 55% / 55% 55% 45% 45%',
                  border: '2px solid rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: o.equipped ? 'var(--accent)' : 'var(--text)' }}>
                    {o.name} {o.equipped && '✓'}
                  </div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
                    {o.description}
                  </div>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {o.owned ? (
                  o.equipped ? (
                    <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: 'var(--accent)' }}>装備中</div>
                  ) : (
                    <button onClick={() => equip(o.id)} className="pixel-btn" style={{ padding: '6px 12px', fontSize: 9, background: '#1a0f06', color: 'var(--text-dim)', borderColor: 'var(--border-lit)' }}>
                      装備
                    </button>
                  )
                ) : (
                  <button onClick={() => buy(o.id)} disabled={cantAfford} className="pixel-btn" style={{ padding: '6px 12px', fontSize: 9, background: canBuy ? 'var(--accent)' : '#1a0f06', color: canBuy ? '#000' : 'var(--text-muted)', borderColor: canBuy ? 'var(--accent)' : 'var(--border)' }}>
                    🪙{o.cost}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
