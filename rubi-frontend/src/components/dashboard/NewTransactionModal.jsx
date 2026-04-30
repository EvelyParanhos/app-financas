/**
 * NewTransactionModal.jsx
 *
 * Regras de negócio (#5):
 * - EXPENSE  → qualquer conta exceto INVESTMENT
 * - INCOME   → apenas CASH ou CHECKING
 * - TRANSFER → origem CASH/CHECKING; destino CASH, CHECKING ou INVESTMENT
 *
 * Parcelas: campo numérico manual (não dropdown), padrão 1
 * Contas: GET /api/accounts?includePartner=true
 * Categorias: GET /api/categories/casal
 */
import { useState, useEffect } from 'react'
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Check } from 'lucide-react'
import { transactionsAPI, accountsAPI, categoriesAPI } from '../../services/api'
import { Button, Field, FormError } from '../ui/FormElements'
import CurrencyInput from '../ui/CurrencyInput'

const TYPES = [
  { value: 'EXPENSE',  label: 'Gasto',        icon: ArrowUpRight,   color: 'var(--danger)' },
  { value: 'INCOME',   label: 'Entrada',       icon: ArrowDownLeft,  color: 'var(--mint)' },
  { value: 'TRANSFER', label: 'Transferência', icon: ArrowLeftRight, color: 'var(--violet)' },
]

// Etiquetas legíveis por tipo de conta
const ACCOUNT_LABEL = {
  CASH: 'Carteira', CHECKING: 'Corrente',
  CREDIT_CARD: 'Cartão', INVESTMENT: 'Investimento',
}

export default function NewTransactionModal({ onClose, onSaved, onSuccess, month, year }) {
  const [type,       setType]       = useState('EXPENSE')
  const [amount,     setAmount]     = useState(0)
  const [desc,       setDesc]       = useState('')
  const [accountId,  setAccountId]  = useState('')
  const [destId,     setDestId]     = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [parcelas,   setParcelas]   = useState(1)
  const [date,       setDate]       = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const [allAccounts, setAllAccounts] = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: accs }, { data: cats }] = await Promise.all([
          accountsAPI.list(true),
          categoriesAPI.listCouple(),
        ])
        setAllAccounts(accs || [])
        setCategories((cats || []).filter(c => c.active !== false))
      } catch (err) {
        setError(err.response?.data?.message || 'Nao foi possivel carregar contas e categorias.')
      }
    }
    load()
  }, [])

  // ── Filtros de conta por tipo de transação ──────────────────────────
  const accountsForOrigin = (() => {
    switch (type) {
      case 'EXPENSE':
        // Gastos: qualquer conta exceto INVESTMENT
        return allAccounts.filter(a => a.type !== 'INVESTMENT')
      case 'INCOME':
        // Entradas: só CASH ou CHECKING
        return allAccounts.filter(a => a.type === 'CASH' || a.type === 'CHECKING')
      case 'TRANSFER':
        // Transferência origem: só CASH ou CHECKING
        return allAccounts.filter(a => a.type === 'CASH' || a.type === 'CHECKING')
      default:
        return allAccounts
    }
  })()

  // Destino da transferência: CASH ou CHECKING, diferente da origem
  const accountsForDest = allAccounts
    .filter(a => (a.type === 'CASH' || a.type === 'CHECKING' || a.type === 'INVESTMENT') && a.id !== accountId)

  // Categorias filtradas por tipo
  const filteredCategories = categories.filter(c => {
    if (type === 'EXPENSE') return c.type === 'EXPENSE'
    if (type === 'INCOME')  return c.type === 'INCOME'
    return true
  })

  // Reset accountId quando o tipo muda e a conta atual não é mais válida
  const handleTypeChange = (newType) => {
    setType(newType)
    setCategoryId('')

    // Verifica se a conta atual ainda é válida para o novo tipo
    const currentAcc = allAccounts.find(a => a.id === accountId)
    if (currentAcc) {
      let stillValid = true
      if (newType === 'INCOME' && currentAcc.type !== 'CASH' && currentAcc.type !== 'CHECKING') {
        stillValid = false
      }
      if (newType === 'TRANSFER' && currentAcc.type !== 'CASH' && currentAcc.type !== 'CHECKING') {
        stillValid = false
      }
      if (!stillValid) setAccountId('')
    }
    setDestId('')
  }

  // Auto-selecionar primeira conta disponível quando o tipo muda
  useEffect(() => {
    if (accountId) return // já tem conta selecionada
    if (accountsForOrigin.length) setAccountId(accountsForOrigin[0].id)
  }, [type, allAccounts]) // eslint-disable-line

  // ── Submit ────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!desc.trim())                          return setError('Informe uma descrição.')
    if (amount <= 0)                           return setError('Informe um valor maior que zero.')
    if (!accountId)                            return setError('Selecione uma conta.')
    if (type === 'TRANSFER' && !destId)        return setError('Selecione a conta de destino.')
    if (type === 'TRANSFER' && destId === accountId) return setError('Origem e destino devem ser contas diferentes.')

    setError(''); setLoading(true)
    try {
      const payload = {
        description:  desc.trim(),
        totalAmount:  amount,
        purchaseDate: date,
        type,
        account:      { id: accountId },
        category:     categoryId ? { id: categoryId } : null,
        isSimulation: false,
      }
      if (type === 'TRANSFER') {
        payload.destinationAccount = { id: destId }
      }
      await transactionsAPI.create(payload, Math.max(1, parseInt(parcelas) || 1))
      onClose?.()
      await onSuccess?.()
      onSaved?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar transação.')
    } finally { setLoading(false) }
  }

  const currentType = TYPES.find(t => t.value === type)

  // ── Estilos inline ────────────────────────────────────────────────────
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
    width: '100%',
    padding: '14px 16px',
    background: 'var(--bg-float)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    outline: 'none',
    minHeight: 48,
    transition: 'border-color 0.2s',
    colorScheme: 'dark',
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
        width: 'min(500px, calc(100vw - 32px))',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        zIndex: 101,
        animation: 'modalEnter 0.25s var(--ease) both',
        maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
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
        <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Seletor de tipo */}
          <div style={{ display: 'flex', gap: 6 }}>
            {TYPES.map(({ value, label, icon: Icon, color }) => (
              <button key={value} onClick={() => handleTypeChange(value)} style={{
                flex: 1, padding: '10px 8px',
                borderRadius: 8, cursor: 'pointer',
                border: `1.5px solid ${type === value ? color : 'var(--border)'}`,
                background: type === value ? `rgba(${rgbOf(color)},0.1)` : 'var(--bg-float)',
                color: type === value ? color : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Valor PIX-style */}
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            label="Valor"
            id="tx-amount"
            large
          />

          {/* Descrição */}
          <Field label="Descrição" htmlFor="tx-desc">
            <input
              id="tx-desc" type="text" value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={
                type === 'EXPENSE'  ? 'Netflix, Supermercado...' :
                type === 'INCOME'   ? 'Salário, Freelance...' :
                                      'PIX para conta...'
              }
              style={dateInputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--lime)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>

          {/* Conta — com regras de tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'TRANSFER' ? '1fr 1fr' : '1fr', gap: 12 }}>
            <Field
              label={type === 'TRANSFER' ? 'De (origem)' : type === 'EXPENSE' ? 'Pagar com' : 'Receber em'}
              htmlFor="tx-account"
            >
              <select
                id="tx-account" value={accountId}
                onChange={e => setAccountId(e.target.value)}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                <option value="">Selecionar conta...</option>
                {accountsForOrigin.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({ACCOUNT_LABEL[a.type] || a.type})
                  </option>
                ))}
              </select>

              {/* Dica contextual */}
              {type === 'INCOME' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Entradas só podem ir para Carteira ou Conta corrente.
                </div>
              )}
              {type === 'TRANSFER' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Transferencias podem ir para Carteira, Conta corrente ou Investimento.
                </div>
              )}
            </Field>

            {type === 'TRANSFER' && (
              <Field label="Para (destino)" htmlFor="tx-dest">
                <select
                  id="tx-dest" value={destId}
                  onChange={e => setDestId(e.target.value)}
                  style={selectStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="">Selecionar conta...</option>
                  {accountsForDest.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({ACCOUNT_LABEL[a.type] || a.type})
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Categoria — só para EXPENSE e INCOME */}
          {type !== 'TRANSFER' && (
            <Field label="Categoria" htmlFor="tx-cat">
              <select
                id="tx-cat" value={categoryId}
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
          )}

          {/* Data + Parcelas */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'EXPENSE' ? '1fr 1fr' : '1fr', gap: 12 }}>
            <Field label="Data" htmlFor="tx-date">
              <input
                id="tx-date" type="date" value={date}
                onChange={e => setDate(e.target.value)}
                style={dateInputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>

            {/* Parcelas — campo numérico manual, só para EXPENSE */}
            {type === 'EXPENSE' && (
              <Field label="Parcelas" htmlFor="tx-parcelas" hint="Quantas vezes">
                <input
                  id="tx-parcelas" type="number" value={parcelas}
                  onChange={e => setParcelas(Math.max(1, Math.min(48, parseInt(e.target.value) || 1)))}
                  min={1} max={48}
                  style={{
                    ...dateInputStyle,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700, fontSize: 20, textAlign: 'center',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </Field>
            )}
          </div>

          {/* Preview de parcelas */}
          {type === 'EXPENSE' && parcelas > 1 && amount > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(202,247,41,0.06)', border: '1px solid var(--border-accent)',
              fontSize: 12, color: 'var(--lime)',
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
            background: 'var(--bg-float)', cursor: 'pointer',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14,
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
  const m = {
    'var(--danger)': '240,82,82',
    'var(--mint)':   '121,221,126',
    'var(--violet)': '136,141,218',
  }
  return m[color] || '255,255,255'
}
