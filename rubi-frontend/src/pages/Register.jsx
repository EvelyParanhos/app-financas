/* Register.jsx */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { authAPI } from '../services/api'
import { AuthLayout } from './AuthLayout'
import { Field, Button, FormError } from '../components/ui/FormElements'

export function Register() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      localStorage.removeItem('rubi_token')
      await authAPI.register(form.name, form.email, form.password)
      navigate('/verify', { state: { email: form.email } })
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Criar conta" sub="Comece seu controle financeiro agora.">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Nome completo" htmlFor="name">
          <input id="name" type="text" value={form.name} onChange={set('name')}
            placeholder="Evely Silva" required className="field-input" />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <input id="email" type="email" value={form.email} onChange={set('email')}
            placeholder="seu@email.com" required className="field-input" />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Min. 8 caracteres, letras, números e símbolo">
          <div style={{ position: 'relative' }}>
            <input id="password" type={showPw ? 'text' : 'password'} value={form.password}
              onChange={set('password')} placeholder="••••••••" required minLength={8}
              className="field-input" style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </Field>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" loading={loading} icon={<UserPlus size={16}/>}>
          Criar conta
        </Button>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Já tem conta?{' '}
          <Link to="/login" style={{ color: 'var(--lime)', fontWeight: 600, textDecoration: 'none' }}>
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
export default Register
