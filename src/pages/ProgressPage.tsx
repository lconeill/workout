import { Plus, Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { NumberField } from '@/components/ui/NumberField'
import { Segmented } from '@/components/ui/Segmented'
import { BarChart, LineChart } from '@/components/charts/charts'
import { db } from '@/db/db'
import { MUSCLE_LABELS, type Muscle, type StandardKey } from '@/db/types'
import { useExerciseMap, useExercises, useMeasurements, useWorkouts } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { dayKey, startOfWeek, uid } from '@/logic/dates'
import { latestBodyweight } from '@/logic/nutrition'
import { e1rm, isCountedSet, workoutVolume } from '@/logic/records'
import { dotsLabel, dotsScore, rateLift } from '@/logic/standards'
import { STANDARD_LABELS } from '@/data/standards'
import { formatVolume, formatWeight, fromLb, toLb } from '@/logic/units'

const RANGES = [{ value: '8', label: '8 wk' }, { value: '16', label: '16 wk' }, { value: '52', label: '1 yr' }] as const

export default function ProgressPage() {
  const settings = useSettings()
  const workouts = useWorkouts()
  const exMap = useExerciseMap()
  const exercises = useExercises()
  const measurements = useMeasurements()
  const [range, setRange] = useState<'8' | '16' | '52'>('8')
  const [logBw, setLogBw] = useState(false)
  const weeks = Number(range)
  const units = settings.units

  const weekly = useMemo(() => {
    const start = startOfWeek().getTime() - (weeks - 1) * 7 * 86400000
    const labels: string[] = [], vol: number[] = [], count: number[] = []
    const perMuscle = new Map<Muscle, number[]>()
    for (let i = 0; i < weeks; i++) {
      const ws = start + i * 7 * 86400000, we = ws + 7 * 86400000
      labels.push(new Date(ws).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
      const list = workouts.filter((w) => w.startedAt >= ws && w.startedAt < we)
      vol.push(list.reduce((a, w) => a + workoutVolume(w), 0))
      count.push(list.length)
      for (const w of list) for (const e of w.exercises) {
        const ex = exMap.get(e.exerciseId); if (!ex) continue
        const n = e.sets.filter(isCountedSet).length
        const arr = perMuscle.get(ex.primaryMuscle) ?? Array(weeks).fill(0)
        arr[i] += n; perMuscle.set(ex.primaryMuscle, arr)
      }
    }
    return { labels, vol, count, perMuscle }
  }, [workouts, exMap, weeks])

  const thisWeekMuscles = useMemo(() => {
    const out = [...weekly.perMuscle.entries()].map(([m, arr]) => ({ m, sets: arr[arr.length - 1], avg: arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.filter((x) => x > 0).length) }))
    return out.filter((x) => x.m !== 'cardio' && x.m !== 'full_body').sort((a, b) => b.sets - a.sets)
  }, [weekly])

  const bw = latestBodyweight(measurements)
  const strength = useMemo(() => {
    if (!bw) return []
    const cutoff = Date.now() - 90 * 86400000
    const out: { key: StandardKey; name: string; e1rm: number; r: ReturnType<typeof rateLift>; exId: string }[] = []
    for (const ex of exercises) {
      if (!ex.standardKey) continue
      let best = 0
      for (const w of workouts) { if (w.startedAt < cutoff) continue; for (const e of w.exercises) if (e.exerciseId === ex.id) for (const s of e.sets) if (isCountedSet(s)) best = Math.max(best, e1rm(s.weightLb ?? 0, s.reps ?? 0)) }
      if (best <= 0) continue
      out.push({ key: ex.standardKey, name: STANDARD_LABELS[ex.standardKey], e1rm: best, r: rateLift(ex.standardKey, settings.sex, bw, best), exId: ex.id })
    }
    return out.sort((a, b) => b.r.levelIndex + b.r.progress - (a.r.levelIndex + a.r.progress))
  }, [exercises, workouts, bw, settings.sex])
  const dots = useMemo(() => {
    if (!bw) return null
    const get = (k: StandardKey) => strength.find((s) => s.key === k)?.e1rm ?? 0
    const total = get('squat') + get('bench') + get('deadlift')
    if (!get('squat') || !get('bench') || !get('deadlift')) return null
    return { total, score: dotsScore(total, bw, settings.sex) }
  }, [strength, bw, settings.sex])

  const bwSeries = useMemo(() => measurements.filter((m) => m.bodyweightLb != null).map((m) => ({ x: m.date.slice(5).replace('-', '/'), y: Math.round(fromLb(m.bodyweightLb!, units) * 10) / 10 })), [measurements, units])

  const prs = useMemo(() => {
    const best = new Map<string, { w: number; reps: number; e: number; when: number }>()
    for (const w of workouts) for (const e of w.exercises) for (const s of e.sets) {
      if (!isCountedSet(s) || !(s.weightLb ?? 0)) continue
      const v = e1rm(s.weightLb!, s.reps!)
      const cur = best.get(e.exerciseId)
      if (!cur || v > cur.e) best.set(e.exerciseId, { w: s.weightLb!, reps: s.reps!, e: v, when: w.startedAt })
    }
    return [...best.entries()].map(([id, b]) => ({ id, name: exMap.get(id)?.name ?? id, ...b })).sort((a, b) => b.e - a.e)
  }, [workouts, exMap])

  const fmtVol = (v: number) => formatVolume(v, units)
  return (
    <div className="fade-in">
      <PageHeader title="Progress" large />
      <div className="px-4 space-y-4">
        <Segmented value={range} options={RANGES as unknown as { value: '8' | '16' | '52'; label: string }[]} onChange={setRange} />
        <div className="card p-3">
          <div className="font-bold mb-1">Weekly volume <span className="text-muted font-normal text-sm">({units})</span></div>
          <BarChart labels={weekly.labels} values={weekly.vol} fmt={fmtVol} height={170} />
        </div>
        <div className="card p-3">
          <div className="font-bold mb-1">Workouts per week</div>
          <BarChart labels={weekly.labels} values={weekly.count} height={120} />
        </div>

        <div className="card">
          <div className="px-4 pt-3 font-bold">Sets per muscle · this week</div>
          <div className="px-4 pb-1 text-xs text-muted">Guideline: 10–20 working sets per muscle per week</div>
          <ul className="px-4 pb-3 space-y-2 mt-2">
            {thisWeekMuscles.length ? thisWeekMuscles.map(({ m, sets, avg }) => (
              <li key={m} className="flex items-center gap-3 text-sm">
                <span className="w-24 truncate">{MUSCLE_LABELS[m]}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden"><div className={`h-full rounded-full ${sets >= 10 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${Math.min(100, (sets / 20) * 100)}%` }} /></div>
                <span className="w-8 text-right num font-semibold">{sets}</span>
                <span className="w-12 text-right num text-xs text-muted">avg {avg.toFixed(0)}</span>
              </li>
            )) : <li className="text-muted text-sm">No sets this week yet.</li>}
          </ul>
        </div>

        <div className="card">
          <div className="px-4 pt-3 pb-1 font-bold">Strength profile</div>
          {!bw ? <p className="px-4 pb-3 text-sm text-muted">Log your bodyweight below to rate your lifts against strength standards.</p>
            : !strength.length ? <p className="px-4 pb-3 text-sm text-muted">Log a squat, bench, deadlift, press, row, pull-up or dip to see your level.</p>
            : (
              <ul className="divide-y divide-border">
                {strength.map((s) => (
                  <li key={s.key}><Link to={`/exercises/${s.exId}`} className="px-4 py-2.5 block">
                    <div className="flex items-center justify-between text-sm"><span className="font-medium">{s.name}</span><span className="num text-text-2">{formatWeight(s.e1rm, units)} {units} e1RM</span></div>
                    <div className="flex items-center gap-2 mt-1">
                      <LevelBar levelIndex={s.r.levelIndex} progress={s.r.progress} />
                      <span className={`text-xs font-semibold w-24 text-right ${levelColor(s.r.levelIndex)}`}>{s.r.level ?? 'Untrained'}</span>
                    </div>
                  </Link></li>
                ))}
              </ul>
            )}
          {dots && <div className="px-4 py-3 border-t border-border flex items-center justify-between"><div><div className="font-semibold">DOTS score</div><div className="text-xs text-muted">SBD total {formatWeight(dots.total, units)} {units} at {formatWeight(bw!, units)} {units}</div></div><div className="text-right"><div className="text-2xl font-bold num">{dots.score.toFixed(0)}</div><div className="text-xs text-muted">{dotsLabel(dots.score)}</div></div></div>}
          <p className="px-4 pb-3 text-[11px] text-muted">Levels are population estimates for {settings.sex} lifters at your bodyweight, using your best estimated 1RM from the last 90 days.</p>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold flex items-center gap-2"><Scale size={18} /> Bodyweight {bw && <span className="text-muted font-normal text-sm">{formatWeight(bw, units)} {units}</span>}</div>
            <button className="btn btn-sm btn-secondary" onClick={() => setLogBw(true)}><Plus size={14} /> Log</button>
          </div>
          {bwSeries.length > 1 ? <LineChart series={[{ label: units, points: bwSeries }]} height={160} fill={false} yMin={undefined} /> : <p className="text-sm text-muted">Log your weight regularly to see the trend and to unlock strength standards.</p>}
        </div>

        {prs.length > 0 && (
          <div className="card">
            <div className="px-4 pt-3 pb-1 font-bold">All-time bests <span className="text-muted font-normal text-sm">(est. 1RM)</span></div>
            <ul className="divide-y divide-border">
              {prs.slice(0, 15).map((p) => (
                <li key={p.id}><Link to={`/exercises/${p.id}`} className="flex items-center gap-3 px-4 py-2.5"><span className="flex-1 font-medium truncate">{p.name}</span><span className="num font-semibold">{formatWeight(p.e, units)}</span><span className="text-xs text-muted num w-16 text-right">{formatWeight(p.w, units)}×{p.reps}</span></Link></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {logBw && <BodyweightSheet onClose={() => setLogBw(false)} units={units} current={bw} />}
    </div>
  )
}

export function levelColor(i: number) {
  return ['text-muted', 'text-text-2', 'text-accent', 'text-success', 'text-pr'][i + 1] ?? 'text-muted'
}
export function LevelBar({ levelIndex, progress }: { levelIndex: number; progress: number }) {
  return (
    <div className="flex-1 flex gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
          <div className="h-full bg-accent" style={{ width: i < levelIndex ? '100%' : i === levelIndex ? `${progress * 100}%` : i === levelIndex + 1 && levelIndex < 0 ? `${progress * 100}%` : '0%' }} />
        </div>
      ))}
    </div>
  )
}

export function BodyweightSheet({ onClose, units, current }: { onClose: () => void; units: 'lb' | 'kg'; current?: number }) {
  const [v, setV] = useState<number | null>(current != null ? Math.round(fromLb(current, units) * 10) / 10 : null)
  const [bf, setBf] = useState<number | null>(null)
  const [date, setDate] = useState(dayKey())
  const save = async () => {
    if (v == null) return
    const existing = await db.measurements.where('date').equals(date).first()
    await db.measurements.put({ id: existing?.id ?? uid(), date, bodyweightLb: toLb(v, units), bodyfatPct: bf ?? existing?.bodyfatPct })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Log bodyweight">
      <div className="space-y-3">
        <label><span className="label">Date</span><input type="date" className="field mt-1" value={date} max={dayKey()} onChange={(e) => setDate(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="label">Weight ({units})</span><NumberField className="mt-1 h-12 text-lg" value={v} onChange={setV} placeholder="0" /></label>
          <label><span className="label">Body fat % · optional</span><NumberField className="mt-1 h-12 text-lg" value={bf} onChange={setBf} placeholder="—" /></label>
        </div>
        <button className="btn btn-primary w-full" onClick={save} disabled={v == null}>Save</button>
      </div>
    </Sheet>
  )
}
