// src/pages/Dashboard/index.jsx
import { Button } from "../../components/Button";
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";

export function Dashboard() {
  const { signOut } = useContext(AuthContext);

  return (
    <div style={{ padding: 40, background: "var(--cream)", height: "100vh" }}>
      <h1 style={{ fontFamily: "var(--fd)", color: "var(--deep)", marginBottom: 20 }}>
        Dashboard do Rubi
      </h1>
      <p style={{ color: "var(--gray)", marginBottom: 20 }}>
        Em breve: A visão geral das suas finanças!
      </p>
      
      {/* Botão temporário para você conseguir testar o Logout depois */}
      <Button onClick={signOut} variant="danger">Sair</Button>
    </div>
  );
}