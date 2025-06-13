import React, { useState, useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from './store';
import { ThemeProvider } from './contexts';
import { 
  VideoLibraryEnhanced, 
  OutputVideos,
  TimelinePreview, 
  SettingsPanel, 
  ProcessingQueue,
  ModalManager,
  NotificationSystem as NotificationProvider
} from './components';
import HeaderBarFlexible from './components/HeaderBar/HeaderBarFlexible';
import SettingsLoader from './components/common/SettingsLoader';
import ErrorBoundaryEnhanced from './components/common/ErrorBoundaryEnhanced';
import KeyboardShortcutsHelp from './components/common/KeyboardShortcutsHelp';
import ElectronDiagnostics from './components/common/ElectronDiagnostics';
import MCPIntegration from './components/MCPIntegration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { addVideos } from './store/slices/videoSlice';
import { addNotification } from './store/slices/uiSlice';
import './styles/globals.css';

const AppContent: React.FC = () => {
  console.log('🚨 FIXED APP LOADED - Import functionality should work now!');
  const dispatch = useDispatch();
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentView, setCurrentView] = useState<'library' | 'output' | 'timeline'>('library');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsPanelCollapsed, setSettingsPanelCollapsed] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
    
    // Add global test function for debugging
    (window as any).testAddVideo = () => {
      console.log('🧪 Manual test: Adding video to Redux');
      const testVideo = {
        id: `manual-test-${Date.now()}`,
        name: 'Manual Test Video.mp4',
        path: './test.mp4',
        size: 1000000,
        duration: 30,
        format: 'mp4',
        resolution: '1080p',
        fps: 30,
        bitrate: 2000,
        status: 'ready' as const,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        metadata: { hasAudio: true, codec: 'h264' }
      };
      dispatch(addVideos([testVideo]));
      console.log('🧪 Manual test: Video added, checking state...');
      setTimeout(() => {
        console.log('🧪 Manual test: Current Redux state:', (window as any).getReduxState?.()?.videos);
      }, 100);
    };
  }, [theme, dispatch]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Handle video import
  const handleImportVideos = async () => {
    console.log('🎬 handleImportVideos called - opening file dialog');
    
    try {
      // Use Electron's native file dialog if available
      if (window.electronAPI && window.electronAPI.selectFiles) {
        console.log('🔧 Using Electron native file dialog');
        
        const filePaths = await window.electronAPI.selectFiles();
        if (!filePaths || filePaths.length === 0) {
          console.log('🎬 No files selected');
          return;
        }
        
        console.log(`🎬 Selected ${filePaths.length} files:`, filePaths);
        
        // Create video objects from file paths
        const videos = filePaths.map((filePath: string, index: number) => {
          const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
          const fileExt = fileName.split('.').pop()?.toLowerCase() || 'unknown';
          
          // Format file path for Electron - handle Windows paths properly
          let formattedPath = filePath;
          if (process.platform === 'win32' || filePath.includes('\\')) {
            // Windows path - ensure forward slashes for file:// protocol
            formattedPath = filePath.replace(/\\/g, '/');
          }
          // Ensure file:// protocol
          const videoPath = formattedPath.startsWith('file://') ? formattedPath : `file:///${formattedPath}`;
          
          console.log('🔧 Path conversion:', { original: filePath, formatted: videoPath });
          
          return {
            id: `imported-${Date.now()}-${index}`,
            name: fileName,
            path: videoPath, // Use properly formatted file protocol
            size: 0, // Will be determined later
            duration: 0, // Will be determined later
            format: fileExt,
            resolution: '1080p', // Default, will be determined later
            fps: 30, // Default
            bitrate: 2000, // Default
            status: 'ready' as const,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            metadata: {
              hasAudio: true, // Default assumption
              codec: 'h264' // Default
            }
          };
        });
        
        // Add videos to Redux store
        console.log('🎬 Adding videos to Redux store:', videos);
        dispatch(addVideos(videos));
        
        // Show success notification
        dispatch(addNotification({
          type: 'success',
          title: 'Videos Imported',
          message: `Successfully imported ${videos.length} video${videos.length !== 1 ? 's' : ''}`,
          autoClose: true,
          duration: 3000
        }));
        
      } else {
        // Fallback to HTML file input for browser
        console.log('🌐 Using HTML file input fallback');
        
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'video/*';
        
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (!files || files.length === 0) return;
          
          console.log(`🎬 Selected ${files.length} files for import`);
          
          // Convert FileList to array
          const fileArray = Array.from(files);
          
          // Create video objects for Redux
          const videos = fileArray.map((file, index) => ({
            id: `imported-${Date.now()}-${index}`,
            name: file.name,
            path: URL.createObjectURL(file), // Use blob URL for browser
            size: file.size,
            duration: 0, // Will be determined later
            format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
            resolution: '1080p', // Default, will be determined later
            fps: 30, // Default
            bitrate: 2000, // Default
            status: 'ready' as const,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            metadata: {
              hasAudio: true, // Default assumption
              codec: 'h264' // Default
            }
          }));
          
          // Add videos to Redux store
          console.log('🎬 Adding videos to Redux store:', videos);
          dispatch(addVideos(videos));
          
          // Show success notification
          dispatch(addNotification({
            type: 'success',
            title: 'Videos Imported',
            message: `Successfully imported ${videos.length} video${videos.length !== 1 ? 's' : ''}`,
            autoClose: true,
            duration: 3000
          }));
        };
        
        input.click();
      }
    } catch (error) {
      console.error('🎬 Error importing videos:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import videos. Please try again.',
        autoClose: true,
        duration: 5000
      }));
    }
  };
  
  // Global keyboard shortcut for help
  useKeyboardShortcuts([
    {
      key: '?',
      shiftKey: true,
      action: () => setShowShortcutsHelp(true),
      description: 'Show keyboard shortcuts help',
      category: 'General'
    },
    {
      key: 'D',
      ctrlKey: true,
      shiftKey: true,
      action: () => setShowDiagnostics(true),
      description: 'Show Electron diagnostics',
      category: 'Development'
    }
  ]);

  return (
    <>
      <SettingsLoader />
      <ErrorBoundaryEnhanced>
      <ThemeProvider value={{ theme, toggleTheme }}>
        <NotificationProvider>
          <MCPIntegration 
            enableTours={true}
            enableScreenshots={true}
            enableTesting={true}
          >
            <div className="app-container" data-testid="app-container">
                <HeaderBarFlexible
                  onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                  onToggleSettings={() => {
                    console.log('Toggle settings called, current state:', settingsPanelCollapsed);
                    setSettingsPanelCollapsed(!settingsPanelCollapsed);
                    console.log('New state will be:', !settingsPanelCollapsed);
                  }}
                  onToggleTheme={toggleTheme}
                  theme={theme}
                  projectName="project-740902494127"
                  videoCount={videos.length}
                  selectedCount={selectedVideos.length}
                  hasSelection={selectedVideos.length > 0}
                  onImport={handleImportVideos}
                  onProcess={() => console.log('Process clicked')}
                />
                
                {/* View Navigation Tabs */}
                <div className="view-navigation">
                  <button 
                    className={`view-tab ${currentView === 'library' ? 'active' : ''}`}
                    onClick={() => setCurrentView('library')}
                  >
                    📚 Library
                  </button>
                  <button 
                    className={`view-tab ${currentView === 'output' ? 'active' : ''}`}
                    onClick={() => setCurrentView('output')}
                  >
                    📤 Output
                  </button>
                  <button 
                    className={`view-tab ${currentView === 'timeline' ? 'active' : ''}`}
                    onClick={() => setCurrentView('timeline')}
                  >
                    🎬 Timeline
                  </button>
                </div>
                
                <div className="main-workspace" data-testid="main-workspace">
                  {currentView === 'library' && (
                    <ErrorBoundaryEnhanced>
                      <VideoLibraryEnhanced />
                    </ErrorBoundaryEnhanced>
                  )}
                  
                  {currentView === 'output' && (
                    <ErrorBoundaryEnhanced>
                      <OutputVideos />
                    </ErrorBoundaryEnhanced>
                  )}
                  
                  {currentView === 'timeline' && (
                    <ErrorBoundaryEnhanced>
                      <TimelinePreview />
                    </ErrorBoundaryEnhanced>
                  )}
                  
                  <ErrorBoundaryEnhanced>
                    <SettingsPanel 
                      collapsed={settingsPanelCollapsed}
                      onToggle={() => setSettingsPanelCollapsed(!settingsPanelCollapsed)}
                    />
                  </ErrorBoundaryEnhanced>
                </div>
                
                <ErrorBoundaryEnhanced>
                  <ProcessingQueue />
                </ErrorBoundaryEnhanced>
                
                <ModalManager />
                
                <KeyboardShortcutsHelp 
                  isOpen={showShortcutsHelp}
                  onClose={() => setShowShortcutsHelp(false)}
                />

                {/* Development Diagnostics */}
                {process.env.NODE_ENV === 'development' && showDiagnostics && (
                  <div 
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      zIndex: 10000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setShowDiagnostics(false)}
                  >
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        backgroundColor: '#1a1a1a',
                        borderRadius: '8px',
                        overflow: 'auto'
                      }}
                    >
                      <div style={{ padding: '10px', borderBottom: '1px solid #333' }}>
                        <button 
                          onClick={() => setShowDiagnostics(false)}
                          style={{
                            float: 'right',
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            fontSize: '20px',
                            cursor: 'pointer'
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <ElectronDiagnostics />
                    </div>
                  </div>
                )}
              </div>
            </MCPIntegration>
          </NotificationProvider>
        </ThemeProvider>
      </ErrorBoundaryEnhanced>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;