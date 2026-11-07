import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useExercises } from '@/hooks/useData'
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Equipment, type Exercise, type Muscle } from '@/db/types'
import { Sheet } from './ui/Sheet'
import { CustomExerciseSheet } from './CustomExerciseSheet'

const MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[]
const EQUIP = Object.keys(EQUIPMENT_LABELS) as Equipment[]

export function ExercisePicker({ open, onClose, onPick, title = 'Add exercise' }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void; title?: string }) {
  const exercises = useExercises()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [equip, setEquip] = useState<Equipment | null>(null)
  const [creating, setCreating] = useState(false)
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return exercises.filter((e) =>
      (!s || e.name.toLowerCase().includes(s)) &&
      (!muscle || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle)) &&
      (!equip || e.equipment === equip))
  }, [exercises, q, muscle, equip])
  return (
    <Sheet open={open} onClose={onClose} title={title} tall>
      <div className="sticky top-0 bg-surface pb-2 z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-10" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2 -mx-5 px-5">
          <button className={`chip ${!muscle ? 'chip-active' : ''}`} onClick={() => setMuscle(null)}>All muscles</button>
          {MUSCLES.map((m) => <button key={m} className={`chip ${muscle === m ? 'chip-active' : ''}`} onClick={() => setMuscle(muscle === m ? null : m)}>{MUSCLE_LABELS[m]}</button>)}
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
          <button className={`chip ${!equip ? 'chip-active' : ''}`} onClick={() => setEquip(null)}>Any equipment</button>
          {EQUIP.map((m) => <button key={m} className={`chip ${equip === m ? 'chip-active' : ''}`} onClick={() => setEquip(equip === m ? null : m)}>{EQUIPMENT_LABELS[m]}</button>)}
        </div>
      </div>
      <button className="btn btn-secondary w-full mb-2" onClick={() => setCreating(true)}><Plus size={18} /> Create custom exercise</button>
      <ul className="divide-y divide-border">
        {list.map((e) => (
          <li key={e.id}>
            <button className="w-full text-left py-3 flex items-center gap-3 active:bg-surface-2" onClick={() => onPick(e)}>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{e.name}</div>
                <div className="text-sm text-muted">{MUSCLE_LABELS[e.primaryMuscle]} · {EQUIPMENT_LABELS[e.equipment]}</div>
              </div>
              <Plus size={18} className="text-accent" />
            </button>
          </li>
        ))}
        {!list.length && <li className="py-8 text-center text-muted">No matches</li>}
      </ul>
      <CustomExerciseSheet open={creating} onClose={() => setCreating(false)} initialName={q} onCreated={(e) => { setCreating(false); onPick(e) }} />
    </Sheet>
  )
}
