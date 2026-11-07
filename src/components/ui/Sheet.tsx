import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface Props { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean }

export function Sheet({ open, onClose, title, children, tall }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`sheet-in relative w-full max-w-lg rounded-t-3xl bg-surface border-t border-border shadow-2xl flex flex-col ${tall ? 'h-[92dvh]' : 'max-h-[88dvh]'}`}>
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-3" />
        {(
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <h2 className="text-lg font-bold">{title}</h2>
            <button className="btn btn-ghost btn-icon btn-sm -mr-2" onClick={onClose} aria-label="Close"><X size={20} /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-safe" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>{children}</div>
      </div>
    </div>
  )
}
