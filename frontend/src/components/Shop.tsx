import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface Furniture {
  id: number
  name: string
  emoji: string
  cost: number
  happinessBonus: number
  owned: boolean
  equipped: boolean
}

interface Props {
  coins: number
  onUpdate: () => void
}

export function Shop({ coins, onUpdate }: Props) {
  const [items, setItems] = useState<Furniture[]>([])

  const load = () => apiFetch('/api/furniture').then(r => r.json()).then(setItems)
  useEffect(() => { load() }, [])

  async function buy(id: number) {
    const res = await apiFetch(`/api/furniture/${id}/buy`, { method: 'POST' })
    setItems(await res.json())
    onUpdate()
  }

  async function toggle(id: number) {
    const res = await apiFetch(`/api/furniture/${id}/toggle`, { method: 'POST' })
    setItems(await res.json())
    onUpdate()
  }

  const totalBonus = items.filter(i => i.equipped).reduce((s, i) => s + i.happinessBonus, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ボーナス表示 */}
      {totalBonus > 0 && (
        <div className="pixel-box" style={{ padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--green)' }}>
            ✦ 家具ボーナス: コイン +{Math.round(totalBonus * 5)}% UP
          </div>
        </div>
      )}

      <div className="pixel-box" style={{ padding: '18px 20px' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          🛒 家具ショップ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const canBuy     = !item.owned && coins >= item.cost
            const cantAfford = !item.owned && coins < item.cost
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: item.equipped ? 'rgba(74,222,128,0.08)' : 'rgba(0,0,0,0.2)',
                border: `2px solid ${item.equipped ? 'var(--green)' : 'var(--border)'}`,
                opacity: cantAfford ? 0.35 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: item.equipped ? 'var(--green)' : 'var(--text)' }}>
                      {item.name} {item.equipped && '✓'}
                    </div>
                    <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      幸福度 +{item.happinessBonus}
                    </div>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {item.owned ? (
                    <button onClick={() => toggle(item.id)} className="pixel-btn" style={{
                      padding: '7px 14px', fontSize: 11,
                      background: item.equipped ? '#1a2a0a' : '#1a0f06',
                      color: item.equipped ? 'var(--green)' : 'var(--text-dim)',
                      borderColor: item.equipped ? 'var(--green)' : 'var(--border-lit)',
                    }}>
                      {item.equipped ? '外す' : '置く'}
                    </button>
                  ) : (
                    <button onClick={() => buy(item.id)} disabled={cantAfford} className="pixel-btn" style={{
                      padding: '7px 14px', fontSize: 11,
                      background: canBuy ? 'var(--accent)' : '#1a0f06',
                      color: canBuy ? '#000' : 'var(--text-muted)',
                      borderColor: canBuy ? 'var(--accent)' : 'var(--border)',
                    }}>
                      🪙{item.cost}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
