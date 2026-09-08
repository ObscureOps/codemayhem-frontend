import { Heading, Body, Mono } from '../design/typography'

export default function BattlePage() {
  return (
    <div className="space-y-3">
      <Heading level={1}>Battle</Heading>
      <Body className="text-graphite">
        Live opponent state and matchmaking come in a later milestone. Preview of the
        timer treatment below — the signature moment on this screen.
      </Body>
      <Mono size="readout" className="text-signal">
        00:00
      </Mono>
    </div>
  )
}
