import { ChevronRight, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { CustomExerciseSheet } from '@/components/CustomExerciseSheet'
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Muscle } from '@/db/types'
import { useExercises, useWorkouts } from '@/hooks/useData'

const MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[]

export default function ExercisesPage() {
  const exercises = useExercises()
  const workouts = useWorkouts()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [creating, setCreating] = useState(false)
  const lastUsed = useMemo(() => { const m = new Map<string, number>(); for (const w of workouts) for (const e of w.exercises) if (!m.has(e.exerciseId)) m.set(e.exerciseId, w.startedAt); return m }, [workouts])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return exercises.filter((e) => (!s || e.name.toLowerCase().includes(s)) && (!muscle || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle)))
  }, [exercises, q, muscle])
  const recent = useMemo(() => exercises.filter((e) => lastUsed.has(e.id)).sort((a, b) => lastUsed.get(b.id)! - lastUsed.get(a.id)!).slice(0, 5), [exercises, lastUsed])
  return (
    <div className="fade-in">
      <PageHeader title="Exercises" back="/more" actions={<button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={16} /> New</button>} />
      <div className="px-4">
        <div className="relative mb-2"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="field pl-10" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-3">
          <button className={`chip ${!muscle ? 'chip-active' : ''}`} onClick={() => setMuscle(null)}>All</button>
          {MUSCLES.map((m) => <button key={m} className={`chip ${muscle === m ? 'chip-active' : ''}`} onClick={() => setMuscle(muscle === m ? null : m)}>{MUSCLE_LABELS[m]}</button>)}
        </div>
        {!q && !muscle && recent.length > 0 && (
          <><div className="label mb-1 px-1">Recent</div>
          <div className="card divide-y divide-border mb-4">{recent.map((e) => <ExRow key={e.id} id={e.id} name={e.name} sub={`${MUSCLE_LABELS[e.primaryMuscle]} · ${EQUIPMENT_LABELS[e.equipment]}`} />)}</div></>
        )}
        <div className="label mb-1 px-1">{list.length} exercises</div>
        <div className="card divide-y divide-border">
          {list.map((e) => <ExRow key={e.id} id={e.id} name={e.name} sub={`${MUSCLE_LABELS[e.primaryMuscle]} · ${EQUIPMENT_LABELS[e.equipment]}${e.isCustom ? ' · custom' : ''}`} />)}
        </div>
      </div>
      <CustomExerciseSheet open={creating} onClose={() => setCreating(false)} initialName={q} />
    </div>
  )
}
function ExRow({ id, name, sub }: { id: string; name: string; sub: string }) {
  return <Link to={`/exercises/${id}`} className="flex items-center gap-3 px-4 py-3"><div className="flex-1 min-w-0"><div className="font-medium truncate">{name}</div><div className="text-xs text-muted">{sub}</div></div><ChevronRight size={16} className="text-muted" /></Link>
}
