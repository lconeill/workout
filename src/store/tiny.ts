import { useSyncExternalStore } from 'react'

/** Minimal external store with optional localStorage persistence. */
export function createStore<T>(initial: T, persistKey?: string) {
  let state = initial
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey)
      if (raw) state = { ...initial, ...JSON.parse(raw) }
    } catch { /* ignore */ }
  }
  const listeners = new Set<() => void>()
  const persist = () => {
    if (!persistKey) return
    try { localStorage.setItem(persistKey, JSON.stringify(state)) } catch { /* ignore */ }
  }
  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next
      persist()
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
    use<S = T>(selector: (s: T) => S = (s) => s as unknown as S): S {
      return useSyncExternalStore(this.subscribe, () => selector(state), () => selector(state))
    },
  }
}
