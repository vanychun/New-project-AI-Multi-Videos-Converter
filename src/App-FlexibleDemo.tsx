import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './contexts';
import HeaderBarFlexible from './components/HeaderBar/HeaderBarFlexible';
import './styles/globals.css';

const FlexibleHeaderDemo: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [videoCount, setVideoCount] = useState(5);
  const [selectedCount, setSelectedCount] = useState(2);
  const [projectName, setProjectName] = useState("project-740902494127");

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleImport = () => {
    const newCount = videoCount + Math.floor(Math.random() * 3) + 1;
    setVideoCount(newCount);
    console.log('Import clicked - Added videos');
  };

  const handleProcess = () => {
    console.log('Process clicked - Processing selected videos');
  };

  const handleSelectRandom = () => {
    setSelectedCount(Math.floor(Math.random() * videoCount));
  };

  return (
    <Provider store={store}>
      <ThemeProvider value={{ theme, toggleTheme }}>
        <div className="app-container" style={{ minHeight: '100vh', background: 'var(--primary-bg)' }}>
          <HeaderBarFlexible
            onToggleSidebar={() => console.log('Toggle sidebar')}
            onToggleSettings={() => console.log('Toggle settings')}
            onToggleTheme={toggleTheme}
            theme={theme}
            projectName={projectName}
            videoCount={videoCount}
            selectedCount={selectedCount}
            hasSelection={selectedCount > 0}
            onImport={handleImport}
            onProcess={handleProcess}
          />
          
          {/* Demo Content */}
          <div style={{ 
            padding: '20px', 
            color: 'var(--text-primary)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: 'var(--text-accent)' }}>
              🎛️ Flexible Header Demo
            </h2>
            
            <div style={{ 
              background: 'var(--surface-secondary)', 
              padding: '20px', 
              borderRadius: 'var(--radius-lg)',
              marginBottom: '20px',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ marginBottom: '15px' }}>Demo Controls</h3>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleImport}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--text-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  Add Videos ({videoCount})
                </button>
                
                <button 
                  onClick={handleSelectRandom}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--surface-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  Random Select ({selectedCount})
                </button>
                
                <button 
                  onClick={() => setProjectName(prev => 
                    prev === "project-740902494127" 
                      ? "ai-video-converter-pro-2024" 
                      : "project-740902494127"
                  )}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--surface-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  Toggle Project Name
                </button>
              </div>
              
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                <p><strong>Current Status:</strong></p>
                <ul>
                  <li>Videos: {videoCount}</li>
                  <li>Selected: {selectedCount}</li>
                  <li>Project: {projectName}</li>
                  <li>Theme: {theme}</li>
                </ul>
              </div>
            </div>

            <div style={{ 
              background: 'var(--surface-secondary)', 
              padding: '20px', 
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ marginBottom: '15px' }}>✨ Flexible Header Features</h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '15px',
                fontSize: '14px'
              }}>
                <div>
                  <h4 style={{ color: 'var(--text-accent)', marginBottom: '8px' }}>📱 Responsive Design</h4>
                  <ul style={{ color: 'var(--text-muted)', paddingLeft: '20px' }}>
                    <li>Auto-detects overflow</li>
                    <li>Collapses elements gracefully</li>
                    <li>Mobile-first approach</li>
                    <li>Hamburger menu on small screens</li>
                  </ul>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--text-accent)', marginBottom: '8px' }}>🎯 Smart Layout</h4>
                  <ul style={{ color: 'var(--text-muted)', paddingLeft: '20px' }}>
                    <li>Three-section layout (left/center/right)</li>
                    <li>Flex-based with proper constraints</li>
                    <li>Text overflow handling</li>
                    <li>Priority-based hiding</li>
                  </ul>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--text-accent)', marginBottom: '8px' }}>⚡ Performance</h4>
                  <ul style={{ color: 'var(--text-muted)', paddingLeft: '20px' }}>
                    <li>CSS-only animations</li>
                    <li>Minimal re-renders</li>
                    <li>Efficient event handling</li>
                    <li>Optimized for 60fps</li>
                  </ul>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--text-accent)', marginBottom: '8px' }}>♿ Accessibility</h4>
                  <ul style={{ color: 'var(--text-muted)', paddingLeft: '20px' }}>
                    <li>Keyboard navigation</li>
                    <li>Screen reader support</li>
                    <li>High contrast mode</li>
                    <li>Reduced motion support</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: 'var(--info-bg)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--info)',
              fontSize: '14px'
            }}>
              <h4 style={{ color: 'var(--info)', marginBottom: '8px' }}>🔧 Testing Instructions</h4>
              <p style={{ color: 'var(--text-primary)', margin: 0 }}>
                Try resizing your browser window to see the responsive behavior. 
                The header will automatically adapt and reorganize elements to prevent overflow. 
                On mobile sizes, most controls move to the hamburger menu.
              </p>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </Provider>
  );
};

export default FlexibleHeaderDemo; 