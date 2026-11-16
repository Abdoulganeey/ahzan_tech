import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Portal runtime error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h1 className="font-display text-xl font-bold text-white">
              Ahzan Tech Ltd — Portal Recovery
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              A client runtime error prevented the trade portal from loading:
            </p>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-amber-400 overflow-x-auto">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
            >
              Reload Portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
