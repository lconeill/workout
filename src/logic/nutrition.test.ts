import { describe, expect, it } from 'vitest'
import { creatineStreak, effectiveTargets, formatWater, latestBodyweight, rollingAverage, totalsFor, waterFromUnit } from './nutrition'
import type { NutritionEntry } from '@/db/types'

function e(date: string, calories: number, proteinG: number): NutritionEntry {
  return { id: date + calories, date, time: 0, label: 'x', calories, proteinG }
}

describe('nutrition', () => {
  it('totals a day', () => {
    expect(totalsFor([e('2026-11-07', 500, 40), e('2026-11-07', 700, 50)])).toMatchObject({ calories: 1200, proteinG: 90, count: 2 })
  })
  it('rolling average skips unlogged days', () => {
    const entries = [e('2026-11-07', 2000, 150), e('2026-11-05', 3000, 170)]
    const avg = rollingAverage(entries, '2026-11-07', 7)
    expect(avg.daysLogged).toBe(2)
    expect(avg.calories).toBe(2500)
    expect(avg.proteinG).toBe(160)
  })
  it('derives protein target from bodyweight when configured', () => {
    expect(effectiveTargets({ nutritionTargets: { calories: 2500, proteinG: 170 }, proteinPerLb: 0.8 }, 200).proteinG).toBe(160)
    expect(effectiveTargets({ nutritionTargets: { calories: 2500, proteinG: 170 }, proteinPerLb: 0.8 }, undefined).proteinG).toBe(170)
    expect(effectiveTargets({ nutritionTargets: { calories: 2500, proteinG: 170 } }, 200).proteinG).toBe(170)
  })
  it('creatine streak counts back from today, tolerating an unticked today', () => {
    const log = (date: string, creatine: boolean) => ({ date, creatine, waterMl: 0 })
    expect(creatineStreak([], '2026-11-10')).toBe(0)
    expect(creatineStreak([log('2026-11-10', true), log('2026-11-09', true), log('2026-11-08', true)], '2026-11-10')).toBe(3)
    expect(creatineStreak([log('2026-11-09', true), log('2026-11-08', true)], '2026-11-10')).toBe(2)
    expect(creatineStreak([log('2026-11-10', false), log('2026-11-09', true), log('2026-11-07', true)], '2026-11-10')).toBe(1)
    expect(creatineStreak([log('2026-11-08', true)], '2026-11-10')).toBe(0)
  })
  it('formats water in ml, L and oz', () => {
    expect(formatWater(750, 'ml')).toBe('750 ml')
    expect(formatWater(1000, 'ml')).toBe('1 L')
    expect(formatWater(1500, 'ml')).toBe('1.5 L')
    expect(formatWater(1250, 'ml')).toBe('1.25 L')
    expect(formatWater(3000, 'ml')).toBe('3 L')
    expect(formatWater(473, 'oz')).toBe('16 oz')
    expect(waterFromUnit(8, 'oz')).toBe(237)
    expect(waterFromUnit(250, 'ml')).toBe(250)
  })
  it('latest bodyweight by date', () => {
    expect(latestBodyweight([{ id: 'a', date: '2026-01-01', bodyweightLb: 180 }, { id: 'b', date: '2026-02-01', bodyweightLb: 182 }, { id: 'c', date: '2026-03-01' }])).toBe(182)
  })
})
