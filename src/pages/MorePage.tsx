import { Calendar, Dumbbell, ListChecks, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Row } from '@/components/ui/Row'

export default function MorePage() {
  const nav = useNavigate()
  return (
    <div className="fade-in">
      <PageHeader title="More" large />
      <div className="px-4">
        <div className="card divide-y divide-border">
          <Row icon={<ListChecks />} title="Routines & programs" subtitle="Templates, active program" onClick={() => nav('/routines')} chevron />
          <Row icon={<Dumbbell />} title="Exercises" subtitle="Library, records, charts" onClick={() => nav('/exercises')} chevron />
          <Row icon={<Calendar />} title="History" subtitle="Every logged workout" onClick={() => nav('/history')} chevron />
          <Row icon={<Settings />} title="Settings" subtitle="Units, plates, timers, backup" onClick={() => nav('/settings')} chevron />
        </div>
        <p className="text-center text-xs text-muted mt-8">Lift · local-only, your data never leaves this device.</p>
      </div>
    </div>
  )
}
