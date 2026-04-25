import { useState, useEffect } from 'react'
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Check, ChevronDown } from 'lucide-react'
import { transactionsAPI, accountsAPI, categoriesAPI } from '../../services/api'
import { Button, Field, FormError } from '../ui/FormElements'
import CurrencyInput from '../ui/CurrencyInput'

const TYPES = [
  { value: 'EXPENSE',  label: 'Gasto',       icon: ArrowUpRight,   color: 'var(--danger)' },
  { value: 'INCOME',   label: 'Entrada',      icon: ArrowDownLeft,  color: 'var(--mint)' },
  { value: 'TRANSFER', label: 'Transferência',icon: ArrowLeftRight, color: 'var(--violet)' },
]

export default function NewTransactionModal({ onClose, onSaved, month, year }) {
  const [type,       setType]       = useState('EXPENSE')
  const [amount,     setAmount]     = useState(0)
  const [desc,       setDesc]       = useState('')
  const [accountId,  setAccountId]  = useState('')
  const [destId,     setDestId]     = useState('')
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
    const load = async () => {
      try {
        const [{ data: accs }, { data: cats }] = await Promise.all([
          accountsAPI.list(true),
          categoriesAPI.listCouple(),
        ])
        setAccounts(accs || [])
        setCategories((cats || []).filter(c => c.active !== false))
        if (accs?.length) setAccountId(accs[0].id)
      } catch { /* silently fail */ }
    }
    load()
  }, [])

  const filteredCategories = categories.filter(c => {
    if (type === 'EXPENSE') return c.type === 'EXPENSE'
    if (type === 'INCOME')  return c.type === 'INCOME'
    return true
  })

  const nonCreditAccounts = accounts.filter(a => a.type !== 'CREDIT_CARD' && a.type !== 'INVESTMENT')

  const submit = async () => {
    if (!desc.trim())   return setError('Informe uma descrição.')
    if (amount <= 0)    return setError('Informe um valor.')
    if (!accountId)     return setError('Selecione uma conta.')
    if (type === 'TRANSFER' && !destId) return setError('Selecione a conta de destino.')

    setError(''); setLoading(true)
    try {
      const payload = {
        description: desc.trim(),
        totalAmount: amount,
        purchaseDate: date,
        type,
        account: { id: accountId },
        category: categoryId ? { id: categoryId } : null,
        isSimulation: false,
      }
      if (type === 'TRANSFER') {
        payload.destinationAccount = { id: destId }
      }
      await transactionsAPI.create(payload, Math.max(1, parseInt(parcelas) || 1))
      onSaved?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar transação.')
    } finally {
      setLoading(false)
    }
  }

  const currentType = TYPES.find(t => t.value === type)

  const selectStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg-float)', border: '1.5px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
    cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A8FA8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 36,
    transition: 'border-color 0.2s',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', zIndex: 100,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 480,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        zIndex: 101,
        animation: 'fadeUp 0.25s var(--ease) both',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            Nova transação
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
        <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {TYPES.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => { setType(value); setCategoryId('') }}
                style={{
                  flex: 1, padding: '9px 8px',
                  borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${type === value ? color : 'var(--border)'}`,
                  background: type === value ? `rgba(${rgbOf(color)},0.1)` : 'var(--bg-float)',
                  color: type === value ? color : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Amount — PIX style */}
          <div style={{ marginBottom: 20 }}>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              label="Valor"
              id="tx-amount"
              large
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <Field label="Descrição" htmlFor="tx-desc">
              <input
                id="tx-desc"
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder={type === 'EXPENSE' ? 'Netflix, Mercado...' : type === 'INCOME' ? 'Salário, Freelance...' : 'PIX para conta...'}
                className="field-input"
                style={{ fontSize: 15 }}
              />
            </Field>
          </div>

          {/* Account */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'TRANSFER' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
            <Field label={type === 'TRANSFER' ? 'De (conta origem)' : type === 'EXPENSE' ? 'Pagar com' : 'Receber em'} htmlFor="tx-account">
              <select
                id="tx-account"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                <option value="">Selecionar conta...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type === 'CREDIT_CARD' ? 'Cartão' : a.type === 'CASH' ? 'Carteira' : a.type === 'INVESTMENT' ? 'Investimento' : 'Corrente'})
                  </option>
                ))}
              </select>
            </Field>

            {type === 'TRANSFER' && (
              <Field label="Para (conta destino)" htmlFor="tx-dest">
                <select
                  id="tx-dest"
                  value={destId}
                  onChange={e => setDestId(e.target.value)}
                  style={selectStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="">Selecionar conta...</option>
                  {nonCreditAccounts.filter(a => a.id !== accountId).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Category */}
          {type !== 'TRANSFER' && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Categoria" htmlFor="tx-cat">
                <select
                  id="tx-cat"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  style={selectStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="">Sem categoria</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* Date + Installments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Data" htmlFor="tx-date">
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="field-input"
              />
            </Field>

            {type === 'EXPENSE' && (
              <Field label="Parcelas" htmlFor="tx-parcelas" hint="Quantidade de vezes">
                <input
                  id="tx-parcelas"
                  type="number"
                  value={parcelas}
                  onChange={e => setParcelas(Math.max(1, Math.min(48, parseInt(e.target.value) || 1)))}
                  min={1} max={48}
                  className="field-input"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, textAlign: 'center' }}
                />
              </Field>
            )}
          </div>

          {/* Parcelas preview */}
          {type === 'EXPENSE' && parcelas > 1 && amount > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(202,247,41,0.06)', border: '1px solid var(--border-accent)',
              fontSize: 12, color: 'var(--lime)', marginBottom: 14,
            }}>
              {parcelas}x de <strong>R$ {(amount / parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
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
            flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-float)', cursor: 'pointer',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13,
          }}>
            Cancelar
          </button>
          <Button onClick={submit} loading={loading} icon={<Check size={14}/>} style={{ flex: 2 }}>
            Registrar
          </Button>
        </div>
      </div>
    </>
  )
}

function rgbOf(color) {
  const map = {
    'var(--danger)': '240,82,82',
    'var(--mint)':   '121,221,126',
    'var(--violet)': '136,141,218',
    'var(--teal)':   '46,203,170',
    'var(--lime)':   '202,247,41',
  }
  return map[color] || '255,255,255'
}