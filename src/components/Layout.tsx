import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { ConfirmHost } from './ui/Confirm'
import { RestTimerBar } from './workout/RestTimerBar'
import { useEffect } from 'react'
import { useSettings, applyTheme } from '@/hooks/useSettings'

export function Layout() {
  const loc = useLocation()
  const settings = useSettings()
  useEffect(() => { applyTheme(settings.theme) }, [settings.theme])
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return (
    <div className="mx-auto max-w-lg min-h-dvh pb-nav">
      <Outlet />
      {loc.pathname !== '/workout' && <RestTimerBar compact />}
      <BottomNav />
      <ConfirmHost />
    </div>
  )
}
