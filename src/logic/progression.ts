import type { Exercise, ProgressionRule, Workout, WorkoutExercise, WorkoutSet } from '@/db/types'
import { isCountedSet } from './records'
import { roundTo } from './units'

export type SuggestionKind = 'first' | 'increase' | 'hold' | 'deload' | 'reps'

export interface Suggestion {
  kind: SuggestionKind
  weightLb: number | null
  reps: number | null
  reason: string
  /** Human summary of the last session, e.g. "3×12 @ 100 lb" */
  lastSummary?: string
  lastSets?: WorkoutSet[]
}

export interface ProgressionOptions {
  rule?: ProgressionRule
  repRange?: { min: number; max: number }
  incrementLb?: number
  failuresBeforeDeload?: number
  deloadPct?: number
}

interface Session { t: number; sets: WorkoutSet[] }

/** Chronological (oldest→newest) list of logged sessions for an exercise. */
export function sessionsFor(workouts: Workout[], exerciseId: string): Session[] {
  const out: Session[] = []
  for (const w of workouts) {
    if (!w.endedAt) continue
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      const sets = ex.sets.filter(isCountedSet)
      if (sets.length) out.push({ t: w.startedAt, sets })
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

function workingWeight(sets: WorkoutSet[]): number {
  // The weight used for most working sets (mode), ties → heaviest.
  const counts = new Map<number, number>()
  for (const s of sets) counts.set(s.weightLb ?? 0, (counts.get(s.weightLb ?? 0) ?? 0) + 1)
  let best = 0, bestN = -1
  for (const [w, n] of counts) if (n > bestN || (n === bestN && w > best)) { best = w; bestN = n }
  return best
}

export function summarize(sets: WorkoutSet[], fmtWeight: (lb: number) => string = (v) => `${v} lb`): string {
  if (!sets.length) return ''
  const w = workingWeight(sets)
  const atW = sets.filter((s) => (s.weightLb ?? 0) === w)
  const reps = atW.map((s) => s.reps ?? 0)
  const allSame = reps.every((r) => r === reps[0])
  const repStr = allSame ? `${reps.length}×${reps[0]}` : reps.join('/')
  return w > 0 ? `${repStr} @ ${fmtWeight(w)}` : repStr
}

/**
 * Decide what to do next for an exercise based on its history.
 * Pure: pass the finished workouts (any order) and the exercise.
 */
export function suggest(exercise: Exercise, workouts: Workout[], opts: ProgressionOptions = {}): Suggestion {
  const rule = opts.rule ?? exercise.progressionRule
  const range = opts.repRange ?? exercise.repRange
  const inc = opts.incrementLb ?? exercise.incrementLb
  const failuresBeforeDeload = opts.failuresBeforeDeload ?? 2
  const deloadPct = opts.deloadPct ?? 10

  const sessions = sessionsFor(workouts, exercise.id)
  if (!sessions.length) {
    return { kind: 'first', weightLb: null, reps: range.min, reason: 'First time — pick a weight you can do for the bottom of the rep range with 2 reps in reserve.' }
  }
  const last = sessions[sessions.length - 1]
  const lastSummary = summarize(last.sets)
  const base = { lastSummary, lastSets: last.sets }
  const W = workingWeight(last.sets)
  const working = last.sets.filter((s) => (s.weightLb ?? 0) === W)
  const minReps = Math.min(...working.map((s) => s.reps ?? 0))

  if (rule === 'none' || exercise.kind === 'duration') {
    return { ...base, kind: 'hold', weightLb: W || null, reps: working[0]?.reps ?? range.min, reason: 'Match last session.' }
  }

  // Count consecutive failed sessions (any working set below range.min at same weight)
  let failures = 0
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i]
    const w = workingWeight(s.sets)
    if (w !== W) break
    const failed = s.sets.filter((x) => (x.weightLb ?? 0) === w).some((x) => (x.reps ?? 0) < range.min)
    if (!failed) break
    failures++
  }

  const isBodyweightOnly = exercise.kind === 'reps_only' || (exercise.kind === 'weighted_bodyweight' && W === 0)

  if (failures >= failuresBeforeDeload) {
    if (isBodyweightOnly) {
      return { ...base, kind: 'hold', weightLb: W, reps: Math.max(1, range.min - 2), reason: `Missed the rep target ${failures} sessions in a row — drop a couple of reps per set and rebuild.` }
    }
    const step = inc > 0 ? inc : 2.5
    const deloaded = Math.max(0, roundTo(W * (1 - deloadPct / 100), step))
    return { ...base, kind: 'deload', weightLb: deloaded, reps: range.min, reason: `Missed ${range.min} reps on ${failures} sessions in a row — deload ${deloadPct}% and rebuild.` }
  }

  if (isBodyweightOnly) {
    const allTop = working.every((s) => (s.reps ?? 0) >= range.max)
    if (allTop) {
      return exercise.kind === 'weighted_bodyweight'
        ? { ...base, kind: 'increase', weightLb: inc > 0 ? inc : 5, reps: range.min, reason: `Hit ${range.max} reps on every set — add weight.` }
        : { ...base, kind: 'reps', weightLb: 0, reps: Math.min(...working.map((s) => s.reps ?? 0)) + 1, reason: `Hit the top of the range — add a rep per set or move to a harder variation.` }
    }
    return { ...base, kind: 'reps', weightLb: W, reps: Math.min(range.max, minReps + 1), reason: `Aim for one more rep per set (${minReps + 1}).` }
  }

  if (rule === 'linear') {
    if (failures > 0) {
      return { ...base, kind: 'hold', weightLb: W, reps: range.min, reason: `Missed reps last time — repeat ${W} lb.` }
    }
    return { ...base, kind: 'increase', weightLb: W + inc, reps: range.min, reason: `Completed all sets — add ${inc} lb.` }
  }

  // double progression
  const allTop = working.every((s) => (s.reps ?? 0) >= range.max)
  const rpeOk = working.every((s) => s.rpe == null || s.rpe <= 9)
  if (allTop && rpeOk) {
    return { ...base, kind: 'increase', weightLb: W + inc, reps: range.min, reason: `Hit ${range.max} reps on every set — add ${inc} lb and start again at ${range.min}.` }
  }
  if (failures > 0) {
    return { ...base, kind: 'hold', weightLb: W, reps: range.min, reason: `Below ${range.min} reps on a set — hold ${W} lb and chase ${range.min}+ on every set.` }
  }
  const target = Math.min(range.max, minReps + 1)
  return { ...base, kind: 'hold', weightLb: W, reps: target, reason: `Keep ${W} lb — push for ${target}+ reps on every set.` }
}

/** Build the next session's sets for a routine exercise from a suggestion. */
export function prefillSets(template: WorkoutExercise['sets'], s: Suggestion): WorkoutExercise['sets'] {
  return template.map((set) => {
    if (set.type === 'warmup') return set
    return { ...set, weightLb: s.weightLb, reps: s.reps ?? set.reps }
  })
}
