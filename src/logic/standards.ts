import { BW_BREAKPOINTS_LB, LEVELS, getTable, type Level } from '@/data/standards'
import type { StandardKey } from '@/db/types'
import { lbToKg } from './units'

export interface StandardResult {
  level: Level | null // null = below Beginner
  levelIndex: number // -1 .. 4
  /** 0..1 progress from current level threshold to next level threshold */
  progress: number
  nextLevel: Level | null
  nextThresholdLb: number | null
  thresholdsLb: number[]
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

/** Thresholds (lb) for the five levels at an arbitrary bodyweight, interpolated. */
export function thresholdsAt(key: StandardKey, sex: 'male' | 'female', bodyweightLb: number): number[] {
  const table = getTable(key, sex)
  const bps = BW_BREAKPOINTS_LB
  if (bodyweightLb <= bps[0]) return table[0]
  if (bodyweightLb >= bps[bps.length - 1]) return table[table.length - 1]
  let i = 0
  while (bps[i + 1] < bodyweightLb) i++
  const t = (bodyweightLb - bps[i]) / (bps[i + 1] - bps[i])
  return table[i].map((v, c) => Math.round(lerp(v, table[i + 1][c], t)))
}

export function rateLift(key: StandardKey, sex: 'male' | 'female', bodyweightLb: number, oneRmLb: number): StandardResult {
  const th = thresholdsAt(key, sex, bodyweightLb)
  let idx = -1
  for (let i = 0; i < th.length; i++) if (oneRmLb >= th[i]) idx = i
  const next = idx + 1 < th.length ? idx + 1 : null
  let progress: number
  if (next == null) progress = 1
  else {
    const lo = idx >= 0 ? th[idx] : 0
    const hi = th[next]
    progress = hi > lo ? Math.max(0, Math.min(1, (oneRmLb - lo) / (hi - lo))) : 1
  }
  return {
    level: idx >= 0 ? LEVELS[idx] : null,
    levelIndex: idx,
    progress,
    nextLevel: next != null ? LEVELS[next] : null,
    nextThresholdLb: next != null ? th[next] : null,
    thresholdsLb: th,
  }
}

/** DOTS score for squat+bench+deadlift totals. Inputs in lb. */
export function dotsScore(totalLb: number, bodyweightLb: number, sex: 'male' | 'female'): number {
  const bw = Math.min(Math.max(lbToKg(bodyweightLb), 40), sex === 'male' ? 210 : 150)
  const c = sex === 'male'
    ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
    : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]
  const denom = c[0] + c[1] * bw + c[2] * bw ** 2 + c[3] * bw ** 3 + c[4] * bw ** 4
  return (lbToKg(totalLb) * 500) / denom
}

export function dotsLabel(score: number): string {
  if (score >= 500) return 'Elite'
  if (score >= 400) return 'Advanced'
  if (score >= 300) return 'Intermediate'
  if (score >= 200) return 'Novice'
  return 'Beginner'
}
