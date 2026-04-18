import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Wallet, CreditCard, 
  TrendingUp, PiggyBank, Check, Circle, LogOut,
  LayoutDashboard, Settings, Plus, Sparkles, ArrowDownRight, ArrowUpRight, ArrowRightLeft, Download, PieChart
} from "lucide-react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { TransactionModal } from "../../components/TransactionModal";
import { SimulatorModal } from "../../components/SimulatorModal";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

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

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // Busca os dados do endpoint que acabamos de refatorar no Java
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

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  // Cálculo visual para a barra de progresso (Saúde Financeira)
  const totalAvailable = (data?.currentBalance || 0) + (data?.committedAmount || 0);
  const committedPercent = totalAvailable > 0 ? ((data?.committedAmount || 0) / totalAvailable) * 100 : 0;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--cream)", overflow: "hidden" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: 240, background: "var(--deep)", display: "flex", flexDirection: "column", padding: "32px 20px", color: "var(--white)" }}>
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
          <button onClick={() => navigate('/settings')} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", borderRadius: 8, color: "rgba(255,255,255,.6)", fontWeight: 500, border: "none", cursor: "pointer", transition: "all .2s" }}>
            <Settings size={18} /> Configurações
          </button>

          <button onClick={() => setIsTransModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--teal)", borderRadius: 8, color: "var(--white)", fontWeight: 600, border: "none", cursor: "pointer", marginTop: 16, transition: "all .2s" }}>
            <Plus size={18} /> Novo Gasto
          </button>
          <button onClick={() => setIsSimModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "var(--mint)", fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
            <Sparkles size={18} /> Bola de Cristal
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,.1)", borderRadius: 8, color: "var(--white)", fontWeight: 600, border: "none", cursor: "pointer", transition: "all .2s" }}>
            <LayoutDashboard size={18} /> Início
          </button>
          
          {/* NOVO BOTÃO DE ORÇAMENTOS AQUI */}
          <button onClick={() => navigate('/reports')} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", borderRadius: 8, color: "rgba(255,255,255,.6)", fontWeight: 500, border: "none", cursor: "pointer", transition: "all .2s" }}>
            <PieChart size={18} /> Orçamentos
          </button>

          <button onClick={() => navigate('/settings')} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", borderRadius: 8, color: "rgba(255,255,255,.6)", fontWeight: 500, border: "none", cursor: "pointer", transition: "all .2s" }}>
            <Settings size={18} /> Configurações
          </button>
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 24 }}>
          <p style={{ fontSize: 13, color: "var(--mint)", marginBottom: 12, paddingLeft: 8, fontWeight: 600 }}>{user?.name || "Usuário"}</p>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", background: "transparent", color: "rgba(255,255,255,.6)", border: "none", cursor: "pointer", fontSize: 14 }}>
            <LogOut size={16} /> Sair do sistema
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 40px", overflow: "hidden" }}>
        
        {/* HEADER: SELETOR DE MÊS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>Visão Geral</h1>
            {/* Termômetro de Saúde Financeira */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
               <div style={{ width: 200, height: 6, background: "#e4e0e4", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(committedPercent, 100)}%`, height: "100%", background: committedPercent > 80 ? "var(--danger)" : "var(--teal)", transition: "width 0.5s ease" }} />
               </div>
               <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 600 }}>{committedPercent.toFixed(0)}% da renda comprometida</span>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--white)", padding: "8px 16px", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <button onClick={prevMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--deep)", minWidth: 110, textAlign: "center", textTransform: "capitalize" }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* 5 CARDS PRINCIPAIS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
          
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f0f8f7", display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={14} color="var(--teal)" /></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)" }}>Saldo Disponível</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, color: "var(--dark)" }}>{formatCurrency(data?.currentBalance)}</p>
          </div>

          <div style={{ background: "var(--white)", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fdf3f3", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={14} color="var(--danger)" /></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)" }}>Comprometido</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, color: "var(--danger)" }}>{formatCurrency(data?.committedAmount)}</p>
          </div>

          <div style={{ background: "var(--mint)", borderRadius: 16, padding: 16, boxShadow: "0 4px 16px rgba(178,213,186,.4)", border: "1px solid #9fcfa9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={14} color="var(--deep)" /></div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--deep)" }}>Sobra Projetada</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, color: "var(--deep)" }}>{formatCurrency(data?.projectedLeftover)}</p>
          </div>

          <div style={{ background: "var(--white)", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}><Download size={14} color="#0055ff" /></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)" }}>A Receber (Emprést.)</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, color: "var(--dark)" }}>{formatCurrency(data?.totalToReceive)}</p>
          </div>

          <div style={{ background: "var(--white)", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f5f3f5", display: "flex", alignItems: "center", justifyContent: "center" }}><PiggyBank size={14} color="var(--deep)" /></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)" }}>Saldo Investido</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, color: "var(--deep)" }}>{formatCurrency(data?.investedBalance)}</p>
          </div>

        </div>

        {/* CORPO: 3 COLUNAS (Listas com Scroll Interno) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, flex: 1, overflow: "hidden" }}>
          
          {/* COLUNA 1: Checklist */}
          <div style={{ background: "var(--white)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 12px rgba(96,80,99,.05)", border: "1px solid #f0edf0" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0edf0", background: "#faf9fa" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--dark)" }}>Checklist de Pagamentos</h2>
            </div>
            <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1 }}>
              {(!loading && (!data?.installmentsDueThisMonth || data.installmentsDueThisMonth.length === 0)) ? (
                <p style={{ fontSize: 13, color: "var(--gray)", textAlign: "center", marginTop: 40 }}>Tudo em dia! 🎉</p>
              ) : (
                data?.installmentsDueThisMonth?.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #faf9fa" }}>
                    <button style={{ minWidth: 20, height: 20, borderRadius: 6, background: item.status === 'PAID' ? "var(--teal)" : "transparent", border: item.status === 'PAID' ? "none" : "2px solid #e4e0e4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      {item.status === 'PAID' && <Check size={12} color="white" strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: item.status === 'PAID' ? "var(--gray)" : "var(--dark)", textDecoration: item.status === 'PAID' ? "line-through" : "none", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.description}</p>
                      <p style={{ fontSize: 11, color: "var(--gray)" }}>Vence: {item.dueDate}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.status === 'PAID' ? "var(--gray)" : "var(--danger)" }}>{formatCurrency(item.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUNA 2: Faturas */}
          <div style={{ background: "var(--white)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 12px rgba(96,80,99,.05)", border: "1px solid #f0edf0" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0edf0", background: "#faf9fa" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--dark)" }}>Faturas do Cartão</h2>
            </div>
            <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1 }}>
              {(!loading && (!data?.pendingInvoices || data.pendingInvoices.length === 0)) ? (
                <p style={{ fontSize: 13, color: "var(--gray)", textAlign: "center", marginTop: 40 }}>Nenhuma fatura em aberto.</p>
              ) : (
                data?.pendingInvoices?.map((fatura) => (
                  <div key={fatura.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", background: "#fcfbfc", borderRadius: 10, marginBottom: 12, border: "1px solid #f0edf0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)" }}>{fatura.accountName}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--danger)" }}>{formatCurrency(fatura.pendingAmount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Circle size={8} fill={fatura.status === 'CLOSED' ? "var(--danger)" : "var(--sage)"} stroke="none" /> 
                        {fatura.status === 'CLOSED' ? "Fechada" : "Aberta"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUNA 3: Últimos Lançamentos */}
          <div style={{ background: "var(--white)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 12px rgba(96,80,99,.05)", border: "1px solid #f0edf0" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0edf0", background: "#faf9fa" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--dark)" }}>Últimos Lançamentos</h2>
            </div>
            <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1 }}>
              {(!loading && (!data?.recentTransactions || data.recentTransactions.length === 0)) ? (
                <p style={{ fontSize: 13, color: "var(--gray)", textAlign: "center", marginTop: 40 }}>Nenhum lançamento recente.</p>
              ) : (
                data?.recentTransactions?.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #faf9fa" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: t.type === 'EXPENSE' ? "#fdf3f3" : t.type === 'INCOME' ? "#f0f8f7" : "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {t.type === 'EXPENSE' ? <ArrowDownRight size={16} color="var(--danger)"/> : t.type === 'INCOME' ? <ArrowUpRight size={16} color="var(--teal)"/> : <ArrowRightLeft size={16} color="#0055ff"/>}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--dark)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{t.description}</p>
                      <p style={{ fontSize: 11, color: "var(--gray)" }}>{t.categoryName}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.type === 'EXPENSE' ? "var(--danger)" : t.type === 'INCOME' ? "var(--teal)" : "var(--deep)" }}>
                      {t.type === 'EXPENSE' ? "-" : t.type === 'INCOME' ? "+" : ""}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
      
      {/* MODAIS (Invisíveis até serem chamados) */}
      <TransactionModal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} />
      <SimulatorModal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} />
    </div>
  );
}