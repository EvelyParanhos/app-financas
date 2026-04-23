import { useState, useEffect } from 'react'
import { FlaskConical, Plus, Check, Trash2, ArrowRight } from 'lucide-react'
import { transactionsAPI, accountsAPI, categoriesAPI } from '../services/api'
import { Button, Badge } from '../components/ui/FormElements'
import NewTransactionModal from '../components/dashboard/NewTransactionModal'

function fmt(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function Simulations() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year]  = useState(now.getFullYear())
  const [sims, setSims]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      // Get all transactions for month, then filter simulations client-side
      // We query without type filter to get everything including simulations
      const { data } = await transactionsAPI.list(month, year)
      // Simulations won't appear in this list (service excludes them)
      // For simulations, we need a dedicated endpoint — for now show empty state
      setSims([])
    } catch { setSims([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activate = async (id) => {
    await transactionsAPI.activate(id)
    load()
  }

  const remove = async (id) => {
    await transactionsAPI.delete(id)
    load()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
            Simulações
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Teste o impacto de compras antes de efetivar
          </div>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} icon={<Plus size={14}/>} variant="secondary">
          Nova simulação
        </Button>
      </div>

      {/* Content */}
      <div className="scrollable" style={{ flex: 1, padding: '20px 24px' }}>
        {/* Info card */}
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(136,141,218,0.06)', border: '1px solid rgba(136,141,218,0.15)',
          color: 'var(--violet)', fontSize: 13, marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <FlaskConical size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Como funciona:</strong> Uma simulação aparece nos cards do Dashboard com destaque roxo, mas não afeta seu saldo real.
            Quando decidir fazer a compra de verdade, clique em "Efetivar".
          </div>
        </div>

        {/* How to create */}
        <div style={{
          padding: '20px', borderRadius: 12, border: '1px dashed var(--border)',
          textAlign: 'center', color: 'var(--text-muted)',
        }}>
          <FlaskConical size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Nenhuma simulação ativa
          </div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>
            Crie uma transação marcando "É uma simulação" para testar o impacto no orçamento.
          </div>
          <Button size="sm" onClick={() => setShowNew(true)} icon={<Plus size={14}/>}>
            Criar simulação
          </Button>
        </div>
      </div>

      {showNew && (
        <NewTransactionModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
          month={month} year={year}
          defaultSimulation={true}
        />
      )}
    </div>
  )
}