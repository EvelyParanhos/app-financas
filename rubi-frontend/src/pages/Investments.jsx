import { useState, useEffect } from 'react'
import { TrendingUp, Plus, PiggyBank, History, ChevronDown, ChevronUp, X, Check } from 'lucide-react'
import { investmentsAPI } from '../services/api'
import { Button, Badge } from '../components/ui/FormElements'
import CurrencyInput from '../components/ui/CurrencyInput'

function fmt(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function Investments() {
  const [summaries,  setSummaries]  = useState([])
  const [projection, setProjection] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [expanded,   setExpanded]   = useState(null)
  const [showEntry,  setShowEntry]  = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: s }, { data: p }] = await Promise.all([
        investmentsAPI.summary(),
        investmentsAPI.projection(12),
      ])
      setSummaries(s || [])
      setProjection(p || [])
    } catch (err) {
      setSummaries([])
      setProjection([])
      setError(err.response?.data?.message || 'Nao foi possivel carregar investimentos.')
    }
    finally { setLoading(false) }
  }

  useEffect(() => {
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
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
            Investimentos
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Reservas, aportes e projeções
          </div>
        </div>
        <Button size="sm" onClick={() => setShowEntry(true)} icon={<Plus size={14}/>}>
          Novo investimento
        </Button>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}

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
      {showEntry && (
        <InvestmentEntryModal
          summaries={summaries}
          onClose={() => setShowEntry(false)}
          onSaved={() => { setShowEntry(false); load() }}
        />
      )}
    </div>
  )
}

function InvestmentEntryModal({ summaries, onClose, onSaved }) {
  const [accountId, setAccountId] = useState(summaries[0]?.accountId || '')
  const [type, setType] = useState('DEPOSIT')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!accountId) return setError('Selecione uma conta de investimento.')
    if (!amount || amount <= 0) return setError('Informe um valor maior que zero.')
    setLoading(true); setError('')
    try {
      await investmentsAPI.entry({
        accountId,
        type,
        amount,
        entryDate: date,
        notes: notes.trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar investimento.')
    } finally { setLoading(false) }
  }

  const input = {
    width: '100%', padding: '12px 14px', minHeight: 44,
    background: 'var(--bg-float)', border: '1.5px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'var(--font-body)', fontSize: 14,
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(460px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)',
        background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16,
        overflow: 'hidden', zIndex: 101, animation: 'modalEnter 0.25s var(--ease) both',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Novo investimento</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
        <div className="scrollable" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} style={input}>
            <option value="">Selecionar investimento...</option>
            {summaries.map(s => <option key={s.accountId} value={s.accountId}>{s.accountName}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {[
              ['DEPOSIT', 'Aporte'],
              ['WITHDRAWAL', 'Resgate'],
              ['YIELD', 'Rendimento'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setType(id)} style={{
                padding: '9px 8px', borderRadius: 8, border: `1px solid ${type === id ? 'var(--lime)' : 'var(--border)'}`,
                background: type === id ? 'rgba(202,247,41,0.08)' : 'var(--bg-float)',
                color: type === id ? 'var(--lime)' : 'var(--text-secondary)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
              }}>{label}</button>
            ))}
          </div>
          <CurrencyInput value={amount} onChange={setAmount} label="Valor" id="investment-amount" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...input, colorScheme: 'dark' }} />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observacao" style={input} />
          {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-float)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
          <Button onClick={submit} loading={loading} icon={<Check size={14}/>} style={{ flex: 2 }}>Registrar</Button>
        </div>
      </div>
    </>
  )
}

function InvestmentCard({ summary: s, expanded, onToggle }) {
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')

  const loadHistory = async () => {
    if (!expanded) {
      setError('')
      try {
        const { data } = await investmentsAPI.history(s.accountId)
        setHistory(data || [])
      } catch (err) {
        setHistory([])
        setError(err.response?.data?.message || 'Nao foi possivel carregar o historico.')
      }
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
          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
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
