import { Check, ChevronLeft, ChevronRight, Droplets, Flame, Minus, Pill, Plus, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/ui/PageHeader'
import { Ring } from '@/components/ui/Ring'
import { Sheet } from '@/components/ui/Sheet'
import { NumberField } from '@/components/ui/NumberField'
import { toast } from '@/components/ui/Toast'
import { BarChart, LineChart, cssVar } from '@/components/charts/charts'
import { db } from '@/db/db'
import type { DailyLog, NutritionEntry, QuickFood, Settings } from '@/db/types'
import { useMeasurements } from '@/hooks/useData'
import { useSettings } from '@/hooks/useSettings'
import { addDays, dayKey, relativeDay, uid } from '@/logic/dates'
import { creatineStreak, effectiveTargets, formatWater, groupByDay, latestBodyweight, rollingAverage, totalsFor, waterToUnit } from '@/logic/nutrition'
import { lbToKg } from '@/logic/units'

const EMPTY: never[] = []

export default function NutritionPage() {
  const settings = useSettings()
  const measurements = useMeasurements()
  const [day, setDay] = useState(dayKey())
  const [adding, setAdding] = useState<Partial<NutritionEntry> | null>(null)
  const entries = useLiveQuery(() => db.nutritionEntries.where('date').equals(day).sortBy('time'), [day], [] as NutritionEntry[]) ?? []
  const all = useLiveQuery(() => db.nutritionEntries.toArray(), [], EMPTY as NutritionEntry[]) ?? EMPTY
  const foods = useLiveQuery(() => db.quickFoods.orderBy('uses').reverse().limit(12).toArray(), [], [] as QuickFood[]) ?? []
  const dailyLogs = useLiveQuery(() => db.dailyLog.toArray(), [], EMPTY as DailyLog[]) ?? EMPTY
  const daily = dailyLogs.find((l) => l.date === day) ?? { date: day, creatine: false, waterMl: 0 }
  const bw = latestBodyweight(measurements)
  const targets = effectiveTargets(settings, bw)
  const t = totalsFor(entries)
  const avg7 = rollingAverage(all, dayKey(), 7)
  const avg30 = rollingAverage(all, dayKey(), 30)
  const today = dayKey()

  const series = useMemo(() => {
    const byDay = groupByDay(all)
    const cal: { x: string; y: number }[] = [], pro: { x: string; y: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const k = addDays(today, -i)
      const d = byDay.get(k)
      if (!d) continue
      const tt = totalsFor(d)
      const label = k.slice(5).replace('-', '/')
      cal.push({ x: label, y: Math.round(tt.calories) })
      pro.push({ x: label, y: Math.round(tt.proteinG) })
    }
    return { cal, pro }
  }, [all, today])
  const water = useMemo(() => {
    const byDay = new Map(dailyLogs.map((l) => [l.date, l]))
    const labels: string[] = [], values: number[] = []
    for (let i = 13; i >= 0; i--) {
      const k = addDays(today, -i)
      labels.push(k.slice(5).replace('-', '/'))
      values.push(Math.round(waterToUnit(byDay.get(k)?.waterMl ?? 0, settings.waterUnit) * 100) / 100)
    }
    return { labels, values, logged: dailyLogs.filter((l) => l.waterMl > 0).length }
  }, [dailyLogs, today, settings.waterUnit])
  const streak = creatineStreak(dailyLogs, today)

  const logFood = async (f: QuickFood) => {
    await db.nutritionEntries.add({ id: uid(), date: day, time: Date.now(), label: f.name, calories: f.calories, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG })
    await db.quickFoods.update(f.id, { uses: f.uses + 1 })
    toast(`Logged ${f.name}`, 'success')
  }

  return (
    <div className="fade-in">
      <PageHeader title="Nutrition" large actions={<button className="btn btn-primary btn-sm" onClick={() => setAdding({})}><Plus size={16} /> Log</button>} />
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day"><ChevronLeft /></button>
          <button className="font-bold" onClick={() => setDay(today)}>{relativeDay(day)}</button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDay(addDays(day, 1))} disabled={day >= today} aria-label="Next day"><ChevronRight /></button>
        </div>

        <div className="card p-4 flex items-center justify-around">
          <Ring value={t.calories} max={targets.calories} size={110} stroke={11} over>
            <Flame size={16} className="text-muted" />
            <div className="text-xl font-bold num leading-tight">{Math.round(t.calories)}</div>
            <div className="text-[11px] text-muted">/ {targets.calories} kcal</div>
          </Ring>
          <Ring value={t.proteinG} max={targets.proteinG} size={110} stroke={11} color="var(--success)">
            <div className="text-[11px] text-muted font-semibold">PROTEIN</div>
            <div className="text-xl font-bold num leading-tight">{Math.round(t.proteinG)}g</div>
            <div className="text-[11px] text-muted">/ {targets.proteinG}g</div>
          </Ring>
        </div>
        {(targets.carbsG || targets.fatG || t.carbsG > 0 || t.fatG > 0) ? (
          <div className="grid grid-cols-2 gap-2">
            <Macro label="Carbs" value={t.carbsG} target={targets.carbsG} />
            <Macro label="Fat" value={t.fatG} target={targets.fatG} />
          </div>
        ) : null}

        <DailyCard daily={daily} streak={streak} settings={settings} />

        {foods.length > 0 && (
          <div>
            <div className="label mb-2 px-1">Quick add</div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
              {foods.map((f) => (
                <button key={f.id} className="chip h-auto py-2 flex-col items-start gap-0 shrink-0" onClick={() => logFood(f)}>
                  <span className="text-text font-semibold">{f.name}</span>
                  <span className="text-[11px] text-muted num">{f.calories} kcal · {f.proteinG}g P</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="px-4 pt-3 pb-1 font-bold">{relativeDay(day)}'s log</div>
          {entries.length ? (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button className="flex-1 min-w-0 text-left" onClick={() => setAdding(e)}>
                    <div className="font-medium truncate">{e.label}</div>
                    <div className="text-xs text-muted">{new Date(e.time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}{e.carbsG || e.fatG ? ` · C ${e.carbsG ?? 0} · F ${e.fatG ?? 0}` : ''}</div>
                  </button>
                  <div className="text-right num"><div className="font-semibold">{e.calories}</div><div className="text-xs text-success">{e.proteinG}g P</div></div>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 pb-4 text-muted text-sm">Nothing logged yet. Tap Log to add a meal, shake or snack.</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="card p-3"><div className="label">7-day avg</div><div className="font-bold num">{Math.round(avg7.calories)} kcal</div><div className="text-sm text-success num">{Math.round(avg7.proteinG)}g protein</div><div className="text-xs text-muted">{avg7.daysLogged} days logged</div></div>
          <div className="card p-3"><div className="label">30-day avg</div><div className="font-bold num">{Math.round(avg30.calories)} kcal</div><div className="text-sm text-success num">{Math.round(avg30.proteinG)}g protein</div><div className="text-xs text-muted">{avg30.daysLogged} days logged</div></div>
        </div>

        {water.logged > 1 && (
          <div className="card p-3"><div className="font-bold mb-2">Water · last 14 days</div><BarChart labels={water.labels} values={water.values} target={Math.round(waterToUnit(settings.waterTargetMl, settings.waterUnit))} color={cssVar('--water')} highlightLast={false} height={160} fmt={(v) => `${v} ${settings.waterUnit}`} /></div>
        )}

        {series.cal.length > 1 && (
          <>
            <div className="card p-3"><div className="font-bold mb-2">Calories · last 30 days</div><LineChart series={[{ label: 'kcal', points: series.cal }]} target={targets.calories} height={180} /></div>
            <div className="card p-3"><div className="font-bold mb-2">Protein · last 30 days</div><LineChart series={[{ label: 'g', points: series.pro, color: getComputedStyle(document.documentElement).getPropertyValue('--success').trim() }]} target={targets.proteinG} height={180} />
              {bw && <div className="text-xs text-muted mt-2">Today: {(t.proteinG / bw).toFixed(2)} g per lb bodyweight ({(t.proteinG / lbToKg(bw)).toFixed(1)} g/kg)</div>}</div>
          </>
        )}
      </div>
      {adding && <EntrySheet initial={adding} day={day} onClose={() => setAdding(null)} />}
    </div>
  )
}

/** Creatine tick + water tracker for the selected day. */
function DailyCard({ daily, streak, settings }: { daily: DailyLog; streak: number; settings: Settings }) {
  const glass = settings.waterGlassMl
  const target = settings.waterTargetMl
  const unit = settings.waterUnit
  const pct = target > 0 ? Math.min(1, daily.waterMl / target) : 0
  const glasses = Math.max(1, Math.round(target / glass))
  const filled = Math.min(glasses, Math.floor(daily.waterMl / glass + 1e-6))
  const save = (patch: Partial<DailyLog>) => db.dailyLog.put({ ...daily, ...patch })
  const addWater = (ml: number) => {
    const next = Math.max(0, daily.waterMl + ml)
    void save({ waterMl: next })
    if (ml > 0 && daily.waterMl < target && next >= target) toast('Water target hit 💧', 'success')
  }
  const step = (n: number) => `+${formatWater(glass * n, unit)}`
  return (
    <div className="card divide-y divide-border">
      <button className="flex items-center gap-3 w-full text-left px-4 py-3" onClick={() => save({ creatine: !daily.creatine })} role="checkbox" aria-checked={daily.creatine} aria-label="Creatine taken">
        <span className={`h-7 w-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${daily.creatine ? 'bg-success border-success text-bg' : 'border-border'}`}>{daily.creatine && <Check size={18} strokeWidth={3} />}</span>
        <span className="flex-1"><span className="font-bold flex items-center gap-1.5"><Pill size={16} className="text-muted" /> Creatine</span><span className="text-xs text-muted">{streak > 0 ? `${streak}-day streak` : 'Tap when you\'ve taken it'}</span></span>
      </button>
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 font-bold"><Droplets size={16} className="text-water" /> Water <span className="ml-auto num font-semibold text-sm">{formatWater(daily.waterMl, unit)} <span className="text-muted font-normal">/ {formatWater(target, unit)}</span></span></div>
        <div className="mt-2 h-2.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full bg-water transition-[width] duration-300" style={{ width: `${pct * 100}%` }} /></div>
        <div className="mt-2 flex items-center gap-1 flex-wrap" aria-hidden>
          {Array.from({ length: glasses }, (_, i) => <Droplets key={i} size={16} className={i < filled ? 'text-water' : 'text-border'} fill={i < filled ? 'currentColor' : 'none'} />)}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn btn-secondary btn-icon" onClick={() => addWater(-glass)} disabled={daily.waterMl <= 0} aria-label="Remove a glass"><Minus size={18} /></button>
          <button className="btn btn-primary flex-1 px-2 whitespace-nowrap" onClick={() => addWater(glass)}>{step(1)}</button>
          <button className="btn btn-secondary flex-1 px-2 whitespace-nowrap" onClick={() => addWater(glass * 2)}>{step(2)}</button>
          <button className="btn btn-secondary flex-1 px-2 whitespace-nowrap" onClick={() => addWater(glass * 4)}>{step(4)}</button>
        </div>
        <div className="mt-1.5 text-xs text-muted">Glass size and target are in Settings.</div>
      </div>
    </div>
  )
}

function Macro({ label, value, target }: { label: string; value: number; target?: number }) {
  return <div className="card p-3"><div className="label">{label}</div><div className="font-bold num">{Math.round(value)}g {target ? <span className="text-muted font-normal">/ {target}g</span> : null}</div></div>
}

function EntrySheet({ initial, day, onClose }: { initial: Partial<NutritionEntry>; day: string; onClose: () => void }) {
  const [label, setLabel] = useState(initial.label ?? '')
  const [cal, setCal] = useState<number | null>(initial.calories ?? null)
  const [pro, setPro] = useState<number | null>(initial.proteinG ?? null)
  const [carb, setCarb] = useState<number | null>(initial.carbsG ?? null)
  const [fat, setFat] = useState<number | null>(initial.fatG ?? null)
  const [save, setSave] = useState(false)
  const editing = !!initial.id
  const submit = async () => {
    const e: NutritionEntry = { id: initial.id ?? uid(), date: initial.date ?? day, time: initial.time ?? Date.now(), label: label.trim() || 'Meal', calories: cal ?? 0, proteinG: pro ?? 0, carbsG: carb ?? undefined, fatG: fat ?? undefined }
    await db.nutritionEntries.put(e)
    if (save && !editing) await db.quickFoods.put({ id: uid(), name: e.label, calories: e.calories, proteinG: e.proteinG, carbsG: e.carbsG, fatG: e.fatG, uses: 1 })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={editing ? 'Edit entry' : 'Log food'}>
      <div className="space-y-3">
        <input className="field" placeholder="What did you eat? (e.g. Chicken & rice)" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus={!editing} />
        <div className="grid grid-cols-2 gap-3">
          <label><span className="label">Calories</span><NumberField className="mt-1 h-12 text-lg" value={cal} onChange={setCal} integer placeholder="0" /></label>
          <label><span className="label">Protein (g)</span><NumberField className="mt-1 h-12 text-lg" value={pro} onChange={setPro} integer placeholder="0" /></label>
          <label><span className="label">Carbs (g) · optional</span><NumberField className="mt-1" value={carb} onChange={setCarb} integer placeholder="—" /></label>
          <label><span className="label">Fat (g) · optional</span><NumberField className="mt-1" value={fat} onChange={setFat} integer placeholder="—" /></label>
        </div>
        {!editing && <label className="flex items-center gap-3 py-1"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={save} onChange={(e) => setSave(e.target.checked)} /><span className="flex items-center gap-1"><Star size={16} className="text-pr" /> Save as quick-add favourite</span></label>}
        <div className="flex gap-2">
          {editing && <button className="btn btn-danger btn-icon" onClick={async () => { await db.nutritionEntries.delete(initial.id!); onClose() }} aria-label="Delete"><Trash2 size={18} /></button>}
          <button className="btn btn-primary flex-1" onClick={submit} disabled={cal == null && pro == null}>{editing ? 'Save' : 'Log it'}</button>
        </div>
      </div>
    </Sheet>
  )
}
