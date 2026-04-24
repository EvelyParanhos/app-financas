    import { useState } from 'react'
import { X, Check, AlertCircle, DollarSign } from 'lucide-react'
import { Button, FormError } from '../ui/FormElements'

function fmt(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

/**
 * Modal de confirmação para materializar uma transação recorrente virtual.
 *
 * Props:
 *  item       — InstallmentItemDTO virtual (tem recurringTransactionId, isVariable)
 *  onClose    — fecha o modal
 *  onConfirm  — (item, actualAmount) → chama recurringAPI.materialize
 */
export default function PayInstallmentModal({ item, onClose, onConfirm }) {
  const [actualAmount, setActualAmount] = useState(
    item.amount ? String(item.amount) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const isIncome  = item.transactionType === 'INCOME'
  const accentColor = isIncome ? 'var(--mint)' : 'var(--lime)'
  const accentRgb   = isIncome ? '121,221,126' : '202,247,41'

  const handleConfirm = async () => {
    if (item.isVariable) {
      const val = parseFloat(actualAmount)
      if (!actualAmount || isNaN(val) || val <= 0) {
        setError('Informe um valor maior que zero.'); return
      }
    }
    setError(''); setLoading(true)
    try {
      const finalAmount = item.isVariable ? parseFloat(actualAmount) : null
      await onConfirm(item, finalAmount)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao confirmar.')
      setLoading(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 420 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `rgba(${accentRgb},0.1)`,
              border: `1px solid rgba(${accentRgb},0.2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accentColor,
            }}>
              <Check size={15} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>
                Confirmar pagamento
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                Transação fixa do mês
              </div>
            </div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Item preview */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'var(--bg-float)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                {item.transactionDescription}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {item.categoryName && `${item.categoryName} • `}
                {isIncome ? 'Entrada' : 'Gasto'} fixo
                {item.isVariable && <span style={{ color: 'var(--teal)', marginLeft: 4 }}>• variável</span>}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
              color: accentColor, flexShrink: 0,
            }}>
              {item.isVariable ? '—' : fmt(item.amount)}
            </div>
          </div>

          {/* Variable amount input */}
          {item.isVariable ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8,
                background: 'rgba(46,203,170,0.06)', border: '1px solid rgba(46,203,170,0.15)',
                color: 'var(--teal)', fontSize: 12, alignItems: 'flex-start',
              }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Este item tem valor variável. Informe o valor real deste mês antes de confirmar.</span>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <DollarSign size={14} />
                </div>
                <input
                  type="number" value={actualAmount}
                  onChange={e => { setActualAmount(e.target.value); setError('') }}
                  placeholder="0,00" min="0.01" step="0.01"
                  className="field-input"
                  style={{ paddingLeft: 32 }}
                  autoFocus
                />
              </div>
              {actualAmount && parseFloat(actualAmount) > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                  Estimativa: {fmt(item.amount)} • Você está confirmando: {fmt(parseFloat(actualAmount))}
                </div>
              )}
            </div>
          ) : (
            /* Fixed amount — info text */
            <div style={{
              display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8,
              background: `rgba(${accentRgb},0.04)`,
              border: `1px solid rgba(${accentRgb},0.12)`,
              color: accentColor, fontSize: 12, alignItems: 'flex-start',
            }}>
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Ao confirmar, <strong>{fmt(item.amount)}</strong> será registrado como{' '}
                {isIncome ? 'entrada' : 'gasto'} real deste mês e aparecerá no seu checklist.
              </span>
            </div>
          )}

          {error && <FormError>{error}</FormError>}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" loading={loading} icon={<Check size={14}/>} onClick={handleConfirm}>
            Confirmar
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