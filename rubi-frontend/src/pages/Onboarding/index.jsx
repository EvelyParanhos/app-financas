import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, ArrowRight, LayoutDashboard, CreditCard,
  TrendingUp, Target, Plus, X,
} from "lucide-react";
import { Button } from "../../components/Button";
import { api } from "../../services/api";
import { parseCurrency } from "../../utils/currency";

const ONBOARD_STEPS = [
  { icon: LayoutDashboard, title: "Visão completa do mês", desc: "Acompanhe saldo, parcelas e gastos por categoria em um só lugar." },
  { icon: CreditCard, title: "Cartões e parcelas", desc: "Controle faturas, divida despesas e marque pagamentos como feitos." },
  { icon: TrendingUp, title: "Investimentos simplificados", desc: "Aporte, resgate e acompanhe rendimentos de todas as suas carteiras." },
  { icon: Target, title: "Metas e orçamentos", desc: "Defina limites por categoria e receba alertas antes de estourar." },
];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(false);

  // Saldo da carteira CASH (criada automaticamente no cadastro)
  // O usuário informa aqui quanto tem em mãos no momento.
  const [walletBalance, setWalletBalance] = useState("");
  const [walletId, setWalletId] = useState(null);

  // Contas correntes adicionais
  const [accs, setAccs] = useState([{ name: "", type: "CHECKING", initialBalance: "" }]);

  // Cartões
  const [cards, setCards] = useState([{ name: "", limit: "", closingDay: "", dueDay: "" }]);

  // Gastos e entradas fixas
  const [fixeds, setFixed] = useState([{ desc: "", amount: "" }]);
  const [incomes, setIncomes] = useState([{ desc: "", amount: "" }]);

  // Busca o ID da carteira CASH logo ao entrar no step 1
  useEffect(() => {
    if (step === 1) {
      api.get("/accounts")
        .then((r) => {
          const wallet = r.data.find((a) => a.type === "CASH");
          if (wallet) setWalletId(wallet.id);
        })
        .catch(console.error);
    }
  }, [step]);

  // ─── Tela de boas-vindas ──────────────────────────────────────────────────
  if (step === 0) return (
    <div style={{ height: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 24, left: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DollarSign size={16} color="white" strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, color: "var(--deep)" }}>RUBI</span>
      </div>
      <div className="scaleIn" style={{ textAlign: "center", maxWidth: 600 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--teal)", letterSpacing: ".08em", marginBottom: 12 }}>COMEÇANDO</p>
        <h1 style={{ fontFamily: "var(--fd)", fontSize: 40, fontWeight: 800, color: "var(--dark)", marginBottom: 14 }}>
          Seu painel financeiro <span style={{ color: "var(--deep)" }}>pessoal.</span>
        </h1>
        <p style={{ fontSize: 16, color: "var(--gray)", marginBottom: 48 }}>
          Conheça as principais funcionalidades do Rubi antes de começar.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40, textAlign: "left" }}>
          {ONBOARD_STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={i}
              style={{ background: "var(--white)", borderRadius: 16, boxShadow: "0 2px 16px rgba(96,80,99,.07)", padding: 20, border: slide === i ? "2px solid var(--teal)" : "2px solid transparent", transition: "all .2s", cursor: "pointer" }}
              onClick={() => setSlide(i)}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: slide === i ? "var(--teal)" : "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, transition: "all .2s" }}>
                <Icon size={18} color={slide === i ? "white" : "var(--deep)"} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--dark)", marginBottom: 4 }}>{title}</p>
              <p style={{ fontSize: 13, color: "var(--gray)", lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
        <Button onClick={() => setStep(1)} style={{ padding: "13px 40px", fontSize: 15, margin: "0 auto" }}>
          Continuar <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const steps = ["Suas contas", "Cartões de crédito", "Gastos fixos", "Entradas fixas"];
  const curr = step - 1;
  const addRow = (setter, proto) => setter((p) => [...p, { ...proto }]);
  const setRow = (setter, i, key, val) => setter((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const rmRow = (setter, i) => setter((p) => p.filter((_, idx) => idx !== i));

  const formatMoney = (raw) => {
    const v = raw.replace(/\D/g, "");
    return v
      ? "R$ " + (parseInt(v, 10) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")
      : "";
  };

  // ─── Finalizar onboarding ─────────────────────────────────────────────────
  const handleFinish = async () => {
    try {
      setLoading(true);

      // 1. Define o saldo da carteira CASH (criada no cadastro)
      if (walletId && parseCurrency(walletBalance) > 0) {
        await api.patch(`/accounts/${walletId}/balance`, null, {
          params: { amount: parseCurrency(walletBalance) },
        });
      }

      // 2. Cria contas correntes/investimento com saldo inicial
      const contasValidas = accs.filter((a) => a.name.trim());
      await Promise.all(
        contasValidas.map((a) =>
          api.post("/accounts", {
            name: a.name,
            type: a.type,
            initialBalance: parseCurrency(a.initialBalance) || 0,
          })
        )
      );

      // 3. Cria cartões de crédito
      const cartoesValidos = cards.filter((c) => c.name.trim());
      await Promise.all(
        cartoesValidos.map((c) =>
          api.post("/accounts", {
            name: c.name,
            type: "CREDIT_CARD",
            cardLimit: parseCurrency(c.limit),
            closingDay: parseInt(c.closingDay) || 5,
            dueDay: parseInt(c.dueDay) || 10,
          })
        )
      );

      // 4. Cria gastos fixos recorrentes
      const fixosValidos = fixeds.filter((f) => f.desc.trim());
      await Promise.all(
        fixosValidos.map((f) =>
          api.post("/recurring", {
            description: f.desc,
            estimatedAmount: parseCurrency(f.amount),
            type: "EXPENSE",
            dayOfMonth: 1,
          })
        )
      );

      // 5. Cria entradas fixas recorrentes
      const entradasValidas = incomes.filter((f) => f.desc.trim());
      await Promise.all(
        entradasValidas.map((f) =>
          api.post("/recurring", {
            description: f.desc,
            estimatedAmount: parseCurrency(f.amount),
            type: "INCOME",
            dayOfMonth: 5,
          })
        )
      );

      navigate("/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Erro ao salvar configurações iniciais.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Campos reutilizáveis ─────────────────────────────────────────────────
  const inputStyle = {
    padding: "10px 12px",
    border: "1.5px solid #e4e0e4",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={{ height: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 24, left: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DollarSign size={16} color="white" strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, color: "var(--deep)" }}>RUBI</span>
      </div>

      <div className="scaleIn" style={{ background: "var(--white)", borderRadius: 16, boxShadow: "0 2px 16px rgba(96,80,99,.07)", padding: "40px 48px", width: 600 }}>
        {/* Barra de progresso */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= curr ? "var(--teal)" : "#e8e4e8", transition: "all .3s" }} />
          ))}
        </div>

        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--teal)", letterSpacing: ".08em", marginBottom: 8 }}>
          PASSO {step} DE 4
        </p>

        {/* ── PASSO 1: Contas ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>
              Suas Contas
            </h2>
            <p style={{ fontSize: 14, color: "var(--gray)", marginBottom: 20 }}>
              Informe quanto você tem hoje. Comece pela sua carteira (dinheiro em mãos).
            </p>

            {/* Carteira CASH (gerada automaticamente) */}
            <div style={{ background: "#f0f8f7", border: "1px solid var(--mint)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)", marginBottom: 8 }}>
                💵 Minha Carteira (dinheiro em mãos)
              </p>
              <input
                value={walletBalance}
                onChange={(e) => setWalletBalance(formatMoney(e.target.value))}
                placeholder="Quanto você tem agora? R$ 0,00"
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>

            {/* Contas bancárias adicionais */}
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)", marginBottom: 10 }}>
              Contas bancárias adicionais (opcional)
            </p>
            {accs.map((acc, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input
                  value={acc.name}
                  onChange={(e) => setRow(setAccs, i, "name", e.target.value)}
                  placeholder="Ex: Bradesco Corrente, Cofre da Casa..."
                  style={{ ...inputStyle, flex: 2 }}
                />
                <input
                  value={acc.initialBalance}
                  onChange={(e) => setRow(setAccs, i, "initialBalance", formatMoney(e.target.value))}
                  placeholder="Saldo atual"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={acc.type}
                  onChange={(e) => setRow(setAccs, i, "type", e.target.value)}
                  style={{ ...inputStyle, flex: 1, background: "white" }}
                >
                  <option value="CHECKING">Corrente</option>
                  <option value="INVESTMENT">Cofre/Reserva</option>
                </select>
                {accs.length > 1 && (
                  <button onClick={() => rmRow(setAccs, i)} style={{ background: "transparent", color: "var(--gray)" }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addRow(setAccs, { name: "", type: "CHECKING", initialBalance: "" })}
              style={{ background: "transparent", color: "var(--teal)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}
            >
              <Plus size={15} /> Adicionar conta
            </button>
          </>
        )}

        {/* ── PASSO 2: Cartões ─────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>
              Cartões de crédito
            </h2>
            <p style={{ fontSize: 14, color: "var(--gray)", marginBottom: 24 }}>
              Informe seus cartões, limites e datas de vencimento.
            </p>
            {cards.map((c, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, padding: 12, border: "1px solid #f0edf0", borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={c.name}
                    onChange={(e) => setRow(setCards, i, "name", e.target.value)}
                    placeholder="Ex: Nubank, Inter..."
                    style={{ ...inputStyle, flex: 2 }}
                  />
                  <input
                    value={c.limit}
                    onChange={(e) => setRow(setCards, i, "limit", formatMoney(e.target.value))}
                    placeholder="Limite R$ 0,00"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {cards.length > 1 && (
                    <button onClick={() => rmRow(setCards, i)} style={{ background: "transparent", color: "var(--gray)" }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--gray)", marginBottom: 4, display: "block" }}>Dia de Fechamento</label>
                    <input value={c.closingDay} onChange={(e) => setRow(setCards, i, "closingDay", e.target.value)} placeholder="Ex: 5" type="number" min="1" max="31" style={{ ...inputStyle, width: "100%" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--gray)", marginBottom: 4, display: "block" }}>Dia de Vencimento</label>
                    <input value={c.dueDay} onChange={(e) => setRow(setCards, i, "dueDay", e.target.value)} placeholder="Ex: 12" type="number" min="1" max="31" style={{ ...inputStyle, width: "100%" }} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => addRow(setCards, { name: "", limit: "", closingDay: "", dueDay: "" })} style={{ background: "transparent", color: "var(--teal)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Plus size={15} /> Adicionar cartão
            </button>
          </>
        )}

        {/* ── PASSO 3: Gastos fixos ────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>
              Gastos fixos mensais
            </h2>
            <p style={{ fontSize: 14, color: "var(--gray)", marginBottom: 24 }}>
              Liste as despesas recorrentes que você tem todo mês (Aluguel, Internet, etc).
            </p>
            {fixeds.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input value={f.desc} onChange={(e) => setRow(setFixed, i, "desc", e.target.value)} placeholder="Ex: Aluguel" style={{ ...inputStyle, flex: 2 }} />
                <input value={f.amount} onChange={(e) => setRow(setFixed, i, "amount", formatMoney(e.target.value))} placeholder="R$ 0,00" style={{ ...inputStyle, flex: 1 }} />
                {fixeds.length > 1 && <button onClick={() => rmRow(setFixed, i)} style={{ background: "transparent", color: "var(--gray)" }}><X size={16} /></button>}
              </div>
            ))}
            <button onClick={() => addRow(setFixed, { desc: "", amount: "" })} style={{ background: "transparent", color: "var(--teal)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Plus size={15} /> Adicionar gasto fixo
            </button>
          </>
        )}

        {/* ── PASSO 4: Entradas fixas ──────────────────────────────────── */}
        {step === 4 && (
          <>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>
              Entradas mensais fixas
            </h2>
            <p style={{ fontSize: 14, color: "var(--gray)", marginBottom: 24 }}>
              Adicione seus recebimentos mensais: salário, vale alimentação, freelance...
            </p>
            {incomes.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input value={f.desc} onChange={(e) => setRow(setIncomes, i, "desc", e.target.value)} placeholder="Ex: Salário, Vale Alimentação" style={{ ...inputStyle, flex: 2 }} />
                <input value={f.amount} onChange={(e) => setRow(setIncomes, i, "amount", formatMoney(e.target.value))} placeholder="R$ 0,00" style={{ ...inputStyle, flex: 1 }} />
                {incomes.length > 1 && <button onClick={() => rmRow(setIncomes, i)} style={{ background: "transparent", color: "var(--gray)" }}><X size={16} /></button>}
              </div>
            ))}
            <button onClick={() => addRow(setIncomes, { desc: "", amount: "" })} style={{ background: "transparent", color: "var(--teal)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Plus size={15} /> Adicionar entrada
            </button>
          </>
        )}

        {/* Navegação */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          <button onClick={() => setStep((p) => p - 1)} style={{ background: "transparent", color: "var(--gray)", fontSize: 14 }}>
            ← Voltar
          </button>
          {step < 4 ? (
            <Button onClick={() => setStep((p) => p + 1)} style={{ padding: "11px 28px" }}>
              Próximo <ArrowRight size={15} />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading} style={{ padding: "11px 28px", background: "var(--deep)" }}>
              {loading ? "Salvando..." : "Entrar no Rubi"} <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}