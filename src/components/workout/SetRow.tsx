import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { CableStackConfig, ExerciseKind, SetType, WorkoutSet } from '@/db/types'
import { formatSetup } from '@/logic/cableStack'
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
  /** Cable-stack exercise: weight shows as pin + add-ons and opens the setup picker. */
  cable?: CableStackConfig | null
  onCable?: () => void
}

export function SetRow({ index, set, kind, units, prev, onChange, onToggleDone, onRemove, onPlates, cable, onCable }: Props) {
  const [menu, setMenu] = useState(false)
  const showWeight = kind !== 'reps_only' && kind !== 'duration'
  const repsLabel = kind === 'duration' ? 'sec' : 'reps'
  const wText = (lb: number) => (cable && formatSetup(lb, cable)) || formatWeight(lb, units)
  const prevText = prev && (prev.reps != null)
    ? (showWeight && prev.weightLb != null && prev.weightLb > 0 ? `${wText(prev.weightLb)} × ${prev.reps}` : `${prev.reps}${kind === 'duration' ? 's' : ''}`)
    : '—'
  const applyPrev = () => { if (prev) onChange({ weightLb: prev.weightLb, reps: prev.reps }) }
  const rowClass = set.pr?.length ? 'set-pr' : set.done ? 'set-done' : ''
  return (
    <div className={`relative grid items-center gap-2 px-3 py-1.5 rounded-xl ${rowClass}`} style={{ gridTemplateColumns: '36px 1fr 72px 64px 44px' }}>
      <button className={`h-9 w-9 rounded-lg bg-surface-2 font-bold text-sm num ${TYPE_CLASS[set.type]}`} onClick={() => setMenu((m) => !m)} aria-label="Set options">
        {set.type === 'working' ? index : TYPE_LABEL[set.type]}
      </button>
      {cable && showWeight && prev?.reps != null && prev.weightLb != null && prev.weightLb > 0 ? (
        <button className="text-muted num text-left min-h-[36px] leading-tight flex flex-col justify-center min-w-0" onClick={applyPrev}>
          <span className="text-sm truncate">{wText(prev.weightLb)}</span><span className="text-xs">× {prev.reps}</span>
        </button>
      ) : <button className="text-sm text-muted num text-left truncate min-h-[36px]" onClick={applyPrev} disabled={!prev}>{prevText}</button>}
      {showWeight && cable ? (
        <button className="field h-9 px-1 flex flex-col items-center justify-center leading-none disabled:opacity-100" onClick={onCable} disabled={set.done} aria-label="Cable setup">
          {set.weightLb != null && set.weightLb > 0 ? <>
            <span className="text-sm font-semibold num">{formatSetup(set.weightLb, cable) ?? formatWeight(set.weightLb, units)}</span>
            <span className="text-[10px] text-muted num mt-0.5">{formatWeight(set.weightLb, units)} {units}</span>
          </> : <span className="text-sm text-muted num">{prev?.weightLb ? wText(prev.weightLb) : 'Pin'}</span>}
        </button>
      ) : showWeight ? (
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
          {onPlates && showWeight && !cable && <button className="btn btn-sm btn-ghost" onClick={() => { setMenu(false); onPlates() }}>Plates</button>}
          <button className="btn btn-sm btn-danger btn-icon" onClick={() => { setMenu(false); onRemove() }} aria-label="Delete set"><Trash2 size={16} /></button>
        </div>
      )}
    </div>
  )
}
