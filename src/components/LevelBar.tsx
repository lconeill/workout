export function levelColor(i: number) {
  return ['text-muted', 'text-text-2', 'text-accent', 'text-success', 'text-pr'][i + 1] ?? 'text-muted'
}

/** Five-segment strength level meter. */
export function LevelBar({ levelIndex, progress }: { levelIndex: number; progress: number }) {
  return (
    <div className="flex-1 flex gap-1">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = i < levelIndex ? 1 : i === levelIndex ? progress : i === levelIndex + 1 && levelIndex < 0 ? progress : 0
        return (
          <div key={i} className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${fill * 100}%` }} />
          </div>
        )
      })}
    </div>
  )
}
