import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'sonner'
import { AppInsightsContext } from '@microsoft/applicationinsights-react-js'
import { reactPlugin } from './services/appInsights'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppInsightsContext.Provider value={reactPlugin}>
      <App />
      <Toaster />
    </AppInsightsContext.Provider>
  </StrictMode>,
)
