import { useState, useContext, useEffect } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

export function TransactionModal({ isOpen, onClose, onSuccess }) {
  const { user } = useContext(AuthContext);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setSaving] = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "EXPENSE",
    accountId: "",
    categoryId: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    installments: "1",
  });

  useEffect(() => {
    if (isOpen) {
      api.get("/accounts").then((r) => setAccounts(r.data)).catch(console.error);
      api.get("/categories").then((r) => setCategories(r.data)).catch(console.error);
      // Reseta o form ao abrir
      setForm({
        description: "",
        amount: "",
        type: "EXPENSE",
        accountId: "",
        categoryId: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        installments: "1",
      });
    }
  }, [isOpen]);

  const parsedAmount = parseFloat(form.amount.replace(/\D/g, "") || 0) / 100;
  const installmentsNum = Math.max(1, parseInt(form.installments || 1, 10));

  const handleSave = async () => {
    if (!form.description.trim()) return alert("Informe a descrição.");
    if (parsedAmount <= 0) return alert("Informe um valor válido.");
    if (!form.accountId) return alert("Selecione a conta.");
    if (!form.categoryId) return alert("Selecione a categoria.");

    try {
      setSaving(true);

      await api.post(
        "/transactions",
        {
          description: form.description,
          totalAmount: parsedAmount,
          type: form.type,
          isSimulation: false,
          purchaseDate: form.purchaseDate,
          account: { id: form.accountId },
          category: { id: form.categoryId },
        },
        { params: { parcelas: installmentsNum } }
      );

      onSuccess?.(); // Avisa o Dashboard para refrescar os dados
      onClose();
    } catch (error) {
      alert(
        error.response?.data?.message || "Erro ao registrar transação."
      );
    } finally {
      setSaving(false);
    }
  };

  const setAmount = (raw) => {
    const v = raw.replace(/\D/g, "");
    const formatted = v
      ? "R$ " +
        (parseInt(v, 10) / 100)
          .toFixed(2)
          .replace(".", ",")
          .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")
      : "";
    setForm((p) => ({ ...p, amount: formatted }));
  };

  const filteredCategories = categories.filter((c) => c.type === form.type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Transação" width={520}>
      {/* Tipo */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {["EXPENSE", "INCOME"].map((t) => (
          <button
            key={t}
            onClick={() => setForm((p) => ({ ...p, type: t, categoryId: "" }))}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border:
                form.type === t
                  ? `2px solid ${t === "EXPENSE" ? "var(--danger)" : "var(--teal)"}`
                  : "1px solid #e4e0e4",
              background:
                form.type === t
                  ? t === "EXPENSE"
                    ? "#fdf3f3"
                    : "#f0f8f7"
                  : "transparent",
              color:
                form.type === t
                  ? t === "EXPENSE"
                    ? "var(--danger)"
                    : "var(--teal)"
                  : "var(--gray)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t === "EXPENSE" ? "Despesa" : "Receita"}
          </button>
        ))}
      </div>

      <Input
        label="Descrição"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        placeholder="Ex: Mercado, Salário, Netflix..."
      />

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 2 }}>
          <Input
            label="Valor"
            value={form.amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="R$ 0,00"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            label="Parcelas"
            type="number"
            value={form.installments}
            onChange={(e) => setForm((p) => ({ ...p, installments: e.target.value }))}
            placeholder="1"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            label="Data"
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Parcelas > 1: mostra valor por parcela */}
      {installmentsNum > 1 && parsedAmount > 0 && (
        <div
          style={{
            background: "#f0f8f7",
            border: "1px solid var(--mint)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            color: "var(--teal)",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          {installmentsNum}x de{" "}
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(parsedAmount / installmentsNum)}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {/* Conta */}
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--gray)",
              marginBottom: 6,
            }}
          >
            Conta
          </label>
          <select
            value={form.accountId}
            onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1.5px solid #e4e0e4",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              background: "white",
            }}
          >
            <option value="">Selecione...</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Categoria */}
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--gray)",
              marginBottom: 6,
            }}
          >
            Categoria
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1.5px solid #e4e0e4",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              background: "white",
            }}
          >
            <option value="">Selecione...</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={loading}
        style={{ width: "100%", justifyContent: "center", padding: 14, marginTop: 4 }}
      >
        {loading ? "Registrando..." : "Registrar Transação"}
      </Button>
    </Modal>
  );
}