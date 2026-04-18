import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Wallet, CreditCard, 
  TrendingUp, PiggyBank, Check, Circle, LogOut,
  LayoutDashboard, Settings
} from "lucide-react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { TransactionModal } from "../../components/TransactionModal";
import { SimulatorModal } from "../../components/SimulatorModal";
import { Plus, Sparkles } from "lucide-react"; 

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export function Dashboard() {
  const { user, signOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  // Controle Temporal
  const [date, setDate] = useState(new Date());
  const month = date.getMonth() + 1; // 1 a 12
  const year = date.getFullYear();

  // Dados da API
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const prevMonth = () => setDate(new Date(year, date.getMonth() - 1, 1));
  const nextMonth = () => setDate(new Date(year, date.getMonth() + 1, 1));

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // Ajuste os parâmetros (month/year ou mes/ano) conforme o seu DashboardController Java espera
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

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--cream)", overflow: "hidden" }}>
      
      {/* MENU LATERAL (SIDEBAR) MINIMALISTA */}
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
          <p style={{ fontSize: 13, color: "var(--mint)", marginBottom: 12, paddingLeft: 8, fontWeight: 600 }}>{user?.name || "Evely"}</p>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", background: "transparent", color: "rgba(255,255,255,.6)", border: "none", cursor: "pointer", fontSize: 14 }}>
            <LogOut size={16} /> Sair do sistema
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 48px", overflow: "hidden" }}>
        
        {/* HEADER: SELETOR DE MÊS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>Visão Geral</h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--white)", padding: "8px 16px", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <button onClick={prevMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--deep)", minWidth: 110, textAlign: "center" }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* 4 CARDS (Linha no Topo) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {/* Card 1: Total de Gastos */}
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f3f5", display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={16} color="var(--deep)" /></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)" }}>Total de Gastos</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>{formatCurrency(data?.totalGastos)}</p>
          </div>

          {/* Card 2: Gastos do Cartão */}
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fdf3f3", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={16} color="var(--danger)" /></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)" }}>Faturas de Cartão</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>{formatCurrency(data?.gastosCartao)}</p>
          </div>

          {/* Card 3: Sobrando no Mês (DESTAQUE LEVE) */}
          <div style={{ background: "var(--mint)", borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(178,213,186,.4)", border: "1px solid #9fcfa9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={16} color="var(--deep)" /></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)" }}>Sobrando no Mês</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800, color: "var(--deep)" }}>{formatCurrency(data?.sobrandoMes)}</p>
          </div>

          {/* Card 4: Investimentos */}
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0f8f7", display: "flex", alignItems: "center", justifyContent: "center" }}><PiggyBank size={16} color="var(--teal)" /></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)" }}>Investido / Reserva</span>
            </div>
            <p style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--teal)" }}>{formatCurrency(data?.investimentos)}</p>
          </div>
        </div>

        {/* CORPO DO DASHBOARD (Listas) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, flex: 1, overflow: "hidden" }}>
          
          {/* COLUNA ESQUERDA: Checklist de Pagamentos */}
          <div style={{ background: "var(--white)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0edf0" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--dark)" }}>Checklist de Pagamentos</h2>
            </div>
            <div style={{ padding: "12px 24px", overflowY: "auto", flex: 1 }}>
              {loading ? <p style={{ fontSize: 13, color: "var(--gray)" }}>Carregando...</p> : null}
              {(!loading && (!data?.pagamentos || data.pagamentos.length === 0)) ? (
                <p style={{ fontSize: 14, color: "var(--gray)", textAlign: "center", marginTop: 40 }}>Nenhuma conta pendente este mês! 🎉</p>
              ) : (
                data?.pagamentos?.map((item, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid #faf9fa" }}>
                    <button style={{ width: 22, height: 22, borderRadius: 6, background: item.pago ? "var(--teal)" : "transparent", border: item.pago ? "none" : "2px solid #e4e0e4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }}>
                      {item.pago && <Check size={14} color="white" strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: item.pago ? "var(--gray)" : "var(--dark)", textDecoration: item.pago ? "line-through" : "none" }}>{item.descricao}</p>
                      <p style={{ fontSize: 12, color: "var(--gray)" }}>Vencimento: {item.vencimento}</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.pago ? "var(--gray)" : "var(--dark)" }}>{formatCurrency(item.valor)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: Faturas do Cartão */}
          <div style={{ background: "var(--white)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0edf0" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--dark)" }}>Descrição das Faturas</h2>
            </div>
            <div style={{ padding: "12px 24px", overflowY: "auto", flex: 1 }}>
              {(!loading && (!data?.faturas || data.faturas.length === 0)) ? (
                <p style={{ fontSize: 14, color: "var(--gray)", textAlign: "center", marginTop: 40 }}>Sem faturas para exibir.</p>
              ) : (
                data?.faturas?.map((fatura, index) => (
                  <div key={index} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px", background: "#fcfbfc", borderRadius: 12, marginBottom: 12, border: "1px solid #f0edf0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)" }}>{fatura.nomeCartao}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--danger)" }}>{formatCurrency(fatura.valorTotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Circle size={8} fill={fatura.fechada ? "var(--danger)" : "var(--sage)"} stroke="none" /> 
                        {fatura.fechada ? "Fatura Fechada" : "Fatura Aberta"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)" }}>Vence dia {fatura.diaVencimento}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
      <TransactionModal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} />
      <SimulatorModal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} />
    </div>
    
  );
}