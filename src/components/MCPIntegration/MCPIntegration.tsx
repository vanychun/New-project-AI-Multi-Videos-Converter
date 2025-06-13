import React, { useState, useEffect } from 'react';
import { TourManager } from '../FeatureTour';
import { mcpIntegrationService } from '../../services/mcpIntegrationService';
import { documentationGenerator } from '../../services/documentationGenerator';
import { visualRegressionService } from '../../services/visualRegressionService';
import './MCPIntegration.css';

interface MCPIntegrationProps {
  children: React.ReactNode;
  enableTours?: boolean;
  enableScreenshots?: boolean;
  enableTesting?: boolean;
}

export const MCPIntegration: React.FC<MCPIntegrationProps> = ({
  children,
  enableTours = true,
  enableScreenshots = true,
  enableTesting = true
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [showMCPPanel, setShowMCPPanel] = useState(false);

  useEffect(() => {
    initializeMCP();
  }, []);

  const initializeMCP = async () => {
    try {
      // Check if MCP is available
      const mcpAvailable = typeof window !== 'undefined' && 
                          typeof (window as any).mcpPuppeteer === 'object';
      
      setMcpStatus(mcpAvailable ? 'available' : 'unavailable');
      setIsInitialized(true);

      // Initialize MCP services if available
      if (mcpAvailable) {
        console.log('✅ MCP Puppeteer available - Enhanced features enabled');
        
        // Setup keyboard shortcuts for MCP features
        setupMCPKeyboardShortcuts();
      } else {
        console.log('⚠️  MCP Puppeteer not available - Running in simulation mode');
      }
    } catch (error) {
      console.error('Failed to initialize MCP:', error);
      setMcpStatus('unavailable');
      setIsInitialized(true);
    }
  };

  const setupMCPKeyboardShortcuts = () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + M for MCP panel
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        setShowMCPPanel(prev => !prev);
      }
      
      // Ctrl/Cmd + Shift + S for screenshot
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        captureScreenshot();
      }
      
      // Ctrl/Cmd + Shift + D for documentation
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        generateDocumentation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  };

  const captureScreenshot = async () => {
    try {
      const result = await mcpIntegrationService.captureCurrentState('manual_capture');
      showNotification(`Screenshot captured: ${result.name}`, 'success');
    } catch (error) {
      showNotification('Failed to capture screenshot', 'error');
    }
  };

  const generateDocumentation = async () => {
    try {
      showNotification('Generating documentation...', 'info');
      await documentationGenerator.generateFullDocumentation();
      showNotification('Documentation generated successfully', 'success');
    } catch (error) {
      showNotification('Failed to generate documentation', 'error');
    }
  };

  const runUITests = async () => {
    try {
      showNotification('Running UI tests...', 'info');
      await mcpIntegrationService.captureFullAppFlow();
      showNotification('UI tests completed', 'success');
    } catch (error) {
      showNotification('UI tests failed', 'error');
    }
  };

  const runVisualRegression = async () => {
    try {
      showNotification('Running visual regression tests...', 'info');
      const results = await visualRegressionService.runAllRegressionTests();
      const passed = results.filter(r => r.passed).length;
      showNotification(`Visual regression: ${passed}/${results.length} passed`, 'success');
    } catch (error) {
      showNotification('Visual regression tests failed', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `mcp-notification mcp-notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      opacity: '0',
      transform: 'translateY(-10px)',
      transition: 'all 0.3s ease',
      backgroundColor: type === 'success' ? '#28a745' : 
                      type === 'error' ? '#dc3545' : '#17a2b8'
    });

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    });

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  if (!isInitialized) {
    return (
      <div className="mcp-loading">
        <div className="mcp-loading-spinner" />
        <p>Initializing MCP integration...</p>
        {children}
      </div>
    );
  }

  return (
    <div className="mcp-integration">
      {enableTours ? (
        <TourManager>
          {children}
        </TourManager>
      ) : (
        children
      )}

      {/* MCP Status Indicator */}
      <div className={`mcp-status-indicator mcp-status-${mcpStatus}`}>
        <div className="mcp-status-dot" />
        <span className="mcp-status-text">
          {mcpStatus === 'available' ? 'MCP Ready' : 
           mcpStatus === 'unavailable' ? 'MCP Unavailable' : 
           'Checking MCP...'}
        </span>
      </div>

      {/* MCP Panel */}
      {showMCPPanel && (
        <div className="mcp-panel">
          <div className="mcp-panel-header">
            <h3>🤖 MCP Control Panel</h3>
            <button 
              className="mcp-panel-close"
              onClick={() => setShowMCPPanel(false)}
            >
              ×
            </button>
          </div>
          
          <div className="mcp-panel-content">
            <div className="mcp-panel-section">
              <h4>📸 Screenshots</h4>
              <button 
                className="mcp-btn mcp-btn-primary"
                onClick={captureScreenshot}
                disabled={mcpStatus !== 'available'}
              >
                Capture Current State
              </button>
              <button 
                className="mcp-btn mcp-btn-secondary"
                onClick={() => mcpIntegrationService.captureFullAppFlow()}
                disabled={mcpStatus !== 'available'}
              >
                Capture App Flow
              </button>
            </div>

            <div className="mcp-panel-section">
              <h4>🧪 Testing</h4>
              <button 
                className="mcp-btn mcp-btn-primary"
                onClick={runUITests}
                disabled={mcpStatus !== 'available'}
              >
                Run UI Tests
              </button>
              <button 
                className="mcp-btn mcp-btn-secondary"
                onClick={runVisualRegression}
                disabled={mcpStatus !== 'available'}
              >
                Visual Regression
              </button>
            </div>

            <div className="mcp-panel-section">
              <h4>📚 Documentation</h4>
              <button 
                className="mcp-btn mcp-btn-primary"
                onClick={generateDocumentation}
              >
                Generate Docs
              </button>
            </div>

            <div className="mcp-panel-section">
              <h4>⌨️ Keyboard Shortcuts</h4>
              <div className="mcp-shortcuts">
                <div className="mcp-shortcut">
                  <kbd>Ctrl+Shift+M</kbd> Toggle this panel
                </div>
                <div className="mcp-shortcut">
                  <kbd>Ctrl+Shift+S</kbd> Capture screenshot
                </div>
                <div className="mcp-shortcut">
                  <kbd>Ctrl+Shift+T</kbd> Open tours
                </div>
                <div className="mcp-shortcut">
                  <kbd>Ctrl+Shift+D</kbd> Generate docs
                </div>
                <div className="mcp-shortcut">
                  <kbd>F1</kbd> Help tour
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Development mode indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mcp-dev-indicator">
          <span>MCP Development Mode</span>
          <button onClick={() => setShowMCPPanel(true)}>
            Open MCP Panel
          </button>
        </div>
      )}
    </div>
  );
};

export default MCPIntegration;