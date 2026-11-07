import { useMemo, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { NumberField } from '../ui/NumberField'
import { useSettings } from '@/hooks/useSettings'
import { platesPerSide, warmupRamp } from '@/logic/plates'
import { formatWeight, fromLb, toLb } from '@/logic/units'

export function PlateCalcSheet({ open, onClose, weightLb, onApply }: { open: boolean; onClose: () => void; weightLb: number | null; onApply?: (lb: number) => void }) {
  const s = useSettings()
  const [w, setW] = useState<number | null>(weightLb != null ? fromLb(weightLb, s.units) : null)
  const lb = w != null ? toLb(w, s.units) : 0
  const res = useMemo(() => platesPerSide(lb, s.barWeightLb, s.platesLb), [lb, s.barWeightLb, s.platesLb])
  const ramp = useMemo(() => warmupRamp(lb, s.barWeightLb, s.units === 'kg' ? 2.5 * 2.2046 : 5), [lb, s.barWeightLb, s.units])
  const fw = (v: number) => formatWeight(v, s.units)
  return (
    <Sheet open={open} onClose={onClose} title="Plate calculator">
      <div className="flex items-center gap-3 mb-4">
        <NumberField value={w} onChange={setW} className="text-2xl h-14" placeholder="0" aria-label="Target weight" />
        <span className="text-muted font-semibold">{s.units}</span>
      </div>
      <div className="card p-4 mb-4">
        <div className="label mb-2">Per side · bar {fw(s.barWeightLb)}</div>
        {res.plates.length ? (
          <div className="flex items-end gap-1 flex-wrap">
            {res.plates.map((p, i) => (
              <div key={i} className="flex flex-col items-center justify-center rounded-md bg-accent text-on-accent font-bold num" style={{ width: 36 + Math.min(p, 45) * 0.4, height: 40 + Math.min(p, 45) * 1.2, fontSize: 12 }}>
                {fw(p)}
              </div>
            ))}
          </div>
        ) : <div className="text-muted">Empty bar</div>}
        {res.remainderLb > 0 && <div className="text-warning text-sm mt-2">Can't load exactly — {fw(res.remainderLb)} short. Nearest: {fw(lb - res.remainderLb)}</div>}
      </div>
      {ramp.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="label mb-2">Warm-up ramp</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {ramp.map((r, i) => <div key={i} className="rounded-lg bg-surface-2 py-2"><div className="font-bold num">{fw(r.weightLb)}</div><div className="text-xs text-muted">× {r.reps}</div></div>)}
          </div>
        </div>
      )}
      {onApply && <button className="btn btn-primary w-full" onClick={() => { if (lb > 0) onApply(lb); onClose() }}>Use {fw(lb)} {s.units}</button>}
    </Sheet>
  )
}
