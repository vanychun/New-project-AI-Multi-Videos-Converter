import React, { useState } from 'react';
import { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const shortcuts: Array<KeyboardShortcut & { category: string }> = [
    // Video Library Shortcuts
    {
      key: 'Ctrl+A',
      action: () => {},
      description: 'Select all videos',
      category: 'Video Library'
    },
    {
      key: 'Delete',
      action: () => {},
      description: 'Delete selected videos',
      category: 'Video Library'
    },
    {
      key: 'Ctrl+F',
      action: () => {},
      description: 'Focus search box',
      category: 'Video Library'
    },
    {
      key: 'Escape',
      action: () => {},
      description: 'Clear search or deselect all',
      category: 'Video Library'
    },
    {
      key: 'Arrow Keys',
      action: () => {},
      description: 'Navigate through videos',
      category: 'Video Library'
    },
    {
      key: 'Enter',
      action: () => {},
      description: 'Select/deselect focused video',
      category: 'Video Library'
    },
    {
      key: 'Home',
      action: () => {},
      description: 'Go to first video',
      category: 'Video Library'
    },
    {
      key: 'End',
      action: () => {},
      description: 'Go to last video',
      category: 'Video Library'
    },
    {
      key: 'F5',
      action: () => {},
      description: 'Refresh library (clear filters)',
      category: 'Video Library'
    },

    // Timeline & Playback Shortcuts
    {
      key: 'Space',
      action: () => {},
      description: 'Play/Pause video',
      category: 'Timeline & Playback'
    },
    {
      key: 'S',
      action: () => {},
      description: 'Stop playback',
      category: 'Timeline & Playback'
    },
    {
      key: '← →',
      action: () => {},
      description: 'Seek backward/forward (1 sec)',
      category: 'Timeline & Playback'
    },
    {
      key: 'Shift + ← →',
      action: () => {},
      description: 'Seek backward/forward (10 sec)',
      category: 'Timeline & Playback'
    },
    {
      key: '↑ ↓',
      action: () => {},
      description: 'Jump forward/backward (1 min)',
      category: 'Timeline & Playback'
    },
    {
      key: 'Home',
      action: () => {},
      description: 'Go to beginning',
      category: 'Timeline & Playback'
    },
    {
      key: 'End',
      action: () => {},
      description: 'Go to end',
      category: 'Timeline & Playback'
    },
    {
      key: 'M',
      action: () => {},
      description: 'Toggle mute',
      category: 'Timeline & Playback'
    },
    {
      key: 'F',
      action: () => {},
      description: 'Toggle fullscreen',
      category: 'Timeline & Playback'
    },

    // Timeline Controls
    {
      key: 'Ctrl + +',
      action: () => {},
      description: 'Zoom in timeline',
      category: 'Timeline Controls'
    },
    {
      key: 'Ctrl + -',
      action: () => {},
      description: 'Zoom out timeline',
      category: 'Timeline Controls'
    },
    {
      key: 'Ctrl + 0',
      action: () => {},
      description: 'Reset timeline zoom',
      category: 'Timeline Controls'
    },
    {
      key: 'Ctrl + T',
      action: () => {},
      description: 'Toggle trim mode',
      category: 'Timeline Controls'
    },
    {
      key: 'Escape',
      action: () => {},
      description: 'Exit trim mode or clear selection',
      category: 'Timeline Controls'
    },

    // General Application
    {
      key: 'Ctrl + S',
      action: () => {},
      description: 'Save current project',
      category: 'General'
    },
    {
      key: 'Ctrl + Z',
      action: () => {},
      description: 'Undo last action',
      category: 'General'
    },
    {
      key: 'Ctrl + Shift + Z',
      action: () => {},
      description: 'Redo last action',
      category: 'General'
    },
    {
      key: 'F11',
      action: () => {},
      description: 'Toggle application fullscreen',
      category: 'General'
    },
    {
      key: '?',
      action: () => {},
      description: 'Show this help dialog',
      category: 'General'
    }
  ];

  const categories = ['all', ...Array.from(new Set(shortcuts.map(s => s.category)))];

  const filteredShortcuts = activeCategory === 'all' 
    ? shortcuts 
    : shortcuts.filter(s => s.category === activeCategory);

  const formatKey = (key: string) => {
    return key
      .replace('Ctrl', '⌃')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace('Meta', '⌘')
      .replace('←', '←')
      .replace('→', '→')
      .replace('↑', '↑')
      .replace('↓', '↓');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="keyboard-shortcuts-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        className="keyboard-shortcuts-dialog"
        style={{
          background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
          border: '1px solid #4a4a6a',
          borderRadius: '16px',
          padding: '32px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 24px 96px rgba(0, 0, 0, 0.5)',
          animation: 'slideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '32px',
              background: 'rgba(116, 97, 239, 0.1)',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ⌨️
            </div>
            <div>
              <h2 style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: '600',
                margin: 0
              }}>
                Keyboard Shortcuts
              </h2>
              <p style={{
                color: '#a0a0a0',
                fontSize: '14px',
                margin: '4px 0 0 0'
              }}>
                Speed up your workflow with these keyboard shortcuts
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0a0a0',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#a0a0a0';
            }}
            title="Close (Escape)"
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                background: activeCategory === category ? '#7461ef' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid',
                borderColor: activeCategory === category ? '#7461ef' : '#4a4a6a',
                color: activeCategory === category ? '#ffffff' : '#e0e0e0',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize'
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              {category === 'all' ? 'All Shortcuts' : category}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div style={{
          maxHeight: '500px',
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {activeCategory !== 'all' && (
            <h3 style={{
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 16px 0',
              borderBottom: '1px solid #4a4a6a',
              paddingBottom: '8px'
            }}>
              {activeCategory}
            </h3>
          )}
          
          <div style={{
            display: 'grid',
            gap: '12px'
          }}>
            {filteredShortcuts.map((shortcut, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid #4a4a6a',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flex: 1
                }}>
                  <div style={{
                    background: 'rgba(116, 97, 239, 0.1)',
                    border: '1px solid #7461ef',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#7461ef',
                    fontSize: '13px',
                    fontWeight: '600',
                    fontFamily: 'monospace',
                    minWidth: '80px',
                    textAlign: 'center'
                  }}>
                    {formatKey(shortcut.key)}
                  </div>
                  
                  <div style={{
                    color: '#e0e0e0',
                    fontSize: '14px'
                  }}>
                    {shortcut.description}
                  </div>
                </div>
                
                {activeCategory === 'all' && (
                  <div style={{
                    color: '#a0a0a0',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    {shortcut.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid #4a4a6a'
        }}>
          <div style={{
            color: '#a0a0a0',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            💡 <strong>Tip:</strong> Many shortcuts are context-sensitive. 
            Focus on different areas (Video Library, Timeline) to activate their specific shortcuts.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .keyboard-shortcuts-dialog::-webkit-scrollbar {
          width: 8px;
        }
        
        .keyboard-shortcuts-dialog::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        .keyboard-shortcuts-dialog::-webkit-scrollbar-thumb {
          background: #7461ef;
          border-radius: 4px;
        }
        
        .keyboard-shortcuts-dialog::-webkit-scrollbar-thumb:hover {
          background: #8b73ff;
        }
      `}</style>
    </div>
  );
};

export default KeyboardShortcutsHelp;