import { Minus, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { adjustRest, notifyRestDone, remainingSec, restTimer, stopRest } from '@/store/restTimer'
import { formatClock } from '@/logic/dates'

/** Sticky rest timer. Renders nothing when idle. */
export function RestTimerBar({ compact }: { compact?: boolean }) {
  const state = restTimer.use()
  const [rem, setRem] = useState(remainingSec())
  useEffect(() => {
    if (!state.endsAt) return
    setRem(remainingSec())
    const id = setInterval(() => {
      const r = remainingSec()
      setRem(r)
      if (r <= 0) {
        const s = restTimer.get()
        if (!s.notified) { restTimer.set({ ...s, notified: true }); void notifyRestDone() }
        if (Date.now() - (s.endsAt ?? 0) > 60_000) stopRest()
      }
    }, 250)
    return () => clearInterval(id)
  }, [state.endsAt])
  if (!state.endsAt) return null
  const pct = state.totalSec > 0 ? Math.max(0, Math.min(1, rem / state.totalSec)) : 0
  const done = rem <= 0
  return (
    <div className={`fixed inset-x-0 z-40 flex justify-center px-3 ${compact ? '' : ''}`} style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      <div className={`fade-in w-full max-w-lg rounded-2xl border shadow-lg overflow-hidden ${done ? 'bg-success text-black border-success' : 'bg-surface-3 border-border'}`}>
        <div className="flex items-center gap-2 px-3 py-2">
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => adjustRest(-15)} aria-label="15 seconds less"><Minus size={18} /></button>
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold num leading-none">{done ? 'Go!' : formatClock(rem)}</div>
            {!done && <div className="text-[11px] text-muted">rest</div>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => adjustRest(15)} aria-label="15 seconds more"><Plus size={18} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={stopRest} aria-label="Skip rest"><X size={18} /></button>
        </div>
        {!done && <div className="h-1 bg-surface-2"><div className="h-full bg-accent" style={{ width: `${pct * 100}%`, transition: 'width 250ms linear' }} /></div>}
      </div>
    </div>
  )
}
