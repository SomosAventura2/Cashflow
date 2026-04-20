import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initIosPwaLocks } from './iosPwaLocks.js'
import App from './App.jsx'

initIosPwaLocks()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
