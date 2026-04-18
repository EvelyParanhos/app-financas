import { useState, useContext } from "react";
import { 
  User, CreditCard, Target, MessageSquare, 
  Plus, Trash2, Link2, Copy, Pencil, Wallet,
  RefreshCw, ShieldCheck
} from "lucide-react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { AuthContext } from "../../context/AuthContext";

export function Settings() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("accounts");
  
  // Estado temporário para simular a geração do código de convite
  const [inviteCode, setInviteCode] = useState(null);

  const tabs = [
    { id: "accounts", label: "Contas e Cartões", icon: CreditCard },
    { id: "budgets", label: "Orçamentos e Fixos", icon: Target },
    { id: "partner", label: "Conectar Parceiro", icon: User },
    { id: "telegram", label: "Bot do Telegram", icon: MessageSquare },
  ];

  const handleGenerateCode = () => {
    // Chamada futura: api.post('/partnership/invite')
    setInviteCode("RB-8291"); 
  };

  return (
    // Adicionado padding de 40px 48px para desgrudar do topo e das laterais
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "40px 48px" }}>
      
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700, color: "var(--dark)" }}>Configurações</h1>
        <p style={{ fontSize: 14, color: "var(--gray)" }}>Gerencie as engrenagens do seu sistema financeiro.</p>
      </div>

      <div style={{ display: "flex", flex: 1, gap: 32, overflow: "hidden" }}>
        
        {/* MENU DE ABAS VERTICAL */}
        <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8,
                background: activeTab === tab.id ? "var(--teal)" : "transparent",
                color: activeTab === tab.id ? "var(--white)" : "var(--deep)",
                fontWeight: 600, border: "none", cursor: "pointer", transition: "all .2s", textAlign: "left"
              }}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div style={{ flex: 1, background: "var(--white)", borderRadius: 16, padding: 32, boxShadow: "0 2px 12px rgba(96,80,99,.05)", overflowY: "auto" }}>
          
          {/* ABA 1: CONTAS E CARTÕES (Dividido em Colunas) */}
          {activeTab === "accounts" && (
            <div className="fadeUp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              
              {/* Coluna Contas */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--dark)" }}>Contas Bancárias</h2>
                  <Button variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }}><Plus size={14} /> Adicionar</Button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Nubank Corrente", "Cofre da Casa"].map((acc, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid #f0edf0", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={18} color="var(--teal)" /></div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--dark)" }}>{acc}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ color: "var(--gray)", background: "transparent", cursor: "pointer" }}><Pencil size={16} /></button>
                        <button style={{ color: "var(--danger)", background: "transparent", cursor: "pointer", opacity: 0.7 }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna Cartões */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--dark)" }}>Cartões de Crédito</h2>
                  <Button variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }}><Plus size={14} /> Adicionar</Button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Cartão Nubank"].map((card, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid #f0edf0", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fdf3f3", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={18} color="var(--danger)" /></div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14, color: "var(--dark)" }}>{card}</p>
                          <p style={{ fontSize: 12, color: "var(--gray)" }}>Vence dia 12</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ color: "var(--gray)", background: "transparent", cursor: "pointer" }}><Pencil size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ABA 2: ORÇAMENTOS E FIXOS */}
          {activeTab === "budgets" && (
            <div className="fadeUp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              
              {/* Coluna Orçamentos */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--dark)" }}>Limites (Orçamentos)</h2>
                  <Button variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }}><Plus size={14} /> Adicionar</Button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[{ name: "Lazer", limit: "R$ 500,00" }, { name: "Mercado", limit: "R$ 1.200,00" }].map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid #f0edf0", borderRadius: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--dark)" }}>{b.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 14, color: "var(--teal)", fontWeight: 600 }}>{b.limit}</span>
                        <button style={{ color: "var(--gray)", background: "transparent", cursor: "pointer" }}><Pencil size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna Gastos Fixos */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--dark)" }}>Gastos Fixos</h2>
                  <Button variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }}><Plus size={14} /> Adicionar</Button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[{ name: "Aluguel", val: "R$ 1.500,00" }, { name: "Internet", val: "R$ 120,00" }].map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid #f0edf0", borderRadius: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--dark)" }}>{f.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 14, color: "var(--danger)", fontWeight: 600 }}>{f.val}</span>
                        <button style={{ color: "var(--gray)", background: "transparent", cursor: "pointer" }}><Pencil size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ABA 3: PARCEIRO (Com botão de Geração) */}
          {activeTab === "partner" && (
            <div className="fadeUp" style={{ maxWidth: 450 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--dark)", marginBottom: 8 }}>Gestão Compartilhada</h2>
              <p style={{ fontSize: 13, color: "var(--gray)", marginBottom: 24 }}>Conecte-se com seu parceiro para dividir gastos e visualizar orçamentos em tempo real.</p>
              
              <div style={{ background: "var(--cream)", padding: 24, borderRadius: 12, marginBottom: 24, textAlign: "center", border: "1px dashed #d5deba" }}>
                {!inviteCode ? (
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <ShieldCheck size={32} color="var(--sage)" />
                      <p style={{ fontSize: 13, color: "var(--gray)", maxWidth: 300 }}>Seu código de convite expira em 5 minutos após gerado por questões de segurança.</p>
                      <Button onClick={handleGenerateCode} style={{ background: "var(--deep)" }}><RefreshCw size={16} /> Gerar Código</Button>
                   </div>
                ) : (
                  <>
                    <p style={{ fontSize: 12, color: "var(--gray)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Código Gerado (Expira em 04:59)</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                      <span style={{ fontFamily: "var(--fd)", fontSize: 32, fontWeight: 800, color: "var(--deep)", letterSpacing: 4 }}>{inviteCode}</span>
                      <button style={{ padding: 8, background: "var(--white)", borderRadius: 8, color: "var(--teal)", cursor: "pointer", border: "none" }}><Copy size={18} /></button>
                    </div>
                  </>
                )}
              </div>
              
              <div style={{ borderTop: "1px solid #f0edf0", paddingTop: 24 }}>
                <Input label="Recebeu um código?" placeholder="Cole o código do parceiro aqui" icon={Link2} />
                <Button style={{ width: "100%", justifyContent: "center" }}>Conectar Contas</Button>
              </div>
            </div>
          )}

          {/* ABA 4: TELEGRAM */}
          {activeTab === "telegram" && (
            <div className="fadeUp" style={{ maxWidth: 550 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--dark)", marginBottom: 8 }}>Integração com Telegram</h2>
              <p style={{ fontSize: 13, color: "var(--gray)", marginBottom: 24 }}>Registre gastos instantaneamente enviando mensagens de texto para o Bot Rubi.</p>
              
              <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 20, background: "#f0f7ff", border: "1px solid #d0e4ff", borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#0088cc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <MessageSquare size={22} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: "#004a80", fontSize: 15 }}>Status: Desconectado</p>
                  <p style={{ fontSize: 13, color: "#6688aa", marginTop: 2 }}>Gere um PIN de uso único para autorizar o seu chat no aplicativo.</p>
                </div>
                <Button style={{ background: "#0088cc", color: "white" }}>Gerar PIN</Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}