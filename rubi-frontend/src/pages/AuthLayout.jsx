/* ── AuthLayout shared by Login, Register, Verify ── */
import { Link } from 'react-router-dom'
import { RubiLogo } from '../App'

export function AuthLayout({ children, title, sub }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      {/* Left panel — decorative */}
      <div style={{
        width: 420, flexShrink: 0,
        background: 'var(--bg-raised)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: 'var(--sp-8)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid bg */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 100% 100% at 0% 100%, black 30%, transparent 80%)',
        }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, background: 'radial-gradient(ellipse, rgba(202,247,41,0.08) 0%, transparent 70%)' }} />

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', position: 'relative' }}>
          <RubiLogo size={28} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>Rubi</span>
        </Link>

        <div style={{ marginTop: 'auto', position: 'relative' }}>
          <blockquote style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.3, color: 'var(--text-primary)', marginBottom: 16 }}>
            "Controle financeiro que o casal merece"
          </blockquote>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Parcelas, cartões, investimentos e reservas — tudo junto, tudo claro.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-8)',
      }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp 0.4s var(--ease) both' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em' }}>{title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 14 }}>{sub}</p>
          {children}
        </div>
      </div>
    </div>
  )
}