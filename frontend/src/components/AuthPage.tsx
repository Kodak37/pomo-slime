import { useState } from 'react'
import { getSupabase } from '../lib/supabase'

export function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: 'google' | 'github') {
    setLoading(true)
    setError(null)
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#2c1a0e',
      backgroundImage: 'radial-gradient(circle, rgba(255,180,80,0.10) 1px, transparent 1px)',
      backgroundSize: '14px 14px',
      padding: '20px',
    }}>
      {/* ロゴ */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🟢</div>
        <h1 style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 22,
          color: 'var(--accent)',
          letterSpacing: 3,
          textShadow: '0 0 20px rgba(245,158,11,0.6)',
          margin: 0,
        }}>
          ポモスライム
        </h1>
        <p style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 10,
          color: 'var(--text-muted)',
          marginTop: 12,
          lineHeight: 2,
        }}>
          スライムを育てながら集中しよう
        </p>
      </div>

      {/* ログインカード */}
      <div className="pixel-box" style={{ padding: '32px 28px', width: '100%', maxWidth: 320 }}>
        <div style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 11,
          color: 'var(--text-dim)',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          ログインして始めよう
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={() => signIn('google')}
            disabled={loading}
            className="pixel-btn"
            style={{
              padding: '14px 20px',
              fontSize: 12,
              background: '#fff',
              color: '#333',
              borderColor: '#ccc',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: 18 }}>🔵</span>
            Googleでログイン
          </button>

          <button
            onClick={() => signIn('github')}
            disabled={loading}
            className="pixel-btn"
            style={{
              padding: '14px 20px',
              fontSize: 12,
              background: '#1a0f06',
              color: 'var(--text)',
              borderColor: 'var(--border-lit)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: 18 }}>🐙</span>
            GitHubでログイン
          </button>
        </div>

        {loading && (
          <div style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 9,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 16,
          }}>
            リダイレクト中…
          </div>
        )}
        {error && (
          <div style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 9,
            color: 'var(--red)',
            textAlign: 'center',
            marginTop: 16,
          }}>
            {error}
          </div>
        )}
      </div>

      <p style={{
        fontFamily: 'var(--pixel-font)',
        fontSize: 8,
        color: 'var(--text-muted)',
        marginTop: 24,
        textAlign: 'center',
        lineHeight: 2,
      }}>
        ログインするとデータが保存されます
      </p>
    </div>
  )
}
