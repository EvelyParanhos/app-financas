import { useState, useEffect } from 'react'
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Check } from 'lucide-react'
import { accountsAPI, categoriesAPI, transactionsAPI } from '../../services/api'
import { Field, Button, FormError } from '../ui/FormElements'
import { useAuth } from '../../contexts/AuthContext'

const TYPES = [
  { value: 'EXPENSE',  label: 'Gasto',       icon: ArrowUpRight,   color: 'var(--danger)' },
  { value: 'INCOME',   label: 'Entrada',      icon: ArrowDownLeft,  color: 'var(--mint)'   },
  { value: 'TRANSFER', label: 'Transferência',icon: ArrowLeftRight, color: 'var(--violet)' },
]

const today = () => new Date().toISOString().split('T')[0]

export default function NewTransactionModal({
  onClose, onSaved, month, year, defaultSimulation = false,
}) {
  const { user } = useAuth()

  const [type,        setType]        = useState('EXPENSE')
  const [description, setDescription] = useState('')
  const [amount,      setAmount]      = useState('')
  const [date,        setDate]        = useState(today())
  const [accountId,   setAccountId]   = useState('')
  const [destId,      setDestId]      = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [parcelas,    setParcelas]    = useState(1)
  const [isSimulation,setIsSimulation]= useState(defaultSimulation)

  const [accounts,   setAccounts]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // Load accounts + categories on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: accs }, { data: cats }] = await Promise.all([
          accountsAPI.list(true),        // includes partner's shared accounts
          categoriesAPI.listCouple(),    // my categories + partner's
        ])
        setAccounts(accs || [])
        setCategories(cats || [])
        // Pre-select first non-investment account
        const first = (accs || []).find(a => a.type !== 'INVESTMENT')
        if (first) setAccountId(first.id)
      } catch { /* ignore — fields stay empty */ }
    }
    load()
  }, [])

  // Filter categories by transaction type
  const filteredCats = categories.filter(c => {
    if (type === 'EXPENSE')   return c.type === 'EXPENSE'
    if (type === 'INCOME')    return c.type === 'INCOME'
    return c.type === 'TRANSFER'
  })

  // Available accounts for destination (TRANSFER only — exclude origin)
  const destAccounts = accounts.filter(a => a.id !== accountId && a.type !== 'INVESTMENT')

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Informe uma descrição.'); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Informe um valor válido.'); return
    }
    if (!accountId) { setError('Selecione uma conta.'); return }
    if (type === 'TRANSFER' && !destId) {
      setError('Selecione a conta de destino.'); return
    }

    setError(''); setLoading(true)
    try {
      const payload = {
        description: description.trim(),
        totalAmount: parseFloat(amount),
        purchaseDate: date,
        type,
        isSimulation,
        account:   { id: accountId },
        category:  categoryId ? { id: categoryId } : null,
        destinationAccount: type === 'TRANSFER' ? { id: destId } : null,
      }
      await transactionsAPI.create(payload, parcelas)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar transação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>
              Nova transação
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Preencha os dados abaixo para registrar
            </div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        {/* Body */}
        <div className="scrollable" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6 }}>
            {TYPES.map(({ value, label, icon: Icon, color }) => {
              const active = type === value
              return (
                <button key={value} onClick={() => { setType(value); setCategoryId('') }} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8,
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  background: active ? `rgba(${colorToRgb(color)},0.08)` : 'var(--bg-float)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 5, transition: 'all var(--duration)',
                  color: active ? color : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
                }}>
                  <Icon size={15} />
                  {label}
                </button>
              )
            })}
          </div>

          {/* Description */}
          <Field label="Descrição" htmlFor="tx-desc">
            <input
              id="tx-desc" type="text" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={
                type === 'EXPENSE'  ? 'Supermercado, Aluguel...' :
                type === 'INCOME'   ? 'Salário, Freelance...' :
                'Transferência para reserva...'
              }
              className="field-input" autoFocus
            />
          </Field>

          {/* Amount + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Valor (R$)" htmlFor="tx-amount">
              <input
                id="tx-amount" type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00" min="0.01" step="0.01"
                className="field-input"
              />
            </Field>
            <Field label="Data" htmlFor="tx-date">
              <input
                id="tx-date" type="date" value={date}
                onChange={e => setDate(e.target.value)}
                className="field-input"
              />
            </Field>
          </div>

          {/* Account */}
          <Field label="Conta" htmlFor="tx-account">
            <select
              id="tx-account" value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="field-input"
            >
              <option value="">Selecione uma conta...</option>
              {accounts
                .filter(a => a.type !== 'INVESTMENT')
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type === 'CREDIT_CARD' ? 'Cartão' :
                              a.type === 'CASH'         ? 'Carteira' :
                              a.type === 'CHECKING'     ? 'Corrente' : a.type})
                    {a.owner?.id !== user?.id ? ' — parceiro(a)' : ''}
                  </option>
                ))}
            </select>
          </Field>

          {/* Destination account — TRANSFER only */}
          {type === 'TRANSFER' && (
            <Field label="Conta destino" htmlFor="tx-dest">
              <select
                id="tx-dest" value={destId}
                onChange={e => setDestId(e.target.value)}
                className="field-input"
              >
                <option value="">Selecione a conta destino...</option>
                {destAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                    {a.owner?.id !== user?.id ? ' — parceiro(a)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Category */}
          {type !== 'TRANSFER' && (
            <Field label="Categoria" htmlFor="tx-cat">
              <select
                id="tx-cat" value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="field-input"
              >
                <option value="">Sem categoria</option>
                {filteredCats.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Parcelas — EXPENSE only */}
          {type === 'EXPENSE' && (
            <Field label="Parcelas" htmlFor="tx-parc">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 10, 12, 18, 24].map(n => (
                  <button key={n} onClick={() => setParcelas(n)} style={{
                    padding: '6px 12px', borderRadius: 6,
                    border: `1px solid ${parcelas === n ? 'var(--lime)' : 'var(--border)'}`,
                    background: parcelas === n ? 'rgba(202,247,41,0.08)' : 'var(--bg-float)',
                    color: parcelas === n ? 'var(--lime)' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all var(--duration)',
                  }}>
                    {n}x
                  </button>
                ))}
              </div>
              {parcelas > 1 && amount && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {parcelas}× de R$ {(parseFloat(amount) / parcelas).toFixed(2).replace('.', ',')}
                </div>
              )}
            </Field>
          )}

          {/* Simulation toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 8,
            background: isSimulation ? 'rgba(136,141,218,0.06)' : 'var(--bg-float)',
            border: `1px solid ${isSimulation ? 'rgba(136,141,218,0.2)' : 'var(--border)'}`,
            transition: 'all var(--duration)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isSimulation ? 'var(--violet)' : 'var(--text-primary)' }}>
                É uma simulação
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Aparece no dashboard com destaque — não afeta o saldo real
              </div>
            </div>
            <Toggle active={isSimulation} onChange={setIsSimulation} color="var(--violet)" />
          </div>

          {error && <FormError>{error}</FormError>}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" loading={loading} icon={<Check size={14}/>} onClick={handleSubmit}>
            {isSimulation ? 'Criar simulação' : 'Registrar'}
          </Button>
        </div>
      </div>
    </Overlay>
  )
}

/* ── Helpers ── */
function Overlay({ children, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s var(--ease) both',
      }}
    >
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-bright)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        animation: 'fadeUp 0.25s var(--ease) both',
      }}>
        {children}
      </div>
    </div>
  )
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, border: 'none',
      background: 'var(--bg-hover)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', transition: 'all var(--duration)',
    }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
    >
      <X size={15} />
    </button>
  )
}

function Toggle({ active, onChange, color = 'var(--lime)' }) {
  return (
    <div onClick={() => onChange(!active)} style={{
      width: 36, height: 20, borderRadius: 99, flexShrink: 0,
      background: active ? color : 'var(--bg-overlay)',
      border: '1px solid var(--border)',
      position: 'relative', cursor: 'pointer',
      transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 3,
        left: active ? 17 : 3,
        width: 12, height: 12, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

function colorToRgb(cssVar) {
  const map = {
    'var(--danger)': '240,82,82',
    'var(--mint)':   '121,221,126',
    'var(--violet)': '136,141,218',
    'var(--lime)':   '202,247,41',
    'var(--teal)':   '46,203,170',
  }
  return map[cssVar] || '255,255,255'
}