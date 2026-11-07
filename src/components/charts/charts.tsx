import {
  BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, TimeScale, Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useMemo } from 'react'
import { useSettings } from '@/hooks/useSettings'

ChartJS.register(CategoryScale, LinearScale, TimeScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'
}
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

export interface Series { label: string; points: { x: string; y: number }[]; color?: string }

function baseOptions(theme: string, fmt?: (v: number) => string, yMin?: number): ChartOptions<'line' | 'bar'> {
  void theme
  const grid = cssVar('--border'), ink = cssVar('--muted'), surface = cssVar('--surface')
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar('--surface-3'), titleColor: cssVar('--text'), bodyColor: cssVar('--text-2'),
        borderColor: grid, borderWidth: 1, padding: 10, displayColors: false,
        callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ': ' : ''}${fmt ? fmt(c.parsed.y as number) : c.parsed.y}` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { color: grid }, ticks: { color: ink, maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { size: 11 } } },
      y: { min: yMin, grid: { color: grid, lineWidth: 1 }, border: { display: false }, ticks: { color: ink, maxTicksLimit: 5, font: { size: 11 }, callback: (v) => (fmt ? fmt(Number(v)) : v) } },
    },
    elements: { point: { borderColor: surface, borderWidth: 2 } },
  }
}

export function LineChart({ series, height = 200, fmt, fill = true, yMin, target }: { series: Series[]; height?: number; fmt?: (v: number) => string; fill?: boolean; yMin?: number; target?: number }) {
  const { theme } = useSettings()
  const data = useMemo(() => {
    const labels = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x))))
    const datasets = series.map((s, i) => {
      const color = s.color ?? (i === 0 ? cssVar('--accent') : cssVar('--text-2'))
      const map = new Map(s.points.map((p) => [p.x, p.y]))
      return {
        label: s.label, data: labels.map((l) => map.get(l) ?? null), borderColor: color, backgroundColor: withAlpha(color, 0.1),
        borderWidth: 2, pointRadius: labels.length > 40 ? 0 : 4, pointHoverRadius: 6, pointBackgroundColor: color, tension: 0.25, fill: fill && i === 0, spanGaps: true,
      }
    })
    if (target != null) {
      datasets.push({ label: 'Target', data: labels.map(() => target), borderColor: cssVar('--muted'), backgroundColor: 'transparent', borderWidth: 1, pointRadius: 0, pointHoverRadius: 0, pointBackgroundColor: 'transparent', tension: 0, fill: false, spanGaps: true })
    }
    return { labels, datasets }
  }, [series, target, theme])
  const options = useMemo(() => baseOptions(theme, fmt, yMin), [theme, fmt, yMin])
  return <div style={{ height }}><Line data={data} options={options as ChartOptions<'line'>} /></div>
}

export function BarChart({ labels, values, height = 200, fmt, color, highlightLast = true, target }: { labels: string[]; values: number[]; height?: number; fmt?: (v: number) => string; color?: string; highlightLast?: boolean; target?: number }) {
  const { theme } = useSettings()
  const data = useMemo(() => {
    const c = color ?? cssVar('--accent')
    const dim = withAlpha(c, 0.45)
    return {
      labels,
      datasets: [{
        label: '', data: values, backgroundColor: values.map((_, i) => (highlightLast && i === values.length - 1 ? c : dim)),
        borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' as const, maxBarThickness: 24,
      }],
    }
  }, [labels, values, color, highlightLast, theme])
  const options = useMemo(() => {
    const o = baseOptions(theme, fmt, 0) as ChartOptions<'bar'>
    if (target != null && o.scales?.y) (o.scales.y as { suggestedMax?: number }).suggestedMax = target
    return o
  }, [theme, fmt, target])
  return <div style={{ height }}><Bar data={data} options={options} /></div>
}
