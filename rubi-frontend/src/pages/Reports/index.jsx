import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Wallet, LayoutDashboard, 
  Settings, PieChart, LogOut, AlertCircle, CheckCircle2 
} from "lucide-react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export function Reports() {
  const { user, signOut } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [date, setDate] = useState(new Date());
  const month = date.getMonth() + 1; 
  const year = date.getFullYear();

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const prevMonth = () => setDate(new Date(year, date.getMonth() - 1, 1));
  const nextMonth = () => setDate(new Date(year, date.getMonth() + 1, 1));

  useEffect(() => {
    // Aqui usaremos o endpoint do Dashboard que já traz o budgetStatus preenchido!
    api.get('/dashboard', { params: { month, year } })
      .then(res => setBudgets(res.data.budgetStatus || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--cream)", overflow: "hidden" }}>
      
      {/* SIDEBAR (Com a aba Relatórios ativa) */}
      <div style={{ width: 240, background: "var(--deep)", display: "flex", flexDirection: "column", padding: "32px 20px", color: "var(--white)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48, paddingLeft: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={16} color="white" />
          </div>
          <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, letterSpacing: ".05em", color: "var(--mint)" }}>RUBI</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", borderRadius: 8, color: "rgba(255,255,255,.6)", fontWeight: 500, border: "none", cursor: "pointer", transition: "all .2s" }}>
            <LayoutDashboard size={18} /> Início
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,.1)", borderRadius: 8, color: "var(--white)", fontWeight: 600, border: "none", cursor: "pointer" }}>
            <PieChart size={18} /> Orçamentos
          </button>
          <button onClick={() => navigate('/settings')} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", borderRadius: 8, color: "rgba(255,255,255,.6)", fontWeight: 500, border: "none", cursor: "pointer", transition: "all .2s" }}>
            <Settings size={18} /> Configurações
          </button>
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 24 }}>
          <p style={{ fontSize: 13, color: "var(--mint)", marginBottom: 12, paddingLeft: 8, fontWeight: 600 }}>{user?.name || "Usuário"}</p>
          <button onClick={() => { signOut(); navigate('/'); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", background: "transparent", color: "rgba(255,255,255,.6)", border: "none", cursor: "pointer", fontSize: 14 }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 40px", overflow: "hidden" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>Raio-X de Gastos</h1>
            <p style={{ fontSize: 14, color: "var(--gray)", marginTop: 4 }}>Acompanhe o limite estipulado para cada categoria.</p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--white)", padding: "8px 16px", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <button onClick={prevMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--deep)", minWidth: 110, textAlign: "center" }}>{MONTHS[month - 1]} {year}</span>
            <button onClick={nextMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gray)", display: "flex", alignItems: "center" }}><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* LISTA DE ORÇAMENTOS (Progress Bars) */}
        <div style={{ flex: 1, background: "var(--white)", borderRadius: 16, padding: 32, overflowY: "auto", boxShadow: "0 2px 12px rgba(96,80,99,.05)" }}>
          {loading ? (
            <p style={{ color: "var(--gray)", fontSize: 14 }}>Analisando dados...</p>
          ) : budgets.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.6 }}>
              <PieChart size={48} color="var(--gray)" style={{ marginBottom: 16 }} />
              <p style={{ color: "var(--dark)", fontWeight: 600 }}>Nenhum orçamento definido para este mês.</p>
              <p style={{ color: "var(--gray)", fontSize: 13, marginTop: 4 }}>Vá em Configurações &gt; Orçamentos para criar seus limites.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 800 }}>
              {budgets.map((b, i) => {
                const percent = b.limitAmount > 0 ? (b.spentAmount / b.limitAmount) * 100 : 0;
                const isOverBudget = percent > 100;
                const isWarning = percent > 80 && !isOverBudget;
                const barColor = isOverBudget ? "var(--danger)" : isWarning ? "#f5a623" : "var(--teal)";

                return (
                  <div key={i} className="fadeUp" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--dark)" }}>{b.categoryName}</h3>
                        {isOverBudget ? <AlertCircle size={16} color="var(--danger)" /> : <CheckCircle2 size={16} color="var(--sage)" />}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: barColor }}>{formatCurrency(b.spentAmount)}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--gray)", marginLeft: 6 }}>de {formatCurrency(b.limitAmount)}</span>
                      </div>
                    </div>
                    
                    {/* TRILHO DA BARRA */}
                    <div style={{ width: "100%", height: 12, background: "#f0edf0", borderRadius: 6, overflow: "hidden" }}>
                      {/* PREENCHIMENTO DINÂMICO */}
                      <div style={{ width: `${Math.min(percent, 100)}%`, height: "100%", background: barColor, borderRadius: 6, transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                    </div>
                    <p style={{ fontSize: 12, color: "var(--gray)", marginTop: 8, fontWeight: 500 }}>{percent.toFixed(1)}% utilizado</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}