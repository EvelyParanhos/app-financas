import { useState, useEffect } from 'react'
import { TrendingUp, Plus, PiggyBank, History, ChevronDown, ChevronUp } from 'lucide-react'
import { investmentsAPI } from '../services/api'
import { Button, Badge } from '../components/ui/FormElements'

function fmt(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function Investments() {
  const [summaries,  setSummaries]  = useState([])
  const [projection, setProjection] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: p }] = await Promise.all([
          investmentsAPI.summary(),
          investmentsAPI.projection(12),
        ])
        setSummaries(s || [])
        setProjection(p || [])
      } catch { setSummaries([]); setProjection([]) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  // Group projection by account
  const projByAccount = projection.reduce((acc, p) => {
    if (!acc[p.accountName]) acc[p.accountName] = []
    acc[p.accountName].push(p)
    return acc
  }, {})

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
          Investimentos
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          Reservas, aportes e projeções
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Account cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {summaries.map((s) => (
            <InvestmentCard
              key={s.accountId}
              summary={s}
              expanded={expanded === s.accountId}
              onToggle={() => setExpanded(id => id === s.accountId ? null : s.accountId)}
            />
          ))}
          {summaries.length === 0 && !loading && (
            <div style={{
              gridColumn: '1/-1', padding: 32, textAlign: 'center',
              border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)',
            }}>
              <PiggyBank size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Nenhuma conta de investimento
              </div>
              <div style={{ fontSize: 13 }}>
                Crie uma conta do tipo "Investimento" em Configurações → Contas.
              </div>
            </div>
          )}
        </div>

        {/* Projection table */}
        {Object.keys(projByAccount).length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
              Projeção dos próximos 12 meses
            </div>
            {Object.entries(projByAccount).map(([name, rows]) => (
              <div key={name} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, marginBottom: 8 }}>{name}</div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 6,
                }}>
                  {rows.slice(0, 12).map((r, i) => (
                    <div key={i} style={{
                      padding: '8px 10px', borderRadius: 8,
                      background: 'var(--bg-raised)', border: '1px solid var(--border)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
                        {MONTHS[r.month - 1]} {String(r.year).slice(2)}
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--lime)' }}>
                        {fmt(r.projectedBalance)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        +{fmt(r.projectedDeposit)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InvestmentCard({ summary: s, expanded, onToggle }) {
  const [history, setHistory] = useState([])

  const loadHistory = async () => {
    if (!expanded) {
      try {
        const { data } = await investmentsAPI.history(s.accountId)
        setHistory(data || [])
      } catch { setHistory([]) }
    }
    onToggle()
  }

  const profitColor = s.profitability > 0 ? 'var(--mint)' : s.profitability < 0 ? 'var(--danger)' : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
      borderTop: '2px solid var(--lime)',
    }}>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{s.accountName}</div>
          <Badge color="lime">INVESTMENT</Badge>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--lime)', marginBottom: 12 }}>
          {fmt(s.currentBalance)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <MiniStat label="Aportado" value={fmt(s.totalDeposited)} />
          <MiniStat label="Resgatado" value={fmt(s.totalWithdrawn)} />
          <MiniStat label="Rendimento" value={`${Number(s.profitability || 0).toFixed(1)}%`} color={profitColor} />
        </div>
      </div>

      <button onClick={loadHistory} style={{
        width: '100%', padding: '8px 16px', background: 'var(--bg-float)',
        border: 'none', borderTop: '1px solid var(--border)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-body)',
      }}>
        <History size={12} />
        {expanded ? 'Ocultar histórico' : 'Ver histórico'}
        {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
      </button>

      {expanded && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }} className="scrollable">
          {history.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{new Date(e.entryDate).toLocaleDateString('pt-BR')} • {e.type}</span>
              <span style={{ fontWeight: 600, color: e.type === 'WITHDRAWAL' ? 'var(--danger)' : 'var(--mint)' }}>{fmt(e.amount)}</span>
            </div>
          ))}
          {history.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sem lançamentos</div>}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}