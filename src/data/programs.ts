import type { Program, Routine, RoutineExercise, RoutineSet, SetType } from '@/db/types'

function sets(n: number, min: number, max: number, warmups = 0): RoutineSet[] {
  const out: RoutineSet[] = []
  for (let i = 0; i < warmups; i++) out.push({ minReps: min, maxReps: max, type: 'warmup' as SetType })
  for (let i = 0; i < n; i++) out.push({ minReps: min, maxReps: max, type: 'working' })
  return out
}
function ex(exerciseId: string, n: number, min: number, max: number, restSec = 120, warmups = 0, supersetGroup?: string): RoutineExercise {
  return { id: `${exerciseId}_${n}x${min}-${max}`, exerciseId, sets: sets(n, min, max, warmups), restSec, supersetGroup }
}
const T0 = 0
function routine(id: string, name: string, exercises: RoutineExercise[]): Routine {
  return { id, name, exercises, isBuiltIn: true, createdAt: T0, updatedAt: T0 }
}

export const SEED_ROUTINES: Routine[] = [
  // ---- Push / Pull / Legs
  routine('ppl_push', 'Push', [
    ex('bench_press', 3, 5, 8, 180, 2),
    ex('overhead_press', 3, 6, 10, 150, 1),
    ex('db_incline_press', 3, 8, 12, 120),
    ex('cable_fly', 3, 12, 15, 75),
    ex('lateral_raise', 3, 12, 15, 60),
    ex('triceps_pushdown', 3, 10, 15, 60),
    ex('overhead_triceps_extension', 3, 10, 15, 60),
  ]),
  routine('ppl_pull', 'Pull', [
    ex('deadlift', 3, 3, 6, 210, 2),
    ex('pull_up', 3, 5, 10, 150),
    ex('barbell_row', 3, 6, 10, 150),
    ex('seated_cable_row', 3, 8, 12, 90),
    ex('face_pull', 3, 12, 20, 60),
    ex('ez_bar_curl', 3, 8, 12, 60),
    ex('hammer_curl', 3, 10, 12, 60),
  ]),
  routine('ppl_legs', 'Legs', [
    ex('squat', 3, 5, 8, 210, 2),
    ex('romanian_deadlift', 3, 6, 10, 150),
    ex('leg_press', 3, 8, 12, 120),
    ex('lying_leg_curl', 3, 10, 15, 75),
    ex('leg_extension', 3, 10, 15, 75),
    ex('standing_calf_raise', 4, 10, 15, 60),
    ex('cable_crunch', 3, 10, 15, 60),
  ]),
  // ---- Upper / Lower
  routine('ul_upper_a', 'Upper A', [
    ex('bench_press', 4, 5, 8, 180, 2),
    ex('barbell_row', 4, 6, 10, 150, 1),
    ex('overhead_press', 3, 6, 10, 120),
    ex('lat_pulldown', 3, 8, 12, 90),
    ex('db_curl', 3, 8, 12, 60, 0, 'A'),
    ex('skull_crusher', 3, 8, 12, 60, 0, 'A'),
  ]),
  routine('ul_lower_a', 'Lower A', [
    ex('squat', 4, 5, 8, 210, 2),
    ex('romanian_deadlift', 3, 6, 10, 150),
    ex('leg_press', 3, 8, 12, 120),
    ex('lying_leg_curl', 3, 10, 15, 75),
    ex('standing_calf_raise', 4, 10, 15, 60),
    ex('hanging_leg_raise', 3, 8, 15, 60),
  ]),
  routine('ul_upper_b', 'Upper B', [
    ex('db_incline_press', 4, 8, 12, 120, 1),
    ex('pull_up', 4, 5, 10, 150),
    ex('db_shoulder_press', 3, 8, 12, 120),
    ex('chest_supported_row', 3, 8, 12, 90),
    ex('lateral_raise', 3, 12, 15, 60, 0, 'B'),
    ex('face_pull', 3, 12, 20, 60, 0, 'B'),
    ex('hammer_curl', 3, 10, 12, 60, 0, 'C'),
    ex('rope_pushdown', 3, 10, 15, 60, 0, 'C'),
  ]),
  routine('ul_lower_b', 'Lower B', [
    ex('deadlift', 3, 3, 6, 210, 2),
    ex('front_squat', 3, 5, 8, 180, 1),
    ex('bulgarian_split_squat', 3, 8, 12, 90),
    ex('seated_leg_curl', 3, 10, 15, 75),
    ex('seated_calf_raise', 4, 12, 20, 60),
    ex('ab_wheel_rollout', 3, 8, 12, 60),
  ]),
  // ---- Full body 3x
  routine('fb_a', 'Full Body A', [
    ex('squat', 3, 5, 8, 180, 2),
    ex('bench_press', 3, 5, 8, 180, 1),
    ex('barbell_row', 3, 6, 10, 150),
    ex('lateral_raise', 3, 12, 15, 60),
    ex('ez_bar_curl', 2, 8, 12, 60),
    ex('plank', 3, 30, 60, 60),
  ]),
  routine('fb_b', 'Full Body B', [
    ex('deadlift', 3, 3, 6, 210, 2),
    ex('overhead_press', 3, 6, 10, 150, 1),
    ex('lat_pulldown', 3, 8, 12, 90),
    ex('leg_press', 3, 8, 12, 120),
    ex('triceps_pushdown', 2, 10, 15, 60),
    ex('hanging_knee_raise', 3, 10, 15, 60),
  ]),
  routine('fb_c', 'Full Body C', [
    ex('front_squat', 3, 5, 8, 180, 1),
    ex('db_incline_press', 3, 8, 12, 120),
    ex('pull_up', 3, 5, 10, 150),
    ex('romanian_deadlift', 3, 6, 10, 150),
    ex('face_pull', 3, 12, 20, 60),
    ex('hammer_curl', 2, 10, 12, 60),
  ]),
  // ---- 5x5
  routine('sl_a', '5×5 Workout A', [
    ex('squat', 5, 5, 5, 180, 2),
    ex('bench_press', 5, 5, 5, 180, 2),
    ex('barbell_row', 5, 5, 5, 180, 1),
  ]),
  routine('sl_b', '5×5 Workout B', [
    ex('squat', 5, 5, 5, 180, 2),
    ex('overhead_press', 5, 5, 5, 180, 2),
    ex('deadlift', 1, 5, 5, 180, 2),
  ]),
]

export const SEED_PROGRAMS: Program[] = [
  { id: 'ppl', name: 'Push / Pull / Legs', description: '3-day rotation. Hypertrophy-focused with a heavy compound to open each day. Run it 3–6 days per week.', routineIds: ['ppl_push', 'ppl_pull', 'ppl_legs'], isBuiltIn: true },
  { id: 'upper_lower', name: 'Upper / Lower', description: '4-day split with two upper and two lower days. Strength on A days, volume on B days.', routineIds: ['ul_upper_a', 'ul_lower_a', 'ul_upper_b', 'ul_lower_b'], isBuiltIn: true },
  { id: 'full_body', name: 'Full Body 3×', description: 'Three full-body sessions per week. Great for beginners or busy weeks.', routineIds: ['fb_a', 'fb_b', 'fb_c'], isBuiltIn: true },
  { id: 'five_by_five', name: '5×5 Linear', description: 'Classic A/B linear progression. Add weight every session; deload after repeated misses.', routineIds: ['sl_a', 'sl_b'], isBuiltIn: true },
]

/** Exercises that use linear progression when run inside the 5x5 program. */
export const LINEAR_PROGRAM_IDS = new Set(['five_by_five'])
