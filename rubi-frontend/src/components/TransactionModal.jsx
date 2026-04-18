import { useState, useContext } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { AuthContext } from "../context/AuthContext";

export function TransactionModal({ isOpen, onClose }) {
  const { user } = useContext(AuthContext); // Pegamos os dados da Evely logada
  
  // O Form agora reflete o seu TransactionDTO do Java
  const [form, setForm] = useState({ 
    description: "", 
    amount: "", 
    type: "EXPENSE", 
    accountId: "", 
    categoryId: "",
    purchaseDate: new Date().toISOString().split('T')[0], // Pega a data de hoje por padrão
    installments: 1,
    isShared: false 
  });

  const handleSave = () => {
    // Validações básicas antes de mandar para a API
    if (!form.accountId || !form.categoryId) {
      return alert("Por favor, selecione a conta e a categoria.");
    }
    // api.post('/transactions', form) ...
    alert("Transação enviada para o banco de dados!");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Transação" width={550}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={() => setForm({...form, type: "EXPENSE"})} style={{ flex: 1, padding: "10px", borderRadius: 8, border: form.type === "EXPENSE" ? "2px solid var(--danger)" : "1px solid #e4e0e4", background: form.type === "EXPENSE" ? "#fdf3f3" : "transparent", color: form.type === "EXPENSE" ? "var(--danger)" : "var(--gray)", fontWeight: 600 }}>Despesa</button>
        <button onClick={() => setForm({...form, type: "INCOME"})} style={{ flex: 1, padding: "10px", borderRadius: 8, border: form.type === "INCOME" ? "2px solid var(--teal)" : "1px solid #e4e0e4", background: form.type === "INCOME" ? "#f0f8f7" : "transparent", color: form.type === "INCOME" ? "var(--teal)" : "var(--gray)", fontWeight: 600 }}>Receita</button>
      </div>

      <Input label="Descrição" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Mercado" />
      
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 2 }}>
          <Input label="Valor" value={form.amount} onChange={e => {
              let v = e.target.value.replace(/\D/g, "");
              v = v ? "R$ " + (parseInt(v, 10) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") : "";
              setForm({...form, amount: v});
            }} placeholder="R$ 0,00" />
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Data" type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--gray)", marginBottom: 6 }}>Conta de Origem</label>
          <select value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e4e0e4", borderRadius: 8, fontSize: 14, outline: "none", background: "white" }}>
            <option value="">Selecione...</option>
            {/* Aqui faremos um map nas contas que vierem da API: */}
            <option value="id-carteira">Minha Carteira (Dinheiro)</option>
            <option value="id-nubank">Nubank</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--gray)", marginBottom: 6 }}>Categoria</label>
          <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e4e0e4", borderRadius: 8, fontSize: 14, outline: "none", background: "white" }}>
            <option value="">Selecione...</option>
            <option value="id-alimentacao">Alimentação</option>
            <option value="id-lazer">Lazer</option>
          </select>
        </div>
      </div>

      {/* A Regra de Negócio que você pontuou: Só aparece se a pessoa tiver parceiro! */}
      {user?.partnerId && (
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#faf9fa", padding: 12, borderRadius: 8, marginBottom: 16, border: "1px solid #f0edf0" }}>
          <input type="checkbox" checked={form.isShared} onChange={e => setForm({...form, isShared: e.target.checked})} style={{ width: 18, height: 18, accentColor: "var(--teal)" }} />
          <span style={{ fontSize: 14, color: "var(--dark)", fontWeight: 500 }}>Dividir com parceiro(a)</span>
        </label>
      )}

      <Button onClick={handleSave} style={{ width: "100%", justifyContent: "center", padding: 14, marginTop: 8 }}>Registrar Transação</Button>
    </Modal>
  );
}