import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'

const ReactiveBackground = lazy(() => import('./components/ReactiveBackground'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* The 3D background is decorative and WebGL-dependent. Isolate it so a
        missing/disabled WebGL context degrades gracefully instead of blanking
        the whole app. */}
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <ReactiveBackground />
      </Suspense>
    </ErrorBoundary>
    <App />
  </React.StrictMode>,
)
