/* Login.jsx */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from './AuthLayout'
import { Field, Button, FormError } from '../components/ui/FormElements'

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Bem-vindo de volta" sub="Entre na sua conta Rubi para continuar.">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="E-mail" htmlFor="email">
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com" required className="field-input" />
        </Field>

        <Field label="Senha" htmlFor="password">
          <div style={{ position: 'relative' }}>
            <input id="password" type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              required minLength={8} className="field-input" style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </Field>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" loading={loading} icon={<LogIn size={16}/>}>
          Entrar
        </Button>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Não tem conta?{' '}
          <Link to="/register" style={{ color: 'var(--lime)', fontWeight: 600, textDecoration: 'none' }}>
            Cadastrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}