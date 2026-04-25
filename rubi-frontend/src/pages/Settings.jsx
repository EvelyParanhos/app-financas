import { useState, useEffect } from 'react'
import {
  Wallet, Building2, CreditCard, PiggyBank,
  Plus, Trash2, Edit2, Check, X, Copy,
  Users, UserX, Shield, Bell, ChevronRight,
  Eye, EyeOff, Share2,
} from 'lucide-react'
import {
  accountsAPI, categoriesAPI, budgetsAPI,
  partnershipAPI, authAPI,
} from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Button, Field, FormError } from '../components/ui/FormElements'
import CurrencyInput from '../components/ui/CurrencyInput'

const TABS = [
  { id: 'contas',     label: 'Contas' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'parceria',   label: 'Parceria' },
  { id: 'perfil',     label: 'Perfil' },
]

const ACCOUNT_TYPE_LABELS = {
  CASH: 'Carteira', CHECKING: 'Corrente',
  CREDIT_CARD: 'Cartão', INVESTMENT: 'Investimento',
}
const ACCOUNT_ICONS = {
  CASH: Wallet, CHECKING: Building2,
  CREDIT_CARD: CreditCard, INVESTMENT: PiggyBank,
}

export default function Settings() {
  const [tab, setTab] = useState('contas')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
          Configurações
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, padding: '10px 24px 0',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer',
            background: 'none', fontFamily: 'var(--font-body)',
            fontSize: 13, fontWeight: 600,
            color: tab === t.id ? 'var(--lime)' : 'var(--text-secondary)',
            borderBottom: `2px solid ${tab === t.id ? 'var(--lime)' : 'transparent'}`,
            marginBottom: -1, transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="scrollable" style={{ flex: 1, padding: '24px' }}>
        {tab === 'contas'     && <ContasTab />}
        {tab === 'categorias' && <CategoriasTab />}
        {tab === 'parceria'   && <ParceriaTab />}
        {tab === 'perfil'     && <PerfilTab />}
      </div>
    </div>
  )
}

/* ── CONTAS TAB ── */
function ContasTab() {
  const [accounts, setAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [form, setForm]         = useState({ name: '', type: 'CHECKING', cardLimit: '', closingDay: '', dueDay: '', initialBalance: 0 })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const load = async () => {
    try {
      const { data } = await accountsAPI.list(false)
      setAccounts(data || [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  const reset = () => {
    setForm({ name: '', type: 'CHECKING', cardLimit: '', closingDay: '', dueDay: '', initialBalance: 0 })
    setEditId(null); setShowForm(false); setError('')
  }

  const save = async () => {
    if (!form.name.trim()) return setError('Nome é obrigatório')
    setLoading(true); setError('')
    try {
      const payload = {
        name: form.name, type: form.type,
        initialBalance: form.initialBalance || 0,
        shared: false,
      }
      if (form.type === 'CREDIT_CARD') {
        payload.cardLimit = parseFloat(form.cardLimit) || 0
        payload.closingDay = parseInt(form.closingDay) || 10
        payload.dueDay = parseInt(form.dueDay) || 15
      }
      if (editId) await accountsAPI.edit(editId, payload)
      else await accountsAPI.create(payload)
      reset(); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar conta')
    } finally { setLoading(false) }
  }

  const del = async (id) => {
    if (!confirm('Excluir esta conta? Esta ação não pode ser desfeita.')) return
    try { await accountsAPI.delete(id); load() } catch {}
  }

  const toggleShared = async (id) => {
    try { await accountsAPI.toggleVisibility(id); load() } catch {}
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Gerencie suas contas e cartões
        </div>
        <Button size="sm" onClick={() => { reset(); setShowForm(true) }} icon={<Plus size={13}/>}>
          Nova conta
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-float)', border: '1px solid var(--border-bright)',
          borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
            {editId ? 'Editar conta' : 'Nova conta'}
          </div>

          {/* Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, lbl]) => {
              const Icon = ACCOUNT_ICONS[val]
              return (
                <button key={val} onClick={() => setForm(f => ({ ...f, type: val }))} style={{
                  padding: '8px 6px', borderRadius: 6, cursor: 'pointer',
                  border: `1.5px solid ${form.type === val ? 'var(--lime)' : 'var(--border)'}`,
                  background: form.type === val ? 'rgba(202,247,41,0.08)' : 'var(--bg-raised)',
                  color: form.type === val ? 'var(--lime)' : 'var(--text-secondary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all 0.2s',
                }}>
                  <Icon size={14} />
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>{lbl}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Nome" htmlFor="s-acc-name">
              <input id="s-acc-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Nubank" className="field-input" />
            </Field>
            {form.type === 'CREDIT_CARD' ? (
              <Field label="Limite (R$)" htmlFor="s-limit">
                <input id="s-limit" type="number" value={form.cardLimit}
                  onChange={e => setForm(f => ({ ...f, cardLimit: e.target.value }))}
                  placeholder="5000" className="field-input" />
              </Field>
            ) : form.type !== 'INVESTMENT' && (
              <div>
                <CurrencyInput value={form.initialBalance} onChange={v => setForm(f => ({ ...f, initialBalance: v }))}
                  label="Saldo inicial" id="s-balance" />
              </div>
            )}
            {form.type === 'CREDIT_CARD' && (
              <>
                <Field label="Dia fechamento" htmlFor="s-cd">
                  <input id="s-cd" type="number" value={form.closingDay}
                    onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))}
                    placeholder="10" min="1" max="28" className="field-input" />
                </Field>
                <Field label="Dia vencimento" htmlFor="s-dd">
                  <input id="s-dd" type="number" value={form.dueDay}
                    onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                    placeholder="15" min="1" max="31" className="field-input" />
                </Field>
              </>
            )}
          </div>

          {error && <FormError>{error}</FormError>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={{
              flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 13,
            }}>Cancelar</button>
            <Button onClick={save} loading={loading} icon={<Check size={13}/>} style={{ flex: 2 }}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {accounts.map(acc => {
        const Icon = ACCOUNT_ICONS[acc.type] || Wallet
        return (
          <div key={acc.id} style={{
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: 'rgba(202,247,41,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--lime)',
            }}>
              <Icon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {ACCOUNT_TYPE_LABELS[acc.type]}
                {acc.type !== 'CREDIT_CARD' && acc.type !== 'INVESTMENT' &&
                  ` • R$ ${Number(acc.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                {acc.type === 'CREDIT_CARD' && acc.cardLimit &&
                  ` • Limite: R$ ${Number(acc.cardLimit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </div>
            </div>

            {/* Share toggle */}
            <button
              onClick={() => toggleShared(acc.id)}
              title={acc.shared ? 'Compartilhada com parceiro' : 'Privada'}
              style={{
                padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: acc.shared ? 'rgba(46,203,170,0.1)' : 'none',
                color: acc.shared ? 'var(--teal)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Share2 size={11} />
              {acc.shared ? 'Comp.' : 'Privada'}
            </button>

            <button onClick={() => del(acc.id)} style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'rgba(240,82,82,0.08)', color: 'var(--danger)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Trash2 size={13} />
            </button>
          </div>
        )
      })}

      {accounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Nenhuma conta cadastrada
        </div>
      )}
    </div>
  )
}

/* ── CATEGORIAS TAB ── */
const CATEGORY_ICONS = ['house','utensils','car','gamepad-2','heart','wallet','banknote','trending-up','tag','coffee','music','book','shopping-bag','plane','gym','monitor','phone','baby']
const PRESET_COLORS = ['#6366F1','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#6B7280','#10B981','#059669','#0EA5E9','#F97316','#EC4899','#CAF729','#2ECBAA']

function CategoriasTab() {
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ name: '', type: 'EXPENSE', icon: 'wallet', color: '#6366F1' })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const load = async () => {
    try {
      const { data } = await categoriesAPI.list()
      setCategories((data || []).filter(c => c.active !== false))
    } catch {}
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name.trim()) return setError('Nome é obrigatório')
    setLoading(true); setError('')
    try {
      await categoriesAPI.create(form)
      setShowForm(false)
      setForm({ name: '', type: 'EXPENSE', icon: 'wallet', color: '#6366F1' })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar categoria')
    } finally { setLoading(false) }
  }

  const del = async (id) => {
    try { await categoriesAPI.delete(id); load() } catch {}
  }

  const expense = categories.filter(c => c.type === 'EXPENSE')
  const income  = categories.filter(c => c.type === 'INCOME')

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Categorias para organizar suas transações</div>
        <Button size="sm" onClick={() => setShowForm(v => !v)} icon={<Plus size={13}/>}>
          Nova categoria
        </Button>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg-float)', border: '1px solid var(--border-bright)',
          borderRadius: 12, padding: 18, marginBottom: 20,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Nome" htmlFor="cat-name">
              <input id="cat-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Lazer" className="field-input" />
            </Field>
            <Field label="Tipo" htmlFor="cat-type">
              <select id="cat-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="field-input" style={{ cursor: 'pointer' }}>
                <option value="EXPENSE">Gasto</option>
                <option value="INCOME">Entrada</option>
              </select>
            </Field>
          </div>

          {/* Color picker */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Cor</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: 24, height: 24, borderRadius: 6, background: c,
                  border: `2px solid ${form.color === c ? 'white' : 'transparent'}`,
                  cursor: 'pointer', transition: 'transform 0.2s',
                  transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>

          {error && <FormError>{error}</FormError>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{
              flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 13,
            }}>Cancelar</button>
            <Button onClick={save} loading={loading} icon={<Check size={13}/>} style={{ flex: 2 }}>Salvar</Button>
          </div>
        </div>
      )}

      {[{ label: 'Gastos', items: expense }, { label: 'Entradas', items: income }].map(({ label, items }) => (
        <div key={label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(cat => (
              <div key={cat.id} style={{
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                borderLeft: `3px solid ${cat.color || 'var(--border)'}`,
              }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{cat.name}</div>
                <button onClick={() => del(cat.id)} style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none',
                  background: 'rgba(240,82,82,0.08)', color: 'var(--danger)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Nenhuma categoria</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── PARCERIA TAB ── */
function ParceriaTab() {
  const { user, refreshUser } = useAuth()
  const [inviteCode, setInviteCode]   = useState('')
  const [inputCode, setInputCode]     = useState('')
  const [copied, setCopied]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  const generateCode = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await partnershipAPI.invite()
      setInviteCode(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao gerar código')
    } finally { setLoading(false) }
  }

  const acceptCode = async () => {
    if (!inputCode.trim()) return setError('Digite o código de convite')
    setLoading(true); setError('')
    try {
      await partnershipAPI.accept(inputCode.trim().toUpperCase())
      setSuccess('Parceria criada com sucesso!')
      await refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido ou expirado')
    } finally { setLoading(false) }
  }

  const dissolve = async () => {
    if (!confirm('Desconectar a parceria? Esta ação não pode ser desfeita.')) return
    setLoading(true)
    try {
      await partnershipAPI.dissolve()
      await refreshUser()
      setSuccess('Parceria encerrada.')
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao encerrar parceria')
    } finally { setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 480 }}>
      {user?.hasPartner ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            padding: '18px', borderRadius: 12,
            background: 'rgba(46,203,170,0.06)', border: '1px solid rgba(46,203,170,0.2)',
            display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(46,203,170,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--teal)',
            }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--teal)' }}>Parceria ativa</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Você está conectado com seu parceiro(a). Vocês compartilham o dashboard do casal.
              </div>
            </div>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-float)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>O que você pode fazer:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Compartilhar contas com seu parceiro</li>
              <li>Ver o dashboard do casal com totais combinados</li>
              <li>Dividir parcelas e assumir gastos</li>
              <li>Ver os investimentos compartilhados</li>
            </ul>
          </div>

          {error && <FormError>{error}</FormError>}
          {success && <div style={{ color: 'var(--mint)', fontSize: 13 }}>{success}</div>}

          <button onClick={dissolve} disabled={loading} style={{
            padding: '10px 16px', borderRadius: 8,
            border: '1px solid rgba(240,82,82,0.3)',
            background: 'rgba(240,82,82,0.08)', color: 'var(--danger)',
            cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content',
          }}>
            <UserX size={14} /> Encerrar parceria
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Generate invite */}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              Convidar parceiro(a)
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
              Gere um código e compartilhe com seu parceiro(a). O código expira em 24h.
            </div>

            {inviteCode ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(202,247,41,0.06)', border: '1px solid var(--border-accent)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
                  letterSpacing: '0.1em', color: 'var(--lime)', flex: 1, textAlign: 'center',
                }}>
                  {inviteCode}
                </div>
                <button onClick={copy} style={{
                  padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-accent)',
                  background: copied ? 'rgba(202,247,41,0.12)' : 'none',
                  color: 'var(--lime)', cursor: 'pointer', fontSize: 12,
                  fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {copied ? <Check size={13}/> : <Copy size={13}/>}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ) : (
              <Button onClick={generateCode} loading={loading} icon={<Plus size={14}/>}>
                Gerar código de convite
              </Button>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Accept invite */}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              Aceitar convite
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Insira o código que seu parceiro(a) gerou.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="field-input"
                style={{
                  flex: 1, textAlign: 'center', letterSpacing: '0.12em',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                }}
              />
              <Button onClick={acceptCode} loading={loading} icon={<Check size={14}/>}>
                Conectar
              </Button>
            </div>
          </div>

          {error && <FormError>{error}</FormError>}
          {success && <div style={{ color: 'var(--mint)', fontSize: 13 }}>{success}</div>}
        </div>
      )}
    </div>
  )
}

/* ── PERFIL TAB ── */
function PerfilTab() {
  const { user, refreshUser, logout } = useAuth()
  const [name, setName]           = useState(user?.name || '')
  const [telegramId, setTelegramId] = useState(user?.telegramId || '')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const save = async () => {
    setLoading(true); setError(''); setSuccess('')
    try {
      await authAPI.editProfile(name, telegramId)
      await refreshUser()
      setSuccess('Perfil atualizado!')
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar')
    } finally { setLoading(false) }
  }

  const deleteAccount = async () => {
    if (!confirm('Excluir sua conta permanentemente? TODOS os dados serão perdidos.')) return
    if (!confirm('Tem certeza absoluta? Esta ação é IRREVERSÍVEL.')) return
    try {
      await authAPI.deleteAccount()
      logout()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir conta')
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        <Field label="Nome" htmlFor="p-name">
          <input id="p-name" value={name} onChange={e => setName(e.target.value)} className="field-input" />
        </Field>
        <Field label="Telegram ID" htmlFor="p-telegram" hint="Para notificações via bot (opcional)">
          <input id="p-telegram" value={telegramId || ''} onChange={e => setTelegramId(e.target.value)}
            placeholder="@seu_usuario" className="field-input" />
        </Field>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          E-mail: <strong style={{ color: 'var(--text-secondary)' }}>{user?.email}</strong>
        </div>

        {error   && <FormError>{error}</FormError>}
        {success && <div style={{ color: 'var(--mint)', fontSize: 13 }}>{success}</div>}

        <Button onClick={save} loading={loading} icon={<Check size={14}/>}>Salvar perfil</Button>
      </div>

      <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>
          Zona de perigo
        </div>
        <button onClick={deleteAccount} style={{
          padding: '10px 16px', borderRadius: 8,
          border: '1px solid rgba(240,82,82,0.3)',
          background: 'rgba(240,82,82,0.08)', color: 'var(--danger)',
          cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)',
        }}>
          Excluir minha conta permanentemente
        </button>
      </div>
    </div>
  )
}