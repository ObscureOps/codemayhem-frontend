import { Heading, Body } from '../design/typography'

export default function DashboardPage() {
  return (
    <div className="space-y-3">
      <Heading level={1}>Dashboard</Heading>
      <Body className="text-graphite">Your activity and progress will live here.</Body>
    </div>
  )
}
