import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, Filter } from 'lucide-react'
import { transactionsAPI, categoriesAPI } from '../services/api'
import { Button } from '../components/ui/FormElements'
import NewTransactionModal from '../components/dashboard/NewTransactionModal'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmt(n) { return 'R$ ' + Number(n||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const TYPE_OPTS = [
  { value: '',        label: 'Todos' },
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME',  label: 'Entradas' },
  { value: 'TRANSFER',label: 'Transferências' },
]

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [type,  setType]  = useState('')
  const [txs,   setTxs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await transactionsAPI.list(month, year, type || null, null)
      setTxs(data || [])
    } catch { setTxs([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month, year, type])

  const total = txs.reduce((s, t) => {
    if (t.type === 'INCOME') return s + Number(t.amount || 0)
    if (t.type === 'EXPENSE') return s - Number(t.amount || 0)
    return s
  }, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        {/* Period */}
        <select value={`${month}-${year}`} onChange={e => {
          const [m, y] = e.target.value.split('-')
          setMonth(+m); setYear(+y)
        }} style={{
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
          borderRadius: 6, color: 'var(--text-primary)', padding: '6px 10px',
          fontSize: 13, fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            return <option key={i} value={`${d.getMonth()+1}-${d.getFullYear()}`}>
              {MONTHS[d.getMonth()]} {d.getFullYear()}
            </option>
          })}
        </select>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TYPE_OPTS.map(o => (
            <button key={o.value} onClick={() => setType(o.value)} style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: type === o.value ? 'rgba(202,247,41,0.1)' : 'var(--bg-raised)',
              color: type === o.value ? 'var(--lime)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all var(--duration)',
            }}>{o.label}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: total >= 0 ? 'var(--mint)' : 'var(--danger)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {total >= 0 ? '+' : ''}{fmt(total)}
          </span>
          <Button size="sm" onClick={() => setShowNew(true)} icon={<Plus size={14}/>}>
            Nova transação
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="scrollable" style={{ flex: 1, padding: '0 24px' }}>
        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
        )}
        {!loading && txs.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhuma transação neste período
          </div>
        )}
        {txs.map((tx, i) => {
          const isOut = tx.type === 'EXPENSE' || tx.type === 'LOAN_OUT'
          const isIn  = tx.type === 'INCOME'
          const color = isIn ? 'var(--mint)' : isOut ? 'var(--danger)' : 'var(--text-secondary)'
          const Icon  = isIn ? ArrowDownLeft : isOut ? ArrowUpRight : ArrowLeftRight
          return (
            <div key={tx.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: `rgba(${isIn ? '121,221,126' : isOut ? '240,82,82' : '136,141,218'},0.1)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color,
              }}>
                <Icon size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{tx.description}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {tx.categoryName} • {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color }}>
                {isIn ? '+' : isOut ? '-' : ''}{fmt(tx.amount)}
              </div>
            </div>
          )
        })}
      </div>

      {showNew && (
        <NewTransactionModal
          onClose={() => setShowNew(false)}
          onSaved={() => setShowNew(false)}
          onSuccess={load}
          month={month} year={year}
        />
      )}
    </div>
  )
}
