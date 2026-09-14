import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { TooltipProvider } from "./components/ui/tooltip.tsx"
import { loadCustomTags } from "./customTags.ts"

// Resolves the icons of locally defined tags first, so every component can
// look them up synchronously like the built-in ones.
loadCustomTags().then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </StrictMode>
  )
)
