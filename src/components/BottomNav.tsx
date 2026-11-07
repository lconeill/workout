import { Apple, Dumbbell, Home, MoreHorizontal, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { active } from '@/store/activeWorkout'

const items = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/workout', label: 'Workout', Icon: Dumbbell },
  { to: '/nutrition', label: 'Nutrition', Icon: Apple },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
  { to: '/more', label: 'More', Icon: MoreHorizontal },
]

export function BottomNav() {
  const hasActive = active.use((s) => !!s.workout)
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-border pb-safe">
      <div className="mx-auto max-w-lg grid grid-cols-5 h-[64px]">
        {items.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-accent' : 'text-muted'}`}>
            <Icon size={22} strokeWidth={2.2} />
            {label}
            {to === '/workout' && hasActive && <span className="absolute top-2 right-[calc(50%-18px)] h-2 w-2 rounded-full bg-success" />}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
