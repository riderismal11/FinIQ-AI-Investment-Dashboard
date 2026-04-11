import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error): void {
    console.warn(`[FinIQ] Render error boundary triggered: ${error.message}`);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center p-6">
          <div className="card max-w-lg text-center">
            <h1 className="text-xl font-black mb-3">FinIQ</h1>
            <p className="text-sm text-text-secondary">
              Something went wrong while rendering the dashboard. Refresh the page and try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
