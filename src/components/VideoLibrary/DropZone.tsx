import React from 'react';

interface DropZoneProps {
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
  isProcessing: boolean;
  onFilesAdded: (files: File[]) => void;
  onPathsAdded?: (paths: string[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  isDragActive,
  isDragAccept,
  isDragReject,
  isProcessing,
  onFilesAdded,
  onPathsAdded,
}) => {
  // const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = Array.from(event.target.files || []);
  //   if (files.length > 0) {
  //     onFilesAdded(files);
  //   }
  // }; // TODO: Implement file input change handler
  
  const handleBrowseClick = async () => {
    try {
      console.log('=== File Browse Clicked ===');
      console.log('window.electronAPI available:', !!window.electronAPI);
      console.log('selectFiles method available:', typeof window.electronAPI?.selectFiles);
      console.log('onPathsAdded callback available:', !!onPathsAdded);
      
      // Try Electron API first
      if (window.electronAPI?.selectFiles) {
        console.log('Using Electron file selection...');
        try {
          const filePaths = await window.electronAPI.selectFiles();
          console.log('Selected file paths:', filePaths);
          console.log('File paths type:', typeof filePaths);
          console.log('File paths length:', filePaths?.length);
          
          if (filePaths && filePaths.length > 0 && onPathsAdded) {
            console.log('Calling onPathsAdded with:', filePaths);
            onPathsAdded(filePaths);
            return;
          } else {
            console.log('No files selected or onPathsAdded not available');
          }
        } catch (electronError) {
          console.error('Electron file selection failed:', electronError);
          // Continue to fallback method
        }
      } else {
        console.log('Electron API or selectFiles method not available');
      }
      
      // Fallback to browser file input
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'video/*,.mp4,.avi,.mov,.mkv,.webm,.wmv,.flv,.m4v,.3gp';
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length > 0) {
          onFilesAdded(files);
        }
      };
      input.click();
    } catch (error) {
      console.error('Failed to open file browser:', error);
    }
  };
  
  const getDropZoneClass = () => {
    const baseClass = 'drop-zone';
    if (isProcessing) return `${baseClass} processing`;
    if (isDragActive) {
      if (isDragAccept) return `${baseClass} drag-accept`;
      if (isDragReject) return `${baseClass} drag-reject`;
      return `${baseClass} drag-active`;
    }
    return baseClass;
  };
  
  const getDropZoneContent = () => {
    if (isProcessing) {
      return {
        icon: '⏳',
        title: 'Processing Videos',
        subtitle: 'Please wait while we process your video files...',
        showButton: false,
      };
    }
    
    if (isDragActive) {
      if (isDragAccept) {
        return {
          icon: '✅',
          title: 'Drop Videos Here',
          subtitle: 'Release to add videos to your library',
          showButton: false,
        };
      }
      
      if (isDragReject) {
        return {
          icon: '❌',
          title: 'Unsupported Files',
          subtitle: 'Some files are not supported video formats',
          showButton: false,
        };
      }
      
      return {
        icon: '📁',
        title: 'Drop Files Here',
        subtitle: 'Checking file types...',
        showButton: false,
      };
    }
    
    return {
      icon: '🎬',
      title: 'Add Videos to Get Started',
      subtitle: 'Drag & drop video files here or click browse to select files',
      showButton: true,
    };
  };
  
  const content = getDropZoneContent();
  
  return (
    <div className={getDropZoneClass()}>
      <div className="drop-zone-content">
        <div className="drop-zone-icon">
          {content.icon}
        </div>
        
        <div className="drop-zone-text">
          <h3 className="drop-zone-title">{content.title}</h3>
          <p className="drop-zone-subtitle">{content.subtitle}</p>
        </div>
        
        {content.showButton && (
          <div className="drop-zone-actions">
            <button 
              className="browse-button"
              onClick={handleBrowseClick}
              disabled={isProcessing}
            >
              📂 Browse Files
            </button>
            
            {window.electronAPI?.selectFolder && (
              <button 
                className="browse-button"
                onClick={async () => {
                  try {
                    const folderPath = await window.electronAPI.selectFolder();
                    if (folderPath && onPathsAdded) {
                      // This would need to be implemented to scan folder for videos
                      console.log('Selected folder:', folderPath);
                    }
                  } catch (error) {
                    console.error('Failed to select folder:', error);
                  }
                }}
                disabled={isProcessing}
                style={{ marginLeft: '8px' }}
              >
                📁 Browse Folder
              </button>
            )}
            
            {/* Development tools */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <button 
                  className="browse-button"
                  onClick={() => {
                    // Create mock files for testing
                    const mockFiles = [
                      new File(['mock video content'], 'sample_video.mp4', { type: 'video/mp4' }),
                      new File(['mock video content'], 'test_video.mov', { type: 'video/mov' })
                    ];
                    onFilesAdded(mockFiles);
                  }}
                  disabled={isProcessing}
                  style={{ background: '#7461ef', marginTop: '8px' }}
                >
                  🧪 Add Test Videos
                </button>

                <button 
                  className="browse-button"
                  onClick={async () => {
                    console.log('=== ELECTRON API TEST ===');
                    console.log('electronAPI exists:', !!window.electronAPI);
                    if (window.electronAPI) {
                      console.log('Available methods:', Object.keys(window.electronAPI));
                      try {
                        const testResult = await window.electronAPI.testConnection?.();
                        console.log('Test connection result:', testResult);
                      } catch (error) {
                        console.error('Test connection failed:', error);
                      }
                    }
                  }}
                  disabled={isProcessing}
                  style={{ background: '#ef4444', marginTop: '8px' }}
                >
                  🔧 Test Electron API
                </button>
              </>
            )}
            
            <div className="drop-zone-formats">
              <strong>Supported formats:</strong>
              <span>MP4, AVI, MOV, MKV, WebM, WMV, FLV, M4V, 3GP</span>
            </div>
          </div>
        )}
        
        {isProcessing && (
          <div className="processing-indicator">
            <div className="processing-spinner" />
          </div>
        )}
      </div>
      
      <div className="drop-zone-features">
        <div className="feature-item">
          <div className="feature-icon">⚡</div>
          <div className="feature-text">
            <strong>Fast Processing</strong>
            <span>Automatic metadata extraction and thumbnail generation</span>
          </div>
        </div>
        
        <div className="feature-item">
          <div className="feature-icon">🎯</div>
          <div className="feature-text">
            <strong>Batch Support</strong>
            <span>Add multiple videos at once for efficient workflow</span>
          </div>
        </div>
        
        <div className="feature-item">
          <div className="feature-icon">🔧</div>
          <div className="feature-text">
            <strong>Smart Organization</strong>
            <span>Automatic sorting and filtering options</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropZone;