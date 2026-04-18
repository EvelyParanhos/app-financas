import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthWrap } from "../../components/AuthWrap";
import { Button } from "../../components/Button";
import { api } from "../../services/api";

export function Verify() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const refs = useRef([]);

  // Guarda sem token: redireciona para o login
  if (!email) {
    navigate('/login');
    return null;
  }

  const fullCode = code.join("");

  const handleKey = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (!v && i > 0) refs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    if (fullCode.length < 6) return alert("Digite os 6 dígitos do código.");
    try {
      setLoading(true);
      await api.post('/users/verificar', { email, code: fullCode });
      // Vai para o login com instrução de redirecionar ao onboarding após autenticar
      navigate('/login', { state: { redirectTo: '/onboarding' } });
    } catch (error) {
      alert(error.response?.data?.message || "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      setResendMsg("");
      await api.post('/users/reenviar', { email, code: "" });
      setResendMsg("Novo código enviado! Verifique seu e-mail.");
    } catch (error) {
      setResendMsg(error.response?.data?.message || "Erro ao reenviar. Aguarde e tente novamente.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthWrap title="Verificar e-mail" sub={`Enviamos um código para ${email}`} showBack={true}>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, justifyContent: "center" }}>
        {code.map((c, i) => (
          <input key={i} ref={el => refs.current[i] = el} value={c} maxLength={1} type="text" inputMode="numeric"
            onChange={e => handleKey(i, e.target.value)}
            style={{ width: 48, height: 56, textAlign: "center", border: "2px solid", borderColor: c ? "var(--teal)" : "#e4e0e4", borderRadius: 10, fontSize: 22, fontWeight: 700, color: "var(--dark)", background: "var(--white)", outline: "none" }} />
        ))}
      </div>

      <Button onClick={handleVerify} disabled={loading || fullCode.length < 6}
        style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15 }}>
        {loading ? "Verificando..." : "Verificar conta"}
      </Button>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <p style={{ fontSize: 13, color: "var(--gray)", marginBottom: 8 }}>
          Não recebeu ou o código expirou?
        </p>
        <button onClick={handleResend} disabled={resendLoading}
          style={{ background: "transparent", color: "var(--teal)", fontWeight: 600, fontSize: 13 }}>
          {resendLoading ? "Enviando..." : "Reenviar código"}
        </button>
        {resendMsg && (
          <p style={{ fontSize: 12, marginTop: 8, color: resendMsg.includes("enviado") ? "var(--success)" : "var(--danger)" }}>
            {resendMsg}
          </p>
        )}
      </div>
    </AuthWrap>
  );
}