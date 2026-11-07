import { db as defaultDb, type LiftDB } from './db'
import type { Workout } from './types'
import { isCountedSet } from '@/logic/records'

export interface BackupFile {
  app: 'lift'
  version: 1
  exportedAt: string
  exercises: unknown[]
  routines: unknown[]
  programs: unknown[]
  workouts: unknown[]
  measurements: unknown[]
  nutritionEntries: unknown[]
  quickFoods: unknown[]
  settings: unknown[]
}

export async function exportBackup(db: LiftDB = defaultDb): Promise<BackupFile> {
  const [exercises, routines, programs, workouts, measurements, nutritionEntries, quickFoods, settings] = await Promise.all([
    db.exercises.toArray(), db.routines.toArray(), db.programs.toArray(), db.workouts.toArray(),
    db.measurements.toArray(), db.nutritionEntries.toArray(), db.quickFoods.toArray(), db.settings.toArray(),
  ])
  return { app: 'lift', version: 1, exportedAt: new Date().toISOString(), exercises, routines, programs, workouts, measurements, nutritionEntries, quickFoods, settings }
}

export function isBackupFile(x: unknown): x is BackupFile {
  return !!x && typeof x === 'object' && (x as BackupFile).app === 'lift' && Array.isArray((x as BackupFile).workouts)
}

/** mode 'replace' wipes everything first; 'merge' upserts by id. */
export async function importBackup(file: BackupFile, mode: 'merge' | 'replace', db: LiftDB = defaultDb): Promise<void> {
  const tables = [db.exercises, db.routines, db.programs, db.workouts, db.measurements, db.nutritionEntries, db.quickFoods, db.settings]
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') for (const t of tables) await t.clear()
    await db.exercises.bulkPut(file.exercises as never[])
    await db.routines.bulkPut(file.routines as never[])
    await db.programs.bulkPut(file.programs as never[])
    await db.workouts.bulkPut(file.workouts as never[])
    await db.measurements.bulkPut(file.measurements as never[])
    await db.nutritionEntries.bulkPut(file.nutritionEntries as never[])
    await db.quickFoods.bulkPut((file.quickFoods ?? []) as never[])
    if (file.settings?.length) await db.settings.bulkPut(file.settings as never[])
  })
}

/** Flat CSV of every logged set. */
export function workoutsToCsv(workouts: Workout[], exerciseNames: Map<string, string>): string {
  const rows = [['date', 'workout', 'exercise', 'set', 'type', 'weight_lb', 'reps', 'rpe']]
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    const date = new Date(w.startedAt).toISOString()
    for (const ex of w.exercises) {
      let i = 0
      for (const s of ex.sets) {
        if (!isCountedSet(s) && s.type !== 'warmup') continue
        i++
        rows.push([date, w.name, exerciseNames.get(ex.exerciseId) ?? ex.exerciseId, String(i), s.type, String(s.weightLb ?? ''), String(s.reps ?? ''), String(s.rpe ?? '')])
      }
    }
  }
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n')
}
