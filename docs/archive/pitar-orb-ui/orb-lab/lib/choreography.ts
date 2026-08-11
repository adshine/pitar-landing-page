export const ORB_LAB_DURATION = 18_000

export type ChoreographyPhase =
  | "gather"
  | "connect"
  | "select"
  | "morph"
  | "type"
  | "submit"
  | "think"
  | "answer"

export type OrbVisualState = {
  progress: number
  phase: ChoreographyPhase
  connection: number
  activation: number
  morph: number
  thinking: number
  answer: number
}

export const DEMO_QUESTION = "Where is the renewal clause?"

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value))

const segment = (time: number, from: number, to: number) => clamp((time - from) / (to - from))

export function getChoreography(time: number): OrbVisualState {
  const elapsed = ((time % ORB_LAB_DURATION) + ORB_LAB_DURATION) % ORB_LAB_DURATION
  const progress = elapsed / ORB_LAB_DURATION

  let phase: ChoreographyPhase = "gather"
  if (elapsed >= 2_200) phase = "connect"
  if (elapsed >= 4_000) phase = "select"
  if (elapsed >= 5_000) phase = "morph"
  if (elapsed >= 7_200) phase = "type"
  if (elapsed >= 10_300) phase = "submit"
  if (elapsed >= 11_100) phase = "think"
  if (elapsed >= 13_200) phase = "answer"

  return {
    progress,
    phase,
    connection: segment(elapsed, 2_200, 4_400),
    activation: segment(elapsed, 4_000, 5_200),
    morph: segment(elapsed, 5_000, 7_200),
    thinking: phase === "think" ? segment(elapsed, 11_100, 13_200) : phase === "answer" ? 1 : 0,
    answer: segment(elapsed, 13_200, 14_400),
  }
}

export function getTypedQuestion(time: number) {
  const amount = segment(time, 7_200, 10_200)
  return DEMO_QUESTION.slice(0, Math.round(DEMO_QUESTION.length * amount))
}

export const FINAL_VISUAL_STATE: OrbVisualState = {
  progress: 14_400 / ORB_LAB_DURATION,
  phase: "answer",
  connection: 1,
  activation: 1,
  morph: 1,
  thinking: 1,
  answer: 1,
}
