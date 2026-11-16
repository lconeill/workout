import { dayKey } from '@/logic/dates'
import { updateSettings } from '@/hooks/useSettings'
import { exportBackup } from './backup'

export type BackupResult = 'shared' | 'downloaded' | 'cancelled'

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Save a full JSON backup off the browser: the share sheet (Drive, Files…) where the
 * browser allows sharing the file, else a download to the phone's Downloads folder.
 * Records the time unless the user cancels.
 */
export async function backupNow(): Promise<BackupResult> {
  const name = `lift-backup-${dayKey()}.json`
  const blob = new Blob([JSON.stringify(await exportBackup(), null, 1)], { type: 'application/json' })
  const file = new File([blob], name, { type: 'application/json' })
  let result: BackupResult = 'downloaded'
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Lift backup' })
      result = 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      download(name, blob)
    }
  } else {
    download(name, blob)
  }
  await updateSettings({ lastBackupAt: Date.now(), backupSnoozeUntil: undefined })
  return result
}

/** Ask the browser not to evict our data under storage pressure. Returns the resulting state. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  const st = navigator.storage
  if (!st?.persist) return null
  try {
    if (await st.persisted()) return true
    return await st.persist()
  } catch { return null }
}

export const BACKUP_REMIND_DAYS = 7

/** Days since the last backup (or since the first workout if never), when a reminder is due; else null. */
export function backupDue(now: number, firstWorkoutAt: number | undefined, lastBackupAt?: number, snoozeUntil?: number): number | null {
  if (firstWorkoutAt == null) return null
  if (snoozeUntil && now < snoozeUntil) return null
  const since = lastBackupAt ?? firstWorkoutAt
  const days = Math.floor((now - since) / 86400000)
  return days >= BACKUP_REMIND_DAYS ? days : null
}
