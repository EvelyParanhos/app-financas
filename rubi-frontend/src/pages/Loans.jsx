import { useState, useEffect } from 'react'
import {
  HandCoins, Plus, Check, X, AlertCircle,
  ArrowUpRight, ArrowDownLeft, ChevronDown,
} from 'lucide-react'
import { loansAPI, accountsAPI } from '../services/api'
import { Button, Field, FormError } from '../components/ui/FormElements'
import CurrencyInput from '../components/ui/CurrencyInput'

const fmt = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function Loans() {
  const [loans,    setLoans]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showNew,  setShowNew]  = useState(false)
  const [receiveId, setReceiveId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await loansAPI.list()
      setLoans(data || [])
    } catch { setLoans([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const forgive = async (id) => {
    if (!confirm('Perdoar este empréstimo? O valor será dado como não-cobrado.')) return
    try { await loansAPI.forgive(id); load() } catch {}
  }

  const external = loans.filter(l => !l.selfLoan)
  const selfLoans = loans.filter(l => l.selfLoan)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
            Empréstimos
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Controle o que você emprestou e para si mesmo
          </div>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} icon={<Plus size={14}/>}>
          Novo empréstimo
        </Button>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: '20px 24px' }}>
        {/* External loans */}
        <Section title="Emprestei para alguém" empty={external.length === 0} emptyMsg="Nenhum empréstimo externo ativo">
          {external.map(loan => (
            <LoanCard
              key={loan.id} loan={loan}
              onReceive={() => setReceiveId(loan.id)}
              onForgive={() => forgive(loan.id)}
              type="external"
            />
          ))}
        </Section>

        {/* Self loans */}
        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

        <Section title="Auto-empréstimo (da reserva para mim)" empty={selfLoans.length === 0} emptyMsg="Nenhum auto-empréstimo ativo">
          {selfLoans.map(loan => (
            <LoanCard
              key={loan.id} loan={loan}
              type="self"
            />
          ))}
        </Section>
      </div>

      {showNew && (
        <NewLoanModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
        />
      )}

      {receiveId && (
        <ReceiveModal
          loanId={receiveId}
          loan={loans.find(l => l.id === receiveId)}
          onClose={() => setReceiveId(null)}
          onSaved={() => { setReceiveId(null); load() }}
        />
      )}
    </div>
  )
}

function Section({ title, children, empty, emptyMsg }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
        {title}
      </div>
      {empty ? (
        <div style={{
          padding: '20px', textAlign: 'center', fontSize: 13,
          color: 'var(--text-muted)', border: '1px dashed var(--border)',
          borderRadius: 10,
        }}>
          {emptyMsg}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function LoanCard({ loan, onReceive, onForgive, type }) {
  const remaining = Number(loan.totalAmount) - Number(loan.paidAmount)
  const pct = Math.round((Number(loan.paidAmount) / Number(loan.totalAmount)) * 100)
  const statusColor = loan.status === 'PAID' ? 'var(--mint)' : loan.status === 'FORGIVEN' ? 'var(--text-muted)' : 'var(--lime)'

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${statusColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
            {type === 'self'
              ? `${loan.sourceAccount?.name} → ${loan.targetAccount?.name}`
              : loan.borrowerName || loan.borrowerUser?.name || 'Devedor'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {loan.status === 'PAID' ? '✓ Quitado' : loan.status === 'FORGIVEN' ? 'Perdoado' : 'Em aberto'}
            {loan.expectedReturnDate &&
              ` • Previsão: ${new Date(loan.expectedReturnDate).toLocaleDateString('pt-BR')}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: statusColor }}>
            {fmt(remaining)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>restante</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 99, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: statusColor,
          borderRadius: 99, transition: 'width 0.6s var(--ease)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        <span>Pago: {fmt(loan.paidAmount)}</span>
        <span>Total: {fmt(loan.totalAmount)}</span>
      </div>

      {loan.status === 'ACTIVE' && type === 'external' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onReceive} style={{
            flex: 1, padding: '7px 12px', borderRadius: 6,
            border: '1px solid var(--border-accent)', background: 'rgba(202,247,41,0.06)',
            color: 'var(--lime)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <ArrowDownLeft size={13} /> Registrar recebimento
          </button>
          <button onClick={onForgive} style={{
            padding: '7px 12px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)',
          }}>
            Perdoar
          </button>
        </div>
      )}

      {loan.notes && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {loan.notes}
        </div>
      )}
    </div>
  )
}

/* ── New Loan Modal ── */
function NewLoanModal({ onClose, onSaved }) {
  const [loanType, setLoanType]       = useState('external') // 'external' | 'self'
  const [borrowerName, setBorrower]   = useState('')
  const [amount, setAmount]           = useState(0)
  const [returnDate, setReturnDate]   = useState('')
  const [notes, setNotes]             = useState('')
  const [accounts, setAccounts]       = useState([])
  const [sourceId, setSourceId]       = useState('')
  const [destId, setDestId]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    accountsAPI.list(false).then(({ data }) => {
      setAccounts(data || [])
      const first = data?.find(a => a.type !== 'CREDIT_CARD')
      if (first) setSourceId(first.id)
    }).catch(() => {})
  }, [])

  const submit = async () => {
    if (amount <= 0) return setError('Informe um valor')
    if (!sourceId)   return setError('Selecione a conta de origem')
    if (loanType === 'external' && !borrowerName.trim()) return setError('Informe o nome do devedor')
    if (loanType === 'self' && !destId) return setError('Selecione a conta de destino')

    setError(''); setLoading(true)
    try {
      if (loanType === 'external') {
        await loansAPI.lendToThird({
          sourceAccountId: sourceId,
          borrowerName: borrowerName.trim(),
          totalAmount: amount,
          expectedReturnDate: returnDate || null,
          notes: notes || null,
        })
      } else {
        await loansAPI.selfLoan({
          sourceAccountId: sourceId,
          targetAccountId: destId,
          totalAmount: amount,
          totalParcelas: 1,
          notes: notes || null,
        })
      }
      onSaved?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar empréstimo')
    } finally { setLoading(false) }
  }

  const investmentAccounts = accounts.filter(a => a.type === 'INVESTMENT')
  const nonInvestmentAccounts = accounts.filter(a => a.type !== 'CREDIT_CARD' && a.type !== 'INVESTMENT')

  const selectStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg-float)', border: '1.5px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', cursor: 'pointer',
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
        width: '100%', maxWidth: 440,
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden', zIndex: 101,
        animation: 'fadeUp 0.25s var(--ease) both',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Novo empréstimo</div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: 'var(--bg-overlay)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
          }}><X size={13}/></button>
        </div>

        <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { value: 'external', label: 'Para outra pessoa' },
              { value: 'self',     label: 'Peguei da minha reserva' },
            ].map(({ value, label }) => (
              <button key={value} onClick={() => setLoanType(value)} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                border: `1.5px solid ${loanType === value ? 'var(--lime)' : 'var(--border)'}`,
                background: loanType === value ? 'rgba(202,247,41,0.08)' : 'var(--bg-float)',
                color: loanType === value ? 'var(--lime)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
              }}>
                {label}
              </button>
            ))}
          </div>

          <CurrencyInput value={amount} onChange={setAmount} label="Valor" id="loan-amount" large />

          {loanType === 'external' && (
            <Field label="Nome do devedor" htmlFor="borrower">
              <input id="borrower" value={borrowerName} onChange={e => setBorrower(e.target.value)}
                placeholder="João Silva..." className="field-input" />
            </Field>
          )}

          {/* Accounts */}
          <Field label={loanType === 'self' ? 'Tirar de (reserva/investimento)' : 'Sai de qual conta'} htmlFor="loan-src">
            <select id="loan-src" value={sourceId} onChange={e => setSourceId(e.target.value)} style={selectStyle}
              onFocus={e => e.target.style.borderColor = 'var(--lime)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}>
              <option value="">Selecionar...</option>
              {(loanType === 'self' ? investmentAccounts : nonInvestmentAccounts).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>

          {loanType === 'self' && (
            <Field label="Vai para qual conta" htmlFor="loan-dest">
              <select id="loan-dest" value={destId} onChange={e => setDestId(e.target.value)} style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}>
                <option value="">Selecionar...</option>
                {nonInvestmentAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          )}

          {loanType === 'external' && (
            <Field label="Data prevista de retorno (opcional)" htmlFor="loan-date">
              <input id="loan-date" type="date" value={returnDate}
                onChange={e => setReturnDate(e.target.value)} className="field-input" />
            </Field>
          )}

          <Field label="Observações (opcional)" htmlFor="loan-notes">
            <input id="loan-notes" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Para quê foi usado..." className="field-input" />
          </Field>

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
          <Button onClick={submit} loading={loading} icon={<Check size={14}/>} style={{ flex: 2 }}>
            Registrar
          </Button>
        </div>
      </div>
    </>
  )
}

/* ── Receive Payment Modal ── */
function ReceiveModal({ loanId, loan, onClose, onSaved }) {
  const [amount, setAmount] = useState(
    Number(loan?.totalAmount || 0) - Number(loan?.paidAmount || 0)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (amount <= 0) return setError('Informe um valor')
    setLoading(true); setError('')
    try {
      await loansAPI.receive(loanId, amount)
      onSaved?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar')
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
        width: '100%', maxWidth: 360,
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden', zIndex: 103,
        animation: 'fadeUp 0.2s var(--ease) both',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
            Registrar recebimento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {loan?.borrowerName}
          </div>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CurrencyInput value={amount} onChange={setAmount} label="Valor recebido" id="receive-amount" large />
          {error && <FormError>{error}</FormError>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: 13,
          }}>Cancelar</button>
          <Button onClick={submit} loading={loading} icon={<Check size={14}/>} style={{ flex: 2 }}>
            Confirmar
          </Button>
        </div>
      </div>
    </>
  )
}