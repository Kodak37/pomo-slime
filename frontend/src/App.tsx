import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { PomodoroTimer } from './components/PomodoroTimer'
import { SlimeRoom } from './components/SlimeRoom'
import { PomodoroLog } from './components/PomodoroLog'
import { MiniGame } from './components/MiniGame'
import { Customization } from './components/Customization'
import { Shop } from './components/Shop'
import { RoomSettings, THEMES } from './components/RoomSettings'
import { AuthPage } from './components/AuthPage'
import { initSupabase, getSupabase } from './lib/supabase'
import { apiFetch, setAuthToken } from './lib/api'
import './index.css'

type Tab = 'work' | 'slime' | 'log' | 'settings'

interface SlimeData {
  id: string; name: string; hunger: number; coins: number
  pomodoroCount: number; status: 'happy'|'slightly_happy'|'normal'|'hungry'|'dying'
  updatedAt: string; happinessBonus: number
}

interface Outfit { id: number; bodyColor: string; hatType: string; equipped: boolean }

const THEME_COLORS: Record<string, { accent: string; accent2: string; borderLit: string }> = {
  warm:   { accent: '#f59e0b', accent2: '#fb923c', borderLit: '#c8722a' },
  forest: { accent: '#4ade80', accent2: '#86efac', borderLit: '#16a34a' },
  ocean:  { accent: '#60a5fa', accent2: '#93c5fd', borderLit: '#2563eb' },
  sakura: { accent: '#f472b6', accent2: '#f9a8d4', borderLit: '#db2777' },
  night:  { accent: '#a78bfa', accent2: '#c4b5fd', borderLit: '#7c3aed' },
}

const DECAY_PER_MIN = 2 / 5
function workTabTimer(hunger: number, updatedAt: string): string {
  const eff = Math.max(0, hunger - (Date.now() - new Date(updatedAt).getTime()) / 60000 * DECAY_PER_MIN)
  const thresholds = [{ value: 35, label: 'ちょっと元気がなくなる' }, { value: 15, label: '瀕死になる' }]
  const next = thresholds.find(t => eff > t.value)
  if (!next) return '⚠ 今すぐごはんを！'
  const min = (eff - next.value) / DECAY_PER_MIN
  if (min < 1)  return `まもなく${next.label}！`
  if (min < 60) return `⏱ 約 ${Math.floor(min)} 分後に${next.label}`
  return `⏱ 約 ${Math.floor(min/60)}時間${Math.floor(min%60) > 0 ? `${Math.floor(min%60)}分` : ''}後に${next.label}`
}

export default function App() {
  const [authReady,    setAuthReady]    = useState(false)
  const [session,      setSession]      = useState<Session | null>(null)
  const [tab,          setTab]          = useState<Tab>('work')
  const [slime,        setSlime]        = useState<SlimeData | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [slimeAlert,   setSlimeAlert]   = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [showGame,     setShowGame]     = useState(false)
  const [theme,        setTheme]        = useState('warm')
  const [outfit,       setOutfit]       = useState<Outfit | null>(null)

  // テーマ変更時にCSS変数をグローバルに更新 → 全コンポーネントに反映
  useEffect(() => {
    const c = THEME_COLORS[theme] ?? THEME_COLORS.warm
    const root = document.documentElement.style
    root.setProperty('--accent',     c.accent)
    root.setProperty('--accent2',    c.accent2)
    root.setProperty('--border-lit', c.borderLit)
  }, [theme])

  // Supabase初期化 + 認証状態の監視
  useEffect(() => {
    initSupabase().then(sb => {
      sb.auth.getSession().then(({ data }) => {
        const s = data.session
        if (s) setAuthToken(s.access_token)
        setSession(s)
        setAuthReady(true)
      })
      sb.auth.onAuthStateChange((_event, s) => {
        if (s) setAuthToken(s.access_token)
        else setAuthToken('')
        setSession(s)
        setAuthReady(true)
      })
    })
  }, [])

  const fetchSlime = useCallback(async () => {
    const data = await apiFetch('/api/slime').then(r => r.json())
    setSlime(data)
    setSlimeAlert(data.status === 'dying' || data.status === 'hungry')
  }, [])

  const fetchOutfit = useCallback(async () => {
    const list: Outfit[] = await apiFetch('/api/outfits').then(r => r.json())
    setOutfit(list.find(o => o.equipped) ?? null)
  }, [])

  useEffect(() => {
    if (!session) return
    fetchSlime()
    fetchOutfit()
    apiFetch('/api/room').then(r => r.json()).then(d => setTheme(d.theme))
    const id = setInterval(fetchSlime, 10000)
    return () => clearInterval(id)
  }, [session, fetchSlime, fetchOutfit])

  function showNotif(msg: string) { setNotification(msg); setTimeout(() => setNotification(null), 3000) }

  async function handlePomodoroComplete(count: number, durationMin: number) {
    const data = await apiFetch('/api/pomodoro/done', {
      method: 'POST',
      body: JSON.stringify({ pomodoroCount: count, durationMin }),
    }).then(r => r.json())
    setSlime(data)
    showNotif(`🍅 完了！🪙コインゲット！`)
  }

  function handleBreakStart() {
    setTimerRunning(false)
    showNotif('☕ 休憩タイム！スライムにごはんをあげよう')
    setTimeout(() => setTab('slime'), 1600)
  }

  async function handleFeed(cost: number) {
    if (!slime || slime.coins < cost) { showNotif('コインが足りない…'); return }
    const data = await apiFetch('/api/feed', {
      method: 'POST',
      body: JSON.stringify({ cost }),
    }).then(r => r.json())
    setSlime(data)
    showNotif('😋 スライムが喜んでいる！')
  }

  function handleTabChange(t: Tab) {
    if (timerRunning && t !== 'work') { showNotif('⏱ タイマー作動中！作業タブに戻ろう'); return }
    setTab(t)
  }

  async function handleLogout() {
    await getSupabase().auth.signOut()
    setSlime(null)
    setTab('work')
  }

  const currentTheme = THEMES.find(t => t.id === theme) ?? THEMES[0]

  const TABS: { id: Tab; label: string; badge?: boolean }[] = [
    { id: 'work',     label: '⏱ 作業' },
    { id: 'slime',    label: '🟢 スライム', badge: slimeAlert },
    { id: 'log',      label: '📋 ログ' },
    { id: 'settings', label: '⚙ 設定' },
  ]

  // 初期化待ち
  if (!authReady) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg-wall)' }}>
      <div style={{ fontFamily:'var(--pixel-font)', fontSize:14, color:'var(--accent)' }}>よみこみ中…</div>
    </div>
  )

  // 未ログイン
  if (!session) return <AuthPage />

  // スライムデータ読み込み待ち
  if (!slime) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg-wall)' }}>
      <div style={{ fontFamily:'var(--pixel-font)', fontSize:14, color:'var(--accent)' }}>よみこみ中…</div>
    </div>
  )

  const timer = workTabTimer(slime.hunger, slime.updatedAt)

  return (
    <div className="room-bg" style={{
      backgroundImage: [
        `radial-gradient(circle, ${currentTheme.dot} 1px, transparent 1px)`,
        `linear-gradient(to bottom, transparent 0%, transparent 71%, #5c3010 71%, #5c3010 73%, ${currentTheme.floor} 73%, ${currentTheme.floor} 100%)`,
      ].join(', '),
      backgroundSize: '14px 14px, 100% 100%',
      backgroundColor: currentTheme.wall,
    }}>

      {/* ヘッダー */}
      <div style={{ textAlign:'center', padding:'28px 0 16px', position:'relative', zIndex:2 }}>
        <h1 style={{ fontFamily:'var(--pixel-font)', fontSize:18, color:'var(--text)', letterSpacing:3, textShadow:'0 0 20px rgba(245,158,11,0.6)', margin:0 }}>
          🍅 ポモスライム
        </h1>
        {/* ログアウトボタン */}
        <button onClick={handleLogout} className="pixel-btn" style={{
          position:'absolute', top:28, right:16,
          padding:'6px 12px', fontSize:9,
          background:'#1a0f06', color:'var(--text-muted)', borderColor:'var(--border)',
        }}>
          ログアウト
        </button>
      </div>

      {/* タブ */}
      <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:4, marginBottom:20, padding:'0 12px', position:'relative', zIndex:2 }}>
        {TABS.map(t => {
          const active = tab === t.id
          const locked = timerRunning && t.id !== 'work'
          return (
            <button key={t.id} onClick={() => handleTabChange(t.id)} className="pixel-btn" style={{
              padding:'13px 26px', fontSize:14,
              background: active ? 'var(--accent)' : locked ? '#120803' : '#1a0f06',
              color: active ? '#000' : locked ? 'var(--text-muted)' : 'var(--text-dim)',
              borderColor: active ? 'var(--accent)' : locked ? 'var(--border)' : 'var(--border-lit)',
              position:'relative', opacity: locked ? 0.5 : 1,
            }}>
              {t.label}
              {t.badge && !active && (
                <span style={{ position:'absolute', top:-5, right:-5, width:11, height:11, background:'var(--red)', borderRadius:'50%', border:'2px solid var(--bg-wall)' }} />
              )}
              {timerRunning && t.id === 'work' && (
                <span style={{ position:'absolute', top:-5, right:-5, width:11, height:11, background:'var(--green)', borderRadius:'50%', border:'2px solid var(--bg-wall)', animation:'pulse 1s infinite' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* 通知 */}
      {notification && (
        <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', fontFamily:'var(--pixel-font)', fontSize:11, background:'var(--accent)', color:'#000', padding:'12px 22px', border:'3px solid #fde68a', boxShadow:'4px 4px 0 #000', zIndex:100, whiteSpace:'nowrap' }}>
          {notification}
        </div>
      )}

      {/* ミニゲーム */}
      {showGame && (
        <MiniGame
          onClose={() => { setShowGame(false); fetchSlime() }}
          onReward={coins => { showNotif(`🎮 ${coins}コイン獲得！`); fetchSlime() }}
        />
      )}

      {/* スライムタブ */}
      {tab === 'slime' && (
        <div style={{ position:'relative', zIndex:2 }}>
          <SlimeRoom
            slime={slime}
            bodyColor={outfit?.bodyColor}
            hatType={outfit?.hatType}
            themeId={theme}
            onNameUpdate={name => setSlime(s => s ? { ...s, name } : s)}
            onFeed={handleFeed}
            onGameOpen={() => setShowGame(true)}
            onThemeChange={setTheme}
            onUpdate={() => { fetchSlime(); fetchOutfit() }}
          />
        </div>
      )}

      {/* 作業・ログ・設定タブ */}
      <div style={{ display: tab === 'slime' ? 'none' : 'block', maxWidth:560, margin:'0 auto', padding:'0 16px 48px', position:'relative', zIndex:2 }}>

        <div style={{ display: tab === 'work' ? 'flex' : 'none', flexDirection:'column', gap:18 }}>
          <PomodoroTimer
            onPomodoroComplete={handlePomodoroComplete}
            pomodoroCount={slime.pomodoroCount}
            onBreakStart={handleBreakStart}
          />
          <div className="pixel-box" style={{ padding:'14px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontFamily:'var(--pixel-font)', fontSize:13, color:'var(--text-dim)' }}>スライムのようす</div>
              <div style={{ display:'flex', gap:18 }}>
                <span style={{ fontFamily:'var(--pixel-font)', fontSize:13, color:'var(--accent)' }}>🪙 {slime.coins}</span>
                <span style={{ fontFamily:'var(--pixel-font)', fontSize:13, color: slimeAlert ? 'var(--red)' : 'var(--green)' }}>
                  {slimeAlert ? '⚠ おなかすいた' : '♥ 元気'}
                </span>
              </div>
            </div>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:12, color: slimeAlert ? 'var(--red)' : 'var(--text-muted)', lineHeight:1.8 }}>
              {timer}
            </div>
          </div>
          <div className="pixel-box" style={{ padding:'16px 20px' }}>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:12, color:'var(--text-muted)', lineHeight:2.4 }}>
              <div>▸ 25分タイマーを回してコインをゲット</div>
              <div>▸ 25分が最高効率（前後するとコイン減）</div>
              <div>▸ 3回以上続けるとボーナスコイン</div>
              <div>▸ 休憩中にスライムにごはんをあげよう</div>
              <div>▸ 家具を置くとコインボーナスUP！</div>
            </div>
          </div>
        </div>

        {tab === 'log' && <PomodoroLog />}

        {tab === 'settings' && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <RoomSettings currentTheme={theme} onThemeChange={setTheme} />
            <Customization coins={slime.coins} onUpdate={() => { fetchSlime(); fetchOutfit() }} />
            <Shop coins={slime.coins} onUpdate={fetchSlime} />
          </div>
        )}
      </div>
    </div>
  )
}
