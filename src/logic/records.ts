import type { PrKind, Workout, WorkoutSet } from '@/db/types'

/** Epley estimated 1RM. Reps capped to keep the formula sane. */
export function e1rm(weightLb: number, reps: number): number {
  if (reps <= 0 || weightLb <= 0) return 0
  if (reps === 1) return weightLb
  return weightLb * (1 + Math.min(reps, 12) / 30)
}

export interface ExerciseRecords {
  bestWeightLb: number
  bestE1rmLb: number
  bestVolumeLb: number
  /** best reps achieved at each weight (lb) */
  repsAtWeight: Map<number, number>
}

export function isCountedSet(s: WorkoutSet): boolean {
  return s.done && s.type !== 'warmup' && s.reps != null && s.reps > 0
}

export function setVolume(s: WorkoutSet): number {
  if (!isCountedSet(s)) return 0
  return (s.weightLb ?? 0) * (s.reps ?? 0)
}

export function workoutVolume(w: Workout): number {
  return w.exercises.reduce((acc, ex) => acc + ex.sets.reduce((a, s) => a + setVolume(s), 0), 0)
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((acc, ex) => acc + ex.sets.filter(isCountedSet).length, 0)
}

/** Compute records for one exercise from prior (finished) workouts. */
export function computeRecords(workouts: Workout[], exerciseId: string): ExerciseRecords {
  const rec: ExerciseRecords = { bestWeightLb: 0, bestE1rmLb: 0, bestVolumeLb: 0, repsAtWeight: new Map() }
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      let vol = 0
      for (const s of ex.sets) {
        if (!isCountedSet(s)) continue
        const wt = s.weightLb ?? 0
        const reps = s.reps ?? 0
        vol += wt * reps
        if (wt > rec.bestWeightLb) rec.bestWeightLb = wt
        const e = e1rm(wt, reps)
        if (e > rec.bestE1rmLb) rec.bestE1rmLb = e
        const prev = rec.repsAtWeight.get(wt) ?? 0
        if (reps > prev) rec.repsAtWeight.set(wt, reps)
      }
      if (vol > rec.bestVolumeLb) rec.bestVolumeLb = vol
    }
  }
  return rec
}

/** Which PR kinds does this set achieve against the given records? (weight-based lifts only) */
export function detectSetPrs(set: WorkoutSet, rec: ExerciseRecords): PrKind[] {
  if (!isCountedSet(set)) return []
  const wt = set.weightLb ?? 0
  const reps = set.reps ?? 0
  if (wt <= 0) return []
  const out: PrKind[] = []
  if (wt > rec.bestWeightLb) out.push('weight')
  if (e1rm(wt, reps) > rec.bestE1rmLb + 0.01) out.push('e1rm')
  const prevReps = rec.repsAtWeight.get(wt)
  if (prevReps != null && reps > prevReps && !out.includes('weight')) out.push('reps')
  return out
}

/** Per-session best e1RM series for charts: [{t, e1rm, weight, volume}] */
export interface SessionPoint { t: number; e1rmLb: number; bestWeightLb: number; volumeLb: number; topSet: string }
export function sessionSeries(workouts: Workout[], exerciseId: string): SessionPoint[] {
  const pts: SessionPoint[] = []
  for (const w of workouts) {
    if (!w.endedAt) continue
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      let best = 0, bestW = 0, vol = 0, top = ''
      for (const s of ex.sets) {
        if (!isCountedSet(s)) continue
        const wt = s.weightLb ?? 0, reps = s.reps ?? 0
        vol += wt * reps
        const e = e1rm(wt, reps)
        if (e > best) { best = e; top = `${wt}×${reps}` }
        if (wt > bestW) bestW = wt
      }
      if (vol > 0 || best > 0) pts.push({ t: w.startedAt, e1rmLb: best, bestWeightLb: bestW, volumeLb: vol, topSet: top })
    }
  }
  return pts.sort((a, b) => a.t - b.t)
}
