import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ThemeProvider } from './contexts/ThemeContext';
import HeaderBar from './components/HeaderBar/HeaderBar';
import VideoLibrary from './components/VideoLibrary/VideoLibrary';
import TimelinePreview from './components/Timeline/TimelinePreview';
import SettingsPanel from './components/Settings/SettingsPanel';
// import ProcessingQueue from './components/ProcessingQueue/ProcessingQueue';
import ModalManager from './components/common/ModalManager';
import NotificationSystem from './components/common/NotificationSystem';
import './styles/globals.css';

const GradualApp: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsPanelCollapsed, setSettingsPanelCollapsed] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Keyboard shortcuts for professional workflow
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger shortcuts when not typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { ctrlKey, metaKey, key } = event;
      const cmdCtrl = ctrlKey || metaKey;

      switch (true) {
        // Toggle panels
        case key === '1':
          setSidebarCollapsed(prev => !prev);
          event.preventDefault();
          break;
        case key === '3':
          setSettingsPanelCollapsed(prev => !prev);
          event.preventDefault();
          break;
        
        // Theme toggle
        case cmdCtrl && key === 't':
          toggleTheme();
          event.preventDefault();
          break;
        
        // File operations (placeholder for future implementation)
        case cmdCtrl && key === 'o':
          console.log('Open file shortcut triggered');
          event.preventDefault();
          break;
        case cmdCtrl && key === 's':
          console.log('Save project shortcut triggered');
          event.preventDefault();
          break;
        
        // Playback controls (placeholder)
        case key === ' ':
          console.log('Play/pause shortcut triggered');
          event.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider value={{ theme, toggleTheme }}>
        <div className="app-container" style={{
          background: 'linear-gradient(135deg, #1a1529 0%, #2d2d47 50%, #1a1529 100%)',
          color: 'white',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header Bar - Testing first */}
          <HeaderBar
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onToggleSettings={() => setSettingsPanelCollapsed(!settingsPanelCollapsed)}
            onToggleTheme={toggleTheme}
            theme={theme}
          />
          
          {/* Main Content Area - Three Panel Layout */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '300px 1fr 320px',
            overflow: 'hidden',
            gap: '1px',
            background: '#404040'
          }}>
            {/* Video Library Panel */}
            <div style={{
              background: '#2d2d47',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <VideoLibrary
                collapsed={false}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>
            
            {/* Timeline Editor Panel */}
            <div style={{
              background: '#1e1e35',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <TimelinePreview />
            </div>
            
            {/* AI Enhancements Panel */}
            <div style={{
              background: '#2d2d47',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <SettingsPanel
                collapsed={false}
                onToggle={() => setSettingsPanelCollapsed(!settingsPanelCollapsed)}
              />
            </div>
          </div>
          
          {/* Modal and Notification Systems */}
          <ModalManager />
          <NotificationSystem />
        </div>
      </ThemeProvider>
    </Provider>
  );
};

export default GradualApp;