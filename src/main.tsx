import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const ReactiveBackground = lazy(() => import('./components/ReactiveBackground'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <ReactiveBackground />
    </Suspense>
    <App />
  </React.StrictMode>,
)
