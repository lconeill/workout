import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { LiftDB } from './db'
import { ensureSeeded, SEED_VERSION } from './seed'
import { exportBackup, importBackup } from './backup'
import { SEED_EXERCISES } from '@/data/exercises'
import { SEED_ROUTINES } from '@/data/programs'

describe('seed + backup', () => {
  it('seeds once and is idempotent', async () => {
    const db = new LiftDB('test-seed')
    const s = await ensureSeeded(db)
    expect(s.seedVersion).toBe(SEED_VERSION)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
    await db.exercises.update('bench_press', { incrementLb: 10 })
    await ensureSeeded(db)
    expect((await db.exercises.get('bench_press'))!.incrementLb).toBe(10)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })
  it('every routine references a seeded exercise', () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id))
    for (const r of SEED_ROUTINES) for (const ex of r.exercises) expect(ids.has(ex.exerciseId), `${r.id}:${ex.exerciseId}`).toBe(true)
  })
  it('seed exercise ids are unique', () => {
    expect(new Set(SEED_EXERCISES.map((e) => e.id)).size).toBe(SEED_EXERCISES.length)
  })
  it('export → replace-import round trips', async () => {
    const a = new LiftDB('test-a')
    await ensureSeeded(a)
    await a.workouts.put({ id: 'w1', name: 'Push', startedAt: 1, endedAt: 2, exercises: [] })
    const file = await exportBackup(a)
    const b = new LiftDB('test-b')
    await importBackup(file, 'replace', b)
    expect(await b.workouts.count()).toBe(1)
    expect(await b.exercises.count()).toBe(SEED_EXERCISES.length)
  })
})
