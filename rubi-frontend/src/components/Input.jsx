export function Input({ label, type = "text", value, onChange, placeholder, icon: Icon, right }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--gray)", marginBottom: 6 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray)" }} />}
        
        <input 
          type={type} 
          value={value} 
          onChange={onChange} 
          placeholder={placeholder}
          style={{
            width: "100%", 
            padding: `10px ${right ? 40 : 12}px 10px ${Icon ? 40 : 12}px`,
            border: "1.5px solid #e8e4e8", 
            borderRadius: 8, 
            fontSize: 14, 
            background: "var(--white)", 
            color: "var(--dark)"
          }} 
        />
        {right}
      </div>
    </div>
  );
}