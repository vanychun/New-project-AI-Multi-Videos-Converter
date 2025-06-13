import React, { Component, ErrorInfo, ReactNode } from 'react';
import { performanceMonitor } from '../../utils/performanceMonitor';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'feature';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Log error with performance monitor
    performanceMonitor.recordComponentRender(`error-${level}-${error.name}`);
    
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };

    console.error('🚨 Error Boundary Caught Error:', errorDetails);
    
    // Send to error reporting service (if available)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: level === 'page'
      });
    }

    this.setState({
      error,
      errorInfo
    });

    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    }
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!error) return;

    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share this with support.');
      })
      .catch(() => {
        console.error('Failed to copy error details to clipboard');
      });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError && error) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default error UI based on level
      const canRetry = this.retryCount < this.maxRetries;
      
      if (level === 'page') {
        return (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ maxWidth: '600px' }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>😵</div>
              <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#ef4444' }}>
                Oops! Something went wrong
              </h1>
              <p style={{ fontSize: '16px', marginBottom: '32px', opacity: 0.8 }}>
                The application encountered an unexpected error. We're sorry for the inconvenience.
              </p>
              
              <div style={{ marginBottom: '24px' }}>
                <details style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
                  <pre style={{ 
                    marginTop: '12px', 
                    fontSize: '12px', 
                    overflow: 'auto',
                    maxHeight: '200px',
                    color: '#ef4444'
                  }}>
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </details>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    background: '#7461ef',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Reload Application
                </button>
                <button
                  onClick={this.handleReportError}
                  style={{
                    background: 'transparent',
                    color: '#7461ef',
                    border: '2px solid #7461ef',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Report Error
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Component-level error
      return (
        <div style={{
          padding: '24px',
          border: '2px dashed #ef4444',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
            Component Error
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.8 }}>
            {error.message}
          </p>
          
          {canRetry && (
            <button
              onClick={this.handleRetry}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Retry ({this.maxRetries - this.retryCount} left)
            </button>
          )}
          
          <button
            onClick={this.handleReportError}
            style={{
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Report
          </button>
        </div>
      );
    }

    return children;
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setError(errorObj);
    
    // Log the error
    console.error('🚨 Error captured by useErrorHandler:', errorObj);
  }, []);

  // Throw error to be caught by Error Boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

export default ErrorBoundary;