import { useState, useRef, useCallback } from 'react'

/**
 * PIX-style currency input — Brazilian R$ format
 * Digits shift left like a calculator: type 5 → R$ 0,05 → R$ 0,50 → R$ 5,00
 * onChange receives the float value in reais (e.g. 750.00)
 */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  label,
  id,
  disabled = false,
  large = false,
}) {
  // Store as integer cents internally
  const [cents, setCents] = useState(() => Math.round((value || 0) * 100))
  const inputRef = useRef(null)

  const format = (c) => {
    const str = String(c).padStart(3, '0')
    const intPart = str.slice(0, -2).replace(/^0+/, '') || '0'
    const decPart = str.slice(-2)
    // Add thousands separator
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `R$ ${intFormatted},${decPart}`
  }

  const handleKeyDown = useCallback((e) => {
    if (disabled) return
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const newCents = Math.min(cents * 10 + parseInt(e.key), 9999999) // max R$99.999,99
      setCents(newCents)
      onChange?.(newCents / 100)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const newCents = Math.floor(cents / 10)
      setCents(newCents)
      onChange?.(newCents / 100)
    }
  }, [cents, onChange, disabled])

  const displayValue = cents === 0 ? '' : format(cents)

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }

  const fieldStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-float)',
    border: '1.5px solid var(--border)',
    borderRadius: large ? 12 : 8,
    cursor: 'text',
    transition: 'border-color 0.2s',
    overflow: 'hidden',
  }

  return (
    <div style={containerStyle}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          {label}
        </label>
      )}
      <div
        style={fieldStyle}
        onClick={() => inputRef.current?.focus()}
        onFocus={() => inputRef.current?.parentElement?.style.setProperty('border-color', 'var(--lime)')}
      >
        {/* Invisible actual input for focus/keyboard */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          readOnly
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onFocus={e => e.currentTarget.parentElement.style.borderColor = 'var(--lime)'}
          onBlur={e => e.currentTarget.parentElement.style.borderColor = 'var(--border)'}
          style={{
            position: 'absolute', opacity: 0, width: '100%', height: '100%',
            cursor: 'text', left: 0, top: 0,
          }}
        />

        {/* Display */}
        <div style={{
          width: '100%',
          padding: large ? '18px 20px' : '11px 14px',
          fontFamily: 'var(--font-display)',
          fontSize: large ? 32 : 16,
          fontWeight: 700,
          letterSpacing: large ? '-0.02em' : '-0.01em',
          color: cents > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          userSelect: 'none',
          textAlign: large ? 'center' : 'left',
        }}>
          {displayValue || placeholder}
        </div>

        {/* Cursor blink */}
        {cents > 0 && !disabled && (
          <div style={{
            position: 'absolute',
            right: large ? 16 : 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 2,
            height: large ? 28 : 18,
            background: 'var(--lime)',
            borderRadius: 1,
            animation: 'blink 1s step-end infinite',
            opacity: 0.8,
          }} />
        )}
      </div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:.8} 50%{opacity:0} }
      `}</style>
    </div>
  )
}