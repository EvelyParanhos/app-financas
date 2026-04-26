import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { accountsAPI, recurringAPI } from '../services/api'
import { RubiLogo } from '../App'
import { Button, Field, FormError } from '../components/ui/FormElements'
import {
  Wallet, CreditCard, Building2, PiggyBank,
  ArrowRight, ArrowLeft, Check, Plus, Trash2,
  DollarSign, TrendingUp, AlertCircle
} from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'CASH',        label: 'Carteira',       icon: Wallet,     desc: 'Dinheiro em espécie' },
  { value: 'CHECKING',    label: 'Conta corrente', icon: Building2,  desc: 'Banco, inter, nubank...' },
  { value: 'CREDIT_CARD', label: 'Cartão crédito', icon: CreditCard, desc: 'Fatura mensal' },
  { value: 'INVESTMENT',  label: 'Investimento',   icon: PiggyBank,  desc: 'Reserva, tesouro...' },
]

const STEPS = ['Boas-vindas', 'Suas contas', 'Entradas fixas', 'Gastos fixos', 'Pronto!']

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: 'var(--bg-float)',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  outline: 'none',
  minHeight: 48,
  transition: 'border-color 0.2s',
}

export default function Onboarding() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — contas
  const [accounts, setAccounts] = useState([
    { name: '', type: 'CHECKING', balance: '', cardLimit: '', closingDay: '', dueDay: '' }
  ])

  // Step 2 — entradas recorrentes
  const [incomes, setIncomes] = useState([
    { description: '', estimatedAmount: '', dayOfMonth: '' }
  ])

  // Step 3 — gastos recorrentes
  const [expenses, setExpenses] = useState([
    { description: '', estimatedAmount: '', dayOfMonth: '', isVariable: false }
  ])

  const setAccount = (i, field, val) =>
    setAccounts(a => a.map((acc, idx) => idx === i ? { ...acc, [field]: val } : acc))
  const setIncome = (i, field, val) =>
    setIncomes(a => a.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  const setExpense = (i, field, val) =>
    setExpenses(a => a.map((it, idx) => idx === i ? { ...it, [field]: val } : it))

  // ── SAVE HANDLERS ────────────────────────────────────────────────────
  const saveAccounts = async () => {
    setError(''); setLoading(true)
    try {
      const valid = accounts.filter(a => a.name.trim() && a.type)
      for (const acc of valid) {
        const payload = {
          name: acc.name.trim(), type: acc.type,
          initialBalance: parseFloat(acc.balance) || 0,
          shared: false,
        }
        if (acc.type === 'CREDIT_CARD') {
          if (!acc.cardLimit || parseFloat(acc.cardLimit) <= 0) {
            setError(`Informe o limite do cartão "${acc.name}".`)
            setLoading(false); return
          }
          payload.cardLimit  = parseFloat(acc.cardLimit)
          payload.closingDay = parseInt(acc.closingDay) || 10
          payload.dueDay     = parseInt(acc.dueDay)     || 15
        }
        await accountsAPI.create(payload)
      }
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar contas.')
    } finally { setLoading(false) }
  }

  const saveIncomes = async () => {
    setError(''); setLoading(true)
    try {
      const valid = incomes.filter(i => i.description.trim() && i.estimatedAmount)
      for (const inc of valid) {
        await recurringAPI.create({
          description: inc.description.trim(),
          estimatedAmount: parseFloat(inc.estimatedAmount),
          dayOfMonth: parseInt(inc.dayOfMonth) || 5,
          type: 'INCOME',
          isVariable: false,
        })
      }
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar entradas.')
    } finally { setLoading(false) }
  }

  const saveExpenses = async () => {
    setError(''); setLoading(true)
    try {
      const valid = expenses.filter(e => e.description.trim() && e.estimatedAmount)
      for (const exp of valid) {
        await recurringAPI.create({
          description: exp.description.trim(),
          estimatedAmount: parseFloat(exp.estimatedAmount),
          dayOfMonth: parseInt(exp.dayOfMonth) || 10,
          type: 'EXPENSE',
          isVariable: exp.isVariable,
        })
      }
      setStep(4)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar gastos fixos.')
    } finally { setLoading(false) }
  }

  const finish = async () => {
    // Marca onboarding como concluído no localStorage
    if (user?.email) {
      localStorage.setItem(`rubi_onboarding_done_${user.email.toLowerCase()}`, '1')
    }
    await refreshUser()
    navigate('/dashboard')
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', overflow: 'hidden', padding: 24,
    }}>
      {/* Fundo decorativo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 80%)',
        opacity: 0.4,
      }} />

      <div style={{
        width: '100%', maxWidth: 620,
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        animation: 'fadeUp 0.4s var(--ease) both', position: 'relative',
      }}>
        {/* Barra de progresso */}
        <div style={{ height: 3, background: 'var(--bg-overlay)' }}>
          <div style={{
            height: '100%', background: 'var(--lime)',
            width: `${(step / 4) * 100}%`,
            transition: 'width 0.4s var(--ease)',
            borderRadius: '0 99px 99px 0',
          }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <RubiLogo size={24} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Passo {Math.min(step + 1, 5)} de 5
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
              {STEPS[Math.min(step, 4)]}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i <= step ? 20 : 8, height: 8, borderRadius: 99,
                background: i <= step ? 'var(--lime)' : 'var(--bg-overlay)',
                opacity: i === step ? 1 : i < step ? 0.6 : 0.3,
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="scrollable" style={{ padding: '28px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

          {/* Step 0 — Boas-vindas */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.2 }}>
                Olá, {user?.name?.split(' ')[0]}! 👋
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Vamos configurar o Rubi em menos de 2 minutos. Você vai informar:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: Building2,  label: 'Suas contas e saldos atuais',  desc: 'Banco, carteira, cartões, investimentos' },
                  { icon: TrendingUp, label: 'Suas entradas fixas',           desc: 'Salário, freelances, renda extra' },
                  { icon: DollarSign, label: 'Seus gastos fixos mensais',     desc: 'Aluguel, streaming, academias...' },
                ].map(({ icon: Icon, label, desc }, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 14, padding: '14px 16px',
                    background: 'var(--bg-float)', borderRadius: 10, border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(202,247,41,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--lime)', flexShrink: 0,
                    }}>
                      <Icon size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                display: 'flex', gap: 8, padding: '12px 14px',
                background: 'rgba(46,203,170,0.06)', borderRadius: 8,
                border: '1px solid rgba(46,203,170,0.15)', color: 'var(--teal)', fontSize: 13,
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Você pode começar com saldo zerado — o Rubi parte do ponto onde você está hoje.</span>
              </div>
            </div>
          )}

          {/* Step 1 — Contas */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Informe suas contas e o <strong style={{ color: 'var(--text-primary)' }}>saldo atual</strong> de cada uma.
              </p>
              {accounts.map((acc, i) => (
                <AccountForm key={i} acc={acc} i={i} onChange={setAccount}
                  onRemove={() => setAccounts(a => a.filter((_, idx) => idx !== i))}
                  canRemove={accounts.length > 1} />
              ))}
              <button onClick={() => setAccounts(a => [...a, { name: '', type: 'CHECKING', balance: '', cardLimit: '', closingDay: '', dueDay: '' }])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  borderRadius: 8, border: '1px dashed var(--border)', background: 'none',
                  cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-body)',
                }}>
                <Plus size={14} /> Adicionar conta
              </button>
              {error && <FormError>{error}</FormError>}
            </div>
          )}

          {/* Step 2 — Entradas */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Cadastre suas <strong style={{ color: 'var(--text-primary)' }}>entradas mensais fixas</strong> — salário, freelances...
              </p>
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(202,247,41,0.06)', border: '1px solid var(--border-accent)',
                color: 'var(--lime)', fontSize: 12, display: 'flex', gap: 8,
              }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                Pule este passo se não tiver entradas fixas — você pode cadastrar depois em Configurações.
              </div>
              {incomes.map((inc, i) => (
                <RecurringForm key={i} item={inc} i={i} onChange={setIncome}
                  onRemove={() => setIncomes(a => a.filter((_, idx) => idx !== i))}
                  canRemove={incomes.length > 1} type="income" />
              ))}
              <button onClick={() => setIncomes(a => [...a, { description: '', estimatedAmount: '', dayOfMonth: '' }])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  borderRadius: 8, border: '1px dashed var(--border)', background: 'none',
                  cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-body)',
                }}>
                <Plus size={14} /> Adicionar entrada
              </button>
              {error && <FormError>{error}</FormError>}
            </div>
          )}

          {/* Step 3 — Gastos */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Cadastre seus <strong style={{ color: 'var(--text-primary)' }}>gastos fixos mensais</strong> — aluguel, streaming, academia...
              </p>
              {expenses.map((exp, i) => (
                <RecurringForm key={i} item={exp} i={i} onChange={setExpense}
                  onRemove={() => setExpenses(a => a.filter((_, idx) => idx !== i))}
                  canRemove={expenses.length > 1} type="expense" />
              ))}
              <button onClick={() => setExpenses(a => [...a, { description: '', estimatedAmount: '', dayOfMonth: '', isVariable: false }])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  borderRadius: 8, border: '1px dashed var(--border)', background: 'none',
                  cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-body)',
                }}>
                <Plus size={14} /> Adicionar gasto
              </button>
              {error && <FormError>{error}</FormError>}
            </div>
          )}

          {/* Step 4 — Concluído */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'rgba(202,247,41,0.12)', border: '1px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lime)',
              }}>
                <Check size={28} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                  Tudo configurado!
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360 }}>
                  O Rubi está pronto. Você pode editar contas e recorrentes a qualquer momento em Configurações.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {step > 0 && step < 4 ? (
            <button onClick={() => setStep(s => s - 1)} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none',
              border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              fontSize: 13, fontFamily: 'var(--font-body)',
            }}>
              <ArrowLeft size={14} /> Voltar
            </button>
          ) : <div />}

          {step === 0 && <Button onClick={() => setStep(1)} icon={<ArrowRight size={16}/>}>Começar</Button>}
          {step === 1 && <Button onClick={saveAccounts} loading={loading} icon={<ArrowRight size={16}/>}>Salvar e continuar</Button>}
          {step === 2 && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                fontSize: 13, fontFamily: 'var(--font-body)',
              }}>
                Pular
              </button>
              <Button onClick={saveIncomes} loading={loading} icon={<ArrowRight size={16}/>}>Continuar</Button>
            </div>
          )}
          {step === 3 && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(4)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                fontSize: 13, fontFamily: 'var(--font-body)',
              }}>
                Pular
              </button>
              <Button onClick={saveExpenses} loading={loading} icon={<ArrowRight size={16}/>}>Continuar</Button>
            </div>
          )}
          {step === 4 && <Button onClick={finish} icon={<Check size={16}/>}>Ir para o dashboard</Button>}
        </div>
      </div>
    </div>
  )
}

// ── Sub-componentes ─────────────────────────────────────────────────────

function AccountForm({ acc, i, onChange, onRemove, canRemove }) {
  return (
    <div style={{ background: 'var(--bg-float)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, flex: 1 }}>
          {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => onChange(i, 'type', value)} style={{
              padding: '8px 6px', borderRadius: 6,
              border: `1px solid ${acc.type === value ? 'var(--lime)' : 'var(--border)'}`,
              background: acc.type === value ? 'rgba(202,247,41,0.08)' : 'var(--bg-raised)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: acc.type === value ? 'var(--lime)' : 'var(--text-secondary)',
              transition: 'all var(--duration)',
            }}>
              <Icon size={14} />
              <span style={{ fontSize: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>
        {canRemove && (
          <button onClick={onRemove} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: 'rgba(240,82,82,0.08)', color: 'var(--danger)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Nome da conta" htmlFor={`acc-name-${i}`}>
          <input
            id={`acc-name-${i}`} type="text" value={acc.name}
            onChange={e => onChange(i, 'name', e.target.value)}
            placeholder={acc.type === 'CREDIT_CARD' ? 'Nubank, Itaú...' : 'Banco, Carteira...'}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--lime)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </Field>

        {acc.type === 'CREDIT_CARD' ? (
          <Field label="Limite do cartão (R$)" htmlFor={`acc-limit-${i}`}>
            <input id={`acc-limit-${i}`} type="number" value={acc.cardLimit}
              onChange={e => onChange(i, 'cardLimit', e.target.value)}
              placeholder="5000" min="0" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--lime)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>
        ) : (
          <Field label="Saldo atual (R$)" htmlFor={`acc-bal-${i}`}>
            <input id={`acc-bal-${i}`} type="number" value={acc.balance}
              onChange={e => onChange(i, 'balance', e.target.value)}
              placeholder="0,00" min="0" step="0.01" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--lime)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>
        )}

        {acc.type === 'CREDIT_CARD' && (
          <>
            <Field label="Dia de fechamento" htmlFor={`acc-cd-${i}`}>
              <input id={`acc-cd-${i}`} type="number" value={acc.closingDay}
                onChange={e => onChange(i, 'closingDay', e.target.value)}
                placeholder="10" min="1" max="28" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
            <Field label="Dia de vencimento" htmlFor={`acc-dd-${i}`}>
              <input id={`acc-dd-${i}`} type="number" value={acc.dueDay}
                onChange={e => onChange(i, 'dueDay', e.target.value)}
                placeholder="15" min="1" max="31" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  )
}

function RecurringForm({ item, i, onChange, onRemove, canRemove, type }) {
  return (
    <div style={{
      background: 'var(--bg-float)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 90px', gap: 10, alignItems: 'end' }}>
        <Field label="Descrição" htmlFor={`rec-desc-${type}-${i}`}>
          <input id={`rec-desc-${type}-${i}`} type="text" value={item.description}
            onChange={e => onChange(i, 'description', e.target.value)}
            placeholder={type === 'income' ? 'Salário, Freelance...' : 'Aluguel, Netflix...'}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--lime)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </Field>
        <Field label="Valor (R$)" htmlFor={`rec-val-${type}-${i}`}>
          <input id={`rec-val-${type}-${i}`} type="number" value={item.estimatedAmount}
            onChange={e => onChange(i, 'estimatedAmount', e.target.value)}
            placeholder="0,00" min="0" step="0.01" style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--lime)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </Field>
        <Field label="Dia" htmlFor={`rec-day-${type}-${i}`}>
          <input id={`rec-day-${type}-${i}`} type="number" value={item.dayOfMonth}
            onChange={e => onChange(i, 'dayOfMonth', e.target.value)}
            placeholder="5" min="1" max="31" style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--lime)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {type === 'expense' ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
            <div onClick={() => onChange(i, 'isVariable', !item.isVariable)} style={{
              width: 32, height: 18, borderRadius: 99,
              background: item.isVariable ? 'var(--teal)' : 'var(--bg-overlay)',
              border: '1px solid var(--border)', position: 'relative',
              cursor: 'pointer', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: item.isVariable ? 14 : 2,
                width: 12, height: 12, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s',
              }} />
            </div>
            Valor variável (ex: conta de luz)
          </label>
        ) : <div />}

        {canRemove && (
          <button onClick={onRemove} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: 'rgba(240,82,82,0.08)', color: 'var(--danger)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}