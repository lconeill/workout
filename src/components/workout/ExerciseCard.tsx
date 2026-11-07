import { ArrowDown, ArrowUp, Check, Clock, MoreVertical, Plus, Sparkles, StickyNote, Trash2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exercise, Settings, Workout, WorkoutExercise } from '@/db/types'
import type { Suggestion } from '@/logic/progression'
import { computeRecords, detectSetPrs } from '@/logic/records'
import { sessionsFor } from '@/logic/progression'
import { formatWeight } from '@/logic/units'
import { addSet, moveExercise, removeExercise, removeSet, updateExercise, updateSet } from '@/store/activeWorkout'
import { buzz, startRest } from '@/store/restTimer'
import { SetRow } from './SetRow'
import { PlateCalcSheet } from './PlateCalcSheet'
import { Sheet } from '../ui/Sheet'
import { toast } from '../ui/Toast'
import { confirmDialog } from '../ui/Confirm'

interface Props { we: WorkoutExercise; exercise: Exercise; suggestion?: Suggestion; history: Workout[]; settings: Settings; index: number; count: number }

/** A fake finished workout containing only this exercise's done sets (minus the one being toggled). */
function activeSnapshot(we: WorkoutExercise, excludeSetId: string): Workout {
  return { id: 'active', name: '', startedAt: 0, endedAt: 1, exercises: [{ ...we, sets: we.sets.filter((s) => s.id !== excludeSetId && s.done) }] }
}

const KIND_NOTE: Record<Suggestion['kind'], string> = { first: 'First time', increase: 'Go up', hold: 'Hold', deload: 'Deload', reps: 'More reps' }

export function ExerciseCard({ we, exercise, suggestion, history, settings, index, count }: Props) {
  const [menu, setMenu] = useState(false)
  const [plates, setPlates] = useState<string | null>(null) // set id
  const [notesOpen, setNotesOpen] = useState(false)
  const [restOpen, setRestOpen] = useState(false)
  const units = settings.units
  const baseRecords = useMemo(() => computeRecords(history, exercise.id), [history, exercise.id])
  const hasHistory = baseRecords.bestWeightLb > 0 || baseRecords.bestE1rmLb > 0
  const lastSets = useMemo(() => {
    const s = sessionsFor(history, exercise.id)
    return s.length ? s[s.length - 1].sets : []
  }, [history, exercise.id])
  const fw = (lb: number) => formatWeight(lb, units, true)

  const toggleDone = (setId: string) => {
    const set = we.sets.find((s) => s.id === setId)
    if (!set) return
    if (set.done) { updateSet(we.id, setId, { done: false, pr: undefined }); return }
    const reps = set.reps ?? (set.targetMin ?? null)
    const weightLb = set.weightLb ?? (exercise.kind === 'reps_only' || exercise.kind === 'duration' ? 0 : null)
    if (reps == null || (weightLb == null && exercise.kind === 'weight_reps')) { toast('Enter weight and reps first'); return }
    const next = { ...set, reps, weightLb, done: true }
    // Records = history + sets already completed in this session, so the 2nd set at a new weight isn't a second PR.
    const records = computeRecords([{ ...activeSnapshot(we, setId) }], exercise.id)
    records.bestWeightLb = Math.max(records.bestWeightLb, baseRecords.bestWeightLb)
    records.bestE1rmLb = Math.max(records.bestE1rmLb, baseRecords.bestE1rmLb)
    for (const [w, r] of baseRecords.repsAtWeight) if ((records.repsAtWeight.get(w) ?? 0) < r) records.repsAtWeight.set(w, r)
    const pr = hasHistory && (exercise.kind === 'weight_reps' || exercise.kind === 'weighted_bodyweight') ? detectSetPrs(next, records) : []
    updateSet(we.id, setId, { done: true, reps, weightLb, pr: pr.length ? pr : undefined })
    buzz(30)
    if (pr.length) toast(`PR! ${pr.includes('weight') ? 'Heaviest ever' : pr.includes('e1rm') ? 'Best estimated 1RM' : 'Most reps at this weight'}`, 'pr')
    if (settings.autoStartRest && set.type !== 'warmup') startRest(we.restSec)
  }

  const applySuggestion = () => {
    if (!suggestion) return
    updateExercise(we.id, (e) => ({ ...e, sets: e.sets.map((s) => (s.type === 'warmup' || s.done ? s : { ...s, weightLb: suggestion.weightLb ?? s.weightLb, reps: suggestion.reps ?? s.reps })) }))
    toast('Applied')
  }

  const workingIdx = (() => { let n = 0; return we.sets.map((s) => (s.type === 'working' || s.type === 'drop' || s.type === 'failure' ? ++n : 0)) })()
  const lastWorking = lastSets.filter((s) => s.type !== 'warmup')

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 px-4 pt-3 pb-1">
        <div className="flex-1 min-w-0">
          <Link to={`/exercises/${exercise.id}`} className="font-bold text-[17px] truncate block text-accent">{exercise.name}</Link>
          <div className="text-xs text-muted flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><Clock size={12} /> {we.restSec}s rest</span>
            {we.supersetGroup && <span className="chip h-5 px-2 text-[10px]">Superset {we.supersetGroup}</span>}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMenu(true)} aria-label="Exercise options"><MoreVertical size={20} /></button>
      </header>

      {suggestion && suggestion.kind !== 'first' && (
        <div className={`mx-3 my-2 rounded-xl px-3 py-2 flex items-center gap-3 ${suggestion.kind === 'increase' ? 'bg-success/15' : suggestion.kind === 'deload' ? 'bg-warning/15' : 'bg-surface-2'}`}>
          {suggestion.kind === 'increase' ? <TrendingUp size={18} className="text-success shrink-0" /> : <Sparkles size={18} className="text-text-2 shrink-0" />}
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-semibold">{KIND_NOTE[suggestion.kind]}{suggestion.weightLb != null && suggestion.weightLb > 0 ? ` · ${fw(suggestion.weightLb)}` : ''}{suggestion.reps != null ? ` × ${suggestion.reps}` : ''}</div>
            <div className="text-text-2 text-xs truncate">Last: {suggestion.lastSummary?.replace(/(\d+(?:\.\d+)?) lb/, (_, n) => fw(Number(n)))} — {suggestion.reason.replace(/(\d+(?:\.\d+)?) lb/g, (_, n) => fw(Number(n)))}</div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={applySuggestion}>Apply</button>
        </div>
      )}
      {suggestion?.kind === 'first' && <p className="mx-4 my-2 text-xs text-muted">{suggestion.reason}</p>}

      {we.notes && <p className="mx-4 mb-1 text-sm text-text-2 whitespace-pre-wrap">{we.notes}</p>}

      <div className="grid px-3 text-[11px] font-semibold text-muted uppercase tracking-wide gap-2 mt-1" style={{ gridTemplateColumns: '36px 1fr 72px 64px 44px' }}>
        <div className="text-center">Set</div><div>Previous</div>
        <div className="text-center">{exercise.kind === 'reps_only' || exercise.kind === 'duration' ? '' : units}</div>
        <div className="text-center">{exercise.kind === 'duration' ? 'sec' : 'reps'}</div><div className="text-center"><Check size={14} className="inline" /></div>
      </div>
      <div className="px-1 pb-1 space-y-0.5">
        {we.sets.map((s, i) => (
          <SetRow key={s.id} index={workingIdx[i]} set={s} kind={exercise.kind} units={units}
            prev={s.type === 'warmup' ? null : lastWorking[workingIdx[i] - 1] ?? null}
            onChange={(p) => updateSet(we.id, s.id, p)} onToggleDone={() => toggleDone(s.id)} onRemove={() => removeSet(we.id, s.id)}
            onPlates={() => setPlates(s.id)} />
        ))}
      </div>
      <button className="btn btn-ghost w-full rounded-none border-t border-border text-accent" onClick={() => addSet(we.id)}><Plus size={18} /> Add set</button>

      <Sheet open={menu} onClose={() => setMenu(false)} title={exercise.name}>
        <div className="space-y-2">
          <button className="btn btn-secondary w-full justify-start" onClick={() => { setMenu(false); setNotesOpen(true) }}><StickyNote size={18} /> {we.notes ? 'Edit note' : 'Add note'}</button>
          <button className="btn btn-secondary w-full justify-start" onClick={() => { setMenu(false); setRestOpen(true) }}><Clock size={18} /> Rest time ({we.restSec}s)</button>
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1" disabled={index === 0} onClick={() => { moveExercise(we.id, -1); setMenu(false) }}><ArrowUp size={18} /> Move up</button>
            <button className="btn btn-secondary flex-1" disabled={index === count - 1} onClick={() => { moveExercise(we.id, 1); setMenu(false) }}><ArrowDown size={18} /> Move down</button>
          </div>
          <button className="btn btn-danger w-full justify-start" onClick={async () => { setMenu(false); if (await confirmDialog({ title: 'Remove exercise?', body: 'Logged sets for this exercise in this workout will be lost.', confirmText: 'Remove', danger: true })) removeExercise(we.id) }}><Trash2 size={18} /> Remove from workout</button>
        </div>
      </Sheet>
      <Sheet open={notesOpen} onClose={() => setNotesOpen(false)} title="Note">
        <textarea className="field py-3 min-h-[120px]" placeholder="Cues, seat height, grip…" defaultValue={we.notes ?? ''} onBlur={(e) => updateExercise(we.id, (x) => ({ ...x, notes: e.target.value || undefined }))} autoFocus />
        <button className="btn btn-primary w-full mt-3" onClick={() => setNotesOpen(false)}>Done</button>
      </Sheet>
      <Sheet open={restOpen} onClose={() => setRestOpen(false)} title="Rest between sets">
        <div className="grid grid-cols-4 gap-2">
          {[45, 60, 90, 120, 150, 180, 210, 240].map((s) => (
            <button key={s} className={`btn ${we.restSec === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { updateExercise(we.id, (x) => ({ ...x, restSec: s })); setRestOpen(false) }}>{s}s</button>
          ))}
        </div>
      </Sheet>
      {plates && <PlateCalcSheet open onClose={() => setPlates(null)} weightLb={we.sets.find((s) => s.id === plates)?.weightLb ?? null} onApply={(lb) => updateSet(we.id, plates, { weightLb: lb })} />}
    </section>
  )
}
