import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CableStackConfig } from '@/db/types'
import { cableLadder, decompose, nearestRung, nextRung, setupTotal } from '@/logic/cableStack'
import { formatWeight } from '@/logic/units'
import { Sheet } from '../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  cfg: CableStackConfig
  units: 'lb' | 'kg'
  /** Starting weight (snapped onto the stack if it isn't a stack weight). */
  weightLb: number | null
  onApply: (lb: number, allRemaining: boolean) => void
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100))

/** Pick a pin and add-on plates; shows the real total. */
export function CableSetupSheet({ open, onClose, cfg, units, weightLb, onApply }: Props) {
  const ladder = useMemo(() => cableLadder(cfg), [cfg])
  // Physical plates in a stable order, each toggled independently by index.
  const plates = useMemo(() => [...cfg.addOnsLb].sort((a, b) => b - a), [cfg.addOnsLb])
  const [pin, setPin] = useState(1)
  const [on, setOn] = useState<boolean[]>([])

  const load = (lb: number) => {
    const s = decompose(nearestRung(lb, ladder), cfg)
    if (!s) return
    const used = plates.map(() => false)
    for (const p of s.plates) {
      const i = plates.findIndex((q, j) => q === p && !used[j])
      if (i >= 0) used[i] = true
    }
    setPin(s.pin); setOn(used)
  }
  useEffect(() => {
    if (open) load(weightLb && weightLb > 0 ? weightLb : ladder[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const chosen = plates.filter((_, i) => on[i])
  const total = setupTotal(pin, chosen, cfg)
  const addLb = chosen.reduce((a, b) => a + b, 0)
  const prevRung = [...ladder].reverse().find((w) => w < total - 1e-6)
  const step = (dir: 1 | -1) => load(dir > 0 ? nextRung(total, ladder) : (prevRung ?? total))

  return (
    <Sheet open={open} onClose={onClose} title="Cable setup">
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-secondary btn-icon" onClick={() => step(-1)} disabled={prevRung == null} aria-label="Lighter"><Minus size={20} /></button>
        <div className="flex-1 text-center">
          <div className="text-3xl font-bold num">P{pin}{addLb > 0 ? ` + ${fmt(addLb)}` : ''}</div>
          <div className="text-sm text-muted num">{formatWeight(total, units, true)} total</div>
        </div>
        <button className="btn btn-secondary btn-icon" onClick={() => step(1)} disabled={total >= ladder[ladder.length - 1]} aria-label="Heavier"><Plus size={20} /></button>
      </div>

      <div className="label mb-2">Pin</div>
      <div className="grid grid-cols-6 gap-2 mb-4">
        {Array.from({ length: cfg.pins }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`btn btn-sm num ${pin === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPin(p)}>{p}</button>
        ))}
      </div>

      {plates.length > 0 && <>
        <div className="label mb-2">Add-on plates</div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {plates.map((p, i) => (
            <button key={i} className={`chip num ${on[i] ? 'chip-active' : ''}`} onClick={() => setOn((o) => plates.map((_, j) => (j === i ? !o[j] : !!o[j])))}>+{fmt(p)}</button>
          ))}
        </div>
      </>}

      <div className="flex gap-2">
        <button className="btn btn-secondary flex-1" onClick={() => { onApply(total, false); onClose() }}>This set</button>
        <button className="btn btn-primary flex-1" onClick={() => { onApply(total, true); onClose() }}>All remaining sets</button>
      </div>
    </Sheet>
  )
}
