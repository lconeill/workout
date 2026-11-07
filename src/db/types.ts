export type Muscle =
  | 'chest' | 'back' | 'lats' | 'traps' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs' | 'lower_back' | 'full_body' | 'cardio'

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell'
  | 'band' | 'smith' | 'ez_bar' | 'trap_bar' | 'other'

export type ExerciseKind = 'weight_reps' | 'reps_only' | 'weighted_bodyweight' | 'duration'
export type ProgressionRule = 'double' | 'linear' | 'none'
export type SetType = 'warmup' | 'working' | 'drop' | 'failure'
export type PrKind = 'weight' | 'reps' | 'e1rm' | 'volume'
export type StandardKey =
  | 'squat' | 'bench' | 'deadlift' | 'ohp' | 'row' | 'front_squat'
  | 'incline_bench' | 'rdl' | 'pullup' | 'dip'

export interface RepRange { min: number; max: number }

export interface Exercise {
  id: string
  name: string
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
  equipment: Equipment
  kind: ExerciseKind
  incrementLb: number
  repRange: RepRange
  progressionRule: ProgressionRule
  standardKey?: StandardKey
  notes?: string
  isCustom: boolean
  archived: boolean
}

export interface RoutineSet { minReps: number; maxReps: number; targetRpe?: number; type: SetType }
export interface RoutineExercise {
  id: string
  exerciseId: string
  sets: RoutineSet[]
  restSec: number
  supersetGroup?: string
  notes?: string
}
export interface Routine {
  id: string
  name: string
  exercises: RoutineExercise[]
  isBuiltIn: boolean
  createdAt: number
  updatedAt: number
}

export interface Program {
  id: string
  name: string
  description: string
  routineIds: string[]
  isBuiltIn: boolean
}

export interface WorkoutSet {
  id: string
  type: SetType
  weightLb: number | null
  reps: number | null
  rpe?: number
  done: boolean
  pr?: PrKind[]
  targetMin?: number
  targetMax?: number
}
export interface WorkoutExercise {
  id: string
  exerciseId: string
  sets: WorkoutSet[]
  restSec: number
  supersetGroup?: string
  notes?: string
}
export interface Workout {
  id: string
  name: string
  routineId?: string
  startedAt: number
  endedAt?: number
  exercises: WorkoutExercise[]
  notes?: string
  bodyweightLb?: number
}

export interface Measurement {
  id: string
  date: string // YYYY-MM-DD
  bodyweightLb?: number
  bodyfatPct?: number
  custom?: Record<string, number>
}

export interface NutritionEntry {
  id: string
  date: string // YYYY-MM-DD
  time: number // ms
  label: string
  calories: number
  proteinG: number
  carbsG?: number
  fatG?: number
}
export interface QuickFood {
  id: string
  name: string
  calories: number
  proteinG: number
  carbsG?: number
  fatG?: number
  uses: number
}

export interface NutritionTargets { calories: number; proteinG: number; carbsG?: number; fatG?: number }

export interface Settings {
  id: 'settings'
  units: 'lb' | 'kg'
  sex: 'male' | 'female'
  barWeightLb: number
  platesLb: number[]
  defaultRestSec: number
  autoStartRest: boolean
  keepScreenOn: boolean
  theme: 'dark' | 'light' | 'system'
  failuresBeforeDeload: number
  deloadPct: number
  activeProgramId?: string
  programCursor: number
  nutritionTargets: NutritionTargets
  proteinPerLb?: number
  seedVersion: number
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  units: 'lb',
  sex: 'male',
  barWeightLb: 45,
  platesLb: [45, 35, 25, 10, 5, 2.5],
  defaultRestSec: 120,
  autoStartRest: true,
  keepScreenOn: true,
  theme: 'dark',
  failuresBeforeDeload: 2,
  deloadPct: 10,
  programCursor: 0,
  nutritionTargets: { calories: 2500, proteinG: 170 },
  seedVersion: 0,
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest', back: 'Back', lats: 'Lats', traps: 'Traps', shoulders: 'Shoulders',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', quads: 'Quads',
  hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', abs: 'Abs',
  lower_back: 'Lower back', full_body: 'Full body', cardio: 'Cardio',
}
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine', cable: 'Cable',
  bodyweight: 'Bodyweight', kettlebell: 'Kettlebell', band: 'Band', smith: 'Smith machine',
  ez_bar: 'EZ bar', trap_bar: 'Trap bar', other: 'Other',
}
