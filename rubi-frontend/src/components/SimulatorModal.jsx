import { useState, useEffect, useContext } from "react";
import { Sparkles, Zap } from "lucide-react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";

export function SimulatorModal({ isOpen, onClose }) {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({ desc: "", amount: "", installments: "1", isShared: false, accountId: "" });
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Carrega as contas do usuário ao abrir
  useEffect(() => {
    if (isOpen) {
      api.get('/accounts').then(res => setAccounts(res.data)).catch(() => {});
      setSaved(false);
    }
  }, [isOpen]);

  const amountNum = parseFloat(form.amount.replace(/\D/g, "") || 0) / 100;
  const installmentsNum = Math.max(1, parseInt(form.installments || 1, 10));
  const monthlyImpact = (amountNum / installmentsNum) / (form.isShared ? 2 : 1);
  const totalImpact = amountNum / (form.isShared ? 2 : 1);

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const handleSimular = async () => {
    if (!form.desc.trim()) return alert("Preencha o nome do que quer comprar.");
    if (amountNum <= 0) return alert("Preencha um valor válido.");
    if (!form.accountId) return alert("Selecione em qual conta seria debitado.");

    try {
      setSaving(true);
      await api.post('/transactions', {
        description: form.desc,
        totalAmount: amountNum,
        type: "EXPENSE",
        isSimulation: true,
        purchaseDate: new Date().toISOString().split('T')[0],
        account: { id: form.accountId },
      }, { params: { parcelas: installmentsNum } });

      setSaved(true);
    } catch (error) {
      alert(error.response?.data?.message || "Erro ao salvar simulação.");
    } finally {
      setSaving(false);
    }
  };

  const handleEfetivar = async () => {
    if (!form.desc.trim() || amountNum <= 0 || !form.accountId) {
      return alert("Preencha todos os campos antes de efetivar.");
    }
    try {
      setSaving(true);
      await api.post('/transactions', {
        description: form.desc,
        totalAmount: amountNum,
        type: "EXPENSE",
        isSimulation: false,
        purchaseDate: new Date().toISOString().split('T')[0],
        account: { id: form.accountId },
      }, { params: { parcelas: installmentsNum } });

      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Erro ao registrar transação.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bola de Cristal" width={620}>
      <div style={{ display: "flex", gap: 24 }}>

        {/* FORMULÁRIO */}
        <div style={{ flex: 1 }}>
          <Input
            label="O que você quer comprar?"
            value={form.desc}
            onChange={e => setForm({ ...form, desc: e.target.value })}
            placeholder="Ex: Geladeira, iPhone, Viagem..."
          />
          <Input
            label="Valor Total"
            value={form.amount}
            onChange={e => {
              let v = e.target.value.replace(/\D/g, "");
              v = v ? "R$ " + (parseInt(v, 10) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") : "";
              setForm({ ...form, amount: v });
            }}
            placeholder="R$ 0,00"
          />
          <Input
            label="Em quantas vezes?"
            type="number"
            value={form.installments}
            onChange={e => setForm({ ...form, installments: e.target.value })}
            placeholder="Ex: 10"
          />

          {/* Seletor de conta */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--gray)", marginBottom: 6 }}>
              Conta de débito
            </label>
            <select
              value={form.accountId}
              onChange={e => setForm({ ...form, accountId: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e4e0e4", borderRadius: 8, fontSize: 14, outline: "none", background: "white" }}>
              <option value="">Selecione uma conta...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={form.isShared}
              onChange={e => setForm({ ...form, isShared: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: "var(--teal)" }}
            />
            <span style={{ fontSize: 13, color: "var(--dark)" }}>Dividir custo com parceiro (50/50)</span>
          </label>
        </div>

        {/* RESULTADO VISUAL */}
        <div style={{ flex: 1, background: "var(--cream)", padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color="var(--deep)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)" }}>Impacto Projetado</h3>
          </div>

          {/* Parcela mensal */}
          <div style={{ background: "var(--white)", borderRadius: 10, padding: 16, border: "1px solid #e4e0e4", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "var(--gray)", marginBottom: 4 }}>Sua parcela mensal</p>
            <p style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800, color: monthlyImpact > 800 ? "var(--danger)" : monthlyImpact > 400 ? "var(--warn)" : "var(--teal)" }}>
              {formatBRL(monthlyImpact)}
            </p>
            <p style={{ fontSize: 11, color: "var(--gray)", marginTop: 4 }}>
              {installmentsNum}x de {formatBRL(monthlyImpact)}
            </p>
          </div>

          {/* Total real */}
          <div style={{ background: "var(--white)", borderRadius: 10, padding: "10px 16px", border: "1px solid #e4e0e4", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--gray)" }}>Seu total real</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dark)" }}>{formatBRL(totalImpact)}</span>
          </div>

          {form.isShared && (
            <div style={{ background: "var(--white)", borderRadius: 10, padding: "10px 16px", border: "1px solid #e4e0e4", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--gray)" }}>Parceiro paga</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--teal)" }}>{formatBRL(totalImpact)}</span>
            </div>
          )}

          {/* Alerta de impacto */}
          {monthlyImpact > 0 && (
            <p style={{ fontSize: 11, color: monthlyImpact > 800 ? "var(--danger)" : "var(--gray)", textAlign: "center" }}>
              {monthlyImpact > 800 ? "⚠️ Impacto alto no orçamento mensal" : monthlyImpact > 400 ? "Impacto moderado" : "Impacto tranquilo"}
            </p>
          )}

          {/* Botões */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
            {!saved ? (
              <Button
                onClick={handleSimular}
                disabled={saving}
                style={{ justifyContent: "center", background: "var(--deep)", opacity: saving ? 0.6 : 1 }}>
                <Sparkles size={15} />
                {saving ? "Salvando..." : "Salvar como Simulação"}
              </Button>
            ) : (
              <div style={{ background: "#f0faf5", border: "1px solid var(--mint)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--teal)", fontWeight: 600, textAlign: "center" }}>
                ✓ Simulação salva no checklist!
              </div>
            )}
            <Button
              onClick={handleEfetivar}
              disabled={saving}
              variant="ghost"
              style={{ justifyContent: "center" }}>
              <Zap size={15} />
              Efetivar Compra (real)
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
}