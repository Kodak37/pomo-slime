import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../lib/api'

interface Props {
  onClose: () => void
  onReward: (coins: number) => void
}

// ─────────────────────────────────────────────
// 食べ物キャッチ
// ─────────────────────────────────────────────
const FOODS = ['🍄','🍙','🍎','🫐','🌽','🍓','🥕','🍞']

function CatchGame({ onResult }: { onResult: (coins: number) => void }) {
  const DURATION = 30
  const REWARD   = 3

  interface Food { id: number; x: number; y: number; emoji: string; speed: number }

  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready')
  const [items, setItems] = useState<Food[]>([])
  const [score, setScore] = useState(0)
  const [time,  setTime]  = useState(DURATION)
  const nextId = useRef(0)

  const spawn = useCallback(() => {
    setItems(prev => [...prev, {
      id: nextId.current++,
      x: 5 + Math.random() * 85,
      y: -8,
      emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
      speed: 2 + Math.random() * 3,
    }])
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const s = setInterval(spawn, 800)
    const t = setInterval(() => setTime(v => {
      if (v <= 1) { clearInterval(s); clearInterval(t); setPhase('result'); return 0 }
      return v - 1
    }), 1000)
    return () => { clearInterval(s); clearInterval(t) }
  }, [phase, spawn])

  useEffect(() => {
    if (phase !== 'playing') return
    const f = setInterval(() => {
      setItems(prev => prev.map(it => ({ ...it, y: it.y + it.speed })).filter(it => it.y < 110))
    }, 50)
    return () => clearInterval(f)
  }, [phase])

  function catchItem(id: number) { setItems(prev => prev.filter(it => it.id !== id)); setScore(s => s + 1) }

  // 生スコア（キャッチ数）をサーバーに渡す。コイン換算はサーバー任せ。
  if (phase === 'result') { onResult(score); return null }

  return (
    <>
      {phase === 'ready' ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 2.2 }}>
            <div>落ちてくる食べ物をタップ！</div>
            <div>制限時間: {DURATION}秒 ／ 1個 = 🪙{REWARD}</div>
          </div>
          <button onClick={() => setPhase('playing')} className="pixel-btn" style={{ padding:'12px 24px', fontSize:11, background:'var(--green)', color:'#000', borderColor:'var(--green)' }}>スタート！</button>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color:'var(--accent)' }}>スコア: {score}</div>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color: time <= 10 ? 'var(--red)' : 'var(--text-dim)' }}>⏱ {time}秒</div>
          </div>
          <div style={{ position:'relative', width:'100%', height:240, background:'#0d0800', border:'2px solid var(--border)', overflow:'hidden' }}>
            {items.map(it => (
              <div key={it.id} onClick={() => catchItem(it.id)} style={{ position:'absolute', left:`${it.x}%`, top:`${it.y}%`, fontSize:28, cursor:'pointer', userSelect:'none', transform:'translateX(-50%)' }}>
                {it.emoji}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// もぐらたたき
// ─────────────────────────────────────────────
function MoleGame({ onResult }: { onResult: (coins: number) => void }) {
  const DURATION  = 30
  const REWARD    = 4
  const MOLES_GIF = ['/slime/jump.gif', '/slime/idle.gif', '/slime/jump.gif']

  const [phase,   setPhase]   = useState<'ready' | 'playing' | 'result'>('ready')
  const [moles,   setMoles]   = useState<boolean[]>(Array(9).fill(false))
  const [score,   setScore]   = useState(0)
  const [time,    setTime]    = useState(DURATION)
  const scoreRef = useRef(0)

  useEffect(() => {
    if (phase !== 'playing') return

    const timer = setInterval(() => setTime(v => {
      if (v <= 1) { clearInterval(timer); setPhase('result'); return 0 }
      return v - 1
    }), 1000)

    const moleInt = setInterval(() => {
      setMoles(() => {
        const next = Array(9).fill(false) as boolean[]
        const count = Math.random() < 0.35 ? 2 : 1
        for (let i = 0; i < count; i++) next[Math.floor(Math.random() * 9)] = true
        return next
      })
    }, 850)

    return () => { clearInterval(timer); clearInterval(moleInt) }
  }, [phase])

  useEffect(() => {
    // 生スコア（たたいた数）をサーバーに渡す。
    if (phase === 'result') onResult(scoreRef.current)
  }, [phase, onResult])

  function whack(i: number) {
    if (!moles[i]) return
    setMoles(prev => { const n = [...prev]; n[i] = false; return n })
    scoreRef.current++
    setScore(s => s + 1)
  }

  if (phase === 'result') return null

  return (
    <>
      {phase === 'ready' ? (
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color:'var(--text-dim)', lineHeight:2.2 }}>
            <div>飛び出たスライムをタップ！</div>
            <div>制限時間: {DURATION}秒 ／ 1匹 = 🪙{REWARD}</div>
          </div>
          <button onClick={() => setPhase('playing')} className="pixel-btn" style={{ padding:'12px 24px', fontSize:11, background:'var(--green)', color:'#000', borderColor:'var(--green)' }}>スタート！</button>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color:'var(--accent)' }}>スコア: {score}</div>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color: time <= 10 ? 'var(--red)' : 'var(--text-dim)' }}>⏱ {time}秒</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {moles.map((hasMole, i) => (
              <div
                key={i}
                onClick={() => whack(i)}
                style={{
                  height: 72,
                  background: hasMole ? 'rgba(74,222,128,0.12)' : 'rgba(0,0,0,0.4)',
                  border: `2px solid ${hasMole ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: hasMole ? 36 : 20,
                  cursor: hasMole ? 'pointer' : 'default',
                  transition: 'all 0.1s',
                  userSelect: 'none',
                }}
              >
                {hasMole
                  ? <img src={MOLES_GIF[i % MOLES_GIF.length]} alt="slime" style={{ width:44, height:44, imageRendering:'pixelated' }} />
                  : '⚫'}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// 障害物避けゲーム
// ─────────────────────────────────────────────
const W = 320, H = 160
const GROUND    = H - 4      // y of ground line (top)
const SLIME_X   = 44
const SLIME_H   = 32
const OBS_W     = 22
const GRAVITY   = 0.55
const JUMP_VY   = -10

function DodgeGame({ onResult }: { onResult: (coins: number) => void }) {
  const [phase, setPhase]   = useState<'ready' | 'playing' | 'dead'>('ready')
  const [, setRender] = useState(0)

  const slimeY   = useRef(GROUND - SLIME_H)
  const vy       = useRef(0)
  const obstacles= useRef<{id:number; x:number; h:number}[]>([])
  const ticks    = useRef(0)
  const nextObs  = useRef(0)
  const rafId    = useRef(0)
  const phaseRef = useRef<'ready'|'playing'|'dead'>('ready')

  const tryJump = useCallback(() => {
    if (slimeY.current >= GROUND - SLIME_H - 2) vy.current = JUMP_VY
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    phaseRef.current = 'playing'

    function tick() {
      if (phaseRef.current !== 'playing') return

      // physics
      vy.current    += GRAVITY
      slimeY.current = Math.min(GROUND - SLIME_H, slimeY.current + vy.current)
      if (slimeY.current >= GROUND - SLIME_H) vy.current = 0

      ticks.current++

      // spawn obstacle (interval shrinks as score grows)
      const spawnEvery = Math.max(55, 120 - Math.floor(ticks.current / 120) * 8)
      if (ticks.current % spawnEvery === 0) {
        const h = 24 + Math.floor(Math.random() * 28)
        obstacles.current.push({ id: nextObs.current++, x: W + 10, h })
      }

      // move obstacles
      const speed = 3 + Math.floor(ticks.current / 180) * 0.5
      obstacles.current = obstacles.current
        .map(o => ({ ...o, x: o.x - speed }))
        .filter(o => o.x > -OBS_W)

      // collision
      const sL = SLIME_X, sR = SLIME_X + SLIME_H
      const sT = slimeY.current, sB = slimeY.current + SLIME_H
      for (const o of obstacles.current) {
        const oT = GROUND - o.h, oB = GROUND
        const oL = o.x,  oR = o.x + OBS_W
        if (sR > oL + 4 && sL < oR - 4 && sB > oT + 4 && sT < oB) {
          phaseRef.current = 'dead'
          setPhase('dead')
          // 生スコア（生存時間ベース）をサーバーに渡す。コイン換算・上限はサーバー任せ。
          onResult(Math.floor(ticks.current / 10))
          return
        }
      }

      setRender(n => n + 1)
      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [phase, onResult])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && phaseRef.current === 'playing') {
        e.preventDefault()
        tryJump()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tryJump])

  function startGame() {
    slimeY.current    = GROUND - SLIME_H
    vy.current        = 0
    obstacles.current = []
    ticks.current     = 0
    setPhase('playing')
  }

  const score = Math.floor(ticks.current / 10)

  if (phase === 'dead') return null

  return (
    <>
      {phase === 'ready' ? (
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color:'var(--text-dim)', lineHeight:2.2 }}>
            <div>障害物をよけてスライムを走らせよう！</div>
            <div>タップ または スペース でジャンプ</div>
            <div>長く生き延びるほどコインUP</div>
          </div>
          <button onClick={startGame} className="pixel-btn" style={{ padding:'12px 24px', fontSize:11, background:'var(--green)', color:'#000', borderColor:'var(--green)' }}>スタート！</button>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color:'var(--accent)' }}>スコア: {score}</div>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color:'var(--text-muted)' }}>速度: ×{(1 + Math.floor(ticks.current / 180) * 0.17).toFixed(1)}</div>
          </div>
          <div
            onClick={tryJump}
            style={{ position:'relative', width:W, height:H, background:'#0d0800', border:'2px solid var(--border)', overflow:'hidden', cursor:'pointer', margin:'0 auto', userSelect:'none' }}
          >
            {/* 地面 */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:4, background:'var(--border)' }} />

            {/* スライム */}
            <img
              src={vy.current < -1 ? '/slime/jump.gif' : '/slime/move.gif'}
              alt="slime"
              style={{ position:'absolute', left:SLIME_X, top:slimeY.current, width:SLIME_H, height:SLIME_H, imageRendering:'pixelated' }}
            />

            {/* 障害物 */}
            {obstacles.current.map(o => (
              <div key={o.id} style={{
                position:'absolute', left:o.x, bottom:4, width:OBS_W, height:o.h,
                background:'rgba(180,60,20,0.7)', border:'1px solid var(--border-lit)',
                display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:2, fontSize:14,
              }}>🌵</div>
            ))}
          </div>
          <div style={{ fontFamily:'var(--pixel-font)', fontSize:8, color:'var(--text-muted)', textAlign:'center', marginTop:6 }}>
            タップ / スペース でジャンプ
          </div>
        </>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// メイン：ゲームロビー＋結果画面
// ─────────────────────────────────────────────
const GAME_LIST = [
  { id: 'catch', label: '🍎 食べ物キャッチ', desc: '落ちてくる食べ物をタップ' },
  { id: 'mole',  label: '🐾 もぐらたたき',  desc: '飛び出たスライムをたたけ' },
  { id: 'dodge', label: '🏃 障害物よけ',    desc: 'ジャンプして障害物をよけろ' },
] as const
type GameId = typeof GAME_LIST[number]['id']

export function MiniGame({ onClose, onReward }: Props) {
  const [selected, setSelected] = useState<GameId | null>(null)
  const [awarded,  setAwarded]  = useState<number | null>(null)
  const claimingRef = useRef(false)

  // ゲーム終了時に生スコアをサーバーへ送り、コインはサーバー算出値を受け取る。
  // 二重付与を防ぐため claimingRef で1ゲーム1回に制限する
  // （CatchGame は result フェーズ中に onResult を繰り返し呼びうるため）。
  async function handleResult(score: number) {
    if (claimingRef.current || selected === null) return
    claimingRef.current = true
    try {
      const res = await apiFetch('/api/minigame/reward', {
        method: 'POST',
        body: JSON.stringify({ game: selected, score }),
      })
      if (res.ok) {
        const data = await res.json()
        setAwarded(typeof data.awarded === 'number' ? data.awarded : 0)
      } else {
        setAwarded(0)
      }
    } catch {
      setAwarded(0)
    }
  }

  function startGame(id: GameId) {
    claimingRef.current = false
    setSelected(id)
  }

  function backToLobby() {
    claimingRef.current = false
    setSelected(null)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.82)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div className="pixel-box" style={{ width:'100%', maxWidth:400, padding:24 }}>

        {/* ────── 結果画面（コインはサーバー算出値を表示・付与済み） ────── */}
        {awarded !== null ? (
          <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:13, color:'var(--accent)' }}>ゲーム終了！</div>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:30, color:'var(--accent)' }}>🪙 {awarded}</div>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:10, color:'var(--text-dim)' }}>コイン獲得！</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => { onReward(awarded); onClose() }} className="pixel-btn" style={{ padding:'12px 24px', fontSize:11, background:'var(--accent)', color:'#000', borderColor:'var(--accent)' }}>うけとる！</button>
              <button onClick={onClose} className="pixel-btn" style={{ padding:'12px 16px', fontSize:10 }}>とじる</button>
            </div>
          </div>
        ) : selected === null ? (
          /* ────── ゲーム選択ロビー ────── */
          <>
            <div style={{ fontFamily:'var(--pixel-font)', fontSize:13, color:'var(--accent)', textAlign:'center', marginBottom:20 }}>🎮 ゲームえらんで！</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {GAME_LIST.map(g => (
                <button key={g.id} onClick={() => startGame(g.id)} className="pixel-btn" style={{ padding:'14px 20px', fontSize:12, textAlign:'left', display:'flex', flexDirection:'column', gap:6 }}>
                  <span>{g.label}</span>
                  <span style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--pixel-font)' }}>{g.desc}</span>
                </button>
              ))}
            </div>
            <button onClick={onClose} className="pixel-btn" style={{ width:'100%', marginTop:12, padding:'10px', fontSize:10 }}>もどる</button>
          </>
        ) : (
          /* ────── ゲーム本体 ────── */
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontFamily:'var(--pixel-font)', fontSize:11, color:'var(--accent)' }}>
                {GAME_LIST.find(g => g.id === selected)?.label}
              </div>
              <button onClick={backToLobby} className="pixel-btn" style={{ padding:'4px 10px', fontSize:9 }}>← もどる</button>
            </div>
            {selected === 'catch' && <CatchGame onResult={handleResult} />}
            {selected === 'mole'  && <MoleGame  onResult={handleResult} />}
            {selected === 'dodge' && <DodgeGame onResult={handleResult} />}
          </>
        )}

      </div>
    </div>
  )
}
