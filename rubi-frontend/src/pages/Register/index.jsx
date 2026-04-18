import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { AuthWrap } from "../../components/AuthWrap";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { api } from "../../services/api"; // <-- Importamos a API

export function Register() {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" }); // Ajustei 'pass' para 'password' para casar com o Java
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const handleRegister = async () => {
    if (!f.name || !f.email || !f.password) return alert("Preencha todos os campos!");
    
    try {
      setLoading(true);
      // Chama o endpoint de criar usuário no Spring Boot
      await api.post('/users', f); 
      
      // Se deu certo, vai para a verificação passando o email na "memória" da rota
      navigate('/verify', { state: { email: f.email } });
    } catch (error) {
      alert(error.response?.data?.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrap title="Criar sua conta" sub="Comece a controlar suas finanças">
      <Input label="Nome completo" value={f.name} onChange={set("name")} placeholder="Ex: Evely Silva" icon={User} />
      <Input label="E-mail" type="email" value={f.email} onChange={set("email")} placeholder="seu@email.com" icon={Mail} />
      <Input label="Senha" type={show ? "text" : "password"} value={f.password} onChange={set("password")} placeholder="Mínimo 8 caracteres" icon={Lock}
        right={
          <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", color: "var(--gray)" }}>
            {show ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        } 
      />
      <Button onClick={handleRegister} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15, marginTop: 8 }}>
        {loading ? "Criando..." : "Criar conta"}
      </Button>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--gray)", marginTop: 20 }}>
        Já tem conta?{" "}
        <button onClick={() => navigate('/login')} style={{ background: "transparent", color: "var(--teal)", fontWeight: 600, fontSize: 13 }}>Entrar</button>
      </p>
    </AuthWrap>
  );
}