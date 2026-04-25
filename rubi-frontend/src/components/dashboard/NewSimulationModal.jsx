import { useState, useEffect } from 'react'
import { X, Check, FlaskConical } from 'lucide-react'
import { transactionsAPI, accountsAPI, categoriesAPI } from '../../services/api'
import { Button, Field, FormError } from '../ui/FormElements'
import CurrencyInput from '../ui/CurrencyInput'

export default function NewSimulationModal({ onClose, onSaved, month, year }) {
  const [amount,     setAmount]     = useState(0)
  const [desc,       setDesc]       = useState('')
  const [accountId,  setAccountId]  = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [parcelas,   setParcelas]   = useState(1)
  const [date,       setDate]       = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
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
      setAccounts(accs || [])
      setCategories((cats || []).filter(c => c.active !== false && c.type === 'EXPENSE'))
      if (accs?.length) setAccountId(accs[0].id)
    }).catch(() => {})
  }, [])

  const submit = async () => {
    if (!desc.trim()) return setError('Informe uma descrição.')
    if (amount <= 0)  return setError('Informe um valor.')
    if (!accountId)   return setError('Selecione uma conta.')

    setError(''); setLoading(true)
    try {
      await transactionsAPI.create({
        description: desc.trim(),
        totalAmount: amount,
        purchaseDate: date,
        type: 'EXPENSE',
        account: { id: accountId },
        category: categoryId ? { id: categoryId } : null,
        isSimulation: true,
      }, Math.max(1, parseInt(parcelas) || 1))
      onSaved?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar simulação.')
    } finally { setLoading(false) }
  }

  const selectStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg-float)', border: '1.5px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', cursor: 'pointer',
    transition: 'border-color 0.2s',
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 100,
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 460,
        background: 'var(--bg-raised)', border: '1px solid rgba(136,141,218,0.3)',
        borderRadius: 16, overflow: 'hidden', zIndex: 101,
        animation: 'fadeUp 0.25s var(--ease) both',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          background: 'rgba(136,141,218,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={18} color="var(--violet)" />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
              Nova simulação
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: 'var(--bg-overlay)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
          }}>
            <X size={14} />
          </button>
        </div>

        <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(136,141,218,0.06)', border: '1px solid rgba(136,141,218,0.2)',
            color: 'var(--violet)', fontSize: 12,
          }}>
            Esta transação será marcada como simulação — não afeta seu saldo real.
          </div>

          <CurrencyInput value={amount} onChange={setAmount} label="Valor simulado" id="sim-amount" large />

          <Field label="Descrição" htmlFor="sim-desc">
            <input id="sim-desc" type="text" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="iPhone 16, TV 4K, Viagem..." className="field-input" style={{ fontSize: 15 }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Conta" htmlFor="sim-acc">
              <select id="sim-acc" value={accountId} onChange={e => setAccountId(e.target.value)}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}>
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
                onBlur={e => e.target.style.borderColor = 'var(--border)'}>
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
                onChange={e => setDate(e.target.value)} className="field-input" />
            </Field>
            <Field label="Parcelas" htmlFor="sim-parcelas">
              <input id="sim-parcelas" type="number" value={parcelas}
                onChange={e => setParcelas(Math.max(1, Math.min(48, parseInt(e.target.value) || 1)))}
                min={1} max={48} className="field-input"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, textAlign: 'center' }} />
            </Field>
          </div>

          {parcelas > 1 && amount > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(136,141,218,0.06)', border: '1px solid rgba(136,141,218,0.2)',
              fontSize: 12, color: 'var(--violet)',
            }}>
              {parcelas}x de <strong>R$ {(amount / parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          )}

          {error && <FormError>{error}</FormError>}
        </div>

        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: 13,
          }}>Cancelar</button>
          <Button onClick={submit} loading={loading}
            icon={<FlaskConical size={14}/>}
            style={{ flex: 2, background: 'var(--violet)', color: 'white' }}>
            Simular
          </Button>
        </div>
      </div>
    </>
  )
}