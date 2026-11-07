import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useExerciseMap, useWorkouts } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { dayKey, formatDuration } from '@/logic/dates'
import { workoutSetCount, workoutVolume } from '@/logic/records'
import { formatVolume } from '@/logic/units'

export default function HistoryPage() {
  const workouts = useWorkouts()
  const exMap = useExerciseMap()
  const { units } = useSettings()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [sel, setSel] = useState<string | null>(null)
  const days = useMemo(() => { const m = new Map<string, number>(); for (const w of workouts) { const k = dayKey(w.startedAt); m.set(k, (m.get(k) ?? 0) + 1) } return m }, [workouts])
  const grid = useMemo(() => {
    const first = (month.getDay() + 6) % 7
    const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const cells: (string | null)[] = Array(first).fill(null)
    for (let d = 1; d <= n; d++) cells.push(dayKey(new Date(month.getFullYear(), month.getMonth(), d)))
    return cells
  }, [month])
  const list = useMemo(() => (sel ? workouts.filter((w) => dayKey(w.startedAt) === sel) : workouts.filter((w) => { const d = new Date(w.startedAt); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth() })), [workouts, sel, month])
  const today = dayKey()
  return (
    <div className="fade-in">
      <PageHeader title="History" back="/more" />
      <div className="px-4 space-y-4">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); setSel(null) }} aria-label="Previous month"><ChevronLeft /></button>
            <div className="font-bold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); setSel(null) }} aria-label="Next month"><ChevronRight /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-muted font-semibold mb-1">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((k, i) => k ? (
              <button key={k} onClick={() => setSel(sel === k ? null : k)} className={`h-10 rounded-lg flex flex-col items-center justify-center text-sm num ${sel === k ? 'bg-accent text-on-accent' : k === today ? 'bg-surface-2 font-bold' : ''}`}>
                {Number(k.slice(8))}
                {days.has(k) && <span className={`h-1.5 w-1.5 rounded-full mt-0.5 ${sel === k ? 'bg-on-accent' : 'bg-success'}`} />}
              </button>
            ) : <div key={`e${i}`} />)}
          </div>
        </div>
        {list.length ? (
          <div className="card divide-y divide-border">
            {list.map((w) => {
              const prs = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.pr?.length).length, 0)
              return (
                <Link key={w.id} to={`/history/${w.id}`} className="block px-4 py-3">
                  <div className="flex items-center justify-between"><span className="font-semibold">{w.name}</span><span className="text-xs text-muted">{new Date(w.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                  <div className="text-xs text-muted mt-0.5 truncate">{w.exercises.map((e) => exMap.get(e.exerciseId)?.name).filter(Boolean).join(', ')}</div>
                  <div className="flex gap-3 text-xs text-text-2 mt-1 num"><span>{formatDuration((w.endedAt ?? w.startedAt) - w.startedAt)}</span><span>{workoutSetCount(w)} sets</span><span>{formatVolume(workoutVolume(w), units)} {units}</span>{prs > 0 && <span className="text-pr inline-flex items-center gap-1"><Trophy size={12} /> {prs}</span>}</div>
                </Link>
              )
            })}
          </div>
        ) : <EmptyState title={sel ? 'No workout that day' : 'No workouts this month'} body="Finished workouts show up here." />}
      </div>
    </div>
  )
}
