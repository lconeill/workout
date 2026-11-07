import { useEffect, useState } from 'react'

interface Props {
  value: number | null | undefined
  onChange: (v: number | null) => void
  placeholder?: string
  step?: number
  integer?: boolean
  className?: string
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
  'aria-label'?: string
}

/** Numeric input that keeps a local string while typing and commits on change. */
export function NumberField({ value, onChange, placeholder, integer, className = '', onFocus, onBlur, disabled, ...rest }: Props) {
  const fmt = (v: number | null | undefined) => (v == null ? '' : String(Math.round(v * 100) / 100))
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setText(fmt(value)) }, [value, focused])
  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      enterKeyHint="next"
      className={`field field-num ${className}`}
      placeholder={placeholder}
      value={text}
      disabled={disabled}
      aria-label={rest['aria-label']}
      onFocus={(e) => { setFocused(true); e.currentTarget.select(); onFocus?.() }}
      onBlur={() => { setFocused(false); onBlur?.() }}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.')
        if (!/^\d*\.?\d*$/.test(t)) return
        setText(t)
        if (t === '' || t === '.') { onChange(null); return }
        const n = integer ? parseInt(t, 10) : parseFloat(t)
        if (!Number.isNaN(n)) onChange(n)
      }}
    />
  )
}
