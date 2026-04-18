// src/components/Modal.jsx
import { X } from "lucide-react";

export function Modal({ isOpen, onClose, title, children, width = 500 }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(26, 22, 27, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
      <div className="scaleIn" style={{ background: "var(--white)", borderRadius: 16, width: "100%", maxWidth: width, boxShadow: "0 10px 40px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0edf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--dark)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--gray)", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
        </div>
        
        <div style={{ padding: 24, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}