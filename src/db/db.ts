import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, Measurement, NutritionEntry, Program, QuickFood, Routine, Settings, Workout } from './types'

export class LiftDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  programs!: EntityTable<Program, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  nutritionEntries!: EntityTable<NutritionEntry, 'id'>
  quickFoods!: EntityTable<QuickFood, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'lift') {
    super(name)
    this.version(1).stores({
      exercises: 'id, name, primaryMuscle, equipment, isCustom, archived',
      routines: 'id, name, isBuiltIn, updatedAt',
      programs: 'id, name, isBuiltIn',
      workouts: 'id, startedAt, endedAt, routineId',
      measurements: 'id, date',
      nutritionEntries: 'id, date, time',
      quickFoods: 'id, name, uses',
      settings: 'id',
    })
  }
}

export const db = new LiftDB()
