import type { Measurement, NutritionEntry, NutritionTargets, Settings } from '@/db/types'
import { addDays } from './dates'

export interface DayTotals { calories: number; proteinG: number; carbsG: number; fatG: number; count: number }

export function totalsFor(entries: NutritionEntry[]): DayTotals {
  const t: DayTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 }
  for (const e of entries) {
    t.calories += e.calories || 0
    t.proteinG += e.proteinG || 0
    t.carbsG += e.carbsG || 0
    t.fatG += e.fatG || 0
    t.count++
  }
  return t
}

/** Group entries by day key. */
export function groupByDay(entries: NutritionEntry[]): Map<string, NutritionEntry[]> {
  const m = new Map<string, NutritionEntry[]>()
  for (const e of entries) {
    const arr = m.get(e.date) ?? []
    arr.push(e)
    m.set(e.date, arr)
  }
  return m
}

/** Average over the last `days` days ending at `endKey` (inclusive). Days with no entries are skipped. */
export function rollingAverage(entries: NutritionEntry[], endKey: string, days: number): DayTotals & { daysLogged: number } {
  const byDay = groupByDay(entries)
  const acc: DayTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 }
  let logged = 0
  for (let i = 0; i < days; i++) {
    const k = addDays(endKey, -i)
    const d = byDay.get(k)
    if (!d || !d.length) continue
    const t = totalsFor(d)
    acc.calories += t.calories; acc.proteinG += t.proteinG; acc.carbsG += t.carbsG; acc.fatG += t.fatG; acc.count += t.count
    logged++
  }
  const n = Math.max(1, logged)
  return {
    calories: acc.calories / n, proteinG: acc.proteinG / n, carbsG: acc.carbsG / n, fatG: acc.fatG / n,
    count: acc.count, daysLogged: logged,
  }
}

/** Effective targets: protein may be derived from latest bodyweight. */
export function effectiveTargets(settings: Pick<Settings, 'nutritionTargets' | 'proteinPerLb'>, latestBodyweightLb?: number): NutritionTargets {
  const t = { ...settings.nutritionTargets }
  if (settings.proteinPerLb && latestBodyweightLb) {
    t.proteinG = Math.round(settings.proteinPerLb * latestBodyweightLb)
  }
  return t
}

export function latestBodyweight(measurements: Measurement[]): number | undefined {
  const withBw = measurements.filter((m) => m.bodyweightLb != null).sort((a, b) => (a.date < b.date ? 1 : -1))
  return withBw[0]?.bodyweightLb
}
