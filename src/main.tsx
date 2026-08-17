import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/providers"

const page = <App />

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      {page}
    </ThemeProvider>
  </StrictMode>
)
