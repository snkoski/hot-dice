import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="container" style={{ padding: '40px 20px' }}>
          <div className="card">
            <h2 className="section-title">Something went wrong</h2>
            <p style={{ marginBottom: 16, color: '#666' }}>
              A component crashed. Check the console for details.
            </p>
            <pre
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 14,
              }}
            >
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
