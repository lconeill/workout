import type { CableStackConfig, Exercise } from '@/db/types'

/**
 * Pin-loaded cable stack with small add-on plates on top.
 * total = baseLb + pin × pinLb + (sum of chosen add-ons), pin in 1…pins.
 * Sets are always stored as total lb; the pin/add-on setup is derived for display.
 */

const EPS = 1e-6

/** Exercises that use the stack: explicit per-exercise flag, else every Cable exercise. */
export function usesCableStack(ex: Pick<Exercise, 'equipment' | 'cableStack'>): boolean {
  return ex.cableStack ?? ex.equipment === 'cable'
}

/** Every distinct sum the add-on plates can make, ascending (always includes 0). */
export function addOnSums(addOnsLb: number[]): number[] {
  let sums = new Set<number>([0])
  for (const p of addOnsLb) {
    const next = new Set(sums)
    for (const s of sums) next.add(Math.round((s + p) * 1000) / 1000)
    sums = next
  }
  return [...sums].sort((a, b) => a - b)
}

/** All weights the stack can make, ascending and de-duplicated. */
export function cableLadder(cfg: CableStackConfig): number[] {
  const sums = addOnSums(cfg.addOnsLb)
  const out = new Set<number>()
  for (let pin = 1; pin <= cfg.pins; pin++) {
    for (const a of sums) out.add(Math.round((cfg.baseLb + pin * cfg.pinLb + a) * 1000) / 1000)
  }
  return [...out].sort((a, b) => a - b)
}

export interface CableSetup {
  pin: number
  /** Total add-on weight. */
  addLb: number
  /** Which physical add-on plates make up addLb (fewest plates). */
  plates: number[]
  totalLb: number
}

/** Fewest add-on plates (from those available) summing to `lb`, or null if impossible. */
export function platesFor(lb: number, addOnsLb: number[]): number[] | null {
  if (lb < EPS) return []
  const avail = [...addOnsLb].sort((a, b) => b - a)
  let best: number[] | null = null
  const n = avail.length
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick: number[] = []
    let sum = 0
    for (let i = 0; i < n; i++) if (mask & (1 << i)) { pick.push(avail[i]); sum += avail[i] }
    if (Math.abs(sum - lb) < EPS && (!best || pick.length < best.length)) best = pick
  }
  return best
}

/**
 * Pin + add-ons for an exact stack weight, or null if the stack can't make it.
 * Prefers the highest pin (fewest add-ons) when several setups give the same total.
 */
export function decompose(totalLb: number, cfg: CableStackConfig): CableSetup | null {
  for (let pin = cfg.pins; pin >= 1; pin--) {
    const addLb = Math.round((totalLb - cfg.baseLb - pin * cfg.pinLb) * 1000) / 1000
    if (addLb < -EPS) continue
    const plates = platesFor(addLb, cfg.addOnsLb)
    if (plates) return { pin, addLb, plates, totalLb }
  }
  return null
}

export function setupTotal(pin: number, plates: number[], cfg: CableStackConfig): number {
  return Math.round((cfg.baseLb + pin * cfg.pinLb + plates.reduce((a, b) => a + b, 0)) * 1000) / 1000
}

function fmtLb(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
}

/** "P3", "P3+5", or null if the weight isn't a stack weight. */
export function formatSetup(totalLb: number | null | undefined, cfg: CableStackConfig): string | null {
  if (totalLb == null || totalLb <= 0) return null
  const s = decompose(totalLb, cfg)
  if (!s) return null
  return s.addLb > 0 ? `P${s.pin}+${fmtLb(s.addLb)}` : `P${s.pin}`
}

/** Smallest ladder weight strictly above `lb` (top of the stack if already there). */
export function nextRung(lb: number, ladder: number[]): number {
  return ladder.find((w) => w > lb + EPS) ?? ladder[ladder.length - 1] ?? lb
}

/** Nearest ladder weight to `lb`; ties go to the lighter one. */
export function nearestRung(lb: number, ladder: number[]): number {
  if (!ladder.length) return lb
  let best = ladder[0]
  for (const w of ladder) if (Math.abs(w - lb) < Math.abs(best - lb) - EPS) best = w
  return best
}

/** Heaviest ladder weight at or below `lb` (lightest rung if below the stack). */
export function rungAtOrBelow(lb: number, ladder: number[]): number {
  let out = ladder[0] ?? lb
  for (const w of ladder) if (w <= lb + EPS) out = w
  return out
}

/** Stack config for an exercise if it's logged on the stack, else null. */
export function cableFor(ex: Pick<Exercise, 'equipment' | 'cableStack' | 'kind'> | undefined, cfg: CableStackConfig | undefined): CableStackConfig | null {
  return ex && cfg && ex.kind === 'weight_reps' && usesCableStack(ex) ? cfg : null
}
