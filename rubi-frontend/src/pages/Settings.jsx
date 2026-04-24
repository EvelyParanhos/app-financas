import { useState, useEffect } from 'react'
import {
  User, Wallet, Tag, Users, Trash2, Plus, Check,
  Eye, EyeOff, Copy, Link2, Link2Off, AlertTriangle,
  CreditCard, Building2, PiggyBank, Pencil, X,
} from 'lucide-react'
import {
  authAPI, accountsAPI, categoriesAPI, partnershipAPI,
} from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Field, Button, FormError, Badge } from '../components/ui/FormElements'

/* ── Section nav ── */
const SECTIONS = [
  { id: 'profile',     icon: User,    label: 'Perfil'     },
  { id: 'accounts',    icon: Wallet,  label: 'Contas'     },
  { id: 'categories',  icon: Tag,     label: 'Categorias' },
  { id: 'partnership', icon: Users,   label: 'Parceria'   },
  { id: 'danger',      icon: Trash2,  label: 'Zona de perigo', danger: true },
]

const ACCOUNT_TYPE_LABELS = {
  CASH:        { label: 'Carteira',      icon: Wallet,    color: 'var(--teal)'   },
  CHECKING:    { label: 'Corrente',      icon: Building2, color: 'var(--violet)' },
  CREDIT_CARD: { label: 'Cartão',        icon: CreditCard,color: 'var(--danger)' },
  INVESTMENT:  { label: 'Investimento',  icon: PiggyBank, color: 'var(--lime)'   },
}

function fmt(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Settings() {
  const [active, setActive] = useState('profile')

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* ── Left nav ── */}
      <aside style={{
        width: 200, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 8px', gap: 2,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--text-muted)', textTransform: 'uppercase',
          padding: '0 10px', marginBottom: 8,
        }}>
          Configurações
        </div>
        {SECTIONS.map(({ id, icon: Icon, label, danger }) => (
          <button key={id} onClick={() => setActive(id)} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 10px', borderRadius: 7,
            border: 'none', cursor: 'pointer', width: '100%',
            background: active === id
              ? danger ? 'rgba(240,82,82,0.08)' : 'rgba(202,247,41,0.07)'
              : 'none',
            color: active === id
              ? danger ? 'var(--danger)' : 'var(--lime)'
              : danger ? 'var(--danger)' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            borderLeft: active === id
              ? `2px solid ${danger ? 'var(--danger)' : 'var(--lime)'}`
              : '2px solid transparent',
            transition: 'all var(--duration)',
          }}>
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </aside>

      {/* ── Content ── */}
      <main className="scrollable" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        {active === 'profile'     && <ProfileSection />}
        {active === 'accounts'    && <AccountsSection />}
        {active === 'categories'  && <CategoriesSection />}
        {active === 'partnership' && <PartnershipSection />}
        {active === 'danger'      && <DangerSection />}
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════════════ */
function ProfileSection() {
  const { user, refreshUser } = useAuth()
  const [name,       setName]       = useState(user?.name || '')
  const [telegramId, setTelegramId] = useState(user?.telegramId || '')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [saved,      setSaved]      = useState(false)

  const save = async () => {
    if (!name.trim()) { setError('O nome não pode ficar vazio.'); return }
    setError(''); setLoading(true)
    try {
      await authAPI.editProfile(name.trim(), telegramId.trim() || null)
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionHeader title="Perfil" sub="Seus dados pessoais na plataforma" />

      {/* Avatar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px', marginBottom: 24,
        background: 'var(--bg-raised)', borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--lime) 0%, var(--teal) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800,
          color: 'var(--text-inverse)',
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
          <div style={{ marginTop: 4 }}>
            <Badge color={user?.status === 'ACTIVE' ? 'teal' : 'muted'}>
              {user?.status === 'ACTIVE' ? 'Conta ativa' : user?.status}
            </Badge>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Nome completo" htmlFor="prof-name">
          <input
            id="prof-name" type="text" value={name}
            onChange={e => { setName(e.target.value); setSaved(false) }}
            className="field-input"
          />
        </Field>

        <Field label="E-mail" htmlFor="prof-email">
          <input
            id="prof-email" type="email" value={user?.email || ''}
            disabled className="field-input"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            O e-mail não pode ser alterado.
          </span>
        </Field>

        <Field label="Telegram ID (opcional)" htmlFor="prof-tg"
          hint="Usado para notificações via bot. Ex: @seuusuario">
          <input
            id="prof-tg" type="text" value={telegramId}
            onChange={e => { setTelegramId(e.target.value); setSaved(false) }}
            placeholder="@seuusuario"
            className="field-input"
          />
        </Field>

        {error && <FormError>{error}</FormError>}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button size="sm" loading={loading} onClick={save} icon={<Check size={14}/>}>
            Salvar alterações
          </Button>
          {saved && (
            <span style={{ fontSize: 12, color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={12} /> Salvo!
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ACCOUNTS
═══════════════════════════════════════════════════════════ */
const ACCOUNT_TYPES_OPTS = ['CASH','CHECKING','CREDIT_CARD','INVESTMENT']

const EMPTY_ACC = {
  name: '', type: 'CHECKING', cardLimit: '', closingDay: '', dueDay: '',
}

function AccountsSection() {
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(null) // account being edited
  const [creating, setCreating] = useState(false)
  const [form,     setForm]     = useState(EMPTY_ACC)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await accountsAPI.list(false)
      setAccounts(data || [])
    } catch { setAccounts([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(EMPTY_ACC); setEditing(null)
    setCreating(true); setError('')
  }

  const openEdit = (acc) => {
    setForm({
      name:       acc.name,
      type:       acc.type,
      cardLimit:  acc.cardLimit  || '',
      closingDay: acc.closingDay || '',
      dueDay:     acc.dueDay     || '',
    })
    setEditing(acc); setCreating(false); setError('')
  }

  const cancelForm = () => { setCreating(false); setEditing(null); setError('') }

  const saveForm = async () => {
    if (!form.name.trim()) { setError('Informe um nome.'); return }
    if (form.type === 'CREDIT_CARD' && (!form.cardLimit || parseFloat(form.cardLimit) <= 0)) {
      setError('Informe o limite do cartão.'); return
    }
    setError(''); setSaving(true)
    try {
      const payload = {
        name:       form.name.trim(),
        type:       form.type,
        cardLimit:  form.type === 'CREDIT_CARD' ? parseFloat(form.cardLimit) : undefined,
        closingDay: form.type === 'CREDIT_CARD' ? parseInt(form.closingDay) || 10 : undefined,
        dueDay:     form.type === 'CREDIT_CARD' ? parseInt(form.dueDay) || 15 : undefined,
      }
      if (editing) {
        await accountsAPI.edit(editing.id, payload)
      } else {
        await accountsAPI.create(payload)
      }
      cancelForm()
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar conta.')
    } finally {
      setSaving(false)
    }
  }

  const deleteAcc = async (acc) => {
    if (!confirm(`Excluir "${acc.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await accountsAPI.delete(acc.id)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Não foi possível excluir.')
    }
  }

  const toggleVisibility = async (acc) => {
    try {
      await accountsAPI.toggleVisibility(acc.id)
      load()
    } catch { /* ignore */ }
  }

  if (loading) return <Loader />

  return (
    <div style={{ maxWidth: 560 }}>
      <SectionHeader
        title="Contas"
        sub="Gerencie suas contas bancárias, carteiras e investimentos"
        action={
          !creating && !editing &&
          <Button size="sm" onClick={openCreate} icon={<Plus size={14}/>}>
            Nova conta
          </Button>
        }
      />

      {/* Form — create / edit */}
      {(creating || editing) && (
        <div style={{
          padding: '18px', marginBottom: 20,
          background: 'var(--bg-float)', borderRadius: 12,
          border: '1px solid var(--border-bright)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            {editing ? `Editando: ${editing.name}` : 'Nova conta'}
          </div>

          {/* Type selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
            {ACCOUNT_TYPES_OPTS.map(t => {
              const { label, icon: Icon, color } = ACCOUNT_TYPE_LABELS[t]
              const active = form.type === t
              return (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                  padding: '9px 6px', borderRadius: 7,
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  background: active ? `rgba(${accColorRgb(color)},0.08)` : 'var(--bg-raised)',
                  cursor: editing ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  color: active ? color : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
                  opacity: editing ? 0.5 : 1,
                  transition: 'all var(--duration)',
                }}
                  disabled={!!editing}
                >
                  <Icon size={14} />
                  {label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="Nome" htmlFor="acc-name" style={{ gridColumn: '1/-1' }}>
              <input id="acc-name" type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={form.type === 'CREDIT_CARD' ? 'Nubank, Itaú...' : 'Conta principal...'}
                className="field-input" autoFocus
              />
            </Field>

            {form.type === 'CREDIT_CARD' && (
              <>
                <Field label="Limite (R$)" htmlFor="acc-limit">
                  <input id="acc-limit" type="number" value={form.cardLimit}
                    onChange={e => setForm(f => ({ ...f, cardLimit: e.target.value }))}
                    placeholder="5000" min="1" className="field-input" />
                </Field>
                <div />
                <Field label="Dia fechamento" htmlFor="acc-cd">
                  <input id="acc-cd" type="number" value={form.closingDay}
                    onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))}
                    placeholder="10" min="1" max="28" className="field-input" />
                </Field>
                <Field label="Dia vencimento" htmlFor="acc-dd">
                  <input id="acc-dd" type="number" value={form.dueDay}
                    onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                    placeholder="15" min="1" max="31" className="field-input" />
                </Field>
              </>
            )}
          </div>

          {error && <FormError>{error}</FormError>}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button size="sm" loading={saving} onClick={saveForm} icon={<Check size={14}/>}>
              {editing ? 'Salvar' : 'Criar conta'}
            </Button>
            <Button size="sm" variant="secondary" onClick={cancelForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Account list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {accounts.length === 0 && (
          <EmptyState icon={<Wallet size={20}/>} label="Nenhuma conta cadastrada" />
        )}
        {accounts.map(acc => {
          const { label, icon: Icon, color } = ACCOUNT_TYPE_LABELS[acc.type] || ACCOUNT_TYPE_LABELS.CASH
          return (
            <div key={acc.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', borderRadius: 10,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${color}`,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: `rgba(${accColorRgb(color)},0.1)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color,
              }}>
                <Icon size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {label}
                  {acc.type === 'CREDIT_CARD' && acc.cardLimit &&
                    ` • Limite: ${fmt(acc.cardLimit)}`}
                  {acc.type !== 'CREDIT_CARD' && acc.type !== 'INVESTMENT' &&
                    ` • Saldo: ${fmt(acc.balance)}`}
                </div>
              </div>

              {/* Shared toggle */}
              <button onClick={() => toggleVisibility(acc)} title={acc.shared ? 'Compartilhada com parceiro(a)' : 'Apenas você'} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 9px', borderRadius: 5,
                border: `1px solid ${acc.shared ? 'rgba(46,203,170,0.3)' : 'var(--border)'}`,
                background: acc.shared ? 'rgba(46,203,170,0.07)' : 'none',
                color: acc.shared ? 'var(--teal)' : 'var(--text-muted)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)', transition: 'all var(--duration)',
              }}>
                {acc.shared ? <Eye size={12}/> : <EyeOff size={12}/>}
                {acc.shared ? 'Casal' : 'Só eu'}
              </button>

              {/* Edit */}
              <IconAction icon={<Pencil size={13}/>} label="Editar" onClick={() => openEdit(acc)} />
              {/* Delete */}
              <IconAction icon={<Trash2 size={13}/>} label="Excluir" onClick={() => deleteAcc(acc)} danger />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CATEGORIES
═══════════════════════════════════════════════════════════ */
const CAT_TYPES = [
  { value: 'EXPENSE',  label: 'Gasto',    color: 'var(--danger)' },
  { value: 'INCOME',   label: 'Entrada',  color: 'var(--mint)'   },
  { value: 'TRANSFER', label: 'Transfer', color: 'var(--violet)' },
]

function CategoriesSection() {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [creating,   setCreating]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState({ name: '', type: 'EXPENSE', icon: '', color: '#6366F1' })
  const [error,      setError]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [filter,     setFilter]     = useState('ALL')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await categoriesAPI.list()
      setCategories(data || [])
    } catch { setCategories([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ name: '', type: 'EXPENSE', icon: '', color: '#6366F1' })
    setEditing(null); setCreating(true); setError('')
  }

  const openEdit = (cat) => {
    setForm({ name: cat.name, type: cat.type, icon: cat.icon || '', color: cat.color || '#6366F1' })
    setEditing(cat); setCreating(false); setError('')
  }

  const cancelForm = () => { setCreating(false); setEditing(null); setError('') }

  const saveForm = async () => {
    if (!form.name.trim()) { setError('Informe um nome.'); return }
    setError(''); setSaving(true)
    try {
      const payload = {
        name:  form.name.trim(),
        type:  form.type,
        icon:  form.icon  || null,
        color: form.color || null,
      }
      if (editing) {
        await categoriesAPI.edit(editing.id, payload)
      } else {
        await categoriesAPI.create(payload)
      }
      cancelForm(); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const deletecat = async (cat) => {
    if (!confirm(`Arquivar categoria "${cat.name}"?`)) return
    try { await categoriesAPI.delete(cat.id); load() }
    catch (err) { alert(err.response?.data?.message || 'Não foi possível arquivar.') }
  }

  const displayed = filter === 'ALL'
    ? categories
    : categories.filter(c => c.type === filter)

  if (loading) return <Loader />

  return (
    <div style={{ maxWidth: 520 }}>
      <SectionHeader
        title="Categorias"
        sub="Organize seus gastos e receitas por categoria"
        action={
          !creating && !editing &&
          <Button size="sm" onClick={openCreate} icon={<Plus size={14}/>}>
            Nova categoria
          </Button>
        }
      />

      {/* Form */}
      {(creating || editing) && (
        <div style={{
          padding: '18px', marginBottom: 20,
          background: 'var(--bg-float)', borderRadius: 12,
          border: '1px solid var(--border-bright)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            {editing ? `Editando: ${editing.name}` : 'Nova categoria'}
          </div>

          {/* Type */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {CAT_TYPES.map(({ value, label, color }) => (
              <button key={value} onClick={() => setForm(f => ({ ...f, type: value }))} style={{
                flex: 1, padding: '8px', borderRadius: 7, cursor: 'pointer',
                border: `1px solid ${form.type === value ? color : 'var(--border)'}`,
                background: form.type === value ? `rgba(${accColorRgb(color)},0.08)` : 'var(--bg-raised)',
                color: form.type === value ? color : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
                transition: 'all var(--duration)',
              }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
            <Field label="Nome" htmlFor="cat-name">
              <input id="cat-name" type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Alimentação, Salário..."
                className="field-input" autoFocus />
            </Field>

            {/* Color */}
            <Field label="Cor" htmlFor="cat-color">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="cat-color" type="color" value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{
                    width: 42, height: 42, padding: 3, borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-raised)',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </Field>
          </div>

          <Field label="Ícone Lucide (opcional)" htmlFor="cat-icon">
            <input id="cat-icon" type="text" value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              placeholder="house, utensils, car..."
              className="field-input" />
          </Field>

          {error && <FormError>{error}</FormError>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button size="sm" loading={saving} onClick={saveForm} icon={<Check size={14}/>}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
            <Button size="sm" variant="secondary" onClick={cancelForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[{ value: 'ALL', label: 'Todas' }, ...CAT_TYPES].map(({ value, label, color }) => (
          <button key={value} onClick={() => setFilter(value)} style={{
            padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${filter === value ? (color || 'var(--lime)') : 'var(--border)'}`,
            background: filter === value ? `rgba(${accColorRgb(color || 'var(--lime)')},0.08)` : 'var(--bg-raised)',
            color: filter === value ? (color || 'var(--lime)') : 'var(--text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all var(--duration)',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Category list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {displayed.length === 0 && (
          <EmptyState icon={<Tag size={20}/>} label="Nenhuma categoria" />
        )}
        {displayed.map(cat => {
          const typeInfo = CAT_TYPES.find(t => t.value === cat.type)
          return (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 9,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
            }}>
              {/* Color dot */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: cat.color || typeInfo?.color || 'var(--text-muted)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.name}</span>
                {cat.icon && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {cat.icon}
                  </span>
                )}
              </div>
              <Badge color={
                cat.type === 'EXPENSE'  ? 'danger' :
                cat.type === 'INCOME'   ? 'teal'   : 'violet'
              }>
                {typeInfo?.label || cat.type}
              </Badge>
              <IconAction icon={<Pencil size={13}/>} label="Editar" onClick={() => openEdit(cat)} />
              <IconAction icon={<Trash2 size={13}/>} label="Arquivar" onClick={() => deletecat(cat)} danger />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PARTNERSHIP
═══════════════════════════════════════════════════════════ */
function PartnershipSection() {
  const { user, refreshUser } = useAuth()
  const hasPartner = user?.hasPartner

  const [inviteCode,    setInviteCode]    = useState('')
  const [acceptCode,    setAcceptCode]    = useState('')
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingAccept, setLoadingAccept] = useState(false)
  const [loadingDissolve,setLoadingDissolve] = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')

  const generateInvite = async () => {
    setError(''); setLoadingInvite(true)
    try {
      const { data } = await partnershipAPI.invite()
      setInviteCode(typeof data === 'string' ? data : data.code || data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao gerar convite.')
    } finally { setLoadingInvite(false) }
  }

  const acceptInvite = async () => {
    if (!acceptCode.trim()) { setError('Cole o código de convite.'); return }
    setError(''); setLoadingAccept(true)
    try {
      await partnershipAPI.accept(acceptCode.trim().toUpperCase())
      setSuccess('Parceria criada com sucesso!')
      setAcceptCode('')
      await refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido ou expirado.')
    } finally { setLoadingAccept(false) }
  }

  const dissolve = async () => {
    if (!confirm('Tem certeza que deseja encerrar a parceria? O histórico financeiro será preservado.')) return
    setError(''); setLoadingDissolve(true)
    try {
      await partnershipAPI.dissolve()
      setSuccess('Parceria encerrada.')
      await refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao encerrar parceria.')
    } finally { setLoadingDissolve(false) }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionHeader title="Parceria" sub="Conecte-se com seu parceiro(a) para compartilhar o controle financeiro" />

      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderRadius: 10, marginBottom: 24,
        background: hasPartner ? 'rgba(46,203,170,0.07)' : 'var(--bg-float)',
        border: `1px solid ${hasPartner ? 'rgba(46,203,170,0.2)' : 'var(--border)'}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: hasPartner ? 'rgba(46,203,170,0.12)' : 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hasPartner ? 'var(--teal)' : 'var(--text-muted)',
        }}>
          {hasPartner ? <Link2 size={16}/> : <Link2Off size={16}/>}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: hasPartner ? 'var(--teal)' : 'var(--text-secondary)' }}>
            {hasPartner ? 'Parceria ativa' : 'Sem parceria'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {hasPartner
              ? 'Você está conectado(a). Contas compartilhadas e dashboard do casal disponíveis.'
              : 'Gere um convite ou aceite o código do seu parceiro(a) para conectar.'}
          </div>
        </div>
      </div>

      {error   && <div style={{ marginBottom: 16 }}><FormError>{error}</FormError></div>}
      {success && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(46,203,170,0.07)', border: '1px solid rgba(46,203,170,0.2)',
          color: 'var(--teal)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <Check size={13}/> {success}
        </div>
      )}

      {/* If no partner */}
      {!hasPartner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Generate invite */}
          <div style={{
            padding: '18px', borderRadius: 12,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              Convidar parceiro(a)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Gere um código e envie para seu parceiro(a). Válido por 24h.
            </div>

            {inviteCode ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-float)', border: '1px solid var(--border-accent)',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
                  letterSpacing: '0.15em', color: 'var(--lime)', textAlign: 'center',
                }}>
                  {inviteCode}
                </div>
                <Button size="sm" variant="secondary" onClick={copyCode} icon={<Copy size={14}/>}>
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            ) : (
              <Button size="sm" loading={loadingInvite} onClick={generateInvite} icon={<Link2 size={14}/>}>
                Gerar código
              </Button>
            )}
          </div>

          {/* Accept invite */}
          <div style={{
            padding: '18px', borderRadius: 12,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              Aceitar convite
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Cole o código enviado pelo seu parceiro(a).
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" value={acceptCode}
                onChange={e => { setAcceptCode(e.target.value.toUpperCase()); setError('') }}
                placeholder="XXXXXX"
                maxLength={6}
                className="field-input"
                style={{ flex: 1, letterSpacing: '0.12em', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, textAlign: 'center', textTransform: 'uppercase' }}
              />
              <Button size="sm" loading={loadingAccept} onClick={acceptInvite} icon={<Check size={14}/>}>
                Conectar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* If has partner */}
      {hasPartner && (
        <div style={{
          padding: '18px', borderRadius: 12,
          background: 'rgba(240,82,82,0.04)',
          border: '1px solid rgba(240,82,82,0.12)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--danger)' }}>
            Encerrar parceria
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
            O histórico financeiro e transações existentes serão preservados.
            As funcionalidades do casal (dashboard, divisão de parcelas) serão desativadas.
          </div>
          <Button size="sm" variant="danger" loading={loadingDissolve} onClick={dissolve} icon={<Link2Off size={14}/>}>
            Encerrar parceria
          </Button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   DANGER ZONE
═══════════════════════════════════════════════════════════ */
function DangerSection() {
  const { logout } = useAuth()
  const [confirm1, setConfirm1] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const deleteAccount = async () => {
    if (confirm1 !== 'EXCLUIR') {
      setError('Digite EXCLUIR para confirmar.'); return
    }
    setError(''); setLoading(true)
    try {
      await authAPI.deleteAccount()
      logout()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir conta.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionHeader title="Zona de perigo" sub="Ações irreversíveis — leia com atenção antes de prosseguir" />

      <div style={{
        padding: '20px', borderRadius: 12,
        background: 'rgba(240,82,82,0.04)',
        border: '1px solid rgba(240,82,82,0.15)',
      }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(240,82,82,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--danger)',
          }}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--danger)', marginBottom: 4 }}>
              Excluir minha conta
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Todos os seus dados serão permanentemente excluídos: transações, parcelas, categorias,
              orçamentos, investimentos e histórico de auditoria. <strong style={{ color: 'var(--text-secondary)' }}>Esta ação não pode ser desfeita.</strong>
            </div>
          </div>
        </div>

        <Field label='Digite EXCLUIR para confirmar' htmlFor="confirm-delete">
          <input
            id="confirm-delete" type="text" value={confirm1}
            onChange={e => { setConfirm1(e.target.value.toUpperCase()); setError('') }}
            placeholder="EXCLUIR"
            className="field-input"
            style={{ borderColor: confirm1 === 'EXCLUIR' ? 'var(--danger)' : undefined }}
          />
        </Field>

        {error && <div style={{ marginTop: 12 }}><FormError>{error}</FormError></div>}

        <div style={{ marginTop: 14 }}>
          <Button
            size="sm" variant="danger"
            loading={loading}
            disabled={confirm1 !== 'EXCLUIR'}
            onClick={deleteAccount}
            icon={<Trash2 size={14}/>}
          >
            Excluir minha conta permanentemente
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SHARED UI HELPERS
═══════════════════════════════════════════════════════════ */
function SectionHeader({ title, sub, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 24, gap: 12,
    }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{sub}</p>
      </div>
      {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
    </div>
  )
}

function IconAction({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} title={label} style={{
      width: 28, height: 28, borderRadius: 6,
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'none',
      color: danger ? 'var(--danger)' : 'var(--text-muted)',
      opacity: 0.6, transition: 'all var(--duration)',
    }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = danger ? 'rgba(240,82,82,0.1)' : 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'none' }}
    >
      {icon}
    </button>
  )
}

function EmptyState({ icon, label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '32px 0', color: 'var(--text-muted)',
    }}>
      {icon}
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  )
}

function Loader() {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Carregando...
    </div>
  )
}

function accColorRgb(cssVar) {
  const map = {
    'var(--lime)':   '202,247,41',
    'var(--teal)':   '46,203,170',
    'var(--violet)': '136,141,218',
    'var(--mint)':   '121,221,126',
    'var(--danger)': '240,82,82',
  }
  return map[cssVar] || '255,255,255'
}