/**
 * NewSimulationModal.jsx
 * Modal específico para simulações (tema roxo/violet).
 * Envia isSimulation: true — não afeta saldo real.
 * Aparece na aba Simulações até ser efetivada ou excluída.
 * Em Simulações → botão "Efetivar" → POST /api/transactions/efetivar/{id}
 */
import { useState, useEffect } from 'react'
import { X, FlaskConical, Check } from 'lucide-react'
import { transactionsAPI, accountsAPI, categoriesAPI } from '../../services/api'
import { Button, Field, FormError } from '../ui/FormElements'
import CurrencyInput from '../ui/CurrencyInput'

export default function NewSimulationModal({ onClose, onSaved, onSuccess, month, year }) {
  const [amount,     setAmount]     = useState(0)
  const [desc,       setDesc]       = useState('')
  const [accountId,  setAccountId]  = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [parcelas,   setParcelas]   = useState(1)
  const [date,       setDate]       = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [accounts,   setAccounts]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    Promise.all([
      accountsAPI.list(true),
      categoriesAPI.listCouple(),
    ]).then(([{ data: accs }, { data: cats }]) => {
      // Simulações podem usar qualquer conta exceto INVESTMENT
      const validAccs = (accs || []).filter(a => a.type !== 'INVESTMENT')
      setAccounts(validAccs)
      setCategories((cats || []).filter(c => c.active !== false && c.type === 'EXPENSE'))
      if (validAccs.length) setAccountId(validAccs[0].id)
    }).catch(() => {})
  }, [])

  const submit = async () => {
    if (!desc.trim()) return setError('Informe uma descrição.')
    if (amount <= 0)  return setError('Informe um valor maior que zero.')
    if (!accountId)   return setError('Selecione uma conta.')

    setError(''); setLoading(true)
    try {
      await transactionsAPI.create({
        description:  desc.trim(),
        totalAmount:  amount,
        purchaseDate: date,
        type:         'EXPENSE',
        account:      { id: accountId },
        category:     categoryId ? { id: categoryId } : null,
        isSimulation: true,
      }, Math.max(1, parseInt(parcelas) || 1))
      onClose?.()
      await onSuccess?.()
      onSaved?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar simulação.')
    } finally { setLoading(false) }
  }

  const selectStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--bg-float)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A8FA8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: 40,
    minHeight: 48,
    transition: 'border-color 0.2s',
  }

  const dateInputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-float)', border: '1.5px solid var(--border)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
    minHeight: 48, transition: 'border-color 0.2s', colorScheme: 'dark',
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 100,
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(460px, calc(100vw - 32px))',
        background: 'var(--bg-raised)',
        border: '1px solid rgba(136,141,218,0.35)',
        borderRadius: 16, overflow: 'hidden', zIndex: 101,
        animation: 'modalEnter 0.25s var(--ease) both',
        maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          background: 'rgba(136,141,218,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(136,141,218,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--violet)',
            }}>
              <FlaskConical size={16} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                Nova simulação
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Não afeta seu saldo real</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: 'var(--bg-overlay)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Info banner */}
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(136,141,218,0.06)', border: '1px solid rgba(136,141,218,0.2)',
            color: 'var(--violet)', fontSize: 12, lineHeight: 1.5,
          }}>
            Esta transação fica ativa em Simulações e pode ser efetivada quando você decidir comprar.
          </div>

          <CurrencyInput value={amount} onChange={setAmount} label="Valor simulado" id="sim-amount" large />

          <Field label="Descrição" htmlFor="sim-desc">
            <input id="sim-desc" type="text" value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="iPhone 16, TV 4K, Viagem..."
              style={{ ...dateInputStyle }}
              onFocus={e => e.target.style.borderColor = 'var(--violet)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Conta" htmlFor="sim-acc">
              <select id="sim-acc" value={accountId} onChange={e => setAccountId(e.target.value)}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                <option value="">Selecionar...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Categoria" htmlFor="sim-cat">
              <select id="sim-cat" value={categoryId} onChange={e => setCategoryId(e.target.value)}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                <option value="">Sem categoria</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Data" htmlFor="sim-date">
              <input id="sim-date" type="date" value={date}
                onChange={e => setDate(e.target.value)}
                style={dateInputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
            <Field label="Parcelas" htmlFor="sim-parcelas">
              <input id="sim-parcelas" type="number" value={parcelas}
                onChange={e => setParcelas(Math.max(1, Math.min(48, parseInt(e.target.value) || 1)))}
                min={1} max={48}
                style={{
                  ...dateInputStyle,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700, fontSize: 20, textAlign: 'center',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
          </div>

          {parcelas > 1 && amount > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(136,141,218,0.06)', border: '1px solid rgba(136,141,218,0.2)',
              fontSize: 12, color: 'var(--violet)',
            }}>
              {parcelas}× de{' '}
              <strong>R$ {(amount / parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          )}

          {error && <FormError>{error}</FormError>}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: 14,
          }}>Cancelar</button>
          <Button
            onClick={submit}
            loading={loading}
            icon={<FlaskConical size={14}/>}
            style={{ flex: 2, background: 'var(--violet)', color: 'white' }}
          >
            Simular
          </Button>
        </div>
      </div>
    </>
  )
}
