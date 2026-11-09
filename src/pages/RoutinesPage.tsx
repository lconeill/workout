import { ArrowDown, ArrowUp, Check, Copy, Plus, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { confirmDialog } from '@/components/ui/Confirm'
import { toast } from '@/components/ui/Toast'
import { db } from '@/db/db'
import type { Program, Routine } from '@/db/types'
import { useExerciseMap, usePrograms, useRoutines } from '@/hooks/useData'
import { updateSettings, useSettings } from '@/hooks/useSettings'
import { uid } from '@/logic/dates'

export default function RoutinesPage() {
  const routines = useRoutines()
  const programs = usePrograms()
  const settings = useSettings()
  const exMap = useExerciseMap()
  const nav = useNavigate()

  const createRoutine = async () => {
    const r: Routine = { id: uid(), name: 'New routine', exercises: [], isBuiltIn: false, createdAt: Date.now(), updatedAt: Date.now() }
    await db.routines.add(r)
    nav(`/routines/${r.id}`)
  }
  const duplicate = async (r: Routine) => {
    const copy: Routine = { ...r, id: uid(), name: `${r.name} (copy)`, isBuiltIn: false, createdAt: Date.now(), updatedAt: Date.now(), exercises: r.exercises.map((e) => ({ ...e, id: uid() })) }
    await db.routines.add(copy)
    nav(`/routines/${copy.id}`)
  }
  const remove = async (r: Routine) => {
    if (!(await confirmDialog({ title: `Delete "${r.name}"?`, body: 'Past workouts are kept.', confirmText: 'Delete', danger: true }))) return
    await db.routines.delete(r.id)
    for (const p of programs) if (p.routineIds.includes(r.id)) await db.programs.update(p.id, { routineIds: p.routineIds.filter((x) => x !== r.id) })
  }
  const setActive = async (p: Program | null) => {
    await updateSettings({ activeProgramId: p?.id, programCursor: 0 })
    toast(p ? `${p.name} is now your program` : 'Program cleared', 'success')
  }
  const createProgram = async () => {
    const p: Program = { id: uid(), name: 'My program', description: 'Custom rotation', routineIds: [], isBuiltIn: false }
    await db.programs.add(p)
    toast('Program created — add routines in the order you train them', 'success')
  }
  const toggleInProgram = async (p: Program, rid: string) => {
    const ids = p.routineIds.includes(rid) ? p.routineIds.filter((x) => x !== rid) : [...p.routineIds, rid]
    await db.programs.update(p.id, { routineIds: ids })
  }
  const moveInProgram = async (p: Program, i: number, d: -1 | 1) => {
    const ids = [...p.routineIds]; const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await db.programs.update(p.id, { routineIds: ids })
  }
  const toggleDay = async (p: Program, d: number) => {
    const cur = p.trainingDays ?? []
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()
    await db.programs.update(p.id, { trainingDays: next.length ? next : undefined })
  }
  const removeProgram = async (p: Program) => {
    if (!(await confirmDialog({ title: `Delete "${p.name}"?`, confirmText: 'Delete', danger: true }))) return
    await db.programs.delete(p.id)
    if (settings.activeProgramId === p.id) await updateSettings({ activeProgramId: undefined })
  }

  return (
    <div className="fade-in">
      <PageHeader title="Routines" back="/more" actions={<button className="btn btn-primary btn-sm" onClick={createRoutine}><Plus size={16} /> New</button>} />
      <div className="px-4 space-y-5">
        <section>
          <div className="label mb-2 px-1">Programs</div>
          <div className="space-y-2">
            {programs.map((p) => {
              const isActive = settings.activeProgramId === p.id
              return (
                <div key={p.id} className={`card p-4 ${isActive ? 'border-accent' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {p.isBuiltIn ? <div className="font-bold">{p.name}</div>
                        : <input className="font-bold bg-transparent outline-none w-full" defaultValue={p.name} onBlur={(e) => db.programs.update(p.id, { name: e.target.value || 'Program' })} />}
                      <p className="text-sm text-muted">{p.description}</p>
                    </div>
                    {isActive ? <span className="chip chip-active"><Check size={14} /> Active</span> : <button className="btn btn-sm btn-secondary" onClick={() => setActive(p)}>Use</button>}
                  </div>
                  {p.isBuiltIn ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.routineIds.map((rid, i) => { const r = routines.find((x) => x.id === rid); return r ? <button key={rid} className="chip" onClick={() => nav(`/routines/${rid}`)}>{i + 1}. {r.name}</button> : null })}
                    </div>
                  ) : (
                    <div className="mt-2">
                      {p.routineIds.length ? (
                        <ol className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                          {p.routineIds.map((rid, i) => { const r = routines.find((x) => x.id === rid); return r ? (
                            <li key={rid} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-surface-2">
                              <span className="text-muted num w-5 text-sm">{i + 1}.</span>
                              <button className="flex-1 text-left font-medium truncate min-h-[36px]" onClick={() => nav(`/routines/${rid}`)}>{r.name}</button>
                              <button className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => moveInProgram(p, i, -1)} aria-label="Move up"><ArrowUp size={16} /></button>
                              <button className="btn btn-ghost btn-icon btn-sm" disabled={i === p.routineIds.length - 1} onClick={() => moveInProgram(p, i, 1)} aria-label="Move down"><ArrowDown size={16} /></button>
                              <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => toggleInProgram(p, rid)} aria-label="Remove from program"><X size={16} /></button>
                            </li>
                          ) : null })}
                        </ol>
                      ) : <p className="text-sm text-muted">No routines yet — tap below to add them in the order you'll train.</p>}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {routines.filter((r) => !p.routineIds.includes(r.id)).map((r) => <button key={r.id} className="chip" onClick={() => toggleInProgram(p, r.id)}><Plus size={12} /> {r.name}</button>)}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>Rotation repeats after the last routine.</span>
                        <button className="text-danger" onClick={() => removeProgram(p)}>Delete program</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="label mb-1">Training days <span className="normal-case font-normal">(optional — Home shows rest days)</span></div>
                    <div className="flex gap-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => { const dow = (i + 1) % 7; const on = p.trainingDays?.includes(dow); return (
                        <button key={i} className={`flex-1 h-9 rounded-lg text-sm font-bold ${on ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted border border-border'}`} onClick={() => toggleDay(p, dow)} aria-pressed={!!on}>{d}</button>
                      ) })}
                    </div>
                  </div>
                  {isActive && <button className="btn btn-ghost btn-sm w-full mt-2 text-muted" onClick={() => setActive(null)}>Stop following</button>}
                </div>
              )
            })}
            <button className="btn btn-secondary w-full" onClick={createProgram}><Plus size={18} /> New program from my routines</button>
          </div>
        </section>
        <section>
          <div className="label mb-2 px-1">All routines</div>
          <div className="card divide-y divide-border">
            {routines.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-4 py-3">
                <button className="flex-1 min-w-0 text-left" onClick={() => nav(`/routines/${r.id}`)}>
                  <div className="font-semibold truncate">{r.name} {r.isBuiltIn && <span className="text-[10px] text-muted font-normal ml-1">BUILT-IN</span>}</div>
                  <div className="text-xs text-muted truncate">{r.exercises.map((e) => exMap.get(e.exerciseId)?.name).filter(Boolean).join(', ') || 'Empty'}</div>
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => duplicate(r)} aria-label="Duplicate"><Copy size={16} /></button>
                <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => remove(r)} aria-label="Delete"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
