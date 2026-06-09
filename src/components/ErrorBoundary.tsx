import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Rendered if a child throws. Defaults to nothing (silent degradation). */
  fallback?: ReactNode;
}

/**
 * Minimal error boundary. Used to isolate non-essential, failure-prone subtrees
 * (e.g. the WebGL 3D background) so that if they throw — no GPU / WebGL disabled
 * / context-lost — the rest of the app still renders instead of going blank.
 */
export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Non-fatal: log for diagnostics, but keep the app alive.
    console.warn('ErrorBoundary caught a non-fatal error:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
