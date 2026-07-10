import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'
import i18n from './i18n'
import { initInstallPrompt } from './lib/platform'

initInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
)
