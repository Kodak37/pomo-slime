import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../lib/api'

interface Log {
  id: number
  durationMin: number
  coinsEarned: number
  completedAt: string
}

type Period = 'today' | 'week' | 'month' | 'all'

const PERIOD_LABELS: { id: Period; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'week',  label: '今週' },
  { id: 'month', label: '今月' },
  { id: 'all',   label: '全期間' },
]

function periodStart(p: Period): Date {
  const now = new Date()
  if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (p === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d }
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return new Date(0)
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

function BarChart({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 70 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%',
            height: `${Math.round((v / max) * 50)}px`,
            minHeight: v > 0 ? 2 : 0,
            background: v > 0 ? color : 'rgba(255,255,255,0.06)',
            imageRendering: 'pixelated',
          }} />
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 7, color: labels[i] ? 'var(--text-muted)' : 'transparent', lineHeight: 1 }}>
            {labels[i] || '·'}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PomodoroLog() {
  const [logs, setLogs] = useState<Log[]>([])
  const [period, setPeriod] = useState<Period>('week')

  useEffect(() => {
    apiFetch('/api/logs').then(r => r.json()).then(setLogs)
  }, [])

  const filtered = useMemo(() => {
    const since = periodStart(period)
    return logs.filter(l => new Date(l.completedAt) >= since)
  }, [logs, period])

  // ストリーク（全ログ対象・今日から遡る）
  const streak = useMemo(() => {
    const dates = new Set(logs.map(l => {
      const d = new Date(l.completedAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    }))
    const today = new Date()
    let count = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (dates.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)) count++
      else if (i > 0) break  // 今日ゼロでも翌日以降に途切れたら終わり
    }
    return count
  }, [logs])

  // 時間帯別（0〜23時）
  const hourData = useMemo(() => {
    const arr = Array(24).fill(0)
    filtered.forEach(l => { arr[new Date(l.completedAt).getHours()]++ })
    return arr
  }, [filtered])

  // 曜日別（月〜日）
  const dowData = useMemo(() => {
    const arr = Array(7).fill(0)
    filtered.forEach(l => { arr[new Date(l.completedAt).getDay()]++ })
    return [1,2,3,4,5,6,0].map(i => arr[i])
  }, [filtered])

  const totalSessions = filtered.length
  const totalMin      = filtered.reduce((s, l) => s + l.durationMin, 0)
  const totalCoins    = filtered.reduce((s, l) => s + l.coinsEarned, 0)

  // 時間帯ラベル（6時間おき）
  const hourLabels = Array.from({ length: 24 }, (_, i) => i % 6 === 0 ? `${i}` : '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 期間フィルタ */}
      <div style={{ display: 'flex', gap: 6 }}>
        {PERIOD_LABELS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className="pixel-btn"
            style={{
              flex: 1, padding: '9px 4px', fontSize: 11,
              background:   period === p.id ? 'var(--accent)' : '#1a0f06',
              color:        period === p.id ? '#000'          : 'var(--text-dim)',
              borderColor:  period === p.id ? 'var(--accent)' : 'var(--border)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* サマリーカード */}
      <div className="pixel-box" style={{ padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>📊 サマリー</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: '完了',   value: `${totalSessions}回`,  color: 'var(--accent)' },
            { label: '時間',   value: `${totalMin}分`,        color: 'var(--accent2)' },
            { label: 'コイン', value: `🪙${totalCoins}`,      color: 'var(--accent)' },
            { label: '連続',   value: `🔥${streak}日`,        color: 'var(--red)' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 17, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 時間帯グラフ */}
      <div className="pixel-box" style={{ padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>⏰ 時間帯別（0〜23時）</div>
        <BarChart data={hourData} labels={hourLabels} color="var(--accent)" />
      </div>

      {/* 曜日別グラフ */}
      <div className="pixel-box" style={{ padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>📅 曜日別</div>
        <BarChart data={dowData} labels={['月','火','水','木','金','土','日']} color="var(--accent2)" />
      </div>

      {/* ポモドーロ履歴 */}
      <div className="pixel-box" style={{ padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>🍅 ポモドーロ履歴</div>
        {filtered.length === 0 ? (
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
            まだ記録がありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(l => {
              const eff = effLabel(l.durationMin)
              return (
                <div key={l.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-muted)' }}>{fmt(l.completedAt)}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--text-dim)' }}>{l.durationMin}分</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: eff.color }}>{eff.text}</div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--accent)' }}>🪙{l.coinsEarned}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
