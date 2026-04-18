import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Wallet, CreditCard, 
  TrendingUp, ArrowDownCircle, Check, Circle, LogOut,
  LayoutDashboard, Settings, Plus, Sparkles
} from "lucide-react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { TransactionModal } from "../../components/TransactionModal";
import { SimulatorModal } from "../../components/SimulatorModal";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

export function Dashboard() {
  const { user, signOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const prevMonth = () => setDate(new Date(year, date.getMonth() - 1, 1));
  const nextMonth = () => setDate(new Date(year, date.getMonth() + 1, 1));

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard', { params: { month, year } });
        setData(response.data);
      } catch (error) {
        console.error("Erro ao buscar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [month, year]);

  // Calcula total das faturas pendentes a partir da lista
  const totalFaturas = data?.pendingInvoices?.reduce((sum, inv) => sum + (inv.remaining || 0), 0) || 0;

  const handleLogout = () => { signOut(); navigate('/'); };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--cream)", overflow: "hidden" }}>

      {/* SIDEBAR */}
      <div style={{ width: 240, background: "var(--deep)", display: "flex", flexDirection: "column", padding: "32px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48, paddingLeft: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={16} color="white" />
          </div>
          <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, letterSpacing: ".05em", color: "var(--mint)" }}>RUBI</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,.1)", borderRadius: 8, color: "var(--white)", fontWeight: 600, border: "none", cursor: "pointer" }}>
            <LayoutDashboard size={18} /> Início
          </button>
          <button onClick={() => setIsTransModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--teal)", borderRadius: 8, color: "var(--white)", fontWeight: 600, border: "none", cursor: "pointer", marginTop: 16 }}>
            <Plus size={18} /> Novo Gasto
          </button>
          <button onClick={() => setIsSimModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "var(--mint)", fontWeight: 600, cursor: "pointer" }}>
            <Sparkles size={18} /> Bola de Cristal
          </button>
          <button onClick={() => navigate('/settings')} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", borderRadius: 8, color: "rgba(255,255,255,.6)", fontWeight: 500, border: "none", cursor: "pointer" }}>
            <Settings size={18} /> Configurações
          </button>
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 24 }}>
          <p style={{ fontSize: 13, color: "var(--mint)", marginBottom: 12, paddingLeft: 8, fontWeight: 600 }}>
            {user?.name || user?.email || "Usuário"}
          </p>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", background: "transparent", color: "rgba(255,255,255,.6)", border: "none", cursor: "pointer", fontSize: 14 }}>
            <LogOut size={16} /> Sair do sistema
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 48px", overflow: "hidden" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>Visão Geral</h1>
            {data?.hasPartner && (
              <span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>✦ Modo casal ativo</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--white)", padding: "8px 16px", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <button onClick={prevMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--deep)", minWidth: 110, textAlign: "center" }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* 4 CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>

          {/* Card 1: Saldo Real */}
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f3f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={16} color="var(--deep)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)" }}>Saldo Disponível</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>
              {loading ? "—" : formatCurrency(data?.currentBalance)}
            </p>
          </div>

          {/* Card 2: Comprometido */}
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fdf3f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CreditCard size={16} color="var(--danger)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)" }}>Comprometido</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--danger)" }}>
              {loading ? "—" : formatCurrency(data?.committedAmount)}
            </p>
          </div>

          {/* Card 3: Sobrando (destaque) */}
          <div style={{ background: "var(--mint)", borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(178,213,186,.4)", border: "1px solid #9fcfa9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={16} color="var(--deep)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)" }}>Sobra Projetada</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800, color: (data?.projectedLeftover || 0) < 0 ? "var(--danger)" : "var(--deep)" }}>
              {loading ? "—" : formatCurrency(data?.projectedLeftover)}
            </p>
          </div>

          {/* Card 4: A Receber */}
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0f8f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowDownCircle size={16} color="var(--teal)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)" }}>A Receber</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--teal)" }}>
              {loading ? "—" : formatCurrency(data?.totalToReceive)}
            </p>
          </div>

        </div>

        {/* CORPO: Checklist + Faturas */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, flex: 1, overflow: "hidden" }}>

          {/* CHECKLIST DE PAGAMENTOS */}
          <div style={{ background: "var(--white)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0edf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--dark)" }}>Checklist de Pagamentos</h2>
              {!loading && data?.installmentsDueThisMonth?.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--gray)" }}>
                  {data.installmentsDueThisMonth.filter(i => i.status === "PAID").length}/{data.installmentsDueThisMonth.length} pagos
                </span>
              )}
            </div>
            <div style={{ padding: "12px 24px", overflowY: "auto", flex: 1 }}>
              {loading && <p style={{ fontSize: 13, color: "var(--gray)", paddingTop: 16 }}>Carregando...</p>}
              {!loading && (!data?.installmentsDueThisMonth || data.installmentsDueThisMonth.length === 0) && (
                <p style={{ fontSize: 14, color: "var(--gray)", textAlign: "center", marginTop: 40 }}>
                  Nenhuma conta pendente este mês! 🎉
                </p>
              )}
              {!loading && data?.installmentsDueThisMonth?.map((item, index) => {
                const pago = item.status === "PAID";
                const simulacao = item.isSimulation || item.simulation;
                return (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #faf9fa" }}>
                    <button
                      onClick={() => api.patch(`/installments/${item.installmentId}/pay`).then(() => {
                        setDate(new Date(date)); // força refresh
                      })}
                      disabled={pago}
                      style={{ width: 22, height: 22, borderRadius: 6, background: pago ? "var(--teal)" : "transparent", border: pago ? "none" : "2px solid #e4e0e4", display: "flex", alignItems: "center", justifyContent: "center", cursor: pago ? "default" : "pointer", flexShrink: 0 }}>
                      {pago && <Check size={13} color="white" strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: pago ? "var(--gray)" : "var(--dark)", textDecoration: pago ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.transactionDescription}
                        {simulacao && <span style={{ marginLeft: 6, fontSize: 10, background: "#fff3cd", color: "#856404", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>SIMULAÇÃO</span>}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--gray)" }}>
                        Vence {formatDate(item.dueDate)}{item.payerName ? ` · ${item.payerName}` : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: pago ? "var(--gray)" : "var(--dark)", flexShrink: 0 }}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FATURAS DO CARTÃO */}
          <div style={{ background: "var(--white)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0edf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--dark)" }}>Faturas de Cartão</h2>
              {!loading && totalFaturas > 0 && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>{formatCurrency(totalFaturas)}</span>
              )}
            </div>
            <div style={{ padding: "12px 24px", overflowY: "auto", flex: 1 }}>
              {!loading && (!data?.pendingInvoices || data.pendingInvoices.length === 0) && (
                <p style={{ fontSize: 14, color: "var(--gray)", textAlign: "center", marginTop: 40 }}>
                  Sem faturas abertas. ✓
                </p>
              )}
              {!loading && data?.pendingInvoices?.map((fatura, index) => {
                const statusColor = fatura.status === "CLOSED" ? "var(--danger)" : fatura.status === "PARTIALLY_PAID" ? "var(--warn)" : "var(--sage)";
                const statusLabel = fatura.status === "PAID" ? "Paga" : fatura.status === "CLOSED" ? "Fechada" : fatura.status === "PARTIALLY_PAID" ? "Parcialmente paga" : "Em aberto";
                return (
                  <div key={index} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16, background: "#fcfbfc", borderRadius: 12, marginBottom: 10, border: "1px solid #f0edf0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)" }}>{fatura.accountName}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--danger)" }}>{formatCurrency(fatura.totalAmount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Circle size={8} fill={statusColor} stroke="none" />
                        {statusLabel}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)" }}>
                        {fatura.referenceMonth}/{fatura.referenceYear}
                      </span>
                    </div>
                    {fatura.paidAmount > 0 && (
                      <div style={{ height: 4, borderRadius: 4, background: "#f0edf0", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (fatura.paidAmount / fatura.totalAmount) * 100)}%`, background: "var(--teal)", borderRadius: 4 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      <TransactionModal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} onSuccess={() => setDate(new Date(date))} />
      <SimulatorModal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} />
    </div>
  );
}