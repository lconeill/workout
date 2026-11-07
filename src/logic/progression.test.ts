import { describe, expect, it } from 'vitest'
import { suggest, summarize } from './progression'
import type { Exercise, Workout, WorkoutSet } from '@/db/types'

const bench: Exercise = {
  id: 'bench', name: 'Bench', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'barbell', kind: 'weight_reps',
  incrementLb: 5, repRange: { min: 8, max: 12 }, progressionRule: 'double', isCustom: false, archived: false,
}
const pushup: Exercise = { ...bench, id: 'pushup', kind: 'reps_only', incrementLb: 0, repRange: { min: 10, max: 20 } }
const pullup: Exercise = { ...bench, id: 'pullup', kind: 'weighted_bodyweight', incrementLb: 5, repRange: { min: 5, max: 10 } }

let n = 0
function set(weightLb: number, reps: number, type: WorkoutSet['type'] = 'working', rpe?: number): WorkoutSet {
  return { id: String(++n), type, weightLb, reps, done: true, rpe }
}
function session(exerciseId: string, sets: WorkoutSet[], daysAgo: number): Workout {
  const t = Date.now() - daysAgo * 86400000
  return { id: `w${t}`, name: 'W', startedAt: t, endedAt: t + 3600000, exercises: [{ id: 'x', exerciseId, sets, restSec: 90 }] }
}

describe('double progression', () => {
  it('first session has no weight', () => {
    const s = suggest(bench, [])
    expect(s.kind).toBe('first')
    expect(s.weightLb).toBeNull()
    expect(s.reps).toBe(8)
  })
  it('increases when all working sets hit the top of the range', () => {
    const s = suggest(bench, [session('bench', [set(100, 12), set(100, 12), set(100, 12)], 3)])
    expect(s.kind).toBe('increase')
    expect(s.weightLb).toBe(105)
    expect(s.reps).toBe(8)
    expect(s.lastSummary).toBe('3×12 @ 100 lb')
  })
  it('ignores warm-up sets', () => {
    const s = suggest(bench, [session('bench', [set(45, 10, 'warmup'), set(100, 12), set(100, 12)], 3)])
    expect(s.kind).toBe('increase')
    expect(s.weightLb).toBe(105)
  })
  it('holds and asks for more reps when inside the range', () => {
    const s = suggest(bench, [session('bench', [set(100, 12), set(100, 10), set(100, 9)], 3)])
    expect(s.kind).toBe('hold')
    expect(s.weightLb).toBe(100)
    expect(s.reps).toBe(10)
  })
  it('holds (no increase) when RPE is 10 on a top set', () => {
    const s = suggest(bench, [session('bench', [set(100, 12, 'working', 10), set(100, 12), set(100, 12)], 3)])
    expect(s.kind).toBe('hold')
  })
  it('holds after one failed session, deloads after two', () => {
    const one = suggest(bench, [session('bench', [set(100, 7), set(100, 6)], 3)])
    expect(one.kind).toBe('hold')
    const two = suggest(bench, [
      session('bench', [set(100, 7), set(100, 6)], 6),
      session('bench', [set(100, 7), set(100, 5)], 3),
    ])
    expect(two.kind).toBe('deload')
    expect(two.weightLb).toBe(90)
  })
  it('resets the failure streak when the weight changes', () => {
    const s = suggest(bench, [
      session('bench', [set(95, 7)], 9),
      session('bench', [set(100, 7)], 3),
    ])
    expect(s.kind).toBe('hold')
  })
  it('uses the most recent session regardless of input order', () => {
    const s = suggest(bench, [
      session('bench', [set(100, 12), set(100, 12)], 1),
      session('bench', [set(90, 12), set(90, 12)], 10),
    ])
    expect(s.weightLb).toBe(105)
  })
  it('respects per-exercise overrides', () => {
    const s = suggest(bench, [session('bench', [set(100, 12), set(100, 12)], 1)], { incrementLb: 10, deloadPct: 20 })
    expect(s.weightLb).toBe(110)
  })
})

describe('linear progression', () => {
  const sq: Exercise = { ...bench, id: 'squat', progressionRule: 'linear', repRange: { min: 5, max: 5 } }
  it('adds weight after a completed session', () => {
    const s = suggest(sq, [session('squat', [set(200, 5), set(200, 5), set(200, 5)], 2)])
    expect(s.kind).toBe('increase')
    expect(s.weightLb).toBe(205)
  })
  it('repeats after a miss, deloads after the configured number of misses', () => {
    expect(suggest(sq, [session('squat', [set(200, 5), set(200, 4)], 2)]).kind).toBe('hold')
    const d = suggest(sq, [session('squat', [set(200, 4)], 5), session('squat', [set(200, 4)], 2)], { failuresBeforeDeload: 2 })
    expect(d.kind).toBe('deload')
    expect(d.weightLb).toBe(180)
  })
})

describe('bodyweight progression', () => {
  it('asks for one more rep when inside the range', () => {
    const s = suggest(pushup, [session('pushup', [set(0, 15), set(0, 12)], 2)])
    expect(s.kind).toBe('reps')
    expect(s.reps).toBe(13)
  })
  it('suggests harder variation at the top of the range', () => {
    const s = suggest(pushup, [session('pushup', [set(0, 20), set(0, 20)], 2)])
    expect(s.kind).toBe('reps')
    expect(s.reason).toMatch(/harder variation/)
  })
  it('suggests adding weight to weighted bodyweight moves at the top of the range', () => {
    const s = suggest(pullup, [session('pullup', [set(0, 10), set(0, 10)], 2)])
    expect(s.kind).toBe('increase')
    expect(s.weightLb).toBe(5)
  })
  it('then runs double progression on the added weight', () => {
    const s = suggest(pullup, [session('pullup', [set(10, 10), set(10, 10)], 2)])
    expect(s.weightLb).toBe(15)
  })
})

describe('summarize', () => {
  it('collapses equal reps and lists unequal ones', () => {
    expect(summarize([set(100, 10), set(100, 10)])).toBe('2×10 @ 100 lb')
    expect(summarize([set(100, 10), set(100, 8)])).toBe('10/8 @ 100 lb')
    expect(summarize([set(0, 10), set(0, 10)])).toBe('2×10')
  })
})
