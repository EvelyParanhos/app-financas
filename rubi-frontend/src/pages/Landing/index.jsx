// src/pages/Landing/index.jsx
import { DollarSign, Wallet, TrendingUp, HandCoins, CheckCircle2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";

export function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Lado Esquerdo — Brand */}
      <div className="fadeUp" style={{ width: "52%", background: "var(--deep)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(36,143,141,.15)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(178,213,186,.08)" }} />
        
        <div style={{ marginBottom: 48, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={20} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, color: "var(--mint)", letterSpacing: ".06em" }}>RUBI</span>
          </div>
        </div>
        
        <h1 style={{ fontFamily: "var(--fd)", fontSize: 52, fontWeight: 800, color: "var(--white)", lineHeight: 1.1, marginBottom: 20, position: "relative" }}>
          Suas finanças,<br />
          <span style={{ color: "var(--mint)" }}>sem mistérios.</span>
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.65)", lineHeight: 1.7, marginBottom: 44, maxWidth: 400, position: "relative" }}>
          Controle gastos, acompanhe investimentos e planeje o futuro com uma interface que finalmente faz sentido.
        </p>
        
        <div style={{ display: "flex", gap: 12, position: "relative" }}>
          {/* Aqui conectamos os botões com as rotas */}
          <Button onClick={() => navigate('/register')} style={{ padding: "12px 28px", fontSize: 15 }}>Criar conta gratuita</Button>
          <Button onClick={() => navigate('/login')} variant="ghost" style={{ padding: "12px 28px", fontSize: 15, color: "var(--mint)", borderColor: "rgba(178,213,186,.35)" }}>Entrar</Button>
        </div>
        
        <div style={{ marginTop: 48, display: "flex", gap: 24, position: "relative" }}>
          {[["Controle total", "de gastos"], ["Gestão", "de parcelas"], ["Painel", "de investimentos"]].map(([a, b], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={15} color="var(--sage)" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>{a} {b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lado Direito — Preview */}
      <div style={{ flex: 1, background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div className="scaleIn" style={{ width: "100%", maxWidth: 380 }}>
          {/* Card Preview */}
          <div style={{ background: "var(--white)", borderRadius: "16px", boxShadow: "0 2px 16px rgba(96,80,99,.07)", padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 12, color: "var(--gray)", fontWeight: 500, marginBottom: 2 }}>Saldo disponível</p>
                <p style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 700, color: "var(--dark)" }}>R$ 4.250,80</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={22} color="white" />
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, background: "#fef3f3", borderRadius: 10, padding: "10px 12px" }}>
                <p style={{ fontSize: 11, color: "var(--gray)", marginBottom: 4 }}>Comprometido</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--danger)" }}>R$ 1.890,50</p>
              </div>
              <div style={{ flex: 1, background: "#f0faf5", borderRadius: 10, padding: "10px 12px" }}>
                <p style={{ fontSize: 11, color: "var(--gray)", marginBottom: 4 }}>Sobra</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--success)" }}>R$ 2.360,30</p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #f0edf0", paddingTop: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)", marginBottom: 10 }}>PARCELAS DO MÊS</p>
              {[{ d: "Aluguel", a: "R$ 1.200,00", paid: false }, { d: "iPhone 15 Pro", a: "R$ 541,67", paid: false }, { d: "Spotify", a: "R$ 21,90", paid: true }].map(({ d, a, paid }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: paid ? "none" : "1.5px solid #ddd", background: paid ? "var(--teal)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {paid && <Check size={12} color="white" strokeWidth={3} />}
                  </div>
                  {/* Corrigido o erro das aspas aqui! */}
                  <span style={{ flex: 1, fontSize: 13, color: paid ? "var(--gray)" : "var(--dark)", textDecoration: paid ? "line-through" : "none" }}>{d}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: paid ? "var(--gray)" : "var(--dark)" }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}