import { SEED_EXERCISES } from '@/data/exercises'
import { SEED_PROGRAMS, SEED_ROUTINES } from '@/data/programs'
import { DEFAULT_SETTINGS, type Settings } from './types'
import { db as defaultDb, type LiftDB } from './db'

export const SEED_VERSION = 1

/**
 * Seed built-in exercises/routines/programs. Idempotent: adds anything missing,
 * never overwrites user-edited rows (built-ins keep their ids so re-seeds are no-ops).
 */
export async function ensureSeeded(db: LiftDB = defaultDb): Promise<Settings> {
  return db.transaction('rw', db.exercises, db.routines, db.programs, db.settings, async () => {
    let settings = await db.settings.get('settings')
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS }
      await db.settings.put(settings)
    }
    if (settings.seedVersion >= SEED_VERSION) return settings

    const haveEx = new Set((await db.exercises.toCollection().primaryKeys()) as string[])
    await db.exercises.bulkAdd(SEED_EXERCISES.filter((e) => !haveEx.has(e.id)))
    const haveR = new Set((await db.routines.toCollection().primaryKeys()) as string[])
    await db.routines.bulkAdd(SEED_ROUTINES.filter((r) => !haveR.has(r.id)))
    const haveP = new Set((await db.programs.toCollection().primaryKeys()) as string[])
    await db.programs.bulkAdd(SEED_PROGRAMS.filter((p) => !haveP.has(p.id)))

    settings = { ...settings, seedVersion: SEED_VERSION }
    await db.settings.put(settings)
    return settings
  })
}
