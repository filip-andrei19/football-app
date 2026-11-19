import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidUpdate(prevProps: Props) {
    // Resetează eroarea automat când utilizatorul schimbă tab-ul
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Eroare prinsă de ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 bg-slate-900 border-4 border-rose-600/50 rounded-3xl text-center shadow-2xl space-y-4">
          <AlertTriangle className="w-14 h-14 text-rose-500 mx-auto" />
          <h3 className="text-xl font-black uppercase tracking-widest text-white">
            Fază întreruptă de VAR
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-bold">
            A apărut o eroare neașteptată în această secțiune. Restul platformei funcționează normal.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs border-b-4 border-emerald-800"
          >
            <RotateCcw className="w-4 h-4" /> Reîncarcă Secțiunea
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}