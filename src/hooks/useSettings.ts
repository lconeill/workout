import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { DEFAULT_SETTINGS, type Settings } from '@/db/types'

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('settings'), [], DEFAULT_SETTINGS) ?? DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const cur = (await db.settings.get('settings')) ?? DEFAULT_SETTINGS
  const next = { ...cur, ...patch }
  await db.settings.put(next)
  if (patch.theme) applyTheme(patch.theme)
}

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  const resolved = theme === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme
  root.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#f4f5f8' : '#0f1115')
}
