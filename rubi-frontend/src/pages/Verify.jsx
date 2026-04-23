import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, RefreshCw, Check } from 'lucide-react'
import { authAPI } from '../services/api'
import { AuthLayout } from './AuthLayout'
import { Button, FormError } from '../components/ui/FormElements'

export default function Verify() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const email     = location.state?.email || ''

  const [code, setCode]         = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [resending, setResending]= useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [countdown, setCountdown]= useState(0)
  const refs = useRef([])

  // Countdown for resend button (starts at 30s after page load)
  useEffect(() => {
    setCountdown(30)
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (idx, val) => {
    const cleaned = val.replace(/\D/, '').slice(-1)
    const next = [...code]
    next[idx] = cleaned
    setCode(next)
    if (cleaned && idx < 5) refs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setCode(pasted.padEnd(6, '').split(''))
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const verify = async () => {
    const fullCode = code.join('')
    if (fullCode.length < 6) { setError('Digite os 6 dígitos do código.'); return }
    setError(''); setLoading(true)
    try {
      await authAPI.verify(email, fullCode)
      navigate('/login', { state: { verified: true } })
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido ou expirado.')
      setCode(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setResending(true); setError(''); setSuccess('')
    try {
      await authAPI.resendCode(email)
      setSuccess('Novo código enviado!')
      setCountdown(30)
    } catch (err) {
      setError(err.response?.data?.message || 'Aguarde antes de reenviar.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title="Verifique seu e-mail"
      sub={`Enviamos um código de 6 dígitos para ${email || 'seu e-mail'}.`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(202,247,41,0.08)', border: '1px solid var(--border-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--lime)',
        }}>
          <Mail size={22} />
        </div>

        {/* 6-digit input */}
        <div style={{ display: 'flex', gap: 8 }} onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              type="text" inputMode="numeric"
              maxLength={1} value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 48, height: 56, textAlign: 'center',
                fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700,
                background: 'var(--bg-raised)', border: `1.5px solid ${digit ? 'var(--lime)' : 'var(--border)'}`,
                borderRadius: 8, color: 'var(--text-primary)',
                outline: 'none', transition: 'border-color 0.2s',
                caretColor: 'var(--lime)',
              }}
              onFocus={e => e.target.select()}
            />
          ))}
        </div>

        {error   && <FormError>{error}</FormError>}
        {success && <p style={{ color: 'var(--mint)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14}/>{success}</p>}

        <Button onClick={verify} loading={loading} icon={<Check size={16}/>}>
          Confirmar código
        </Button>

        <button
          onClick={resend} disabled={countdown > 0 || resending}
          style={{
            background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer',
            color: countdown > 0 ? 'var(--text-muted)' : 'var(--lime)',
            fontSize: 13, fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
          }}
        >
          <RefreshCw size={13} style={{ animation: resending ? 'spin 0.8s linear infinite' : 'none' }} />
          {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
        </button>
      </div>
    </AuthLayout>
  )
}