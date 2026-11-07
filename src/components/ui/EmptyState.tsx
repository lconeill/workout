import type { ReactNode } from 'react'

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="text-text-2 mt-1 max-w-xs">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
