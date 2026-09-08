import { Heading, Body } from '../design/typography'

export default function QuizPage() {
  return (
    <div className="space-y-3">
      <Heading level={1}>Quiz</Heading>
      <Body className="text-graphite">
        Single-player problems with the async submission state machine land here.
      </Body>
    </div>
  )
}
