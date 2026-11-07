import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ExerciseKind, SetType, WorkoutSet } from '@/db/types'
import { NumberField } from '../ui/NumberField'
import { formatWeight, fromLb, toLb } from '@/logic/units'

const TYPE_LABEL: Record<SetType, string> = { warmup: 'W', working: '', drop: 'D', failure: 'F' }
const TYPE_CLASS: Record<SetType, string> = { warmup: 'text-warning', working: 'text-text-2', drop: 'text-accent', failure: 'text-danger' }

interface Props {
  index: number
  set: WorkoutSet
  kind: ExerciseKind
  units: 'lb' | 'kg'
  prev?: { weightLb: number | null; reps: number | null } | null
  onChange: (patch: Partial<WorkoutSet>) => void
  onToggleDone: () => void
  onRemove: () => void
  onPlates?: () => void
}

export function SetRow({ index, set, kind, units, prev, onChange, onToggleDone, onRemove, onPlates }: Props) {
  const [menu, setMenu] = useState(false)
  const showWeight = kind !== 'reps_only' && kind !== 'duration'
  const repsLabel = kind === 'duration' ? 'sec' : 'reps'
  const prevText = prev && (prev.reps != null)
    ? (showWeight && prev.weightLb != null && prev.weightLb > 0 ? `${formatWeight(prev.weightLb, units)} × ${prev.reps}` : `${prev.reps}${kind === 'duration' ? 's' : ''}`)
    : '—'
  const applyPrev = () => { if (prev) onChange({ weightLb: prev.weightLb, reps: prev.reps }) }
  const rowClass = set.pr?.length ? 'set-pr' : set.done ? 'set-done' : ''
  return (
    <div className={`relative grid items-center gap-2 px-3 py-1.5 rounded-xl ${rowClass}`} style={{ gridTemplateColumns: '36px 1fr 72px 64px 44px' }}>
      <button className={`h-9 w-9 rounded-lg bg-surface-2 font-bold text-sm num ${TYPE_CLASS[set.type]}`} onClick={() => setMenu((m) => !m)} aria-label="Set options">
        {set.type === 'working' ? index : TYPE_LABEL[set.type]}
      </button>
      <button className="text-sm text-muted num text-left truncate min-h-[36px]" onClick={applyPrev} disabled={!prev}>{prevText}</button>
      {showWeight ? (
        <NumberField value={set.weightLb != null ? fromLb(set.weightLb, units) : null} onChange={(v) => onChange({ weightLb: v != null ? toLb(v, units) : null })}
          placeholder={prev?.weightLb != null ? formatWeight(prev.weightLb, units) : '0'} className="h-9" aria-label="Weight" disabled={set.done} onFocus={undefined} />
      ) : <div />}
      <NumberField value={set.reps} onChange={(v) => onChange({ reps: v })} placeholder={prev?.reps != null ? String(prev.reps) : (set.targetMin != null ? `${set.targetMin}` : repsLabel)} className="h-9" integer aria-label={repsLabel} disabled={set.done} />
      <button onClick={onToggleDone} aria-label={set.done ? 'Mark not done' : 'Mark done'}
        className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${set.done ? 'bg-success text-black' : 'bg-surface-2 text-muted'}`}>
        <Check size={20} strokeWidth={3} />
      </button>
      {menu && (
        <div className="absolute left-2 top-11 z-20 card p-1 shadow-xl flex gap-1 fade-in">
          {(['warmup', 'working', 'drop', 'failure'] as SetType[]).map((t) => (
            <button key={t} className={`btn btn-sm ${set.type === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { onChange({ type: t }); setMenu(false) }}>
              {t === 'working' ? 'Set' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          {onPlates && showWeight && <button className="btn btn-sm btn-ghost" onClick={() => { setMenu(false); onPlates() }}>Plates</button>}
          <button className="btn btn-sm btn-danger btn-icon" onClick={() => { setMenu(false); onRemove() }} aria-label="Delete set"><Trash2 size={16} /></button>
        </div>
      )}
    </div>
  )
}
