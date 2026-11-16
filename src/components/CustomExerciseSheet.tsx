import { useEffect, useState } from 'react'
import { db } from '@/db/db'
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Equipment, type Exercise, type ExerciseKind, type Muscle, type ProgressionRule } from '@/db/types'
import { uid } from '@/logic/dates'
import { Sheet } from './ui/Sheet'
import { NumberField } from './ui/NumberField'
import { useSettings } from '@/hooks/useSettings'
import { fromLb, toLb } from '@/logic/units'

const KINDS: { value: ExerciseKind; label: string }[] = [
  { value: 'weight_reps', label: 'Weight × reps' }, { value: 'reps_only', label: 'Reps only' },
  { value: 'weighted_bodyweight', label: 'Bodyweight + added weight' }, { value: 'duration', label: 'Duration (seconds)' },
]
const RULES: { value: ProgressionRule; label: string }[] = [
  { value: 'double', label: 'Double progression (reps then weight)' }, { value: 'linear', label: 'Linear (add weight every session)' }, { value: 'none', label: 'None' },
]

export function CustomExerciseSheet({ open, onClose, onCreated, initialName = '', edit }: { open: boolean; onClose: () => void; onCreated?: (e: Exercise) => void; initialName?: string; edit?: Exercise }) {
  const { units } = useSettings()
  const [name, setName] = useState(initialName)
  const [muscle, setMuscle] = useState<Muscle>('chest')
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [kind, setKind] = useState<ExerciseKind>('weight_reps')
  const [rule, setRule] = useState<ProgressionRule>('double')
  const [inc, setInc] = useState<number | null>(5)
  const [min, setMin] = useState<number | null>(8)
  const [max, setMax] = useState<number | null>(12)
  /** null = follow equipment (on for Cable). */
  const [cable, setCable] = useState<boolean | null>(null)
  const cableOn = cable ?? equipment === 'cable'
  useEffect(() => {
    if (!open) return
    if (edit) {
      setName(edit.name); setMuscle(edit.primaryMuscle); setEquipment(edit.equipment); setKind(edit.kind); setRule(edit.progressionRule)
      setInc(fromLb(edit.incrementLb, units)); setMin(edit.repRange.min); setMax(edit.repRange.max); setCable(edit.cableStack ?? null)
    } else { setName(initialName); setInc(units === 'kg' ? 2.5 : 5); setCable(null) }
  }, [open, edit, initialName, units])
  const save = async () => {
    if (!name.trim()) return
    const ex: Exercise = {
      ...(edit ?? { id: uid(), secondaryMuscles: [], isCustom: true, archived: false }),
      name: name.trim(), primaryMuscle: muscle, equipment, kind, progressionRule: rule,
      incrementLb: toLb(inc ?? 0, units), repRange: { min: min ?? 8, max: max ?? 12 },
      cableStack: kind === 'weight_reps' && cable != null && cable !== (equipment === 'cable') ? cable : undefined,
    }
    if (ex.cableStack === undefined) delete ex.cableStack
    await db.exercises.put(ex)
    onCreated?.(ex)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Edit exercise' : 'New exercise'}>
      <div className="space-y-4">
        <label className="block"><span className="label">Name</span><input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable Row (wide)" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Muscle</span>
            <select className="field mt-1" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)}>{Object.entries(MUSCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block"><span className="label">Equipment</span>
            <select className="field mt-1" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>{Object.entries(EQUIPMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        <label className="block"><span className="label">Type</span>
          <select className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind)}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
        <label className="block"><span className="label">Progression</span>
          <select className="field mt-1" value={rule} onChange={(e) => setRule(e.target.value as ProgressionRule)}>{RULES.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
        {kind === 'weight_reps' && (
          <button type="button" className="flex items-center gap-3 w-full text-left" onClick={() => setCable(!cableOn)} role="switch" aria-checked={cableOn}>
            <div className="flex-1"><div className="font-medium">Cable stack</div><div className="text-xs text-muted">Log as pin + add-on plates (set up in Settings)</div></div>
            <span className={`relative h-7 w-12 rounded-full transition-colors ${cableOn ? 'bg-accent' : 'bg-surface-3'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${cableOn ? 'translate-x-6' : 'translate-x-1'}`} /></span>
          </button>
        )}
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="label">Increment ({units})</span><NumberField className="mt-1" value={inc} onChange={setInc} disabled={kind === 'weight_reps' && cableOn} placeholder={kind === 'weight_reps' && cableOn ? 'stack' : undefined} /></label>
          <label className="block"><span className="label">Min reps</span><NumberField className="mt-1" value={min} onChange={setMin} integer /></label>
          <label className="block"><span className="label">Max reps</span><NumberField className="mt-1" value={max} onChange={setMax} integer /></label>
        </div>
        <button className="btn btn-primary w-full" onClick={save} disabled={!name.trim()}>{edit ? 'Save' : 'Create'}</button>
      </div>
    </Sheet>
  )
}
