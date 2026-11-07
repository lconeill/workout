/** Plates per side needed to load `targetLb` on a bar of `barLb`, greedy by largest plate. */
export function platesPerSide(targetLb: number, barLb: number, availableLb: number[]): { plates: number[]; remainderLb: number } {
  let perSide = (targetLb - barLb) / 2
  if (perSide <= 0) return { plates: [], remainderLb: 0 }
  const plates: number[] = []
  for (const p of [...availableLb].sort((a, b) => b - a)) {
    while (perSide >= p - 1e-9) { plates.push(p); perSide -= p }
  }
  return { plates, remainderLb: Math.round(perSide * 2 * 100) / 100 }
}

/** Nearest loadable weight at or below target. */
export function nearestLoadable(targetLb: number, barLb: number, availableLb: number[]): number {
  const { plates } = platesPerSide(targetLb, barLb, availableLb)
  return barLb + 2 * plates.reduce((a, b) => a + b, 0)
}

/** Warm-up ramp: percentages of the working weight with suggested reps. */
export function warmupRamp(workingLb: number, barLb: number, step = 5): { weightLb: number; reps: number }[] {
  if (workingLb <= barLb) return []
  const pct = [
    { p: 0, reps: 10 }, { p: 0.5, reps: 5 }, { p: 0.7, reps: 3 }, { p: 0.85, reps: 1 },
  ]
  const out: { weightLb: number; reps: number }[] = []
  for (const { p, reps } of pct) {
    const w = p === 0 ? barLb : Math.max(barLb, Math.round((workingLb * p) / step) * step)
    if (w >= workingLb) continue
    if (out.length && out[out.length - 1].weightLb === w) continue
    out.push({ weightLb: w, reps })
  }
  return out
}
