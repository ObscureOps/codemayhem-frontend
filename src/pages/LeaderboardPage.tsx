import { Heading, Body } from '../design/typography'

export default function LeaderboardPage() {
  return (
    <div className="space-y-3">
      <Heading level={1}>Leaderboard</Heading>
      <Body className="text-graphite">Rankings will populate once submissions exist.</Body>
    </div>
  )
}
