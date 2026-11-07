import { Check, Dumbbell, Play, Plus, Trash2, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { confirmDialog } from '@/components/ui/Confirm'
import { ExercisePicker } from '@/components/ExercisePicker'
import { ExerciseCard } from '@/components/workout/ExerciseCard'
import { RestTimerBar } from '@/components/workout/RestTimerBar'
import { useExerciseMap, usePrograms, useRoutines, useWorkouts } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { formatDuration } from '@/logic/dates'
import { formatVolume } from '@/logic/units'
import { active, addExerciseToActive, discardWorkout, finishWorkout, startWorkout, updateActive, type FinishSummary } from '@/store/activeWorkout'
import { requestNotifyPermission } from '@/store/restTimer'
import type { Routine } from '@/db/types'

function useElapsed(start?: number) {
  const [, tick] = useState(0)
  useEffect(() => { if (!start) return; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id) }, [start])
  return start ? Date.now() - start : 0
}

function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    const acquire = async () => { try { lock = await navigator.wakeLock.request('screen') } catch { /* ignore */ } }
    const onVis = () => { if (document.visibilityState === 'visible') void acquire() }
    void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); void lock?.release() }
  }, [enabled])
}

export default function WorkoutPage() {
  const { workout, suggestions } = active.use()
  const settings = useSettings()
  const exMap = useExerciseMap()
  const history = useWorkouts()
  const routines = useRoutines()
  const programs = usePrograms()
  const nav = useNavigate()
  const [picker, setPicker] = useState(false)
  const [summary, setSummary] = useState<FinishSummary | null>(null)
  const elapsed = useElapsed(workout?.startedAt)
  useWakeLock(!!workout && settings.keepScreenOn)
  useEffect(() => { if (workout) void requestNotifyPermission() }, [workout])

  const activeProgram = programs.find((p) => p.id === settings.activeProgramId)
  const nextRoutine: Routine | undefined = activeProgram
    ? routines.find((r) => r.id === activeProgram.routineIds[settings.programCursor % activeProgram.routineIds.length])
    : undefined

  const start = async (r: Routine | null) => {
    if (workout) { if (!(await confirmDialog({ title: 'Replace current workout?', body: 'You already have a workout in progress.', confirmText: 'Replace', danger: true }))) return }
    await startWorkout(r, r?.name ?? 'Workout', exMap, settings)
  }

  const doneSets = useMemo(() => workout?.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0) ?? 0, [workout])
  const totalSets = workout?.exercises.reduce((a, e) => a + e.sets.length, 0) ?? 0

  const finish = async () => {
    if (!workout) return
    if (doneSets === 0) { if (await confirmDialog({ title: 'No sets logged', body: 'Discard this workout?', confirmText: 'Discard', danger: true })) discardWorkout(); return }
    if (doneSets < totalSets && !(await confirmDialog({ title: 'Finish workout?', body: `${totalSets - doneSets} set${totalSets - doneSets === 1 ? '' : 's'} not completed will be dropped.`, confirmText: 'Finish' }))) return
    const s = await finishWorkout(settings)
    if (s) setSummary(s)
  }

  if (!workout) {
    return (
      <div className="fade-in">
        <PageHeader title="Workout" large />
        <div className="px-4 space-y-4">
          {nextRoutine && (
            <div className="card p-4 border-accent/50">
              <div className="label text-accent mb-1">Up next · {activeProgram?.name}</div>
              <div className="text-xl font-bold">{nextRoutine.name}</div>
              <div className="text-sm text-muted mb-3">{nextRoutine.exercises.map((e) => exMap.get(e.exerciseId)?.name).filter(Boolean).join(' · ')}</div>
              <button className="btn btn-primary w-full" onClick={() => start(nextRoutine)}><Play size={18} /> Start {nextRoutine.name}</button>
            </div>
          )}
          <button className="btn btn-secondary w-full" onClick={() => start(null)}><Plus size={18} /> Start empty workout</button>
          <div>
            <div className="label mb-2 px-1">Routines</div>
            <div className="card divide-y divide-border">
              {routines.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.name}</div>
                    <div className="text-xs text-muted truncate">{r.exercises.length} exercises · {r.exercises.map((e) => exMap.get(e.exerciseId)?.name).filter(Boolean).slice(0, 3).join(', ')}{r.exercises.length > 3 ? '…' : ''}</div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => start(r)}><Play size={14} /> Start</button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost w-full mt-2 text-accent" onClick={() => nav('/routines')}>Manage routines & programs</button>
          </div>
        </div>
        <FinishSheet summary={summary} onClose={() => { setSummary(null); nav('/') }} units={settings.units} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <PageHeader title={workout.name} subtitle={`${formatDuration(elapsed)} · ${doneSets}/${totalSets} sets`}
        actions={<button className="btn btn-primary btn-sm" onClick={finish}><Check size={16} /> Finish</button>} />
      <div className="px-3 space-y-3 pb-24">
        {workout.exercises.map((we, i) => {
          const ex = exMap.get(we.exerciseId)
          if (!ex) return null
          return <ExerciseCard key={we.id} we={we} exercise={ex} suggestion={suggestions[we.id]} history={history} settings={settings} index={i} count={workout.exercises.length} />
        })}
        <button className="btn btn-secondary w-full" onClick={() => setPicker(true)}><Plus size={18} /> Add exercise</button>
        <label className="block"><span className="label">Workout name</span><input className="field mt-1" value={workout.name} onChange={(e) => updateActive((w) => ({ ...w, name: e.target.value }))} /></label>
        <textarea className="field py-3 min-h-[72px]" placeholder="Workout notes" defaultValue={workout.notes ?? ''} onBlur={(e) => updateActive((w) => ({ ...w, notes: e.target.value || undefined }))} />
        <button className="btn btn-danger w-full" onClick={async () => { if (await confirmDialog({ title: 'Discard workout?', body: 'All sets in this workout will be lost.', confirmText: 'Discard', danger: true })) discardWorkout() }}><Trash2 size={18} /> Discard workout</button>
      </div>
      <RestTimerBar />
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(e) => { void addExerciseToActive(e, settings); setPicker(false) }} />
      <FinishSheet summary={summary} onClose={() => { setSummary(null); nav('/') }} units={settings.units} />
    </div>
  )
}

function FinishSheet({ summary, onClose, units }: { summary: FinishSummary | null; onClose: () => void; units: 'lb' | 'kg' }) {
  if (!summary) return null
  const w = summary.workout
  return (
    <Sheet open onClose={onClose} title="Workout complete">
      <div className="text-center py-2">
        <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-success/20 text-success flex items-center justify-center"><Dumbbell size={30} /></div>
        <div className="text-2xl font-bold">{w.name}</div>
        <div className="text-muted">{formatDuration((w.endedAt ?? 0) - w.startedAt)}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 my-4">
        <Stat label="Volume" value={`${formatVolume(summary.volumeLb, units)} ${units}`} />
        <Stat label="Sets" value={String(summary.setCount)} />
        <Stat label="PRs" value={String(summary.prCount)} accent={summary.prCount > 0} />
      </div>
      {summary.prCount > 0 && <div className="flex items-center gap-2 justify-center text-pr font-semibold mb-4"><Trophy size={18} /> {summary.prCount} new personal record{summary.prCount > 1 ? 's' : ''}!</div>}
      <button className="btn btn-primary w-full" onClick={onClose}>Done</button>
    </Sheet>
  )
}

export function Stat({ label, value, accent, sub }: { label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="card p-3 text-center">
      <div className={`text-xl font-bold ${accent ? 'text-pr' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-wide font-semibold">{label}</div>
      {sub && <div className="text-xs text-text-2">{sub}</div>}
    </div>
  )
}
