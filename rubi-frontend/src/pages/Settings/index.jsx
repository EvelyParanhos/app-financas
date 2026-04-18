import { useState, useContext } from "react";
import { 
  User, CreditCard, Target, MessageSquare, 
  Plus, Trash2, Link2, Copy, Check, ShieldCheck
} from "lucide-react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { AuthContext } from "../../context/AuthContext";

export function Settings() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("accounts");

  const tabs = [
    { id: "accounts", label: "Contas e Cartões", icon: CreditCard },
    { id: "budgets", label: "Orçamentos e Fixos", icon: Target },
    { id: "partner", label: "Conectar Parceiro", icon: User },
    { id: "telegram", label: "Bot do Telegram", icon: MessageSquare },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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

        {/* CONTEÚDO DINÂMICO (PAINEL BRANCO) */}
        <div style={{ flex: 1, background: "var(--white)", borderRadius: 16, padding: 32, boxShadow: "0 2px 12px rgba(96,80,99,.05)", overflowY: "auto" }}>
          
          {activeTab === "accounts" && (
            <div className="fadeUp">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--dark)" }}>Suas Contas e Cartões</h2>
                <Button variant="ghost" style={{ padding: "8px 16px" }}><Plus size={16} /> Adicionar Novo</Button>
              </div>
              {/* LISTA DE CONTAS (Exemplo visual) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["Nubank Corrente", "Minha Carteira", "Cofre da Casa"].map((acc, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid #f0edf0", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={18} color="var(--teal)" /></div>
                      <span style={{ fontWeight: 600, color: "var(--dark)" }}>{acc}</span>
                    </div>
                    <button style={{ color: "var(--gray)", background: "transparent" }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "partner" && (
            <div className="fadeUp" style={{ maxWidth: 450 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--dark)", marginBottom: 8 }}>Gestão Compartilhada</h2>
              <p style={{ fontSize: 13, color: "var(--gray)", marginBottom: 24 }}>Conecte-se com o seu parceiro ou família para dividir gastos e visualizar orçamentos conjuntos.</p>
              
              <div style={{ background: "var(--cream)", padding: 24, borderRadius: 12, marginBottom: 24, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "var(--gray)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Seu Código de Convite</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <span style={{ fontFamily: "var(--fd)", fontSize: 32, fontWeight: 800, color: "var(--deep)", letterSpacing: 4 }}>{user?.inviteCode || "RB-8291"}</span>
                  <button style={{ padding: 8, background: "var(--white)", borderRadius: 8, color: "var(--teal)" }}><Copy size={18} /></button>
                </div>
              </div>
              
              <div style={{ borderTop: "1px solid #f0edf0", paddingTop: 24 }}>
                <Input label="Recebeu um código?" placeholder="Cole o código do parceiro aqui" icon={Link2} />
                <Button style={{ width: "100%", justifyContent: "center" }}>Conectar Agora</Button>
              </div>
            </div>
          )}

          {activeTab === "telegram" && (
            <div className="fadeUp">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--dark)", marginBottom: 8 }}>Integração com Telegram</h2>
              <p style={{ fontSize: 13, color: "var(--gray)", marginBottom: 24 }}>Registre gastos instantaneamente enviando mensagens para o Bot Rubi.</p>
              
              <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 20, background: "#f0f7ff", border: "1px solid #d0e4ff", borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#0088cc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <MessageSquare size={22} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: "#004a80" }}>Status: Desconectado</p>
                  <p style={{ fontSize: 12, color: "#6688aa" }}>Você precisa gerar um PIN para autenticar o Bot.</p>
                </div>
                <Button style={{ background: "#0088cc" }}>Gerar Token PIN</Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}