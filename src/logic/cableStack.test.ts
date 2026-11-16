import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Exercise, type Workout, type WorkoutSet } from '@/db/types'
import { addOnSums, cableLadder, decompose, formatSetup, nearestRung, nextRung, rungAtOrBelow, setupTotal, usesCableStack } from './cableStack'
import { suggest } from './progression'

const cfg = DEFAULT_SETTINGS.cableStack // base 6, 12/pin, 12 pins, add-ons 5, 2.5, 2.5

describe('cable stack', () => {
  it('add-on plates make 0–10 in 2.5 steps', () => {
    expect(addOnSums(cfg.addOnsLb)).toEqual([0, 2.5, 5, 7.5, 10])
  })
  it('ladder starts at pin 1 and tops out at pin 12 + 10', () => {
    const l = cableLadder(cfg)
    expect(l[0]).toBe(18)
    expect(l.slice(0, 6)).toEqual([18, 20.5, 23, 25.5, 28, 30])
    expect(l[l.length - 1]).toBe(160)
    expect(l.length).toBe(60)
  })
  it('decomposes totals back to pin + add-ons', () => {
    expect(decompose(47, cfg)).toMatchObject({ pin: 3, addLb: 5, plates: [5] })
    expect(decompose(49.5, cfg)).toMatchObject({ pin: 3, addLb: 7.5, plates: [5, 2.5] })
    expect(decompose(30, cfg)).toMatchObject({ pin: 2, addLb: 0, plates: [] })
    expect(decompose(29, cfg)).toBeNull()
    expect(decompose(6, cfg)).toBeNull() // pin 0 not used
  })
  it('formats setups', () => {
    expect(formatSetup(42, cfg)).toBe('P3')
    expect(formatSetup(44.5, cfg)).toBe('P3+2.5')
    expect(formatSetup(52, cfg)).toBe('P3+10')
    expect(formatSetup(50, cfg)).toBeNull()
    expect(setupTotal(3, [5, 2.5], cfg)).toBe(49.5)
  })
  it('steps along the ladder', () => {
    const l = cableLadder(cfg)
    expect(nextRung(42, l)).toBe(44.5)
    expect(nextRung(52, l)).toBe(54) // P3+10 → P4
    expect(nextRung(50, l)).toBe(52) // off-ladder history
    expect(nextRung(160, l)).toBe(160)
    expect(nearestRung(43, l)).toBe(42)
    expect(rungAtOrBelow(41, l)).toBe(40) // P2+10
    expect(rungAtOrBelow(5, l)).toBe(18)
  })
  it('defaults on for Cable equipment, overridable per exercise', () => {
    expect(usesCableStack({ equipment: 'cable' })).toBe(true)
    expect(usesCableStack({ equipment: 'machine' })).toBe(false)
    expect(usesCableStack({ equipment: 'cable', cableStack: false })).toBe(false)
    expect(usesCableStack({ equipment: 'other', cableStack: true })).toBe(true)
  })
})

describe('progression on the stack', () => {
  const curl: Exercise = {
    id: 'curl', name: 'Cable Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'cable', kind: 'weight_reps',
    incrementLb: 5, repRange: { min: 10, max: 15 }, progressionRule: 'double', isCustom: false, archived: false,
  }
  const ladder = cableLadder(cfg)
  const sets = (w: number, reps: number[]): WorkoutSet[] => reps.map((r, i) => ({ id: `${w}-${i}`, type: 'working', weightLb: w, reps: r, done: true }))
  const w = (s: WorkoutSet[], daysAgo: number): Workout => {
    const t = Date.now() - daysAgo * 86400000
    return { id: `w${t}`, name: 'W', startedAt: t, endedAt: t + 1, exercises: [{ id: 'x', exerciseId: 'curl', sets: s, restSec: 90 }] }
  }
  it('goes up one rung (2.5 lb), not the exercise increment', () => {
    const s = suggest(curl, [w(sets(42, [15, 15, 15]), 3)], { ladder })
    expect(s.weightLb).toBe(44.5)
    expect(s.reason).toContain('add 2.5 lb')
  })
  it('rolls over to the next pin', () => {
    const s = suggest(curl, [w(sets(52, [15, 15, 15]), 3)], { ladder })
    expect(s.weightLb).toBe(54)
    expect(s.reason).toContain('add 2 lb')
  })
  it('deloads onto a stack weight', () => {
    const s = suggest(curl, [w(sets(54, [8, 7]), 6), w(sets(54, [8, 6]), 3)], { ladder, deloadPct: 10 })
    expect(s.kind).toBe('deload')
    expect(s.weightLb).toBe(47) // 48.6 → P3+5
  })
})
