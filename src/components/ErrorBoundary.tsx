import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)'
        }}>
          <div className="card-glass" style={{ padding: '3rem', maxWidth: '600px', textAlign: 'center' }}>
            <h1 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Ops, algo deu errado!</h1>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              A aplicação encontrou um erro inesperado. Tente recarregar a página ou verificar a planilha de origem.
            </p>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', color: 'var(--color-danger)', textAlign: 'left', overflowX: 'auto', fontSize: '0.85rem', marginBottom: '2rem' }}>
              <code>{this.state.error?.message}</code>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
