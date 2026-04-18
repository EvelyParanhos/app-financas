import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthWrap } from "../../components/AuthWrap";
import { Button } from "../../components/Button";
import { api } from "../../services/api"; // <-- API

export function Verify() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email; // Pega o email que veio do Register
  
  const [code, setCode] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const handleKey = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < 5) refs.current[i+1]?.focus();
    if (!v && i > 0) refs.current[i-1]?.focus();
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) return alert("Digite o código completo!");
    if (!email) return alert("Erro interno: Email não encontrado.");

    try {
      setLoading(true);
      // Chama o endpoint de verificação do Java
      await api.post('/users/verificar', { email, code: fullCode });
      
      alert("Conta ativada com sucesso! Faça login.");
      navigate('/login'); // Conta ativada, manda pro login!
    } catch (error) {
      alert(error.response?.data?.message || "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrap title="Verificar e-mail" sub={`Enviamos um código para ${email || "seu email"}`} showBack={true}>
      <div style={{ display: "flex", gap: 10, marginBottom: 32, justifyContent: "center" }}>
        {code.map((c, i) => (
          <input key={i} ref={el => refs.current[i] = el} value={c} maxLength={1} type="text" inputMode="numeric"
            onChange={e => handleKey(i, e.target.value)}
            style={{ width: 48, height: 56, textAlign: "center", border: "2px solid", borderColor: c ? "var(--teal)" : "#e4e0e4", borderRadius: 10, fontSize: 22, fontWeight: 700, color: "var(--dark)", background: "var(--white)", outline: "none" }} />
        ))}
      </div>
      <Button onClick={handleVerify} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15 }}>
        {loading ? "Verificando..." : "Verificar conta"}
      </Button>
    </AuthWrap>
  );
}