import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { AuthWrap } from "../../components/AuthWrap";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { AuthContext } from "../../context/AuthContext"; // <-- Importa o Contexto

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useContext(AuthContext); // Traz a função mágica que fala com a API
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return alert("Preencha email e senha!");

    try {
      setLoading(true);
      await signIn(email, password); // Vai lá no Java, pega o Token e guarda no LocalStorage
      
      // Aqui você pode colocar uma lógica depois para saber se é a primeira vez
      // e mandar pro /onboarding, mas por enquanto vamos direto pro sistema!
      navigate('/dashboard'); 
    } catch (error) {
      alert(error.response?.data?.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrap title="Bem-vindo de volta" sub="Entre na sua conta Rubi">
      <Input label="E-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" icon={Mail} />
      <Input label="Senha" type={show ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" icon={Lock}
        right={
          <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", color: "var(--gray)" }}>
            {show ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        } 
      />
      <Button onClick={handleLogin} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15, marginTop: 8 }}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--gray)", marginTop: 20 }}>
        Não tem conta?{" "}
        <button onClick={() => navigate('/register')} style={{ background: "transparent", color: "var(--teal)", fontWeight: 600, fontSize: 13 }}>Criar agora</button>
      </p>
    </AuthWrap>
  );
}