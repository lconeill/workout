import { Pencil, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { NumberField } from '@/components/ui/NumberField'
import { confirmDialog } from '@/components/ui/Confirm'
import { db } from '@/db/db'
import type { Workout, WorkoutSet } from '@/db/types'
import { useExerciseMap } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { formatDateTime, formatDuration } from '@/logic/dates'
import { isCountedSet, workoutSetCount, workoutVolume } from '@/logic/records'
import { formatVolume, formatWeight, fromLb, toLb } from '@/logic/units'
import { Stat } from './WorkoutPage'

export default function WorkoutDetailPage() {
  const { id } = useParams()
  const w = useLiveQuery(() => db.workouts.get(id!), [id])
  const exMap = useExerciseMap()
  const { units } = useSettings()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  if (!w) return <div className="p-8 text-center text-muted">Loading…</div>
  const prs = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.pr?.length).length, 0)
  const del = async () => {
    if (!(await confirmDialog({ title: 'Delete workout?', body: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return
    await db.workouts.delete(w.id); nav('/history')
  }
  return (
    <div className="fade-in">
      <PageHeader title={w.name} back subtitle={formatDateTime(w.startedAt)} actions={<><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(true)} aria-label="Edit"><Pencil size={18} /></button><button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={del} aria-label="Delete"><Trash2 size={18} /></button></>} />
      <div className="px-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Duration" value={formatDuration((w.endedAt ?? w.startedAt) - w.startedAt)} />
          <Stat label="Volume" value={`${formatVolume(workoutVolume(w), units)}`} sub={units} />
          <Stat label="Sets" value={String(workoutSetCount(w))} sub={prs ? `${prs} PR${prs > 1 ? 's' : ''}` : undefined} accent={prs > 0} />
        </div>
        {w.exercises.map((e) => {
          const ex = exMap.get(e.exerciseId)
          const showW = ex?.kind === 'weight_reps' || ex?.kind === 'weighted_bodyweight'
          return (
            <div key={e.id} className="card">
              <Link to={`/exercises/${e.exerciseId}`} className="block px-4 pt-3 pb-1 font-bold text-accent">{ex?.name ?? e.exerciseId}</Link>
              {e.notes && <p className="px-4 pb-1 text-sm text-text-2">{e.notes}</p>}
              <ul className="px-4 pb-3 space-y-1">
                {e.sets.map((s, i) => (
                  <li key={s.id} className={`flex items-center gap-3 text-sm rounded-lg px-2 py-1 ${s.pr?.length ? 'set-pr' : ''}`}>
                    <span className={`w-6 text-muted num ${s.type === 'warmup' ? 'text-warning' : ''}`}>{s.type === 'warmup' ? 'W' : i + 1}</span>
                    <span className="num font-medium">{showW && (s.weightLb ?? 0) > 0 ? `${formatWeight(s.weightLb, units)} ${units} × ` : ''}{s.reps}{ex?.kind === 'duration' ? ' s' : ''}</span>
                    {s.rpe != null && <span className="text-xs text-muted">RPE {s.rpe}</span>}
                    {s.pr?.length ? <span className="ml-auto text-pr inline-flex items-center gap-1 text-xs font-semibold"><Trophy size={12} /> {s.pr.join(', ')}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {w.notes && <div className="card p-4 text-sm text-text-2 whitespace-pre-wrap">{w.notes}</div>}
      </div>
      {editing && <EditSheet w={w} units={units} onClose={() => setEditing(false)} />}
    </div>
  )
}

function EditSheet({ w, units, onClose }: { w: Workout; units: 'lb' | 'kg'; onClose: () => void }) {
  const exMap = useExerciseMap()
  const [draft, setDraft] = useState<Workout>(w)
  const setSet = (eid: string, sid: string, patch: Partial<WorkoutSet>) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === eid ? { ...e, sets: e.sets.map((s) => (s.id === sid ? { ...s, ...patch } : s)) } : e)) }))
  const save = async () => { await db.workouts.put({ ...draft, exercises: draft.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => isCountedSet(s) || s.type === 'warmup') })).filter((e) => e.sets.length) }); onClose() }
  return (
    <Sheet open onClose={onClose} title="Edit workout" tall>
      <input className="field mb-3" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      {draft.exercises.map((e) => (
        <div key={e.id} className="mb-3">
          <div className="font-semibold mb-1">{exMap.get(e.exerciseId)?.name}</div>
          {e.sets.map((s, i) => (
            <div key={s.id} className="grid grid-cols-[32px_1fr_1fr_40px] gap-2 items-center mb-1">
              <span className="text-muted text-sm num text-center">{i + 1}</span>
              <NumberField value={s.weightLb != null ? fromLb(s.weightLb, units) : null} onChange={(v) => setSet(e.id, s.id, { weightLb: v != null ? toLb(v, units) : null })} className="h-9" />
              <NumberField value={s.reps} onChange={(v) => setSet(e.id, s.id, { reps: v })} integer className="h-9" />
              <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => setDraft((d) => ({ ...d, exercises: d.exercises.map((x) => (x.id === e.id ? { ...x, sets: x.sets.filter((y) => y.id !== s.id) } : x)) }))} aria-label="Delete set"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ))}
      <button className="btn btn-primary w-full" onClick={save}>Save changes</button>
    </Sheet>
  )
}
