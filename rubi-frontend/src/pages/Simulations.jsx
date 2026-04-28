import { useState, useEffect } from 'react'
import { FlaskConical, Plus, Zap } from 'lucide-react'
import { transactionsAPI } from '../services/api'
import { Button, Badge, FormError } from '../components/ui/FormElements'
import NewSimulationModal from '../components/dashboard/NewSimulationModal'

const fmt = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Simulations() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [sims,  setSims]  = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [backendOk, setBackendOk] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await transactionsAPI.listSimulations(month, year)
      setSims(data || [])
      setBackendOk(true)
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        setBackendOk(false)
      }
      setSims([])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month, year])

  const activate = async (id) => {
    setError('')
    try {
      await transactionsAPI.activate(id)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro inesperado')
    }
  }

  const del = async (id) => {
    if (!confirm('Excluir esta simulação?')) return
    setError('')
    try { await transactionsAPI.delete(id); load() } catch (err) { setError(err.response?.data?.message || 'Erro inesperado') }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
            Simulações
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Teste o impacto de compras antes de efetivar
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={`${month}-${year}`} onChange={e => {
            const [m, y] = e.target.value.split('-')
            setMonth(+m); setYear(+y)
          }} style={{
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text-primary)', padding: '6px 10px',
            fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
              return <option key={i} value={`${d.getMonth()+1}-${d.getFullYear()}`}>
                {MONTHS[d.getMonth()]} {d.getFullYear()}
              </option>
            })}
          </select>
          <Button size="sm" onClick={() => setShowNew(true)} icon={<Plus size={14}/>}>
            Nova simulação
          </Button>
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: '20px 24px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(136,141,218,0.06)', border: '1px solid rgba(136,141,218,0.15)',
          color: 'var(--violet)', fontSize: 13, marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <FlaskConical size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Como funciona:</strong> Uma simulação aparece no Dashboard com destaque roxo,
            mas não afeta seu saldo real. Quando decidir, clique em <strong>"Efetivar"</strong>.
          </div>
        </div>

        {!backendOk && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            color: 'var(--warning)', fontSize: 12,
          }}>
            <strong>Backend pendente:</strong> Adicione o endpoint abaixo para listar simulações.
            <pre style={{ marginTop: 8, background: 'var(--bg-base)', borderRadius: 6, padding: '8px 10px', fontSize: 11, overflowX: 'auto' }}>{`// TransactionController.java
@GetMapping("/simulations")
public ResponseEntity<List<TransactionItemDTO>> listarSimulacoes(
    @RequestParam int month, @RequestParam int year,
    @AuthenticationPrincipal User user) {
  return ResponseEntity.ok(
    transactionService.listarSimulacoes(user.getId(), month, year));
}

// TransactionRepository.java
@Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.account WHERE t.account.owner.id = :userId AND t.isSimulation = true AND MONTH(t.purchaseDate) = :month AND YEAR(t.purchaseDate) = :year ORDER BY t.createdAt DESC")
List<Transaction> findSimulacoes(@Param("userId") UUID userId, @Param("month") int month, @Param("year") int year);

// TransactionService.java
public List<TransactionItemDTO> listarSimulacoes(UUID userId, int month, int year) {
  return transactionRepository.findSimulacoes(userId, month, year).stream()
    .map(t -> new TransactionItemDTO(t.getId(), t.getDescription(),
      t.getCategory() != null ? t.getCategory().getName() : "Sem Categoria",
      t.getTotalAmount(), t.getPurchaseDate(), t.getType().name())).toList();
}`}</pre>
          </div>
        )}

        {error && <FormError>{error}</FormError>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando...
          </div>
        ) : sims.length === 0 ? (
          <div style={{
            padding: '32px 20px', borderRadius: 12,
            border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)',
          }}>
            <FlaskConical size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Nenhuma simulação em {MONTHS[month - 1]} {year}
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Crie uma simulação para ver o impacto no orçamento antes de comprar.
            </div>
            <Button size="sm" onClick={() => setShowNew(true)} icon={<Plus size={14}/>}>
              Criar simulação
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sims.map(sim => (
              <SimCard key={sim.id} sim={sim} onActivate={() => activate(sim.id)} onDelete={() => del(sim.id)} />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewSimulationModal
          onClose={() => setShowNew(false)}
          onSuccess={load}
          month={month} year={year}
        />
      )}
    </div>
  )
}

function SimCard({ sim, onActivate, onDelete }) {
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid rgba(136,141,218,0.3)',
      borderRadius: 10, padding: '14px 16px', borderLeft: '3px solid var(--violet)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'rgba(136,141,218,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--violet)',
        }}>
          <FlaskConical size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{sim.description}</span>
            <Badge color="violet">simulação</Badge>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {sim.categoryName}
            {sim.date ? ` • ${new Date(sim.date + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--violet)', flexShrink: 0 }}>
          R$ {Number(sim.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onActivate} style={{
          flex: 1, padding: '8px 12px', borderRadius: 6,
          border: '1px solid var(--border-accent)', background: 'rgba(202,247,41,0.06)',
          color: 'var(--lime)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <Zap size={13}/> Efetivar
        </button>
        <button onClick={onDelete} style={{
          padding: '8px 12px', borderRadius: 6,
          border: '1px solid var(--border)', background: 'none',
          color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)',
        }}>
          Excluir
        </button>
      </div>
    </div>
  )
}
