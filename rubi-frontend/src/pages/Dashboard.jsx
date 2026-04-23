import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Check, CreditCard, TrendingUp,
  Wallet, CircleDollarSign, FlaskConical, Clock, AlertCircle,
  Plus, MoreHorizontal, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'
import { dashboardAPI, installmentsAPI, recurringAPI, accountsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Button, Badge } from '../components/ui/FormElements'
import NewTransactionModal from '../components/dashboard/NewTransactionModal'
import PayInstallmentModal from '../components/dashboard/PayInstallmentModal'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmt(n) {
  if (n == null) return 'R$ 0,00'
  return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function Dashboard() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [data,  setData]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCouple, setShowCouple] = useState(false)
  const [showNewTx,  setShowNewTx]  = useState(false)
  const [payTarget,  setPayTarget]  = useState(null) // installment to pay

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fetch = showCouple && user?.hasPartner
        ? dashboardAPI.getCouple(month, year)
        : dashboardAPI.get(month, year)
      const { data: d } = await fetch
      setData(d)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [month, year, showCouple, user])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  const handlePay = async (item) => {
    if (item.recurringTransactionId) {
      // Virtual recurring — needs materialisation
      setPayTarget(item)
    } else if (item.installmentId) {
      await installmentsAPI.pay(item.installmentId)
      load()
    }
  }

  const handleMaterialise = async (item, actualAmount) => {
    await recurringAPI.materialize(
      item.recurringTransactionId,
      month, year,
      item.isVariable ? actualAmount : null
    )
    load()
    setPayTarget(null)
  }

  if (loading && !data) return <PageLoader />

  const checklist = data?.installmentsDueThisMonth || []
  const pending   = checklist.filter(i => i.status === 'PENDING')
  const paid      = checklist.filter(i => i.status === 'PAID')

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexShrink: 0,
      }}>
        {/* Period selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={16}/></button>
          <div style={{ textAlign: 'center', minWidth: 110 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
              {MONTHS[month - 1]} {year}
            </div>
            {isCurrentMonth && (
              <div style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 600, letterSpacing: '0.06em' }}>MÊS ATUAL</div>
            )}
          </div>
          <button onClick={nextMonth} style={navBtnStyle}><ChevronRight size={16}/></button>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {user?.hasPartner && (
            <button onClick={() => setShowCouple(v => !v)} style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
              background: showCouple ? 'rgba(46,203,170,0.1)' : 'var(--bg-raised)',
              color: showCouple ? 'var(--teal)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all var(--duration)',
            }}>
              {showCouple ? 'Visão casal' : 'Só eu'}
            </button>
          )}
          <Button size="sm" onClick={() => setShowNewTx(true)} icon={<Plus size={14}/>}>
            Nova transação
          </Button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        overflow: 'hidden',
      }}>
        {/* Left — cards + checklist */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12, padding: '16px 20px 12px',
          }}>
            <SummaryCard
              label="Gasto no cartão"
              value={fmt(data?.creditCardCommitted)}
              icon={<CreditCard size={16}/>}
              color="var(--violet)"
              sub={`${(data?.pendingInvoices || []).length} faturas pendentes`}
            />
            <SummaryCard
              label="Saldo disponível"
              value={fmt(data?.currentBalance)}
              icon={<Wallet size={16}/>}
              color="var(--teal)"
              sub={`Sobra projetada: ${fmt(data?.projectedLeftover)}`}
              highlight
            />
            <SummaryCard
              label="Investido no mês"
              value={fmt(data?.monthlyDeposits)}
              icon={<TrendingUp size={16}/>}
              color="var(--lime)"
              sub={`A receber: ${fmt(data?.totalToReceive)}`}
            />
          </div>

          {/* Checklist */}
          <div style={{
            flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--border)', margin: '0 20px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0 10px', flexShrink: 0,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                Checklist do mês
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {paid.length}/{checklist.length} pagos
              </div>
            </div>

            <div className="scrollable" style={{ flex: 1 }}>
              {pending.length === 0 && paid.length === 0 && (
                <EmptyState icon={<Check size={20}/>} label="Nenhuma conta neste mês" />
              )}

              {/* Pending */}
              {pending.map((item, i) => (
                <ChecklistItem
                  key={item.installmentId || `virt-${i}`}
                  item={item} isPaid={false}
                  onPay={() => handlePay(item)}
                  isSimulation={item.isSimulation}
                />
              ))}

              {/* Paid */}
              {paid.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', padding: '8px 0 4px', textTransform: 'uppercase' }}>
                    Pagos
                  </div>
                  {paid.map((item, i) => (
                    <ChecklistItem
                      key={item.installmentId || `paid-${i}`}
                      item={item} isPaid={true}
                      isSimulation={item.isSimulation}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right panel — investments + recent */}
        <div style={{
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Investment boxes */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
              Investimentos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.budgetStatus || []).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                  Nenhum investimento ainda
                </div>
              )}
              {/* Projection cards from budget if available */}
              <InvestmentMiniCard name="Reserva do casal" balance={data?.monthlyDeposits} color="var(--lime)" />
            </div>
          </div>

          {/* Budget status */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
              Orçamentos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.budgetStatus || []).slice(0, 4).map((b) => (
                <BudgetBar key={b.id} budget={b} />
              ))}
              {(data?.budgetStatus || []).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum orçamento definido</div>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div style={{ flex: 1, padding: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 10, flexShrink: 0 }}>
              Últimas transações
            </div>
            <div className="scrollable" style={{ flex: 1 }}>
              {(data?.recentTransactions || []).map((tx, i) => (
                <RecentTxItem key={tx.id || i} tx={tx} />
              ))}
              {(data?.recentTransactions || []).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sem transações recentes</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewTx && (
        <NewTransactionModal
          onClose={() => setShowNewTx(false)}
          onSaved={() => { setShowNewTx(false); load() }}
          month={month} year={year}
        />
      )}
      {payTarget && (
        <PayInstallmentModal
          item={payTarget}
          onClose={() => setPayTarget(null)}
          onConfirm={handleMaterialise}
        />
      )}
    </div>
  )
}

/* ── Sub-components ── */
function SummaryCard({ label, value, icon, color, sub, highlight }) {
  return (
    <div style={{
      background: highlight ? 'var(--bg-float)' : 'var(--bg-raised)',
      border: `1px solid ${highlight ? 'var(--border-bright)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 16px',
      borderTop: highlight ? `2px solid ${color}` : `1px solid var(--border)`,
      transition: 'box-shadow var(--duration)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `rgba(${colorToRgb(color)},0.1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function ChecklistItem({ item, isPaid, onPay, isSimulation }) {
  const isExpense = item.transactionType === 'EXPENSE' || !item.transactionType
  const isVirtual = !item.installmentId

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
      borderBottom: '1px solid var(--border)', opacity: isPaid ? 0.5 : 1,
      transition: 'opacity var(--duration)',
    }}>
      {!isPaid && (
        <button onClick={onPay} style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${isSimulation ? 'var(--violet)' : 'var(--border-bright)'}`,
          background: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all var(--duration)', color: 'transparent',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(202,247,41,0.1)'; e.currentTarget.style.borderColor = 'var(--lime)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = isSimulation ? 'var(--violet)' : 'var(--border-bright)' }}
        />
      )}
      {isPaid && (
        <div style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={11} color="#0B0C10" strokeWidth={3} />
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textDecoration: isPaid ? 'line-through' : 'none',
            color: isPaid ? 'var(--text-muted)' : 'var(--text-primary)',
          }}>
            {item.transactionDescription}
          </span>
          {isSimulation && <Badge color="violet">simulação</Badge>}
          {isVirtual && !isPaid && <Badge color="muted">fixo</Badge>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {item.categoryName} • {item.dueDate ? new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
          {item.payerName && ` • ${item.payerName}`}
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
        color: isExpense ? 'var(--text-primary)' : 'var(--mint)',
        flexShrink: 0,
      }}>
        {isExpense ? '-' : '+'} {fmt(item.amount)}
      </div>
    </div>
  )
}

function InvestmentMiniCard({ name, balance, color }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: 'var(--bg-float)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${color}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{name}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color }}>
        {fmt(balance)}
      </span>
    </div>
  )
}

function BudgetBar({ budget }) {
  const pct = Math.min(budget.percentageUsed, 100)
  const color = budget.status === 'EXCEEDED' ? 'var(--danger)'
              : budget.status === 'WARNING'  ? 'var(--warning)'
              : 'var(--teal)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{budget.categoryName}</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s var(--ease)' }} />
      </div>
    </div>
  )
}

function RecentTxItem({ tx }) {
  const isOut = tx.type === 'EXPENSE' || tx.type === 'LOAN_OUT'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: isOut ? 'rgba(240,82,82,0.08)' : 'rgba(121,221,126,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isOut ? 'var(--danger)' : 'var(--mint)',
      }}>
        {isOut ? <ArrowUpRight size={13}/> : <ArrowDownLeft size={13}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.description}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tx.categoryName}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: isOut ? 'var(--danger)' : 'var(--mint)', flexShrink: 0 }}>
        {isOut ? '-' : '+'}{fmt(tx.amount)}
      </div>
    </div>
  )
}

function EmptyState({ icon, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 0', color: 'var(--text-muted)' }}>
      {icon}
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  )
}

function PageLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Carregando...
    </div>
  )
}

const navBtnStyle = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--bg-raised)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-secondary)', transition: 'all var(--duration)',
}

function colorToRgb(cssVar) {
  const map = {
    'var(--lime)':   '202,247,41',
    'var(--teal)':   '46,203,170',
    'var(--violet)': '136,141,218',
    'var(--mint)':   '121,221,126',
    'var(--danger)': '240,82,82',
  }
  return map[cssVar] || '255,255,255'
}