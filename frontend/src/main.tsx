// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './assets/styles/index.css'
import App from './App.tsx'
import { applyStoredFontScale } from '@/utils/fontScale'

applyStoredFontScale()

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <HelmetProvider>
    <App />
  </HelmetProvider>
  // </StrictMode>
)
