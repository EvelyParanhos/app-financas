/* FormElements.jsx — shared UI primitives */
import './FormElements.css'

export function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor} className="field-label">{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function Button({ children, icon, loading, variant = 'primary', size = 'md', ...props }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <span className="btn-spinner" />
        : icon && <span className="btn-icon">{icon}</span>
      }
      {children}
    </button>
  )
}

export function FormError({ children }) {
  return <p className="form-error">{children}</p>
}

export function IconButton({ icon, label, onClick, variant = 'ghost', active = false }) {
  return (
    <button
      className={`icon-btn icon-btn-${variant} ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  )
}

export function Badge({ children, color = 'lime' }) {
  return <span className={`badge badge-${color}`}>{children}</span>
}