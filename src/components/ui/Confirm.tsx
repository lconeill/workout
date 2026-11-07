import { createStore } from '@/store/tiny'
import { Sheet } from './Sheet'

interface Req { title: string; body?: string; confirmText?: string; danger?: boolean; resolve: (ok: boolean) => void }
const store = createStore<Req | null>(null)

export function confirmDialog(opts: Omit<Req, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => store.set({ ...opts, resolve }))
}

export function ConfirmHost() {
  const req = store.use()
  const close = (ok: boolean) => { req?.resolve(ok); store.set(null) }
  return (
    <Sheet open={!!req} onClose={() => close(false)} title={req?.title}>
      {req?.body && <p className="text-text-2 mb-5">{req.body}</p>}
      <div className="flex gap-3">
        <button className="btn btn-secondary flex-1" onClick={() => close(false)}>Cancel</button>
        <button className={`btn flex-1 ${req?.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>{req?.confirmText ?? 'Confirm'}</button>
      </div>
    </Sheet>
  )
}
