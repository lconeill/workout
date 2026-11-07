import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ensureSeeded } from './db/seed'
import { applyTheme } from './hooks/useSettings'

registerSW({ immediate: true })

ensureSeeded().then((s) => {
  applyTheme(s.theme)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
