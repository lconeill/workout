import type { Exercise, Routine, Settings, SetType, Workout, WorkoutExercise, WorkoutSet } from '@/db/types'
import { db } from '@/db/db'
import { LINEAR_PROGRAM_IDS } from '@/data/programs'
import { uid } from '@/logic/dates'
import { suggest, type Suggestion } from '@/logic/progression'
import { computeRecords, detectSetPrs, isCountedSet } from '@/logic/records'
import { createStore } from './tiny'
import { stopRest } from './restTimer'

interface ActiveState { workout: Workout | null; suggestions: Record<string, Suggestion> }
export const active = createStore<ActiveState>({ workout: null, suggestions: {} }, 'lift.active')

export function progressionOpts(settings: Settings, exercise: Exercise) {
  const linear = settings.activeProgramId && LINEAR_PROGRAM_IDS.has(settings.activeProgramId) && exercise.kind === 'weight_reps'
  return {
    rule: linear ? ('linear' as const) : undefined,
    failuresBeforeDeload: settings.failuresBeforeDeload,
    deloadPct: settings.deloadPct,
  }
}

function newSet(type: SetType, targetMin?: number, targetMax?: number): WorkoutSet {
  return { id: uid(), type, weightLb: null, reps: null, done: false, targetMin, targetMax }
}

/** Build a WorkoutExercise from an exercise + optional routine sets, prefilled from history. */
export function buildExercise(
  exercise: Exercise,
  routineSets: { minReps: number; maxReps: number; type: SetType }[] | null,
  history: Workout[],
  settings: Settings,
  restSec?: number,
  supersetGroup?: string,
): { we: WorkoutExercise; suggestion: Suggestion } {
  const range = routineSets?.find((s) => s.type === 'working') ?? null
  const suggestion = suggest(exercise, history, {
    ...progressionOpts(settings, exercise),
    repRange: range ? { min: range.minReps, max: range.maxReps } : undefined,
  })
  const template = routineSets ?? Array.from({ length: 3 }, () => ({ minReps: exercise.repRange.min, maxReps: exercise.repRange.max, type: 'working' as SetType }))
  const lastWorking = suggestion.lastSets ?? []
  const sets: WorkoutSet[] = template.map((t, i) => {
    const s = newSet(t.type, t.minReps, t.maxReps)
    if (t.type === 'warmup') return s
    // Prefill with suggestion weight; reps from suggestion (or last session's per-set reps if holding)
    s.weightLb = suggestion.weightLb
    const lastRep = lastWorking[i]?.reps
    s.reps = suggestion.kind === 'hold' && lastRep != null ? Math.max(lastRep, suggestion.reps ?? lastRep) : suggestion.reps
    if (exercise.kind === 'reps_only' || exercise.kind === 'duration') s.weightLb = 0
    return s
  })
  return {
    we: { id: uid(), exerciseId: exercise.id, sets, restSec: restSec ?? settings.defaultRestSec, supersetGroup },
    suggestion,
  }
}

export async function startWorkout(routine: Routine | null, name: string, exercises: Map<string, Exercise>, settings: Settings) {
  const history = (await db.workouts.where('startedAt').above(0).toArray()).filter((w) => w.endedAt)
  const w: Workout = { id: uid(), name, routineId: routine?.id, startedAt: Date.now(), exercises: [] }
  const suggestions: Record<string, Suggestion> = {}
  if (routine) {
    for (const re of routine.exercises) {
      const ex = exercises.get(re.exerciseId)
      if (!ex) continue
      const { we, suggestion } = buildExercise(ex, re.sets, history, settings, re.restSec, re.supersetGroup)
      we.notes = re.notes
      w.exercises.push(we)
      suggestions[we.id] = suggestion
    }
  }
  stopRest()
  active.set({ workout: w, suggestions })
}

export async function addExerciseToActive(exercise: Exercise, settings: Settings) {
  const history = (await db.workouts.where('startedAt').above(0).toArray()).filter((w) => w.endedAt)
  const { we, suggestion } = buildExercise(exercise, null, history, settings)
  active.set((s) => s.workout ? { workout: { ...s.workout, exercises: [...s.workout.exercises, we] }, suggestions: { ...s.suggestions, [we.id]: suggestion } } : s)
}

export function updateActive(fn: (w: Workout) => Workout) {
  active.set((s) => (s.workout ? { ...s, workout: fn(s.workout) } : s))
}

export function updateExercise(weId: string, fn: (we: WorkoutExercise) => WorkoutExercise) {
  updateActive((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === weId ? fn(e) : e)) }))
}

export function updateSet(weId: string, setId: string, patch: Partial<WorkoutSet>) {
  updateExercise(weId, (we) => ({ ...we, sets: we.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))
}

export function addSet(weId: string) {
  updateExercise(weId, (we) => {
    const last = [...we.sets].reverse().find((s) => s.type !== 'warmup') ?? we.sets[we.sets.length - 1]
    const s = newSet('working', last?.targetMin, last?.targetMax)
    s.weightLb = last?.weightLb ?? null
    s.reps = last?.reps ?? null
    return { ...we, sets: [...we.sets, s] }
  })
}

export function removeSet(weId: string, setId: string) {
  updateExercise(weId, (we) => ({ ...we, sets: we.sets.filter((s) => s.id !== setId) }))
}

export function removeExercise(weId: string) {
  active.set((s) => {
    if (!s.workout) return s
    const { [weId]: _drop, ...rest } = s.suggestions
    void _drop
    return { workout: { ...s.workout, exercises: s.workout.exercises.filter((e) => e.id !== weId) }, suggestions: rest }
  })
}

export function moveExercise(weId: string, dir: -1 | 1) {
  updateActive((w) => {
    const i = w.exercises.findIndex((e) => e.id === weId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= w.exercises.length) return w
    const arr = [...w.exercises]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    return { ...w, exercises: arr }
  })
}

export function discardWorkout() {
  stopRest()
  active.set({ workout: null, suggestions: {} })
}

export interface FinishSummary { workout: Workout; prCount: number; volumeLb: number; setCount: number }

/** Mark PRs, strip empty sets, persist, advance the program cursor. */
export async function finishWorkout(settings: Settings): Promise<FinishSummary | null> {
  const s = active.get()
  if (!s.workout) return null
  const history = (await db.workouts.where('startedAt').above(0).toArray()).filter((w) => w.endedAt && w.id !== s.workout!.id)
  let prCount = 0
  let volumeLb = 0
  let setCount = 0
  const exercises: WorkoutExercise[] = []
  for (const we of s.workout.exercises) {
    const sets = we.sets.filter((x) => x.done && (x.reps ?? 0) > 0)
    if (!sets.length) continue
    const rec = computeRecords(history, we.exerciseId)
    const marked = sets.map((x) => {
      if (!isCountedSet(x)) return { ...x, pr: undefined }
      const pr = detectSetPrs(x, rec)
      // update running records so a second PR set in the same session is judged against the first
      if (pr.includes('weight')) rec.bestWeightLb = x.weightLb ?? 0
      if (pr.includes('e1rm')) rec.bestE1rmLb = Math.max(rec.bestE1rmLb, (x.weightLb ?? 0) * (1 + Math.min(x.reps ?? 0, 12) / 30))
      if (pr.length) rec.repsAtWeight.set(x.weightLb ?? 0, x.reps ?? 0)
      if (pr.length) prCount++
      volumeLb += (x.weightLb ?? 0) * (x.reps ?? 0)
      setCount++
      return { ...x, pr: pr.length ? pr : undefined }
    })
    exercises.push({ ...we, sets: marked })
  }
  const workout: Workout = { ...s.workout, exercises, endedAt: Date.now() }
  await db.workouts.put(workout)
  if (settings.activeProgramId && workout.routineId) {
    const program = await db.programs.get(settings.activeProgramId)
    if (program) {
      const idx = program.routineIds.indexOf(workout.routineId)
      if (idx >= 0) await db.settings.update('settings', { programCursor: (idx + 1) % program.routineIds.length })
    }
  }
  stopRest()
  active.set({ workout: null, suggestions: {} })
  return { workout, prCount, volumeLb, setCount }
}
