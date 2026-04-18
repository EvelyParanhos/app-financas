export function Button({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const base = { 
    display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", 
    borderRadius: 8, fontSize: 14, fontWeight: 600, transition: "all .18s" 
  };
  
  const variants = {
    primary: { background: "var(--teal)", color: "var(--white)" },
    ghost: { background: "transparent", color: "var(--deep)", border: "1.5px solid var(--mint)" },
    danger: { background: "transparent", color: "var(--danger)", border: "1.5px solid #f0c0c0" },
    dark: { background: "var(--deep)", color: "var(--white)" },
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      style={{ ...base, ...variants[variant], opacity: disabled ? 0.5 : 1, ...style }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.opacity = ".85";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
}