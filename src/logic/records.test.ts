import { describe, expect, it } from 'vitest'
import { computeRecords, detectSetPrs, e1rm, sessionSeries, workoutVolume } from './records'
import type { Workout, WorkoutSet } from '@/db/types'

function set(weightLb: number, reps: number, type: WorkoutSet['type'] = 'working', done = true): WorkoutSet {
  return { id: `${weightLb}x${reps}${Math.random()}`, type, weightLb, reps, done }
}
function w(sets: WorkoutSet[], t: number): Workout {
  return { id: `w${t}`, name: 'W', startedAt: t, endedAt: t + 1, exercises: [{ id: 'x', exerciseId: 'bench', sets, restSec: 60 }] }
}

describe('e1rm', () => {
  it('uses Epley and caps reps', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1)
    expect(e1rm(100, 20)).toBe(e1rm(100, 12))
    expect(e1rm(0, 5)).toBe(0)
  })
})

describe('records + PRs', () => {
  const hist = [w([set(45, 10, 'warmup'), set(100, 10), set(100, 8)], 1), w([set(110, 5), set(110, 5)], 2)]
  const rec = computeRecords(hist, 'bench')
  it('computes best weight, e1rm, volume and reps-at-weight', () => {
    expect(rec.bestWeightLb).toBe(110)
    expect(rec.bestE1rmLb).toBeCloseTo(e1rm(100, 10), 5)
    expect(rec.bestVolumeLb).toBe(1800)
    expect(rec.repsAtWeight.get(100)).toBe(10)
    expect(rec.repsAtWeight.get(45)).toBeUndefined()
  })
  it('detects weight, e1rm and reps PRs', () => {
    expect(detectSetPrs(set(115, 3), rec)).toEqual(['weight'])
    expect(detectSetPrs(set(100, 12), rec)).toEqual(['e1rm', 'reps'])
    expect(detectSetPrs(set(110, 6), rec)).toEqual(['reps'])
    expect(detectSetPrs(set(110, 8), rec)).toEqual(['e1rm', 'reps'])
    expect(detectSetPrs(set(100, 8), rec)).toEqual([])
    expect(detectSetPrs(set(100, 12, 'warmup'), rec)).toEqual([])
    expect(detectSetPrs(set(100, 12, 'working', false), rec)).toEqual([])
  })
  it('volume ignores warm-ups and undone sets', () => {
    expect(workoutVolume(w([set(45, 10, 'warmup'), set(100, 10), set(100, 10, 'working', false)], 1))).toBe(1000)
  })
  it('series is chronological with top set', () => {
    const s = sessionSeries(hist, 'bench')
    expect(s.map((p) => p.t)).toEqual([1, 2])
    expect(s[0].topSet).toBe('100×10')
  })
})
