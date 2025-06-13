import React, { Suspense, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import NotificationProvider, { useNotificationHelpers } from './components/common/NotificationSystem';
import PerformanceDashboard from './components/common/PerformanceDashboard';
import { performanceMonitor, memoryManager } from './utils/performanceMonitor';

// Lazy load components for better performance
const VideoLibraryOptimized = React.lazy(() => import('./components/VideoLibrary/VideoLibraryOptimized'));
const TimelinePreview = React.lazy(() => import('./components/Timeline/TimelinePreview'));
const SettingsPanel = React.lazy(() => import('./components/Settings/SettingsPanel'));
const HeaderBar = React.lazy(() => import('./components/HeaderBar/HeaderBar'));
const ProcessingQueue = React.lazy(() => import('./components/ProcessingQueue/ProcessingQueue'));

// Loading component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '12px',
    color: 'white'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(116, 97, 239, 0.3)',
      borderTop: '3px solid #7461ef',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    }} />
    <div style={{ fontSize: '14px', opacity: 0.8 }}>{message}</div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Main App content component
const AppContent: React.FC = () => {
  const { showError, showSuccess, showInfo } = useNotificationHelpers();
  const [activeTab, setActiveTab] = useState<'library' | 'timeline' | 'settings'>('library');
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(
    process.env.NODE_ENV === 'development'
  );

  // Initialize performance monitoring
  useEffect(() => {
    const cleanup = () => {
      performanceMonitor.destroy();
      memoryManager.clear();
    };

    // Global error handler
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('🚨 Unhandled Error:', event.error);
      showError(
        'Unexpected Error',
        'An unexpected error occurred. The application may not function correctly.',
        [
          {
            label: 'Reload',
            action: () => window.location.reload(),
            primary: true
          },
          {
            label: 'Report',
            action: () => {
              // Copy error details to clipboard
              const errorDetails = {
                message: event.error?.message || 'Unknown error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
              };
              navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
            }
          }
        ]
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      showError(
        'Promise Rejection',
        'An asynchronous operation failed. This may affect some features.',
        [
          {
            label: 'Dismiss',
            action: () => {},
            primary: true
          }
        ]
      );
    };

    // Performance monitoring
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is hidden, run cleanup
        memoryManager.cleanup();
      } else {
        // App is visible, show welcome back message
        showInfo('Welcome back!', 'Performance optimizations applied.');
      }
    };

    // Memory pressure detection
    const checkMemoryPressure = () => {
      const trend = performanceMonitor.getMemoryTrend();
      if (trend === 'increasing') {
        console.warn('🚨 Memory pressure detected, running cleanup...');
        memoryManager.cleanup();
        
        // Force garbage collection in development
        if (process.env.NODE_ENV === 'development' && 'gc' in window) {
          (window as any).gc();
        }
      }
    };

    // Add event listeners
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check memory every 30 seconds
    const memoryCheckInterval = setInterval(checkMemoryPressure, 30000);

    // Cleanup function
    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', cleanup);
      clearInterval(memoryCheckInterval);
      cleanup();
    };
  }, [showError, showSuccess, showInfo]);

  // Show welcome message on first load
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('hasShownWelcome');
    if (!hasShownWelcome) {
      setTimeout(() => {
        showSuccess(
          'Welcome to AI Multi Videos Converter!',
          'Professional video processing with AI enhancement capabilities.'
        );
        sessionStorage.setItem('hasShownWelcome', 'true');
      }, 1000);
    }
  }, [showSuccess]);

  const handleTabChange = (tab: 'library' | 'timeline' | 'settings') => {
    setActiveTab(tab);
    
    // Track navigation for performance
    performanceMonitor.recordComponentRender(`navigation-${tab}`);
  };

  return (
    <div className="app">
      {/* Header */}
      <ErrorBoundary level="component">
        <Suspense fallback={<LoadingSpinner message="Loading header..." />}>
          <HeaderBar 
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Main Content */}
      <main className="main-content">
        <ErrorBoundary level="feature">
          <Suspense fallback={<LoadingSpinner message="Loading content..." />}>
            {activeTab === 'library' && <VideoLibraryOptimized />}
            {activeTab === 'timeline' && <TimelinePreview />}
            {activeTab === 'settings' && <SettingsPanel />}
          </Suspense>
        </ErrorBoundary>

        {/* Processing Queue */}
        <ErrorBoundary level="component">
          <Suspense fallback={<LoadingSpinner message="Loading processing queue..." />}>
            <ProcessingQueue />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Performance Dashboard (Development/Debug) */}
      {showPerformanceDashboard && <PerformanceDashboard />}

      {/* Keyboard shortcuts */}
      <div style={{ display: 'none' }}>
        <button
          style={{ position: 'absolute', left: '-9999px' }}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              switch (e.key) {
                case '1':
                  e.preventDefault();
                  handleTabChange('library');
                  break;
                case '2':
                  e.preventDefault();
                  handleTabChange('timeline');
                  break;
                case '3':
                  e.preventDefault();
                  handleTabChange('settings');
                  break;
                case 'p':
                  e.preventDefault();
                  setShowPerformanceDashboard(!showPerformanceDashboard);
                  break;
                case 'r':
                  e.preventDefault();
                  window.location.reload();
                  break;
              }
            }
          }}
          autoFocus
        />
      </div>

      {/* Global Styles */}
      <style>{`
        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          overflow: hidden;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Performance indicators */
        .performance-badge {
          font-size: 12px;
          margin-left: 8px;
          opacity: 0.7;
        }

        .virtualized-indicator {
          color: #10b981;
          font-size: 12px;
        }

        /* Accessibility improvements */
        *:focus-visible {
          outline: 2px solid #7461ef;
          outline-offset: 2px;
        }

        /* Smooth transitions */
        * {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        /* Loading animations */
        .loading-skeleton {
          background: linear-gradient(90deg, #2a2a3a 25%, #3a3a4a 50%, #2a2a3a 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(116, 97, 239, 0.6);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(116, 97, 239, 0.8);
        }
      `}</style>
    </div>
  );
};

// Enhanced App component with providers
const AppEnhanced: React.FC = () => {
  return (
    <ErrorBoundary level="page">
      <Provider store={store}>
        <ThemeProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default AppEnhanced;