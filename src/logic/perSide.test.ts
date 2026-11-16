import { describe, expect, it } from 'vitest'
import type { Workout } from '@/db/types'
import { isPerSide, workoutVolume } from './records'
import { backupDue } from '@/db/backupFlow'

describe('per-side exercises', () => {
  it('uses the built-in list, then the name, unless overridden', () => {
    expect(isPerSide({ id: 'cable_lateral_raise', name: 'Cable Lateral Raise' })).toBe(true)
    expect(isPerSide({ id: 'lateral_raise', name: 'Lateral Raise' })).toBe(false)
    expect(isPerSide({ id: 'x1', name: 'Single-Arm Cable Row' })).toBe(true)
    expect(isPerSide({ id: 'x2', name: 'one arm db row' })).toBe(true)
    expect(isPerSide({ id: 'x3', name: 'Singles Bench' })).toBe(false)
    expect(isPerSide({ id: 'cable_kickback', name: 'Cable Kickback', perSide: false })).toBe(false)
    expect(isPerSide({ id: 'cable_curl', name: 'Cable Curl', perSide: true })).toBe(true)
  })
  it('doubles volume for per-side exercises only', () => {
    const set = (w: number, r: number) => ({ id: `${w}${r}`, type: 'working' as const, weightLb: w, reps: r, done: true })
    const w: Workout = { id: 'w', name: 'W', startedAt: 0, endedAt: 1, exercises: [
      { id: 'a', exerciseId: 'cable_lateral_raise', sets: [set(20.5, 12)], restSec: 60 },
      { id: 'b', exerciseId: 'cable_curl', sets: [set(42, 10)], restSec: 60 },
    ] }
    expect(workoutVolume(w)).toBe(246 + 420)
    expect(workoutVolume(w, (id) => (id === 'cable_lateral_raise' ? 2 : 1))).toBe(492 + 420)
  })
})

describe('backup reminder', () => {
  const day = 86400000
  const now = 100 * day
  it('stays quiet with no workouts', () => expect(backupDue(now, undefined)).toBeNull())
  it('nags a week after the first workout if never backed up', () => {
    expect(backupDue(now, now - 6 * day)).toBeNull()
    expect(backupDue(now, now - 9 * day)).toBe(9)
  })
  it('counts from the last backup and respects snooze', () => {
    expect(backupDue(now, now - 60 * day, now - 3 * day)).toBeNull()
    expect(backupDue(now, now - 60 * day, now - 8 * day)).toBe(8)
    expect(backupDue(now, now - 60 * day, now - 8 * day, now + day)).toBeNull()
  })
})
