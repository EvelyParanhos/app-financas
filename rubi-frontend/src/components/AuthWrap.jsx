import { DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AuthWrap({ children, title, sub, showBack = false }) {
  const navigate = useNavigate();

  return (
    <div style={{height:"100vh",background:"var(--cream)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",top:24,left:24,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:30,height:30,borderRadius:8,background:"var(--teal)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <DollarSign size={16} color="white" strokeWidth={2.5} />
        </div>
        <span style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"var(--deep)"}}>RUBI</span>
      </div>
      <div className="scaleIn" style={{ background: "var(--white)", borderRadius: "var(--r16)", boxShadow: "0 2px 16px rgba(96,80,99,.07)", padding:"40px 44px",width:420}}>
        <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"var(--dark)",marginBottom:6}}>{title}</h2>
        <p style={{fontSize:14,color:"var(--gray)",marginBottom:32}}>{sub}</p>
        
        {children}
        
        {showBack && (
          <button onClick={() => navigate(-1)} style={{background:"transparent",color:"var(--gray)",fontSize:13,marginTop:16,display:"block",width:"100%",textAlign:"center"}}>
            ← Voltar
          </button>
        )}
      </div>
    </div>
  );
}