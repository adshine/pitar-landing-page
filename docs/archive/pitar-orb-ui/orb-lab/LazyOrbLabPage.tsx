import { lazy } from "react"

export const LazyOrbLabPage = lazy(() =>
  import("./OrbLabPage.tsx").then((module) => ({ default: module.OrbLabPage })),
)
