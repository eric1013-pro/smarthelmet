import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  errorMessage: string | null;
}

class RootErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { errorMessage: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error?.message || '알 수 없는 렌더링 오류가 발생했습니다.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SmartHelmet CAD runtime error:', error, info);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
            <h1 className="text-base font-bold text-slate-900">
              화면을 불러오는 중 오류가 발생했습니다
            </h1>
            <p className="text-xs font-mono-tabular text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 break-all">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  );
}
