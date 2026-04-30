import { useEffect, useMemo, useState } from 'react'
import { X, Check, Repeat, CreditCard, Wallet } from 'lucide-react'
import { accountsAPI } from '../../services/api'
import { Button, FormError } from '../ui/FormElements'
import CurrencyInput from '../ui/CurrencyInput'

const ACCOUNT_LABEL = {
  CASH: 'Carteira',
  CHECKING: 'Corrente',
}

function kindOf(item) {
  if (item?.checklistType) return item.checklistType
  if (item?.invoiceId) return 'INVOICE'
  if (item?.recurringTransactionId) return 'RECURRING'
  return 'INSTALLMENT'
}

export default function PayInstallmentModal({ item, onClose, onConfirm, onSuccess }) {
  const kind = kindOf(item)
  const [amount, setAmount] = useState(Number(item?.amount || 0))
  const [accounts, setAccounts] = useState([])
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sourceAccounts = useMemo(
    () => accounts.filter(a => a.type === 'CASH' || a.type === 'CHECKING'),
    [accounts]
  )

  useEffect(() => {
    setAmount(Number(item?.amount || 0))
    setError('')
  }, [item])

  useEffect(() => {
    if (kind !== 'INVOICE') return

    const load = async () => {
      try {
        const { data } = await accountsAPI.list(true)
        setAccounts(data || [])
      } catch (err) {
        setAccounts([])
        setError(err.response?.data?.message || 'Nao foi possivel carregar as contas de pagamento.')
      }
    }
    load()
  }, [kind])

  useEffect(() => {
    if (!sourceAccountId && sourceAccounts.length) {
      setSourceAccountId(sourceAccounts[0].id)
    }
  }, [sourceAccounts, sourceAccountId])

  const copy = {
    INVOICE: {
      title: 'Pagar fatura',
      subtitle: 'Cartao de credito',
      icon: <CreditCard size={15} />,
      amountLabel: 'Valor a pagar',
      hint: 'O pagamento reduz o saldo da conta escolhida.',
    },
    RECURRING: {
      title: item?.transactionType === 'INCOME' ? 'Confirmar entrada' : 'Confirmar pagamento',
      subtitle: 'Transacao recorrente',
      icon: <Repeat size={15} />,
      amountLabel: 'Valor real',
      hint: 'Ao confirmar, a recorrencia entra no mes e fica concluida.',
    },
    INSTALLMENT: {
      title: 'Confirmar pagamento',
      subtitle: 'Parcela do mes',
      icon: <Wallet size={15} />,
      amountLabel: 'Valor',
      hint: 'Ao confirmar, o saldo real sera atualizado.',
    },
  }[kind]

  const handle = async () => {
    if (amount <= 0) return setError('Informe um valor maior que zero.')
    if (kind === 'INVOICE' && !sourceAccountId) {
      return setError('Selecione a conta de pagamento.')
    }

    setError('')
    setLoading(true)
    try {
      await onConfirm(item, { amount, sourceAccountId })
      onClose?.()
      await onSuccess?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao confirmar.')
      setLoading(false)
    }
  }

  const selectStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-float)',
    border: '1.5px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 102,
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(420px, calc(100vw - 32px))',
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden', zIndex: 103,
        animation: 'modalEnter 0.2s var(--ease) both',
      }}>
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(46,203,170,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--teal)',
            }}>
              {copy.icon}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                {copy.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {copy.subtitle}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: 'var(--bg-overlay)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
          }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: 'var(--bg-float)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
              {item?.transactionDescription}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {item?.categoryName}
              {item?.dueDate
                ? ` - ${new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                : ''}
            </div>
          </div>

          {kind === 'INSTALLMENT' ? (
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'rgba(202,247,41,0.06)', border: '1px solid var(--border-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{copy.amountLabel}</span>
              <strong style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>
                R$ {Number(item?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          ) : (
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              label={copy.amountLabel}
              id="checklist-amount"
              large
            />
          )}

          {kind === 'INVOICE' && (
            <div>
              <label htmlFor="invoice-source-account" style={{
                display: 'block', fontSize: 11, color: 'var(--text-secondary)',
                fontWeight: 700, textTransform: 'uppercase', marginBottom: 6,
              }}>
                Pagar com
              </label>
              <select
                id="invoice-source-account"
                value={sourceAccountId}
                onChange={e => setSourceAccountId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Selecionar conta...</option>
                {sourceAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({ACCOUNT_LABEL[a.type] || a.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            {copy.hint}
          </div>

          {error && <FormError>{error}</FormError>}
        </div>

        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13,
          }}>
            Cancelar
          </button>
          <Button onClick={handle} loading={loading} icon={<Check size={14}/>} style={{ flex: 2 }}>
            Confirmar
          </Button>
        </div>
      </div>
    </>
  )
}
