import { Pencil, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { CustomExerciseSheet } from '@/components/CustomExerciseSheet'
import { LineChart } from '@/components/charts/charts'
import { db } from '@/db/db'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/db/types'
import { useMeasurements, useWorkouts } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { formatDateTime } from '@/logic/dates'
import { latestBodyweight } from '@/logic/nutrition'
import { suggest } from '@/logic/progression'
import { computeRecords, isCountedSet, sessionSeries } from '@/logic/records'
import { rateLift } from '@/logic/standards'
import { formatVolume, formatWeight, fromLb } from '@/logic/units'
import { progressionOpts } from '@/store/activeWorkout'
import { LevelBar, levelColor } from '@/components/LevelBar'

type Metric = 'e1rm' | 'weight' | 'volume'

export default function ExerciseDetailPage() {
  const { id } = useParams()
  const ex = useLiveQuery(() => db.exercises.get(id!), [id])
  const workouts = useWorkouts()
  const settings = useSettings()
  const measurements = useMeasurements()
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [edit, setEdit] = useState(false)
  const units = settings.units
  const series = useMemo(() => (ex ? sessionSeries(workouts, ex.id) : []), [workouts, ex])
  const records = useMemo(() => (ex ? computeRecords(workouts, ex.id) : null), [workouts, ex])
  const suggestion = useMemo(() => (ex ? suggest(ex, workouts, progressionOpts(settings, ex)) : null), [ex, workouts, settings])
  const history = useMemo(() => (ex ? workouts.filter((w) => w.exercises.some((e) => e.exerciseId === ex.id)) : []), [workouts, ex])
  const bw = latestBodyweight(measurements)
  const standard = useMemo(() => {
    if (!ex?.standardKey || !bw) return null
    const cutoff = Date.now() - 90 * 86400000
    const best = Math.max(0, ...series.filter((p) => p.t >= cutoff).map((p) => p.e1rmLb))
    if (!best) return null
    return { best, r: rateLift(ex.standardKey, settings.sex, bw, best) }
  }, [ex, bw, series, settings.sex])
  if (!ex) return <div className="p-8 text-center text-muted">Loading…</div>

  const points = series.map((p) => ({ x: new Date(p.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), y: metric === 'e1rm' ? Math.round(fromLb(p.e1rmLb, units)) : metric === 'weight' ? Math.round(fromLb(p.bestWeightLb, units) * 10) / 10 : Math.round(fromLb(p.volumeLb, units)) }))
  const showWeight = ex.kind === 'weight_reps' || ex.kind === 'weighted_bodyweight'
  const fw = (lb: number) => formatWeight(lb, units, true)

  return (
    <div className="fade-in">
      <PageHeader title={ex.name} back subtitle={`${MUSCLE_LABELS[ex.primaryMuscle]} · ${EQUIPMENT_LABELS[ex.equipment]}`} actions={<button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEdit(true)} aria-label="Edit"><Pencil size={18} /></button>} />
      <div className="px-4 space-y-4">
        {suggestion && suggestion.kind !== 'first' && (
          <div className={`card p-3 ${suggestion.kind === 'increase' ? 'border-success/60' : ''}`}>
            <div className="label mb-1">Next time</div>
            <div className="font-bold">{suggestion.weightLb ? fw(suggestion.weightLb) : ''}{suggestion.reps != null ? ` × ${suggestion.reps}` : ''}</div>
            <div className="text-sm text-text-2">{suggestion.reason.replace(/(\d+(?:\.\d+)?) lb/g, (_, n) => fw(Number(n)))}</div>
          </div>
        )}
        {records && showWeight && (
          <div className="grid grid-cols-3 gap-2">
            <Rec label="Best e1RM" value={records.bestE1rmLb ? formatWeight(records.bestE1rmLb, units) : '—'} />
            <Rec label="Heaviest" value={records.bestWeightLb ? formatWeight(records.bestWeightLb, units) : '—'} />
            <Rec label="Best volume" value={records.bestVolumeLb ? formatVolume(records.bestVolumeLb, units) : '—'} />
          </div>
        )}
        {standard && (
          <div className="card p-3">
            <div className="flex items-center justify-between"><div className="font-bold">Strength level</div><span className={`font-bold ${levelColor(standard.r.levelIndex)}`}>{standard.r.level ?? 'Untrained'}</span></div>
            <div className="mt-2"><LevelBar levelIndex={standard.r.levelIndex} progress={standard.r.progress} /></div>
            <div className="text-xs text-muted mt-2">{standard.r.nextLevel ? `${fw(standard.best)} e1RM · ${fw(standard.r.nextThresholdLb!)} for ${standard.r.nextLevel}` : `${fw(standard.best)} e1RM · top level`}<span> · {settings.sex}, {formatWeight(bw!, units)} {units}</span></div>
          </div>
        )}
        {ex.standardKey && !bw && <p className="text-xs text-muted px-1">Log your bodyweight on the Progress tab to see your strength level for this lift.</p>}

        {points.length > 1 ? (
          <div className="card p-3">
            <Segmented className="mb-3" value={metric} onChange={setMetric} options={showWeight ? [{ value: 'e1rm', label: 'Est. 1RM' }, { value: 'weight', label: 'Top weight' }, { value: 'volume', label: 'Volume' }] : [{ value: 'volume', label: 'Reps/volume' }, { value: 'weight', label: 'Top' }, { value: 'e1rm', label: 'Est.' }]} />
            <LineChart series={[{ label: units, points }]} height={200} />
          </div>
        ) : <p className="text-sm text-muted px-1">Log this exercise at least twice to see a trend.</p>}

        <div className="card">
          <div className="px-4 pt-3 pb-1 font-bold">History</div>
          {history.length ? history.map((w) => {
            const we = w.exercises.find((e) => e.exerciseId === ex.id)!
            return (
              <Link key={w.id} to={`/history/${w.id}`} className="block px-4 py-2.5 border-t border-border">
                <div className="flex justify-between text-sm"><span className="font-medium">{w.name}</span><span className="text-muted">{formatDateTime(w.startedAt)}</span></div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {we.sets.filter(isCountedSet).map((s) => (
                    <span key={s.id} className={`chip h-7 px-2 text-xs ${s.pr?.length ? 'chip-active' : ''}`}>{s.pr?.length ? <Trophy size={12} /> : null}{showWeight && (s.weightLb ?? 0) > 0 ? `${formatWeight(s.weightLb, units)}×` : ''}{s.reps}{ex.kind === 'duration' ? 's' : ''}</span>
                  ))}
                </div>
              </Link>
            )
          }) : <p className="px-4 pb-3 text-sm text-muted">Never logged.</p>}
        </div>
        <div className="text-xs text-muted px-1">Progression: {ex.progressionRule} · +{formatWeight(ex.incrementLb, units)} {units} · {ex.repRange.min}–{ex.repRange.max} reps</div>
      </div>
      <CustomExerciseSheet open={edit} onClose={() => setEdit(false)} edit={ex} />
    </div>
  )
}
function Rec({ label, value }: { label: string; value: string }) {
  return <div className="card p-3 text-center"><div className="text-lg font-bold num">{value}</div><div className="text-[11px] text-muted uppercase font-semibold tracking-wide">{label}</div></div>
}
