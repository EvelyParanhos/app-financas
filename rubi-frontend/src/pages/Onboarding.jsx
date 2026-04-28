import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { accountsAPI, budgetsAPI, categoriesAPI, recurringAPI } from '../services/api'
import { RubiLogo } from '../App'
import { Button, Field, FormError } from '../components/ui/FormElements'
import CurrencyInput from '../components/ui/CurrencyInput'
import {
  ArrowLeft, ArrowRight, Building2, Check, CreditCard,
  DollarSign, PiggyBank, Target, Trash2, Wallet,
} from 'lucide-react'

const STEPS = [
  { title: 'Fotografia Atual', icon: Building2 },
  { title: 'Entradas Fixas', icon: DollarSign },
  { title: 'Gastos Fixos', icon: Wallet },
  { title: 'Reserva', icon: PiggyBank },
  { title: 'Orçamentos', icon: Target },
]

const textInputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-float)',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  outline: 'none',
  minHeight: 44,
}

const cardStyle = {
  background: 'var(--bg-float)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 16,
}

const todayPeriod = () => {
  const today = new Date()
  return { month: today.getMonth() + 1, year: today.getFullYear() }
}

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export default function Onboarding() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState({})

  const [primaryAccount, setPrimaryAccount] = useState(null)
  const [investmentAccount, setInvestmentAccount] = useState(null)

  const [checking, setChecking] = useState({
    name: 'Conta principal',
    balance: 0,
  })
  const [card, setCard] = useState({
    enabled: true,
    name: 'Cartão principal',
    openInvoiceAmount: 0,
    closingDay: '10',
    dueDay: '15',
  })
  const [income, setIncome] = useState({
    description: 'Salário',
    amount: 0,
    dayOfMonth: '5',
    alreadyLiquidatedThisMonth: false,
  })
  const [expenses, setExpenses] = useState([
    { description: 'Aluguel', amount: 0, dayOfMonth: '10', isVariable: false, alreadyLiquidatedThisMonth: false },
    { description: 'Luz', amount: 0, dayOfMonth: '15', isVariable: true, alreadyLiquidatedThisMonth: false },
  ])
  const [reserve, setReserve] = useState({
    accountName: 'Reserva Rubi',
    amount: 0,
    dayOfMonth: '5',
    alreadyLiquidatedThisMonth: false,
  })
  const [budgets, setBudgets] = useState({
    food: 0,
    leisure: 0,
  })

  const finishOnboarding = async () => {
    if (user?.email) {
      localStorage.setItem(`rubi_onboarding_done_${user.email.toLowerCase()}`, '1')
    }
    await refreshUser()
    navigate('/dashboard')
  }

  const runStep = async () => {
    setError('')
    setLoading(true)
    try {
      if (currentStep === 0) await saveCurrentSnapshot()
      if (currentStep === 1) await saveIncome()
      if (currentStep === 2) await saveExpenses()
      if (currentStep === 3) await saveReserve()
      if (currentStep === 4) await saveBudgets()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const saveCurrentSnapshot = async () => {
    if (completed.snapshot) return setCurrentStep(1)
    if (!checking.name.trim()) throw new Error('Informe o nome da conta principal.')

    const { data: checkingAccount } = await accountsAPI.create({
      name: checking.name.trim(),
      type: 'CHECKING',
      initialBalance: checking.balance || 0,
      shared: false,
    })
    setPrimaryAccount(checkingAccount)

    if (card.enabled) {
      if (!card.name.trim()) throw new Error('Informe o nome do cartão.')
      await accountsAPI.create({
        name: card.name.trim(),
        type: 'CREDIT_CARD',
        closingDay: parseInt(card.closingDay) || 10,
        dueDay: parseInt(card.dueDay) || 15,
        initialOpenInvoiceAmount: card.openInvoiceAmount || 0,
        shared: false,
      })
    }

    setCompleted(c => ({ ...c, snapshot: true }))
    setCurrentStep(1)
  }

  const saveIncome = async () => {
    if (completed.income) return setCurrentStep(2)
    if (income.amount > 0) {
      if (!primaryAccount?.id) throw new Error('Volte e salve a conta principal primeiro.')
      await recurringAPI.create({
        description: income.description.trim() || 'Renda mensal',
        estimatedAmount: income.amount,
        dayOfMonth: parseInt(income.dayOfMonth) || 5,
        type: 'INCOME',
        isVariable: false,
        alreadyLiquidatedThisMonth: income.alreadyLiquidatedThisMonth,
        account: { id: primaryAccount.id },
      })
    }
    setCompleted(c => ({ ...c, income: true }))
    setCurrentStep(2)
  }

  const saveExpenses = async () => {
    if (completed.expenses) return setCurrentStep(3)
    if (!primaryAccount?.id) throw new Error('Volte e salve a conta principal primeiro.')

    const validExpenses = expenses.filter(item => item.amount > 0 && item.description.trim())
    for (const item of validExpenses) {
      await recurringAPI.create({
        description: item.description.trim(),
        estimatedAmount: item.amount,
        dayOfMonth: parseInt(item.dayOfMonth) || 10,
        type: 'EXPENSE',
        isVariable: item.isVariable,
        alreadyLiquidatedThisMonth: item.alreadyLiquidatedThisMonth,
        account: { id: primaryAccount.id },
      })
    }

    setCompleted(c => ({ ...c, expenses: true }))
    setCurrentStep(3)
  }

  const saveReserve = async () => {
    if (completed.reserve) return setCurrentStep(4)
    if (reserve.amount > 0) {
      if (!primaryAccount?.id) throw new Error('Volte e salve a conta principal primeiro.')

      const { data: createdInvestment } = await accountsAPI.create({
        name: reserve.accountName.trim() || 'Reserva Rubi',
        type: 'INVESTMENT',
        initialBalance: 0,
        shared: false,
      })
      setInvestmentAccount(createdInvestment)

      await recurringAPI.create({
        description: `Aporte mensal - ${createdInvestment.name}`,
        estimatedAmount: reserve.amount,
        dayOfMonth: parseInt(reserve.dayOfMonth) || 5,
        type: 'TRANSFER',
        isVariable: false,
        alreadyLiquidatedThisMonth: reserve.alreadyLiquidatedThisMonth,
        account: { id: primaryAccount.id },
        destinationAccount: { id: createdInvestment.id },
      })
    }

    setCompleted(c => ({ ...c, reserve: true }))
    setCurrentStep(4)
  }

  const saveBudgets = async () => {
    if (completed.budgets) return finishOnboarding()

    const items = [
      { name: 'Alimentação', icon: 'utensils', color: '#10B981', amount: budgets.food },
      { name: 'Lazer', icon: 'gamepad-2', color: '#6366F1', amount: budgets.leisure },
    ].filter(item => item.amount > 0)

    if (items.length) {
      const { month, year } = todayPeriod()
      const [{ data: categories }, { data: budgetStatus }] = await Promise.all([
        categoriesAPI.list(),
        budgetsAPI.status(month, year),
      ])
      const knownCategories = [...(categories || [])]

      for (const item of items) {
        let category = knownCategories.find(cat => normalizeText(cat.name) === normalizeText(item.name))
        if (!category) {
          const { data: createdCategory } = await categoriesAPI.create({
            name: item.name,
            type: 'EXPENSE',
            icon: item.icon,
            color: item.color,
          })
          category = createdCategory
          knownCategories.push(category)
        }

        const payload = {
          categoryId: category.id,
          amountLimit: item.amount,
          alertThreshold: 80,
          referenceMonth: month,
          referenceYear: year,
        }
        const existing = (budgetStatus || [])
          .find(b => normalizeText(b.categoryName) === normalizeText(item.name))

        if (existing?.id) await budgetsAPI.edit(existing.id, payload)
        else await budgetsAPI.create(payload)
      }
    }

    setCompleted(c => ({ ...c, budgets: true }))
    await finishOnboarding()
  }

  const goBack = () => {
    setError('')
    setCurrentStep(step => Math.max(0, step - 1))
  }

  const StepIcon = STEPS[currentStep].icon

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <section style={{
        width: 'min(980px, calc(100vw - 48px))',
        height: 'min(680px, calc(100vh - 48px))',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <header style={{
          height: 76,
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexShrink: 0,
        }}>
          <RubiLogo size={26} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Entrevista financeira
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
              {STEPS[currentStep].title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const active = index === currentStep
              const done = index < currentStep || completedStep(index, completed)
              return (
                <div key={step.title} title={step.title} style={{
                  width: active ? 38 : 30,
                  height: 30,
                  borderRadius: 8,
                  border: `1px solid ${active ? 'var(--border-accent)' : 'var(--border)'}`,
                  background: active ? 'rgba(202,247,41,0.10)' : done ? 'rgba(46,203,170,0.08)' : 'var(--bg-float)',
                  color: active ? 'var(--lime)' : done ? 'var(--teal)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </div>
              )
            })}
          </div>
        </header>

        <main style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          overflow: 'hidden',
        }}>
          <aside style={{
            borderRight: '1px solid var(--border)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 10,
              background: 'rgba(202,247,41,0.10)',
              color: 'var(--lime)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <StepIcon size={22} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>
                {stepTitle(currentStep)}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
                {stepCopy(currentStep)}
              </p>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Passo {currentStep + 1} de {STEPS.length}
            </div>
          </aside>

          <div style={{ padding: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              {currentStep === 0 && (
                <SnapshotStep
                  checking={checking}
                  setChecking={setChecking}
                  card={card}
                  setCard={setCard}
                />
              )}
              {currentStep === 1 && (
                <IncomeStep income={income} setIncome={setIncome} />
              )}
              {currentStep === 2 && (
                <ExpensesStep expenses={expenses} setExpenses={setExpenses} />
              )}
              {currentStep === 3 && (
                <ReserveStep reserve={reserve} setReserve={setReserve} investmentAccount={investmentAccount} />
              )}
              {currentStep === 4 && (
                <BudgetsStep budgets={budgets} setBudgets={setBudgets} />
              )}
            </div>

            {error && <FormError>{error}</FormError>}
          </div>
        </main>

        <footer style={{
          height: 72,
          borderTop: '1px solid var(--border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <button
            onClick={goBack}
            disabled={currentStep === 0 || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              color: currentStep === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              opacity: currentStep === 0 ? 0.45 : 1,
              cursor: currentStep === 0 ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
            }}
          >
            <ArrowLeft size={15} /> Voltar
          </button>
          <Button
            onClick={runStep}
            loading={loading}
            icon={currentStep === 4 ? <Check size={15} /> : <ArrowRight size={15} />}
          >
            {currentStep === 4 ? 'Concluir' : 'Continuar'}
          </Button>
        </footer>
      </section>
    </div>
  )
}

function SnapshotStep({ checking, setChecking, card, setCard }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
      <section style={cardStyle}>
        <SectionTitle icon={<Building2 size={16} />} title="Conta corrente principal" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <Field label="Nome" htmlFor="checking-name">
            <input
              id="checking-name"
              value={checking.name}
              onChange={e => setChecking(v => ({ ...v, name: e.target.value }))}
              style={textInputStyle}
            />
          </Field>
          <CurrencyInput
            id="checking-balance"
            label="Saldo atual"
            value={checking.balance}
            onChange={value => setChecking(v => ({ ...v, balance: value }))}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <SectionTitle icon={<CreditCard size={16} />} title="Cartão de crédito" />
          <Toggle checked={card.enabled} onChange={checked => setCard(v => ({ ...v, enabled: checked }))} />
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginTop: 16,
          opacity: card.enabled ? 1 : 0.45,
          pointerEvents: card.enabled ? 'auto' : 'none',
        }}>
          <Field label="Nome" htmlFor="card-name">
            <input
              id="card-name"
              value={card.name}
              onChange={e => setCard(v => ({ ...v, name: e.target.value }))}
              style={textInputStyle}
            />
          </Field>
          <CurrencyInput
            id="card-open-invoice"
            label="Fatura atual em aberto"
            value={card.openInvoiceAmount}
            onChange={value => setCard(v => ({ ...v, openInvoiceAmount: value }))}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DayInput label="Fechamento" id="card-close" value={card.closingDay} onChange={value => setCard(v => ({ ...v, closingDay: value }))} />
            <DayInput label="Vencimento" id="card-due" value={card.dueDay} onChange={value => setCard(v => ({ ...v, dueDay: value }))} />
          </div>
        </div>
      </section>
    </div>
  )
}

function IncomeStep({ income, setIncome }) {
  return (
    <section style={{ ...cardStyle, height: '100%', maxWidth: 520 }}>
      <SectionTitle icon={<DollarSign size={16} />} title="Salario ou renda fixa" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 90px', gap: 12, alignItems: 'end', marginTop: 20 }}>
          <Field label="Descrição" htmlFor="income-description">
          <input
            id="income-description"
            value={income.description}
            onChange={e => setIncome(v => ({ ...v, description: e.target.value }))}
            style={textInputStyle}
          />
        </Field>
        <CurrencyInput
          id="income-amount"
          label="Valor"
          value={income.amount}
          onChange={value => setIncome(v => ({ ...v, amount: value }))}
        />
        <DayInput label="Dia" id="income-day" value={income.dayOfMonth} onChange={value => setIncome(v => ({ ...v, dayOfMonth: value }))} />
      </div>
      <CheckLine
        checked={income.alreadyLiquidatedThisMonth}
        onChange={checked => setIncome(v => ({ ...v, alreadyLiquidatedThisMonth: checked }))}
        label="Já recebi este valor neste mês"
      />
    </section>
  )
}

function ExpensesStep({ expenses, setExpenses }) {
  const updateExpense = (index, patch) =>
    setExpenses(list => list.map((item, i) => i === index ? { ...item, ...patch } : item))

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {expenses.map((item, index) => (
        <div key={index} style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 28px', gap: 10, alignItems: 'end' }}>
            <Field label="Conta" htmlFor={`expense-description-${index}`}>
              <input
                id={`expense-description-${index}`}
                value={item.description}
                onChange={e => updateExpense(index, { description: e.target.value })}
                style={textInputStyle}
              />
            </Field>
            <CurrencyInput
              id={`expense-amount-${index}`}
              label="Valor"
              value={item.amount}
              onChange={value => updateExpense(index, { amount: value })}
            />
            <DayInput label="Dia" id={`expense-day-${index}`} value={item.dayOfMonth} onChange={value => updateExpense(index, { dayOfMonth: value })} />
            <button
              onClick={() => setExpenses(list => list.filter((_, i) => i !== index))}
              disabled={expenses.length === 1}
              style={{
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: 6,
                background: 'rgba(240,82,82,0.08)',
                color: 'var(--danger)',
                cursor: expenses.length === 1 ? 'default' : 'pointer',
                opacity: expenses.length === 1 ? 0.35 : 1,
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
            <CheckLine
              checked={item.alreadyLiquidatedThisMonth}
              onChange={checked => updateExpense(index, { alreadyLiquidatedThisMonth: checked })}
              label="Já paguei esta conta neste mês"
            />
            <CheckLine
              checked={item.isVariable}
              onChange={checked => updateExpense(index, { isVariable: checked })}
              label="Valor variável"
            />
          </div>
        </div>
      ))}
      <button
        onClick={() => setExpenses(list => [
          ...list,
          { description: '', amount: 0, dayOfMonth: '10', isVariable: false, alreadyLiquidatedThisMonth: false },
        ])}
        disabled={expenses.length >= 4}
        style={{
          width: 'fit-content',
          padding: '9px 13px',
          borderRadius: 8,
          border: '1px dashed var(--border)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: expenses.length >= 4 ? 'default' : 'pointer',
          opacity: expenses.length >= 4 ? 0.45 : 1,
          fontFamily: 'var(--font-body)',
          fontSize: 13,
        }}
      >
        Adicionar gasto
      </button>
    </section>
  )
}

function ReserveStep({ reserve, setReserve, investmentAccount }) {
  return (
    <section style={{ ...cardStyle, height: '100%', maxWidth: 560 }}>
      <SectionTitle icon={<PiggyBank size={16} />} title="Pague-se primeiro" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 90px', gap: 12, alignItems: 'end', marginTop: 20 }}>
        <Field label="Conta de investimento" htmlFor="reserve-account">
          <input
            id="reserve-account"
            value={investmentAccount?.name || reserve.accountName}
            disabled={!!investmentAccount}
            onChange={e => setReserve(v => ({ ...v, accountName: e.target.value }))}
            style={textInputStyle}
          />
        </Field>
        <CurrencyInput
          id="reserve-amount"
          label="Aporte mensal"
          value={reserve.amount}
          onChange={value => setReserve(v => ({ ...v, amount: value }))}
          disabled={!!investmentAccount}
        />
        <DayInput label="Dia" id="reserve-day" value={reserve.dayOfMonth} onChange={value => setReserve(v => ({ ...v, dayOfMonth: value }))} />
      </div>
      <CheckLine
        checked={reserve.alreadyLiquidatedThisMonth}
        onChange={checked => setReserve(v => ({ ...v, alreadyLiquidatedThisMonth: checked }))}
        label="Já fiz este aporte neste mês"
      />
    </section>
  )
}

function BudgetsStep({ budgets, setBudgets }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
      <div style={cardStyle}>
        <SectionTitle icon={<Target size={16} />} title="Alimentação" />
        <div style={{ marginTop: 18 }}>
          <CurrencyInput
            id="budget-food"
            label="Limite mensal"
            value={budgets.food}
            onChange={value => setBudgets(v => ({ ...v, food: value }))}
            large
          />
        </div>
      </div>
      <div style={cardStyle}>
        <SectionTitle icon={<Target size={16} />} title="Lazer" />
        <div style={{ marginTop: 18 }}>
          <CurrencyInput
            id="budget-leisure"
            label="Limite mensal"
            value={budgets.leisure}
            onChange={value => setBudgets(v => ({ ...v, leisure: value }))}
            large
          />
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14 }}>
      <span style={{ color: 'var(--lime)', display: 'flex' }}>{icon}</span>
      {title}
    </div>
  )
}

function DayInput({ label, id, value, onChange }) {
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
        inputMode="numeric"
        style={{ ...textInputStyle, textAlign: 'center' }}
      />
    </Field>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 99,
        border: '1px solid var(--border)',
        background: checked ? 'var(--teal)' : 'var(--bg-overlay)',
        cursor: 'pointer',
        position: 'relative',
      }}
      aria-label="Alternar cartão"
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 19 : 3,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

function CheckLine({ checked, onChange, label }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: 'var(--text-secondary)',
      fontSize: 12,
      cursor: 'pointer',
      marginTop: 14,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 15, height: 15, accentColor: 'var(--lime)' }}
      />
      {label}
    </label>
  )
}

function completedStep(index, completed) {
  return [
    completed.snapshot,
    completed.income,
    completed.expenses,
    completed.reserve,
    completed.budgets,
  ][index]
}

function stepTitle(index) {
  return [
    'Comece pelo dinheiro que existe hoje',
    'Registre o que entra todo mês',
    'Separe as contas que sempre voltam',
    'Transforme reserva em compromisso',
    'Defina limites de consumo',
  ][index]
}

function stepCopy(index) {
  return [
    'Saldo atual e fatura aberta são o ponto de partida. Nada aqui cria movimentação retroativa falsa.',
    'Se a renda já caiu neste mês, o Rubi cria a recorrência e marca a parcela atual como paga sem mexer no saldo.',
    'Contas já pagas neste mês entram como histórico liquidado, sem cobrar duas vezes do saldo inicial.',
    'O aporte recorrente sai da conta principal para uma conta de investimento e muda liquidez sem mudar patrimônio.',
    'Os limites mensais alimentam a aba de gastos por categoria a partir do mês atual.',
  ][index]
}
