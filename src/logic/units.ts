export const LB_PER_KG = 2.2046226218

export function lbToKg(lb: number): number { return lb / LB_PER_KG }
export function kgToLb(kg: number): number { return kg * LB_PER_KG }

/** Round to the nearest `step` (e.g. 2.5, 1.25, 5). */
export function roundTo(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

/** Format a weight stored in lb for display in the chosen unit. */
export function formatWeight(lb: number | null | undefined, units: 'lb' | 'kg', withUnit = false): string {
  if (lb == null || Number.isNaN(lb)) return '—'
  const v = units === 'kg' ? lbToKg(lb) : lb
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '')
  return withUnit ? `${s} ${units}` : s
}

/** Convert a display value (in chosen unit) to stored lb. */
export function toLb(display: number, units: 'lb' | 'kg'): number {
  return units === 'kg' ? kgToLb(display) : display
}
/** Convert stored lb to the display unit as a number. */
export function fromLb(lb: number, units: 'lb' | 'kg'): number {
  return units === 'kg' ? lbToKg(lb) : lb
}

/** Default smallest increment for the unit. */
export function unitStep(units: 'lb' | 'kg'): number {
  return units === 'kg' ? 1.25 : 2.5
}

export function formatVolume(lb: number, units: 'lb' | 'kg'): string {
  const v = units === 'kg' ? lbToKg(lb) : lb
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
  return String(Math.round(v))
}
