import { createStore } from './tiny'

interface TimerState { endsAt: number | null; totalSec: number; notified: boolean }
export const restTimer = createStore<TimerState>({ endsAt: null, totalSec: 0, notified: false }, 'lift.restTimer')

export function startRest(sec: number) {
  restTimer.set({ endsAt: Date.now() + sec * 1000, totalSec: sec, notified: false })
}
export function adjustRest(deltaSec: number) {
  restTimer.set((s) => {
    if (!s.endsAt) return s
    const endsAt = Math.max(Date.now(), s.endsAt + deltaSec * 1000)
    return { ...s, endsAt, totalSec: Math.max(1, s.totalSec + deltaSec) }
  })
}
export function stopRest() { restTimer.set({ endsAt: null, totalSec: 0, notified: false }) }

export function remainingSec(): number {
  const s = restTimer.get()
  if (!s.endsAt) return 0
  return Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000))
}

export function buzz(pattern: number | number[] = [120, 60, 120]) {
  try { navigator.vibrate?.(pattern) } catch { /* ignore */ }
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try { return (await Notification.requestPermission()) === 'granted' } catch { return false }
}

export async function notifyRestDone() {
  buzz([200, 100, 200, 100, 300])
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    const opts = { body: 'Rest is over — next set.', tag: 'rest', renotify: true, vibrate: [200, 100, 200] } as NotificationOptions
    if (reg) await reg.showNotification('Lift', opts)
    else new Notification('Lift', opts)
  } catch { /* ignore */ }
}
