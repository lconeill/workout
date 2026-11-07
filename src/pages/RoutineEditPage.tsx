import { ArrowDown, ArrowUp, Link2, Minus, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/ui/PageHeader'
import { NumberField } from '@/components/ui/NumberField'
import { ExercisePicker } from '@/components/ExercisePicker'
import { db } from '@/db/db'
import type { Routine, RoutineExercise, RoutineSet } from '@/db/types'
import { useExerciseMap } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { uid } from '@/logic/dates'
import { startWorkout } from '@/store/activeWorkout'

export default function RoutineEditPage() {
  const { id } = useParams()
  const routine = useLiveQuery(() => db.routines.get(id!), [id])
  const exMap = useExerciseMap()
  const settings = useSettings()
  const nav = useNavigate()
  const [picker, setPicker] = useState(false)
  if (!routine) return <div className="p-8 text-center text-muted">Loading…</div>

  const save = (fn: (r: Routine) => Routine) => db.routines.put({ ...fn(routine), updatedAt: Date.now() })
  const updateEx = (eid: string, fn: (e: RoutineExercise) => RoutineExercise) => save((r) => ({ ...r, exercises: r.exercises.map((e) => (e.id === eid ? fn(e) : e)) }))
  const move = (i: number, d: -1 | 1) => save((r) => { const a = [...r.exercises]; const j = i + d; if (j < 0 || j >= a.length) return r; [a[i], a[j]] = [a[j], a[i]]; return { ...r, exercises: a } })
  const setCount = (e: RoutineExercise, n: number) => {
    const working = e.sets.filter((s) => s.type === 'working')
    const others = e.sets.filter((s) => s.type !== 'working')
    const tmpl: RoutineSet = working[0] ?? { minReps: 8, maxReps: 12, type: 'working' }
    const next = Array.from({ length: Math.max(1, n) }, (_, i) => working[i] ?? { ...tmpl })
    updateEx(e.id, (x) => ({ ...x, sets: [...others, ...next] }))
  }
  const setRange = (e: RoutineExercise, k: 'minReps' | 'maxReps', v: number | null) => {
    if (v == null) return
    updateEx(e.id, (x) => ({ ...x, sets: x.sets.map((s) => (s.type === 'working' ? { ...s, [k]: v, ...(k === 'minReps' && v > s.maxReps ? { maxReps: v } : {}), ...(k === 'maxReps' && v < s.minReps ? { minReps: v } : {}) } : s)) }))
  }
  const setWarmups = (e: RoutineExercise, n: number) => {
    const working = e.sets.filter((s) => s.type !== 'warmup')
    const w = working[0] ?? { minReps: 8, maxReps: 12, type: 'working' as const }
    updateEx(e.id, (x) => ({ ...x, sets: [...Array.from({ length: Math.max(0, n) }, () => ({ ...w, type: 'warmup' as const })), ...working] }))
  }
  const toggleSuperset = (i: number) => {
    // Link with the next exercise: share a group letter.
    save((r) => {
      const a = r.exercises.map((e) => ({ ...e }))
      const cur = a[i], next = a[i + 1]
      if (!next) return r
      if (cur.supersetGroup && cur.supersetGroup === next.supersetGroup) { next.supersetGroup = undefined; if (!a[i - 1] || a[i - 1].supersetGroup !== cur.supersetGroup) cur.supersetGroup = undefined }
      else { const g = cur.supersetGroup ?? String.fromCharCode(65 + a.filter((e) => e.supersetGroup).length); cur.supersetGroup = g; next.supersetGroup = g }
      return { ...r, exercises: a }
    })
  }

  return (
    <div className="fade-in">
      <PageHeader title={routine.name} back="/routines" actions={<button className="btn btn-primary btn-sm" onClick={() => startWorkout(routine, routine.name, exMap, settings).then(() => nav('/workout'))}><Play size={16} /> Start</button>} />
      <div className="px-4 space-y-3">
        <input className="field font-bold text-lg" value={routine.name} onChange={(e) => save((r) => ({ ...r, name: e.target.value }))} aria-label="Routine name" />
        {routine.isBuiltIn && <p className="text-xs text-muted px-1">Built-in routine — edits are saved. Duplicate it from the routines list if you want to keep the original.</p>}
        {routine.exercises.map((e, i) => {
          const ex = exMap.get(e.exerciseId)
          const working = e.sets.filter((s) => s.type === 'working')
          const warm = e.sets.filter((s) => s.type === 'warmup').length
          const linkedNext = !!e.supersetGroup && routine.exercises[i + 1]?.supersetGroup === e.supersetGroup
          return (
            <div key={e.id} className="card p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0"><div className="font-bold truncate">{ex?.name ?? e.exerciseId}</div>{e.supersetGroup && <div className="text-xs text-accent">Superset {e.supersetGroup}</div>}</div>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={16} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === routine.exercises.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={16} /></button>
                <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => save((r) => ({ ...r, exercises: r.exercises.filter((x) => x.id !== e.id) }))} aria-label="Remove"><Trash2 size={16} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                <div><div className="label">Sets</div><Stepper value={working.length} onChange={(n) => setCount(e, n)} min={1} /></div>
                <div><div className="label">Min</div><NumberField className="mt-1 h-10" value={working[0]?.minReps ?? 8} onChange={(v) => setRange(e, 'minReps', v)} integer /></div>
                <div><div className="label">Max</div><NumberField className="mt-1 h-10" value={working[0]?.maxReps ?? 12} onChange={(v) => setRange(e, 'maxReps', v)} integer /></div>
                <div><div className="label">Rest s</div><NumberField className="mt-1 h-10" value={e.restSec} onChange={(v) => v != null && updateEx(e.id, (x) => ({ ...x, restSec: v }))} integer /></div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-2 text-sm text-muted">Warm-ups <Stepper value={warm} onChange={(n) => setWarmups(e, n)} min={0} small /></div>
                {i < routine.exercises.length - 1 && <button className={`btn btn-sm ml-auto ${linkedNext ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleSuperset(i)}><Link2 size={14} /> {linkedNext ? 'Linked' : 'Superset with next'}</button>}
              </div>
            </div>
          )
        })}
        <button className="btn btn-secondary w-full" onClick={() => setPicker(true)}><Plus size={18} /> Add exercise</button>
      </div>
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(ex) => {
        save((r) => ({ ...r, exercises: [...r.exercises, { id: uid(), exerciseId: ex.id, restSec: settings.defaultRestSec, sets: Array.from({ length: 3 }, () => ({ minReps: ex.repRange.min, maxReps: ex.repRange.max, type: 'working' as const })) }] }))
      }} />
    </div>
  )
}

function Stepper({ value, onChange, min, small }: { value: number; onChange: (n: number) => void; min: number; small?: boolean }) {
  const h = small ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div className={`inline-flex items-center rounded-xl bg-surface-2 border border-border ${small ? '' : 'mt-1'}`}>
      <button className={`${h} flex items-center justify-center`} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Fewer"><Minus size={14} /></button>
      <span className="w-6 text-center font-bold num">{value}</span>
      <button className={`${h} flex items-center justify-center`} onClick={() => onChange(value + 1)} aria-label="More"><Plus size={14} /></button>
    </div>
  )
}
