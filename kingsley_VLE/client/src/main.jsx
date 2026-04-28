import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initializeApiBaseUrl } from './lib/api.js'
import './index.css'

async function bootstrap() {
  await initializeApiBaseUrl()

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

bootstrap()
