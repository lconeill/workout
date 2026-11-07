import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

/** Settings/list row with optional chevron. */
export function Row({ title, subtitle, right, onClick, chevron, icon }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; onClick?: () => void; chevron?: boolean; icon?: ReactNode }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`flex items-center gap-3 w-full text-left px-4 min-h-[56px] py-2 ${onClick ? 'active:bg-surface-2' : ''}`}>
      {icon && <div className="text-muted shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        {subtitle && <div className="text-sm text-muted truncate">{subtitle}</div>}
      </div>
      {right && <div className="text-text-2 shrink-0">{right}</div>}
      {chevron && <ChevronRight size={18} className="text-muted shrink-0" />}
    </Tag>
  )
}
