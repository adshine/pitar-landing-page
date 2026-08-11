import { lazy } from "react"

export const LazyOrbChatPage = lazy(() =>
  import("./OrbChatPage.tsx").then((module) => ({ default: module.OrbChatPage })),
)
