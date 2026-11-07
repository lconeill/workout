import { createStore } from '@/store/tiny'

interface Toast { id: number; text: string; kind: 'info' | 'success' | 'pr' }
const toasts = createStore<Toast[]>([])
let n = 0
export function toast(text: string, kind: Toast['kind'] = 'info') {
  const id = ++n
  toasts.set((t) => [...t, { id, text, kind }])
  setTimeout(() => toasts.set((t) => t.filter((x) => x.id !== id)), 2600)
}

export function ToastHost() {
  const list = toasts.use()
  if (!list.length) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4" style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}>
      {list.map((t) => (
        <div key={t.id} className={`fade-in rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${t.kind === 'pr' ? 'bg-pr text-black' : t.kind === 'success' ? 'bg-success text-black' : 'bg-surface-3 text-text border border-border'}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
