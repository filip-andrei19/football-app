import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // Acum calea este simplă, fiind în același folder
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)