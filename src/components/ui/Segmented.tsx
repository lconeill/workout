export function Segmented<T extends string>({ value, options, onChange, className = '' }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`flex rounded-xl bg-surface-2 border border-border p-1 ${className}`}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 min-h-[36px] rounded-lg text-sm font-semibold transition-colors ${o.value === value ? 'bg-surface-3 text-text shadow' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
