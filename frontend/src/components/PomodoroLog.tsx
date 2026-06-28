import { useState, useEffect } from 'react'

interface Log {
  id: number
  durationMin: number
  coinsEarned: number
  completedAt: string
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function effLabel(min: number) {
  const dev = Math.abs(min - 25)
  if (dev === 0) return { text: '最高効率', color: 'var(--green)' }
  if (dev <= 5)  return { text: '良好',     color: 'var(--accent)' }
  if (dev <= 10) return { text: '普通',     color: 'var(--text-dim)' }
  return             { text: '低効率',     color: 'var(--red)' }
}

export function PomodoroLog() {
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    fetch('/api/logs').then(r => r.json()).then(setLogs)
  }, [])

  const totalCoins = logs.reduce((s, l) => s + l.coinsEarned, 0)
  const totalMin   = logs.reduce((s, l) => s + l.durationMin, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* サマリー */}
      <div className="pixel-box" style={{ padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 14 }}>
          📊 合計記録
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>完了回数</div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 18, color: 'var(--accent)' }}>{logs.length}<span style={{ fontSize: 10 }}> 回</span></div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>総作業時間</div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 18, color: 'var(--accent2)' }}>{totalMin}<span style={{ fontSize: 10 }}> 分</span></div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>獲得コイン</div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 18, color: 'var(--accent)' }}>🪙{totalCoins}</div>
          </div>
        </div>
      </div>

      {/* ログ一覧 */}
      <div className="pixel-box" style={{ padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 14 }}>
          🍅 ポモドーロ履歴
        </div>
        {logs.length === 0 ? (
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
            まだ記録がありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {logs.map(l => {
              const eff = effLabel(l.durationMin)
              return (
                <div key={l.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: 'var(--text-muted)' }}>
                    {fmt(l.completedAt)}
                  </div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: 'var(--text-dim)' }}>
                    {l.durationMin}分
                  </div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: eff.color }}>
                    {eff.text}
                  </div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 9, color: 'var(--accent)' }}>
                    🪙{l.coinsEarned}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
