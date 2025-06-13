import React, { ErrorInfo, ReactNode } from 'react';
import { addNotification } from '../../store/slices/uiSlice';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryEnhanced extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report error to analytics (if implemented)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Here you could send error reports to your analytics service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Example: Send to analytics service
    // analyticsService.reportError(errorReport);
    
    console.log('Error report:', errorReport);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReport = () => {
    const { error, errorInfo } = this.state;
    if (!error || !errorInfo) return;

    // Create a detailed error report
    const report = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    // Copy to clipboard for user to send
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. Please paste it when reporting this issue.');
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(report, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Error report copied to clipboard. Please paste it when reporting this issue.');
      });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error!, errorInfo!);
      }

      // Default error UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          padding: '40px',
          background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
          border: '1px solid #4a4a6a',
          borderRadius: '12px',
          margin: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
          
          <h2 style={{ 
            color: '#ffffff', 
            marginBottom: '12px',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            Oops! Something went wrong
          </h2>
          
          <p style={{ 
            color: '#a0a0a0', 
            marginBottom: '24px',
            fontSize: '16px',
            lineHeight: '1.5',
            maxWidth: '500px'
          }}>
            We encountered an unexpected error. Don't worry - your data is safe. 
            Try the options below to get back on track.
          </p>

          <div style={{ marginBottom: '24px' }}>
            <details style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #4a4a6a',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'left',
              maxWidth: '600px'
            }}>
              <summary style={{ 
                color: '#ffffff',
                cursor: 'pointer',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                🔧 Technical Details
              </summary>
              <div style={{ 
                color: '#ff6b7a',
                fontSize: '12px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <strong>Error:</strong> {error?.message || 'Unknown error'}
                {error?.stack && (
                  <>
                    <br /><br />
                    <strong>Stack:</strong>
                    <br />
                    {error.stack}
                  </>
                )}
              </div>
            </details>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: '#7461ef',
                border: 'none',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#8b73ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#7461ef'}
            >
              🔄 Try Again
            </button>

            <button
              onClick={this.handleReload}
              style={{
                background: 'none',
                border: '1px solid #4a4a6a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              🔄 Reload App
            </button>

            <button
              onClick={this.handleReport}
              style={{
                background: 'none',
                border: '1px solid #dc3545',
                color: '#dc3545',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
                e.currentTarget.style.borderColor = '#ff6b7a';
                e.currentTarget.style.color = '#ff6b7a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.borderColor = '#dc3545';
                e.currentTarget.style.color = '#dc3545';
              }}
            >
              📋 Copy Error Report
            </button>
          </div>

          <p style={{ 
            color: '#666', 
            marginTop: '24px',
            fontSize: '12px'
          }}>
            If this problem persists, please report it with the error details above.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryEnhanced;