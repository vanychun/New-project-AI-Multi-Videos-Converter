import React, { useState, useEffect, useCallback, useRef } from 'react';

interface VideoFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'ready' | 'processing' | 'completed' | 'error';
}

interface ConfirmationDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type: 'delete' | 'warning' | 'info';
}

interface ContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
  videoId?: string;
  items: Array<{
    label: string;
    action: () => void;
    icon: string;
    disabled?: boolean;
  }>;
}

// Enhanced AI Multi Videos Converter with all Phase 1-3 features
const AppWorking: React.FC = () => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<ConfirmationDialog>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    type: 'info'
  });
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    isOpen: false,
    x: 0,
    y: 0,
    items: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    format: 'mp4',
    quality: 'high'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const showConfirmationDialog = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'delete' | 'warning' | 'info' = 'info'
  ) => {
    setShowConfirmation({
      isOpen: true,
      title,
      message,
      onConfirm,
      onCancel: () => setShowConfirmation(prev => ({ ...prev, isOpen: false })),
      type
    });
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    addVideos(files);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files) as File[];
    addVideos(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const addVideos = useCallback((files: File[]) => {
    setIsLoading(true);
    setLoadingMessage('Processing files...');
    
    setTimeout(() => {
      const newVideos: VideoFile[] = files.map(file => ({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        status: 'ready' as const
      }));
      
      setVideos(prev => [...prev, ...newVideos]);
      setIsLoading(false);
      setLoadingMessage('');
    }, 1000);
  }, []);

  const removeVideo = useCallback((videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    showConfirmationDialog(
      'Remove Video',
      `Are you sure you want to remove "${video.name}"?`,
      () => {
        setVideos(prev => prev.filter(v => v.id !== videoId));
        setSelectedVideos(prev => prev.filter(id => id !== videoId));
        setShowConfirmation(prev => ({ ...prev, isOpen: false }));
      },
      'delete'
    );
  }, [videos, showConfirmationDialog]);

  const removeSelectedVideos = useCallback(() => {
    if (selectedVideos.length === 0) return;
    showConfirmationDialog(
      'Remove Selected Videos',
      `Remove ${selectedVideos.length} selected video(s)?`,
      () => {
        setVideos(prev => prev.filter(v => !selectedVideos.includes(v.id)));
        setSelectedVideos([]);
        setShowConfirmation(prev => ({ ...prev, isOpen: false }));
      },
      'delete'
    );
  }, [selectedVideos, showConfirmationDialog]);

  const selectAllVideos = useCallback(() => {
    setSelectedVideos(videos.map(v => v.id));
  }, [videos]);

  const clearSelection = useCallback(() => {
    setSelectedVideos([]);
  }, []);

  const toggleVideoSelection = useCallback((videoId: string) => {
    setSelectedVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  }, []);

  const showContextMenu = useCallback((event: React.MouseEvent, videoId?: string) => {
    event.preventDefault();
    event.stopPropagation();

    const items = videoId ? [
      { label: 'Remove Video', action: () => removeVideo(videoId), icon: '🗑️' },
      { label: 'Duplicate', action: () => console.log('Duplicate:', videoId), icon: '📋' }
    ] : [
      { label: 'Select All', action: selectAllVideos, icon: '☑️', disabled: videos.length === 0 },
      { label: 'Clear Selection', action: clearSelection, icon: '❌', disabled: selectedVideos.length === 0 },
      { label: 'Remove Selected', action: removeSelectedVideos, icon: '🗑️', disabled: selectedVideos.length === 0 }
    ];

    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      videoId,
      items
    });
  }, [videos, selectedVideos, removeVideo, selectAllVideos, clearSelection, removeSelectedVideos]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'a':
            event.preventDefault();
            selectAllVideos();
            break;
          case 'o':
            event.preventDefault();
            fileInputRef.current?.click();
            break;
        }
      } else {
        switch (event.key) {
          case 'Delete':
            event.preventDefault();
            if (selectedVideos.length > 0) {
              removeSelectedVideos();
            }
            break;
          case 'Escape':
            event.preventDefault();
            clearSelection();
            closeContextMenu();
            setShowConfirmation(prev => ({ ...prev, isOpen: false }));
            setShowKeyboardHelp(false);
            break;
          case '?':
            if (event.shiftKey) {
              event.preventDefault();
              setShowKeyboardHelp(true);
            }
            break;
        }
      }
    };

    const handleClick = () => closeContextMenu();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, [selectedVideos, selectAllVideos, removeSelectedVideos, clearSelection, closeContextMenu]);

  const startProcessing = useCallback(() => {
    if (videos.length === 0) return;

    showConfirmationDialog(
      'Start Processing',
      `Process ${videos.length} video(s)?`,
      () => {
        setShowConfirmation(prev => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setLoadingMessage('Processing videos...');
        
        setTimeout(() => {
          setVideos(prev => prev.map(v => ({ ...v, status: 'completed' as const })));
          setIsLoading(false);
          setLoadingMessage('');
        }, 3000);
      }
    );
  }, [videos, showConfirmationDialog]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        height: '60px',
        background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
        borderBottom: '1px solid #4a4a6a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#7461ef'
        }}>
          🎬 AI Multi Videos Converter
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowKeyboardHelp(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Help ❓
          </button>
          <button style={{
            background: '#7461ef',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Settings ⚙️
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedVideos.length > 0 && (
        <div style={{
          height: '50px',
          background: 'rgba(116, 97, 239, 0.2)',
          borderBottom: '1px solid #7461ef',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: '10px'
        }}>
          <span style={{ fontSize: '14px' }}>
            {selectedVideos.length} video(s) selected
          </span>
          <button
            onClick={removeSelectedVideos}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🗑️ Remove Selected
          </button>
          <button
            onClick={clearSelection}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ❌ Clear Selection
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        padding: '20px',
        gap: '20px'
      }}>
        {/* Video Library */}
        <div 
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid #4a4a6a',
            borderRadius: '12px',
            padding: '20px'
          }}
          onContextMenu={(e) => showContextMenu(e)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#ffffff' }}>Video Library</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#7461ef',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                📁 Add Videos (Ctrl+O)
              </button>
              <button
                onClick={selectAllVideos}
                disabled={videos.length === 0}
                style={{
                  background: videos.length === 0 ? '#4a4a6a' : 'rgba(255,255,255,0.1)',
                  color: videos.length === 0 ? '#666' : 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: videos.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                ☑️ Select All (Ctrl+A)
              </button>
            </div>
          </div>
          
          {/* Drop Zone */}
          <div 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              border: '2px dashed #7461ef',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'rgba(116, 97, 239, 0.1)',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <h3>Drop videos here or click to browse</h3>
            <p style={{ color: '#a0a0a0' }}>
              Support: MP4, AVI, MOV, MKV, WebM
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Video Grid */}
          {videos.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '15px',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => toggleVideoSelection(video.id)}
                  onContextMenu={(e) => showContextMenu(e, video.id)}
                  style={{
                    background: selectedVideos.includes(video.id) 
                      ? 'rgba(116, 97, 239, 0.3)' 
                      : 'rgba(255,255,255,0.1)',
                    border: selectedVideos.includes(video.id) 
                      ? '2px solid #7461ef' 
                      : '1px solid #4a4a6a',
                    borderRadius: '8px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📹</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {video.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                        {(video.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: video.status === 'ready' ? '#f39c12' : 
                                 video.status === 'processing' ? '#3498db' :
                                 video.status === 'completed' ? '#27ae60' : '#e74c3c',
                      color: 'white'
                    }}>
                      {video.status}
                    </span>
                    {selectedVideos.includes(video.id) && (
                      <span style={{ color: '#7461ef', fontSize: '16px' }}>✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div style={{
          width: '300px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid #4a4a6a',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>Export Settings</h3>
          <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Format:</label>
              <select 
                value={exportSettings.format}
                onChange={(e) => setExportSettings(prev => ({ ...prev, format: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #4a4a6a',
                  background: '#2d2d47',
                  color: 'white'
                }}
              >
                <option value="mp4">MP4</option>
                <option value="avi">AVI</option>
                <option value="mov">MOV</option>
                <option value="mkv">MKV</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Quality:</label>
              <select 
                value={exportSettings.quality}
                onChange={(e) => setExportSettings(prev => ({ ...prev, quality: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #4a4a6a',
                  background: '#2d2d47',
                  color: 'white'
                }}
              >
                <option value="high">High (1080p)</option>
                <option value="medium">Medium (720p)</option>
                <option value="low">Low (480p)</option>
              </select>
            </div>
            <button 
              onClick={startProcessing}
              disabled={videos.length === 0}
              style={{
                width: '100%',
                background: videos.length === 0 ? '#4a4a6a' : '#7461ef',
                color: videos.length === 0 ? '#666' : 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                cursor: videos.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🚀 Start Processing ({videos.length} videos)
            </button>
            
            {/* Statistics */}
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Statistics</h4>
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <div>Total Videos: {videos.length}</div>
                <div>Selected: {selectedVideos.length}</div>
                <div>Ready: {videos.filter(v => v.status === 'ready').length}</div>
                <div>Completed: {videos.filter(v => v.status === 'completed').length}</div>
                <div>Total Size: {(videos.reduce((sum, v) => sum + v.size, 0) / (1024 * 1024)).toFixed(1)} MB</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        height: '160px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #4a4a6a',
        borderRadius: '12px',
        margin: '0 20px 20px 20px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>Timeline</h3>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          height: '80px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a0a0a0'
        }}>
          {videos.length === 0 
            ? 'Timeline Preview - Add videos to see them here'
            : `Timeline with ${videos.length} video(s) - Drag to reorder`
          }
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '8px',
            padding: '8px 0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 1000,
            minWidth: '150px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.items.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  closeContextMenu();
                }
              }}
              style={{
                padding: '8px 16px',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                color: item.disabled ? '#666' : 'white',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  e.currentTarget.style.background = 'rgba(116, 97, 239, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>
              {showConfirmation.type === 'delete' ? '🗑️' : 
               showConfirmation.type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <h3 style={{ margin: '0 0 15px 0', color: '#ffffff' }}>
              {showConfirmation.title}
            </h3>
            <p style={{ margin: '0 0 25px 0', color: '#a0a0a0', lineHeight: '1.5' }}>
              {showConfirmation.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={showConfirmation.onCancel}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={showConfirmation.onConfirm}
                style={{
                  background: showConfirmation.type === 'delete' ? '#e74c3c' : '#7461ef',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {showConfirmation.type === 'delete' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#ffffff', textAlign: 'center' }}>
              ⌨️ Keyboard Shortcuts
            </h3>
            <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#7461ef' }}>File Operations:</strong>
                <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                  <div>Ctrl+O - Open files</div>
                  <div>Ctrl+A - Select all videos</div>
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#7461ef' }}>Selection:</strong>
                <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                  <div>Click - Toggle selection</div>
                  <div>Delete - Remove selected videos</div>
                  <div>Escape - Clear selection</div>
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#7461ef' }}>Navigation:</strong>
                <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                  <div>Right-click - Context menu</div>
                  <div>Escape - Close dialogs</div>
                  <div>Shift+? - Show this help</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                style={{
                  background: '#7461ef',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #4a4a6a',
              borderTop: '4px solid #7461ef',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px auto'
            }} />
            <p style={{ margin: 0, color: '#ffffff' }}>{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AppWorking;