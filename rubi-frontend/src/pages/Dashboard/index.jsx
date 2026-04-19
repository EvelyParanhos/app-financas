import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Wallet, CreditCard,
  TrendingUp, PiggyBank, Check, Circle, LogOut,
  LayoutDashboard, Settings, Plus, Sparkles,
  ArrowDownRight, ArrowUpRight, ArrowRightLeft,
  Download, PieChart, RefreshCw
} from "lucide-react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { TransactionModal } from "../../components/TransactionModal";
import { SimulatorModal } from "../../components/SimulatorModal";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const fmt = (val) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

// ─────────────────────────────────────────────────────────────
// Sub-componente: Card de saldo com breakdown por conta
// ─────────────────────────────────────────────────────────────
function BalanceCard({ total, breakdown }) {
  const typeIcon = (type) =>
    type === "CASH"
      ? { icon: "💵", label: "Carteira" }
      : { icon: "🏦", label: "Corrente" };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={iconBox("#f0f8f7")}><Wallet size={14} color="var(--teal)" /></div>
        <span style={labelStyle}>Saldo Disponível</span>
      </div>
      <p style={valueStyle("var(--dark)")}>{fmt(total)}</p>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {(breakdown || []).map((acc, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--gray)" }}>
              {typeIcon(acc.type).icon} {acc.name}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--dark)" }}>{fmt(acc.balance)}</span>
          </div>
        ))}
        {(!breakdown || breakdown.length === 0) && (
          <span style={{ fontSize: 11, color: "var(--gray)", fontStyle: "italic" }}>Nenhuma conta cadastrada</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-componente: Card de comprometido com breakdown
// ─────────────────────────────────────────────────────────────
function CommittedCard({ total, fixed: fixedAmt, creditCard }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={iconBox("#fdf3f3")}><CreditCard size={14} color="var(--danger)" /></div>
        <span style={labelStyle}>Comprometido</span>
      </div>
      <p style={valueStyle("var(--danger)")}>{fmt(total)}</p>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--gray)" }}>🔁 Gastos fixos</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray)" }}>{fmt(fixedAmt)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--gray)" }}>💳 Faturas cartão</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray)" }}>{fmt(creditCard)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos reutilizáveis dos cards
// ─────────────────────────────────────────────────────────────
const cardStyle = {
  background: "var(--white)", borderRadius: 16, padding: 16,
  boxShadow: "0 2px 12px rgba(96,80,99,.05)", display: "flex",
  flexDirection: "column"
};
const cardHeaderStyle = { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 };
const iconBox = (bg) => ({
  width: 28, height: 28, borderRadius: 8, background: bg,
  display: "flex", alignItems: "center", justifyContent: "center"
});
const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--gray)", lineHeight: 1.3 };
const valueStyle = (color) => ({
  fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, color
});

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user, signOut } = useContext(AuthContext);
  const navigate = useNavigate();

  const [date, setDate] = useState(new Date());
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);

  const prevMonth = () => setDate(new Date(year, date.getMonth() - 1, 1));
  const nextMonth = () => setDate(new Date(year, date.getMonth() + 1, 1));

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard", { params: { month, year } });
      setData(res.data);
    } catch (err) {
      console.error("Erro ao buscar dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Marcar parcela real como paga
  const handlePayInstallment = async (installmentId) => {
    try {
      await api.patch(`/installments/${installmentId}/pay`);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao registrar pagamento.");
    }
  };

  // Materializar item virtual (gasto/receita fixo não registrado ainda)
  const handleMaterializeRecurring = async (recurringId, transactionType) => {
    const verb = transactionType === "INCOME" ? "receber" : "pagar";
    if (!window.confirm(`Confirmar ${verb} este item fixo?`)) return;
    try {
      await api.post(`/recurring/${recurringId}/materialize`, null, {
        params: { month, year }
      });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao registrar item.");
    }
  };

  const handleLogout = () => { signOut(); navigate("/"); };

  // Termômetro: comprometido / (saldo + comprometido)
  const totalRef = (data?.currentBalance || 0) + (data?.committedAmount || 0);
  const committedPercent = totalRef > 0
    ? ((data?.committedAmount || 0) / totalRef) * 100 : 0;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--cream)", overflow: "hidden" }}>

      {/* ── SIDEBAR ────────────────────────────────────────────── */}
      <div style={{
        width: 240, background: "var(--deep)", display: "flex",
        flexDirection: "column", padding: "32px 20px", color: "var(--white)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48, paddingLeft: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={16} color="white" />
          </div>
          <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, letterSpacing: ".05em", color: "var(--mint)" }}>RUBI</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <NavBtn active icon={<LayoutDashboard size={18} />} label="Início" onClick={() => navigate("/dashboard")} />
          <NavBtn icon={<PieChart size={18} />} label="Orçamentos" onClick={() => navigate("/reports")} />
          <NavBtn icon={<Settings size={18} />} label="Configurações" onClick={() => navigate("/settings")} />

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => setIsTransModalOpen(true)} style={actionBtnStyle("var(--teal)")}>
              <Plus size={18} /> Novo Lançamento
            </button>
            <button onClick={() => setIsSimModalOpen(true)} style={actionBtnStyle("transparent", "rgba(255,255,255,.1)", "1px solid rgba(255,255,255,.15)", "var(--mint)")}>
              <Sparkles size={18} /> Bola de Cristal
            </button>
          </div>
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 24 }}>
          <p style={{ fontSize: 13, color: "var(--mint)", marginBottom: 12, paddingLeft: 8, fontWeight: 600 }}>
            {user?.name || "Usuário"}
          </p>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", background: "transparent", color: "rgba(255,255,255,.6)", border: "none", cursor: "pointer", fontSize: 14 }}>
            <LogOut size={16} /> Sair do sistema
          </button>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 36px", overflow: "hidden", gap: 16 }}>

        {/* Header: título + termômetro + seletor de mês */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 700, color: "var(--dark)" }}>Visão Geral</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <div style={{ width: 180, height: 5, background: "#e4e0e4", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(committedPercent, 100)}%`, height: "100%",
                  background: committedPercent > 80 ? "var(--danger)" : "var(--teal)",
                  transition: "width 0.5s ease"
                }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600 }}>
                {committedPercent.toFixed(0)}% comprometido
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--white)", padding: "7px 14px", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={18} /></button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--deep)", minWidth: 110, textAlign: "center", textTransform: "capitalize" }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} style={navBtnStyle}><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* ── CARDS: linha 1 (3 colunas) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 14 }}>

          {/* Card 1: Saldo + breakdown por conta */}
          <BalanceCard
            total={data?.currentBalance}
            breakdown={data?.accountBreakdown}
          />

          {/* Card 2: Comprometido + breakdown */}
          <CommittedCard
            total={data?.committedAmount}
            fixed={data?.fixedExpensesCommitted}
            creditCard={data?.creditCardCommitted}
          />

          {/* Card 3: Sobra projetada */}
          <div style={{ ...cardStyle, background: "var(--mint)", border: "1px solid #9fcfa9", boxShadow: "0 4px 16px rgba(178,213,186,.4)" }}>
            <div style={cardHeaderStyle}>
              <div style={iconBox("rgba(255,255,255,.4)")}><TrendingUp size={14} color="var(--deep)" /></div>
              <span style={{ ...labelStyle, color: "var(--deep)" }}>Sobra do Mês</span>
            </div>
            <p style={{ ...valueStyle("var(--deep)"), fontSize: 22 }}>{fmt(data?.projectedLeftover)}</p>
            <p style={{ fontSize: 11, color: "var(--deep)", marginTop: 8, opacity: 0.7 }}>
              Entradas previstas: {fmt(data?.projectedIncome)}
            </p>
          </div>
        </div>

        {/* ── CARDS: linha 2 (2 colunas) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Card 4: A Receber */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={iconBox("#f0f4ff")}><Download size={14} color="#0055ff" /></div>
              <span style={labelStyle}>A Receber (Empréstimos)</span>
            </div>
            <p style={valueStyle("var(--dark)")}>{fmt(data?.totalToReceive)}</p>
          </div>

          {/* Card 5: Investido no mês */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={iconBox("#f5f3f5")}><PiggyBank size={14} color="var(--deep)" /></div>
              <span style={labelStyle}>Investido em {MONTHS[month - 1]}</span>
            </div>
            <p style={valueStyle("var(--deep)")}>{fmt(data?.monthlyDeposits)}</p>
          </div>
        </div>

        {/* ── CORPO: 3 COLUNAS COM LISTAS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Checklist */}
          <ListCard title="Checklist do Mês">
            {(!loading && !data?.installmentsDueThisMonth?.length)
              ? <EmptyState>Tudo em dia! 🎉</EmptyState>
              : data?.installmentsDueThisMonth?.map((item, idx) => {
                  const isIncome = item.transactionType === "INCOME";
                  const isVirtual = !!item.recurringTransactionId;
                  const isPaid = item.status === "PAID";
                  return (
                    <div key={item.installmentId || `v-${idx}`}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #faf9fa" }}
                    >
                      {/* Checkbox / botão de ação */}
                      <button
                        onClick={() => {
                          if (isPaid) return;
                          if (item.installmentId) handlePayInstallment(item.installmentId);
                          else if (isVirtual) handleMaterializeRecurring(item.recurringTransactionId, item.transactionType);
                        }}
                        style={{
                          minWidth: 20, height: 20, borderRadius: 6,
                          background: isPaid
                            ? (isIncome ? "var(--teal)" : "var(--teal)")
                            : "transparent",
                          border: isPaid ? "none"
                            : isIncome ? "2px solid var(--teal)" : "2px solid #e4e0e4",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: isPaid ? "default" : "pointer"
                        }}
                      >
                        {isPaid && <Check size={12} color="white" strokeWidth={3} />}
                      </button>

                      {/* Ícone de tipo */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                        background: isIncome ? "#f0f8f7" : "#fdf3f3",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {isIncome
                          ? <ArrowUpRight size={12} color="var(--teal)" />
                          : <ArrowDownRight size={12} color="var(--danger)" />}
                      </div>

                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <p style={{
                            fontSize: 12, fontWeight: 600,
                            color: isPaid ? "var(--gray)" : "var(--dark)",
                            textDecoration: isPaid ? "line-through" : "none",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                          }}>
                            {item.transactionDescription}
                          </p>
                          {isVirtual && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--deep)", background: "var(--cream)", borderRadius: 3, padding: "1px 4px", whiteSpace: "nowrap" }}>
                              FIXO
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 10, color: "var(--gray)" }}>
                          {item.categoryName ? `${item.categoryName} · ` : ""}
                          Vence: {item.dueDate}
                        </p>
                      </div>

                      <span style={{
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                        color: isPaid ? "var(--gray)" : isIncome ? "var(--teal)" : "var(--danger)"
                      }}>
                        {isIncome ? "+" : "-"}{fmt(item.amount)}
                      </span>
                    </div>
                  );
                })
            }
          </ListCard>

          {/* Faturas do Cartão */}
          <ListCard title="Faturas do Cartão">
            {(!loading && !data?.pendingInvoices?.length)
              ? <EmptyState>Nenhuma fatura em aberto.</EmptyState>
              : data?.pendingInvoices?.map((fatura) => (
                <div key={fatura.invoiceId} style={{
                  display: "flex", flexDirection: "column", gap: 6, padding: "10px",
                  background: "#fcfbfc", borderRadius: 10, marginBottom: 10,
                  border: "1px solid #f0edf0"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)" }}>{fatura.accountName}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)" }}>{fmt(fatura.remaining)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Circle size={7} fill={fatura.status === "CLOSED" ? "var(--danger)" : "var(--sage)"} stroke="none" />
                      {fatura.status === "CLOSED" ? "Fechada" : "Aberta"} — {MONTHS[fatura.referenceMonth - 1]}/{fatura.referenceYear}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--gray)" }}>Total: {fmt(fatura.totalAmount)}</span>
                  </div>
                </div>
              ))
            }
          </ListCard>

          {/* Últimos Lançamentos */}
          <ListCard title="Últimos Lançamentos">
            {(!loading && !data?.recentTransactions?.length)
              ? <EmptyState>Nenhum lançamento recente.</EmptyState>
              : data?.recentTransactions?.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #faf9fa" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: t.type === "EXPENSE" ? "#fdf3f3" : t.type === "INCOME" ? "#f0f8f7" : "#f0f4ff",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    {t.type === "EXPENSE"
                      ? <ArrowDownRight size={15} color="var(--danger)" />
                      : t.type === "INCOME"
                        ? <ArrowUpRight size={15} color="var(--teal)" />
                        : <ArrowRightLeft size={15} color="#0055ff" />}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--dark)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{t.description}</p>
                    <p style={{ fontSize: 10, color: "var(--gray)" }}>{t.categoryName}</p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    color: t.type === "EXPENSE" ? "var(--danger)" : t.type === "INCOME" ? "var(--teal)" : "var(--deep)"
                  }}>
                    {t.type === "EXPENSE" ? "-" : t.type === "INCOME" ? "+" : ""}{fmt(t.amount)}
                  </span>
                </div>
              ))
            }
          </ListCard>
        </div>
      </div>

      {/* MODAIS */}
      <TransactionModal
        isOpen={isTransModalOpen}
        onClose={() => setIsTransModalOpen(false)}
        onSuccess={fetchDashboard}
      />
      <SimulatorModal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Auxiliares de UI
// ─────────────────────────────────────────────────────────────
const navBtnStyle = {
  background: "transparent", border: "none", cursor: "pointer",
  color: "var(--gray)", display: "flex", alignItems: "center"
};

function actionBtnStyle(bg, hoverBg, border, color = "var(--white)") {
  return {
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 16px", background: bg || "var(--teal)",
    borderRadius: 8, color, fontWeight: 600, border: border || "none",
    cursor: "pointer", transition: "all .2s", fontSize: 14
  };
}

function NavBtn({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        background: active ? "rgba(255,255,255,.1)" : "transparent",
        borderRadius: 8,
        color: active ? "var(--white)" : "rgba(255,255,255,.6)",
        fontWeight: active ? 600 : 500,
        border: "none", cursor: "pointer", transition: "all .2s"
      }}
    >
      {icon} {label}
    </button>
  );
}

function ListCard({ title, children }) {
  return (
    <div style={{
      background: "var(--white)", borderRadius: 16, display: "flex",
      flexDirection: "column", overflow: "hidden",
      boxShadow: "0 2px 12px rgba(96,80,99,.05)", border: "1px solid #f0edf0"
    }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0edf0", background: "#faf9fa" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--dark)" }}>{title}</h2>
      </div>
      <div style={{ padding: "8px 18px", overflowY: "auto", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <p style={{ fontSize: 12, color: "var(--gray)", textAlign: "center", marginTop: 32 }}>
      {children}
    </p>
  );
}