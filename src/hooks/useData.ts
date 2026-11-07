import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/db/db'
import type { Exercise, Workout } from '@/db/types'

const EMPTY: never[] = []

export function useExercises(includeArchived = false): Exercise[] {
  const all = useLiveQuery(() => db.exercises.toArray(), [], EMPTY as Exercise[]) ?? EMPTY
  return useMemo(() => {
    const list = includeArchived ? all : all.filter((e) => !e.archived)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [all, includeArchived])
}

export function useExerciseMap(): Map<string, Exercise> {
  const all = useLiveQuery(() => db.exercises.toArray(), [], EMPTY as Exercise[]) ?? EMPTY
  return useMemo(() => new Map(all.map((e) => [e.id, e])), [all])
}

/** Finished workouts, newest first. */
export function useWorkouts(): Workout[] {
  const list = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray(), [], EMPTY as Workout[]) ?? EMPTY
  return useMemo(() => list.filter((w) => w.endedAt), [list])
}

export function useRoutines() {
  return useLiveQuery(() => db.routines.toArray(), [], EMPTY) ?? EMPTY
}
export function usePrograms() {
  return useLiveQuery(() => db.programs.toArray(), [], EMPTY) ?? EMPTY
}
export function useMeasurements() {
  return useLiveQuery(() => db.measurements.orderBy('date').toArray(), [], EMPTY) ?? EMPTY
}
