import React from 'react';

interface RouteErrorBoundaryState { hasError: boolean; error?: unknown }

export class RouteErrorBoundary extends React.Component<React.PropsWithChildren, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: unknown, info: unknown) { console.error('[RouteErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24 }}><h2>Something went wrong.</h2><pre style={{whiteSpace:'pre-wrap'}}>{String(this.state.error)}</pre></div>;
    }
    return this.props.children;
  }
}
