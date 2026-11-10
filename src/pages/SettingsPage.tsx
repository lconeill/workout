import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Row } from '@/components/ui/Row'
import { Segmented } from '@/components/ui/Segmented'
import { NumberField } from '@/components/ui/NumberField'
import { confirmDialog } from '@/components/ui/Confirm'
import { toast } from '@/components/ui/Toast'
import { db } from '@/db/db'
import { exportBackup, importBackup, isBackupFile, workoutsToCsv } from '@/db/backup'
import { ensureSeeded } from '@/db/seed'
import { updateSettings, useSettings } from '@/hooks/useSettings'
import { useExerciseMap } from '@/hooks/useData'
import { requestNotifyPermission } from '@/store/restTimer'
import { dayKey } from '@/logic/dates'
import { formatWeight, fromLb, toLb } from '@/logic/units'
import { waterFromUnit, waterToUnit } from '@/logic/nutrition'

function download(name: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function SettingsPage() {
  const s = useSettings()
  const exMap = useExerciseMap()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const u = s.units
  const plates = s.platesLb.map((p) => formatWeight(p, u)).join(', ')

  const onImport = async (f: File) => {
    setBusy(true)
    try {
      const data = JSON.parse(await f.text())
      if (!isBackupFile(data)) { toast('Not a Lift backup file'); return }
      const replace = await confirmDialog({ title: 'Import backup', body: `${data.workouts.length} workouts, ${data.nutritionEntries?.length ?? 0} nutrition entries. Replace everything on this device, or merge into it?`, confirmText: 'Replace all', danger: true })
      await importBackup(data, replace ? 'replace' : 'merge')
      await ensureSeeded()
      toast('Import complete', 'success')
    } catch (e) { toast(`Import failed: ${(e as Error).message}`) } finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="fade-in">
      <PageHeader title="Settings" back="/more" />
      <div className="px-4 space-y-5">
        <Section title="Units & equipment">
          <div className="px-4 py-3"><div className="label mb-2">Weight unit</div><Segmented value={u} options={[{ value: 'lb', label: 'Pounds (lb)' }, { value: 'kg', label: 'Kilograms (kg)' }]} onChange={(v) => updateSettings({ units: v, barWeightLb: v === 'kg' ? 44.0925 : 45, platesLb: v === 'kg' ? [25, 20, 15, 10, 5, 2.5, 1.25].map((k) => k * 2.2046226218) : [45, 35, 25, 10, 5, 2.5] })} /></div>
          <div className="px-4 py-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium">Bar weight</div><div className="text-xs text-muted">Used by the plate calculator</div></div><div className="w-24"><NumberField value={Math.round(fromLb(s.barWeightLb, u) * 100) / 100} onChange={(v) => v != null && updateSettings({ barWeightLb: toLb(v, u) })} /></div><span className="text-muted">{u}</span></div>
          <div className="px-4 py-3"><div className="font-medium">Available plates ({u})</div><input className="field mt-1" defaultValue={plates} onBlur={(e) => { const arr = e.target.value.split(/[,\s]+/).map(Number).filter((n) => n > 0); if (arr.length) updateSettings({ platesLb: arr.map((n) => toLb(n, u)).sort((a, b) => b - a) }) }} /><div className="text-xs text-muted mt-1">Comma-separated, per side.</div></div>
          <div className="px-4 py-3"><div className="label mb-2">Sex (for strength standards)</div><Segmented value={s.sex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} onChange={(v) => updateSettings({ sex: v })} /></div>
        </Section>

        <Section title="Workout">
          <div className="px-4 py-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium">Default rest</div><div className="text-xs text-muted">For new exercises</div></div><div className="w-24"><NumberField value={s.defaultRestSec} onChange={(v) => v != null && updateSettings({ defaultRestSec: v })} integer /></div><span className="text-muted">sec</span></div>
          <Toggle title="Auto-start rest timer" sub="When you tick a working set" value={s.autoStartRest} onChange={(v) => updateSettings({ autoStartRest: v })} />
          <Toggle title="Keep screen on" sub="During a workout" value={s.keepScreenOn} onChange={(v) => updateSettings({ keepScreenOn: v })} />
          <Row title="Rest timer notifications" subtitle={'Notification' in window ? `Permission: ${Notification.permission}` : 'Not supported'} onClick={async () => { toast((await requestNotifyPermission()) ? 'Notifications enabled' : 'Not granted') }} chevron />
        </Section>

        <Section title="Progression">
          <div className="px-4 py-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium">Deload after</div><div className="text-xs text-muted">Consecutive sessions missing the rep target</div></div><div className="w-20"><NumberField value={s.failuresBeforeDeload} onChange={(v) => v != null && v > 0 && updateSettings({ failuresBeforeDeload: v })} integer /></div><span className="text-muted text-sm">misses</span></div>
          <div className="px-4 py-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium">Deload amount</div></div><div className="w-20"><NumberField value={s.deloadPct} onChange={(v) => v != null && updateSettings({ deloadPct: v })} integer /></div><span className="text-muted">%</span></div>
          <p className="px-4 pb-3 text-xs text-muted">Weight increments and rep ranges are set per exercise (open an exercise → pencil icon).</p>
        </Section>

        <Section title="Nutrition targets">
          <div className="px-4 py-3 grid grid-cols-2 gap-3">
            <label><span className="label">Calories</span><NumberField className="mt-1" value={s.nutritionTargets.calories} onChange={(v) => v != null && updateSettings({ nutritionTargets: { ...s.nutritionTargets, calories: v } })} integer /></label>
            <label><span className="label">Protein (g)</span><NumberField className="mt-1" value={s.nutritionTargets.proteinG} onChange={(v) => v != null && updateSettings({ nutritionTargets: { ...s.nutritionTargets, proteinG: v } })} integer disabled={!!s.proteinPerLb} /></label>
            <label><span className="label">Carbs (g) · optional</span><NumberField className="mt-1" value={s.nutritionTargets.carbsG ?? null} onChange={(v) => updateSettings({ nutritionTargets: { ...s.nutritionTargets, carbsG: v ?? undefined } })} integer placeholder="—" /></label>
            <label><span className="label">Fat (g) · optional</span><NumberField className="mt-1" value={s.nutritionTargets.fatG ?? null} onChange={(v) => updateSettings({ nutritionTargets: { ...s.nutritionTargets, fatG: v ?? undefined } })} integer placeholder="—" /></label>
          </div>
          <div className="px-4 pb-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium">Protein from bodyweight</div><div className="text-xs text-muted">g per lb of latest logged bodyweight (0.7–1.0 typical). Leave blank to use the fixed target.</div></div><div className="w-20"><NumberField value={s.proteinPerLb ?? null} onChange={(v) => updateSettings({ proteinPerLb: v ?? undefined })} placeholder="—" /></div></div>
        </Section>

        <Section title="Water & creatine">
          <div className="px-4 py-3 grid grid-cols-2 gap-3">
            <label><span className="label">Daily target ({s.waterUnit})</span><NumberField className="mt-1" value={Math.round(waterToUnit(s.waterTargetMl, s.waterUnit))} onChange={(v) => v != null && v > 0 && updateSettings({ waterTargetMl: waterFromUnit(v, s.waterUnit) })} integer /></label>
            <label><span className="label">Glass size ({s.waterUnit})</span><NumberField className="mt-1" value={Math.round(waterToUnit(s.waterGlassMl, s.waterUnit))} onChange={(v) => v != null && v > 0 && updateSettings({ waterGlassMl: waterFromUnit(v, s.waterUnit) })} integer /></label>
          </div>
          <div className="px-4 py-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium">Water unit</div><div className="text-xs text-muted">Logged amounts are kept; only the display changes.</div></div><Segmented className="w-32" value={s.waterUnit} options={[{ value: 'ml', label: 'ml' }, { value: 'oz', label: 'oz' }]} onChange={(v) => updateSettings({ waterUnit: v })} /></div>
          <div className="px-4 py-3 text-xs text-muted">Creatine is a daily tick on the Nutrition page; it tracks your streak.</div>
        </Section>

        <Section title="Appearance">
          <div className="px-4 py-3"><Segmented value={s.theme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} onChange={(v) => updateSettings({ theme: v })} /></div>
        </Section>

        <Section title="Backup">
          <Row icon={<Download />} title="Export backup (JSON)" subtitle="Everything: workouts, routines, nutrition, settings" onClick={async () => { download(`lift-backup-${dayKey()}.json`, JSON.stringify(await exportBackup(), null, 1)); toast('Backup exported', 'success') }} chevron />
          <Row icon={<Download />} title="Export workouts (CSV)" subtitle="One row per set, for spreadsheets" onClick={async () => { const ws = await db.workouts.toArray(); download(`lift-workouts-${dayKey()}.csv`, workoutsToCsv(ws.filter((w) => w.endedAt), new Map([...exMap].map(([k, v]) => [k, v.name]))), 'text/csv') }} chevron />
          <Row icon={<Upload />} title={busy ? 'Importing…' : 'Import backup'} subtitle="Restore or merge a JSON backup" onClick={() => fileRef.current?.click()} chevron />
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f) }} />
        </Section>

        <Section title="Danger zone">
          <Row title="Reset all data" subtitle="Deletes every workout, routine and setting on this device" onClick={async () => {
            if (!(await confirmDialog({ title: 'Reset everything?', body: 'Export a backup first if you want to keep anything. This cannot be undone.', confirmText: 'Reset', danger: true }))) return
            await db.delete(); localStorage.clear(); location.reload()
          }} />
        </Section>
        <p className="text-center text-xs text-muted pb-4">Lift {__APP_VERSION__}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><div className="label mb-2 px-1">{title}</div><div className="card divide-y divide-border">{children}</div></section>
}
function Toggle({ title, sub, value, onChange }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="flex items-center gap-3 w-full text-left px-4 min-h-[56px] py-2" onClick={() => onChange(!value)} role="switch" aria-checked={value}>
      <div className="flex-1"><div className="font-medium">{title}</div>{sub && <div className="text-xs text-muted">{sub}</div>}</div>
      <span className={`relative h-7 w-12 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-surface-3'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} /></span>
    </button>
  )
}
