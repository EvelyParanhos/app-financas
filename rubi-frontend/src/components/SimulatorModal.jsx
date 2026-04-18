// src/components/SimulatorModal.jsx
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";

export function SimulatorModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ desc: "", amount: "", installments: "1", isShared: false });

  // Lógica Matemática do Frontend para a Simulação
  const amountNum = parseFloat(form.amount.replace(/\D/g, "") || 0) / 100;
  const installmentsNum = parseInt(form.installments || 1, 10);
  const monthlyImpact = (amountNum / installmentsNum) / (form.isShared ? 2 : 1);

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bola de Cristal (Simulador)" width={600}>
      <div style={{ display: "flex", gap: 24 }}>
        
        {/* Lado Esquerdo: Formulário */}
        <div style={{ flex: 1 }}>
          <Input label="O que você quer comprar?" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} placeholder="Ex: Geladeira Nova" />
          
          <Input label="Valor Total" value={form.amount} onChange={e => {
              let v = e.target.value.replace(/\D/g, "");
              v = v ? "R$ " + (parseInt(v, 10) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") : "";
              setForm({...form, amount: v});
            }} placeholder="R$ 0,00" />
            
          <Input label="Em quantas vezes?" type="number" value={form.installments} onChange={e => setForm({...form, installments: e.target.value})} placeholder="Ex: 10" />

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 16 }}>
            <input type="checkbox" checked={form.isShared} onChange={e => setForm({...form, isShared: e.target.checked})} style={{ width: 16, height: 16, accentColor: "var(--teal)" }} />
            <span style={{ fontSize: 13, color: "var(--dark)" }}>Dividir custo (50/50)</span>
          </label>
        </div>

        {/* Lado Direito: Resultados Visuais */}
        <div style={{ flex: 1, background: "var(--cream)", padding: 20, borderRadius: 12, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Sparkles size={16} color="var(--deep)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)" }}>Impacto Projetado</h3>
          </div>
          
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "var(--white)", borderRadius: 8, padding: 16, border: "1px solid #e4e0e4" }}>
            <p style={{ fontSize: 12, color: "var(--gray)", marginBottom: 4 }}>Sua parcela mensal será de:</p>
            <p style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800, color: monthlyImpact > 500 ? "var(--danger)" : "var(--teal)" }}>
              {formatBRL(monthlyImpact)}
            </p>
            <p style={{ fontSize: 11, color: "var(--gray)", marginTop: 8 }}>Durante {installmentsNum} meses</p>
          </div>

          <Button style={{ marginTop: 16, justifyContent: "center", background: "var(--deep)" }}>
            Amei! Efetivar Compra
          </Button>
        </div>

      </div>
    </Modal>
  );
}