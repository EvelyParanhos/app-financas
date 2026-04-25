import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Check, CreditCard, TrendingUp,
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, Repeat,
  PiggyBank, HandCoins,
} from 'lucide-react'
import { dashboardAPI, installmentsAPI, recurringAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Button, Badge } from '../components/ui/FormElements'
import NewTransactionModal from '../components/dashboard/NewTransactionModal'
import PayInstallmentModal from '../components/dashboard/PayInstallmentModal'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt = (n) => n == null ? 'R$ 0,00' : 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function Dashboard() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [data,  setData]  = useState(null)
  const [loading, setLoading]  = useState(true)
  const [showCouple, setShowCouple] = useState(false)
  const [showNewTx,  setShowNewTx]  = useState(false)
  const [payTarget,  setPayTarget]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const req = showCouple && user?.hasPartner
        ? dashboardAPI.getCouple(month, year)
        : dashboardAPI.get(month, year)
      const { data: d } = await req
      setData(d)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [month, year, showCouple, user])

  useEffect(() => { load() }, [load])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y=>y+1) } else setMonth(m=>m+1) }
  const isCurrent = month === now.getMonth()+1 && year === now.getFullYear()

  const handleCheck = async (item) => {
    // All recurring/virtual items → PayInstallmentModal to confirm/adjust amount
    if (item.recurringTransactionId) {
      setPayTarget(item)
    } else if (item.installmentId) {
      await installmentsAPI.pay(item.installmentId)
      load()
    }
  }

  const handleMaterialize = async (item, amount) => {
    await recurringAPI.materialize(item.recurringTransactionId, month, year, amount)
    load()
    setPayTarget(null)
  }

  if (loading && !data) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Carregando...
    </div>
  )

  const checklist = data?.installmentsDueThisMonth || []
  const pending = checklist.filter(i => i.status === 'PENDING')
  const paid    = checklist.filter(i => i.status === 'PAID')

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={15}/></button>
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
              {MONTHS[month-1]} {year}
            </div>
            {isCurrent && <div style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 600, letterSpacing: '0.06em' }}>ATUAL</div>}
          </div>
          <button onClick={nextMonth} style={navBtnStyle}><ChevronRight size={15}/></button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user?.hasPartner && (
            <button onClick={() => setShowCouple(v => !v)} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: showCouple ? 'rgba(46,203,170,0.1)' : 'var(--bg-raised)',
              color: showCouple ? 'var(--teal)' : 'var(--text-secondary)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              {showCouple ? '👫 Casal' : '👤 Só eu'}
            </button>
          )}
          <Button size="sm" onClick={() => setShowNewTx(true)} icon={<Plus size={13}/>}>
            Nova transação
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Summary cards — 4 cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10, padding: '14px 16px 10px',
          }}>
            <SCard label="Saldo disponível" value={fmt(data?.currentBalance)} color="var(--teal)"
              icon={<Wallet size={15}/>} highlight />
            <SCard label="Sobra projetada" value={fmt(data?.projectedLeftover)} color="var(--lime)"
              icon={<TrendingUp size={15}/>}
              sub={`Entradas: ${fmt(data?.projectedIncome)}`} />
            <SCard label="Comprometido" value={fmt(data?.committedAmount)} color="var(--violet)"
              icon={<CreditCard size={15}/>}
              sub={`Cartão: ${fmt(data?.creditCardCommitted)}`} />
            <SCard label="A receber" value={fmt(data?.totalToReceive)} color="var(--mint)"
              icon={<HandCoins size={15}/>} />
          </div>

          {/* Checklist */}
          <div style={{
            flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--border)', margin: '0 16px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0 8px', flexShrink: 0,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                Checklist do mês
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {paid.length}/{checklist.length} concluídos
              </div>
            </div>

            <div className="scrollable" style={{ flex: 1 }}>
              {pending.length === 0 && paid.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Repeat size={20} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  Nenhuma transação fixa neste mês
                </div>
              )}

              {pending.map((item, i) => (
                <CheckItem key={item.installmentId || `v-${i}`}
                  item={item} isPaid={false} onCheck={() => handleCheck(item)} />
              ))}

              {paid.length > 0 && (
                <>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
                    letterSpacing: '0.06em', padding: '8px 0 4px', textTransform: 'uppercase' }}>
                    Concluídos
                  </div>
                  {paid.map((item, i) => (
                    <CheckItem key={item.installmentId || `p-${i}`}
                      item={item} isPaid={true} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT panel */}
        <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Investimentos */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, marginBottom: 10 }}>
              Investido no mês
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'rgba(202,247,41,0.06)', border: '1px solid var(--border-accent)',
              borderLeft: '3px solid var(--lime)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PiggyBank size={14} color="var(--lime)" />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Aportes</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--lime)' }}>
                {fmt(data?.monthlyDeposits)}
              </span>
            </div>
          </div>

          {/* Gastos por categoria */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, marginBottom: 10 }}>
              Orçamentos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.budgetStatus || []).slice(0, 4).map(b => (
                <BudgetBar key={b.id} budget={b} />
              ))}
              {(data?.budgetStatus || []).length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Configure orçamentos em Configurações
                </div>
              )}
            </div>
          </div>

          {/* Faturas pendentes */}
          {(data?.pendingInvoices || []).length > 0 && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                Faturas pendentes
              </div>
              {(data?.pendingInvoices || []).slice(0, 3).map(inv => (
                <div key={inv.invoiceId} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0', fontSize: 11, borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{inv.accountName}</span>
                  <span style={{ fontWeight: 700, color: 'var(--violet)' }}>{fmt(inv.remaining)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Últimas transações */}
          <div style={{ flex: 1, padding: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, marginBottom: 10, flexShrink: 0 }}>
              Recentes
            </div>
            <div className="scrollable" style={{ flex: 1 }}>
              {(data?.recentTransactions || []).map((tx, i) => (
                <RecentItem key={tx.id || i} tx={tx} />
              ))}
              {(data?.recentTransactions || []).length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sem transações recentes</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewTx && (
        <NewTransactionModal onClose={() => setShowNewTx(false)}
          onSaved={() => { setShowNewTx(false); load() }} month={month} year={year} />
      )}
      {payTarget && (
        <PayInstallmentModal item={payTarget}
          onClose={() => setPayTarget(null)} onConfirm={handleMaterialize} />
      )}
    </div>
  )
}

/* ── Sub-components ── */
function SCard({ label, value, icon, color, sub, highlight }) {
  return (
    <div style={{
      background: highlight ? 'var(--bg-float)' : 'var(--bg-raised)',
      border: `1px solid ${highlight ? 'var(--border-bright)' : 'var(--border)'}`,
      borderRadius: 10, padding: '12px 14px',
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 5,
          background: `rgba(${rgbOf(color)},0.12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>{icon}</div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function CheckItem({ item, isPaid, onCheck }) {
  const isExpense  = item.transactionType === 'EXPENSE' || !item.transactionType
  const isVirtual  = !!item.recurringTransactionId
  const typeColor  = isExpense ? 'var(--text-primary)' : 'var(--mint)'
  const typeIcon   = isVirtual
    ? <Repeat size={11} color="var(--teal)" />
    : isExpense ? <ArrowUpRight size={11} color="var(--danger)" />
    : <ArrowDownLeft size={11} color="var(--mint)" />

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
      borderBottom: '1px solid var(--border)',
      opacity: isPaid ? 0.45 : 1,
    }}>
      {/* Checkbox */}
      {!isPaid ? (
        <button onClick={onCheck} style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${item.isSimulation ? 'var(--violet)' : isVirtual ? 'var(--teal)' : 'var(--border-bright)'}`,
          background: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(202,247,41,0.12)'; e.currentTarget.style.borderColor = 'var(--lime)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = item.isSimulation ? 'var(--violet)' : isVirtual ? 'var(--teal)' : 'var(--border-bright)' }}
        />
      ) : (
        <div style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={10} color="#0B0C10" strokeWidth={3} />
        </div>
      )}

      {/* Type icon */}
      <div style={{
        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
        background: 'var(--bg-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {typeIcon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: 12, fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textDecoration: isPaid ? 'line-through' : 'none',
            color: isPaid ? 'var(--text-muted)' : 'var(--text-primary)',
          }}>
            {item.transactionDescription}
          </span>
          {item.isSimulation && <Badge color="violet" style={{fontSize:9}}>sim</Badge>}
          {isVirtual && !isPaid && <Badge color="muted" style={{fontSize:9}}>fixo</Badge>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {item.categoryName}
          {item.dueDate ? ` • ${new Date(item.dueDate+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}` : ''}
        </div>
      </div>

      {/* Amount */}
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
        color: typeColor, flexShrink: 0,
      }}>
        {isExpense ? '-' : '+'}{fmt(item.amount)}
      </div>
    </div>
  )
}

function BudgetBar({ budget }) {
  const pct = Math.min(budget.percentageUsed, 100)
  const color = budget.status === 'EXCEEDED' ? 'var(--danger)'
              : budget.status === 'WARNING'  ? 'var(--warning)' : 'var(--teal)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {budget.categoryName}
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--bg-overlay)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s var(--ease)' }} />
      </div>
    </div>
  )
}

function RecentItem({ tx }) {
  const isOut = tx.type === 'EXPENSE' || tx.type === 'LOAN_OUT'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 5, flexShrink: 0,
        background: isOut ? 'rgba(240,82,82,0.08)' : 'rgba(121,221,126,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isOut ? 'var(--danger)' : 'var(--mint)',
      }}>
        {isOut ? <ArrowUpRight size={11}/> : <ArrowDownLeft size={11}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.description}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tx.categoryName}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: isOut ? 'var(--danger)' : 'var(--mint)', flexShrink: 0 }}>
        {isOut ? '-' : '+'}{fmt(tx.amount)}
      </div>
    </div>
  )
}

const navBtnStyle = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--bg-raised)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-secondary)',
}

function rgbOf(color) {
  const m = {
    'var(--lime)': '202,247,41', 'var(--teal)': '46,203,170',
    'var(--violet)': '136,141,218', 'var(--mint)': '121,221,126',
    'var(--danger)': '240,82,82',
  }
  return m[color] || '255,255,255'
}