import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { Analytics } from '@vercel/analytics/react'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'
import UpdatePrompt from './ui/UpdatePrompt'
import i18n from './i18n'
import { initInstallPrompt } from './lib/platform'
import { initAnalytics } from './lib/analytics'

initInstallPrompt()
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
      <UpdatePrompt />
      <Analytics />
    </I18nextProvider>
  </React.StrictMode>,
)
