import { ChevronRight, Flame, Play, TrendingUp, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/ui/PageHeader'
import { Ring } from '@/components/ui/Ring'
import { useExerciseMap, useMeasurements, usePrograms, useRoutines, useWorkouts } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { db } from '@/db/db'
import { dayKey, formatDateTime, startOfWeek } from '@/logic/dates'
import { effectiveTargets, latestBodyweight, totalsFor } from '@/logic/nutrition'
import { suggest } from '@/logic/progression'
import { workoutVolume } from '@/logic/records'
import { formatVolume, formatWeight } from '@/logic/units'
import { active, progressionOpts, startWorkout } from '@/store/activeWorkout'
import { Stat } from './WorkoutPage'

export default function HomePage() {
  const settings = useSettings()
  const workouts = useWorkouts()
  const exMap = useExerciseMap()
  const routines = useRoutines()
  const programs = usePrograms()
  const measurements = useMeasurements()
  const nav = useNavigate()
  const activeW = active.use((s) => s.workout)
  const today = dayKey()
  const todayEntries = useLiveQuery(() => db.nutritionEntries.where('date').equals(today).toArray(), [today], [])
  const totals = totalsFor(todayEntries ?? [])
  const targets = effectiveTargets(settings, latestBodyweight(measurements))

  const program = programs.find((p) => p.id === settings.activeProgramId)
  const next = program ? routines.find((r) => r.id === program.routineIds[settings.programCursor % program.routineIds.length]) : undefined

  const week = useMemo(() => {
    const start = startOfWeek().getTime()
    const list = workouts.filter((w) => w.startedAt >= start)
    return { count: list.length, volume: list.reduce((a, w) => a + workoutVolume(w), 0) }
  }, [workouts])

  const streak = useMemo(() => {
    // consecutive weeks (incl. this one) with ≥1 workout
    let n = 0
    let ws = startOfWeek().getTime()
    const weeksWith = new Set(workouts.map((w) => startOfWeek(w.startedAt).getTime()))
    if (!weeksWith.has(ws)) ws -= 7 * 86400000
    while (weeksWith.has(ws)) { n++; ws -= 7 * 86400000 }
    return n
  }, [workouts])

  const ready = useMemo(() => {
    const ids = new Set<string>()
    for (const w of workouts.slice(0, 12)) for (const e of w.exercises) ids.add(e.exerciseId)
    const out: { id: string; name: string; text: string }[] = []
    for (const id of ids) {
      const ex = exMap.get(id)
      if (!ex || ex.kind === 'duration') continue
      const s = suggest(ex, workouts, progressionOpts(settings, ex))
      if (s.kind === 'increase') out.push({ id, name: ex.name, text: `${formatWeight(s.weightLb, settings.units, true)} × ${s.reps}` })
      else if (s.kind === 'deload') out.push({ id, name: ex.name, text: `Deload to ${formatWeight(s.weightLb, settings.units, true)}` })
    }
    return out.slice(0, 6)
  }, [workouts, exMap, settings])

  const recentPrs = useMemo(() => {
    const out: { name: string; text: string; when: number }[] = []
    for (const w of workouts.slice(0, 10)) for (const e of w.exercises) for (const s of e.sets) if (s.pr?.length) {
      out.push({ name: exMap.get(e.exerciseId)?.name ?? '', text: `${formatWeight(s.weightLb, settings.units, true)} × ${s.reps}`, when: w.startedAt })
    }
    return out.slice(0, 5)
  }, [workouts, exMap, settings.units])

  return (
    <div className="fade-in">
      <PageHeader title={greeting()} large subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} />
      <div className="px-4 space-y-4">
        {activeW ? (
          <button className="card w-full p-4 text-left border-success/60 flex items-center gap-3" onClick={() => nav('/workout')}>
            <span className="h-3 w-3 rounded-full bg-success animate-pulse" />
            <div className="flex-1"><div className="font-bold">Workout in progress</div><div className="text-sm text-muted">{activeW.name}</div></div>
            <ChevronRight className="text-muted" />
          </button>
        ) : next ? (
          <div className="card p-4">
            <div className="label text-accent mb-1">Up next · {program?.name}</div>
            <div className="text-2xl font-bold">{next.name}</div>
            <div className="text-sm text-muted mb-3 truncate">{next.exercises.map((e) => exMap.get(e.exerciseId)?.name).filter(Boolean).join(' · ')}</div>
            <button className="btn btn-primary w-full" onClick={() => startWorkout(next, next.name, exMap, settings).then(() => nav('/workout'))}><Play size={18} /> Start workout</button>
          </div>
        ) : (
          <div className="card p-4">
            <div className="text-lg font-bold">No program selected</div>
            <p className="text-sm text-muted mb-3">Pick a built-in program or build your own routine.</p>
            <div className="flex gap-2">
              <Link to="/routines" className="btn btn-primary flex-1">Choose program</Link>
              <button className="btn btn-secondary flex-1" onClick={() => nav('/workout')}>Quick start</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="This week" value={String(week.count)} sub={week.count === 1 ? 'workout' : 'workouts'} />
          <Stat label="Volume" value={formatVolume(week.volume, settings.units)} sub={settings.units} />
          <Stat label="Streak" value={String(streak)} sub={streak === 1 ? 'week' : 'weeks'} />
        </div>

        <Link to="/nutrition" className="card p-3 flex items-center gap-4">
          <Ring value={totals.calories} max={targets.calories} size={56} stroke={7} over><Flame size={18} className="text-text-2" /></Ring>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div><div className="label">Calories</div><div className="font-bold num">{Math.round(totals.calories)} <span className="text-muted font-normal">/ {targets.calories}</span></div></div>
            <div><div className="label">Protein</div><div className="font-bold num">{Math.round(totals.proteinG)}g <span className="text-muted font-normal">/ {targets.proteinG}g</span></div></div>
          </div>
          <ChevronRight className="text-muted" />
        </Link>

        {ready.length > 0 && (
          <div className="card">
            <div className="px-4 pt-3 pb-1 flex items-center gap-2 font-bold"><TrendingUp size={18} className="text-success" /> Ready to progress</div>
            <ul className="divide-y divide-border">
              {ready.map((r) => (
                <li key={r.id}><Link to={`/exercises/${r.id}`} className="flex items-center px-4 py-2.5 gap-3"><span className="flex-1 font-medium truncate">{r.name}</span><span className="text-sm text-success font-semibold num">{r.text}</span><ChevronRight size={16} className="text-muted" /></Link></li>
              ))}
            </ul>
          </div>
        )}

        {recentPrs.length > 0 && (
          <div className="card">
            <div className="px-4 pt-3 pb-1 flex items-center gap-2 font-bold"><Trophy size={18} className="text-pr" /> Recent PRs</div>
            <ul className="divide-y divide-border">
              {recentPrs.map((p, i) => (
                <li key={i} className="flex items-center px-4 py-2.5 gap-3"><span className="flex-1 font-medium truncate">{p.name}</span><span className="text-sm num font-semibold">{p.text}</span><span className="text-xs text-muted">{formatDateTime(p.when).split(',')[0]}</span></li>
              ))}
            </ul>
          </div>
        )}

        {workouts.length > 0 && (
          <div className="card">
            <div className="px-4 pt-3 pb-1 font-bold flex items-center justify-between">Recent workouts <Link to="/history" className="text-sm text-accent font-semibold">All</Link></div>
            <ul className="divide-y divide-border">
              {workouts.slice(0, 3).map((w) => (
                <li key={w.id}><Link to={`/history/${w.id}`} className="flex items-center px-4 py-2.5 gap-3">
                  <div className="flex-1 min-w-0"><div className="font-medium truncate">{w.name}</div><div className="text-xs text-muted">{formatDateTime(w.startedAt)}</div></div>
                  <div className="text-sm num text-text-2">{formatVolume(workoutVolume(w), settings.units)} {settings.units}</div><ChevronRight size={16} className="text-muted" />
                </Link></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
