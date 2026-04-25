import { useState } from 'react'
import { X, Check, Repeat } from 'lucide-react'
import { Button, FormError } from '../ui/FormElements'
import CurrencyInput from '../ui/CurrencyInput'

export default function PayInstallmentModal({ item, onClose, onConfirm }) {
  const [amount, setAmount] = useState(Number(item?.amount || 0))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (amount <= 0) return setError('Informe um valor.')
    setError(''); setLoading(true)
    try {
      await onConfirm(item, amount)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar.')
      setLoading(false)
    }
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
        width: '100%', maxWidth: 380,
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden', zIndex: 103,
        animation: 'fadeUp 0.2s var(--ease) both',
      }}>
        {/* Header */}
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
              <Repeat size={15} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                Confirmar pagamento
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Transação recorrente
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

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Item name */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'var(--bg-float)', border: '1px solid var(--border)',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>
              {item?.transactionDescription}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {item?.categoryName} {item?.dueDate
                ? `• ${new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                : ''}
            </div>
          </div>

          {/* Amount with PIX style */}
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            label="Valor real"
            id="pay-amount"
            large
          />

          {/* Hint */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            Valor estimado: R$ {Number(item?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            {' '}— ajuste se necessário
          </div>

          {error && <FormError style={{ marginTop: 12 }}>{error}</FormError>}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
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