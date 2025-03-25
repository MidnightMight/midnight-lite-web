import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './euc.css'
import App from './EUC_App.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)