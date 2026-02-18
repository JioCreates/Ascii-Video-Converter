import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/app.css'
import './styles/terminal.css'
import './styles/crt.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
