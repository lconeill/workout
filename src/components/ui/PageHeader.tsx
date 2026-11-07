import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props { title: string; back?: boolean | string; actions?: ReactNode; subtitle?: string; large?: boolean }

export function PageHeader({ title, back, actions, subtitle, large }: Props) {
  const nav = useNavigate()
  return (
    <header className="pt-safe sticky top-0 z-30 bg-bg/90 backdrop-blur">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 min-h-[56px]">
        {back && (
          <button className="btn btn-ghost btn-icon btn-sm -ml-2" aria-label="Back" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className={`${large ? 'text-3xl' : 'text-xl'} font-bold truncate leading-tight`}>{title}</h1>
          {subtitle && <p className="text-sm text-muted truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}
