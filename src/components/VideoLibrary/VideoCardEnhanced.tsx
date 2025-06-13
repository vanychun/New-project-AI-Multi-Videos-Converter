import React, { useState, useRef, useEffect, memo } from 'react';
import { VideoFileEnhanced, ProcessingProgress } from '../../types/video-enhanced.types';

export interface VideoCardEnhancedProps {
  video: VideoFileEnhanced;
  isSelected: boolean;
  viewMode: 'grid' | 'list';
  gridSize: 'small' | 'medium' | 'large';
  showThumbnails: boolean;
  showMetadata: boolean;
  showProgress: boolean;
  onSelect: (videoId: string, multiSelect: boolean) => void;
  onDoubleClick: (video: VideoFileEnhanced) => void;
  onContextMenu: (event: React.MouseEvent, video: VideoFileEnhanced) => void;
  onPreview: (video: VideoFileEnhanced) => void;
  onRemove: (video: VideoFileEnhanced) => void;
  onEdit: (video: VideoFileEnhanced) => void;
}

interface ThumbnailCarouselProps {
  thumbnails: VideoFileEnhanced['thumbnails'];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const ThumbnailCarousel: React.FC<ThumbnailCarouselProps> = memo(({ 
  thumbnails, 
  currentIndex, 
  onIndexChange 
}) => {
  if (!thumbnails || thumbnails.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '4px',
      left: '4px',
      right: '4px',
      display: 'flex',
      gap: '2px',
      opacity: 0.8
    }}>
      {thumbnails.map((_, index) => (
        <div
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index);
          }}
          style={{
            flex: 1,
            height: '3px',
            background: index === currentIndex ? '#7461ef' : 'rgba(255,255,255,0.3)',
            borderRadius: '1px',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        />
      ))}
    </div>
  );
});

const ProgressIndicator: React.FC<{ progress: ProcessingProgress }> = memo(({ progress }) => (
  <div style={{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.8)',
    padding: '8px'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '11px',
      color: 'white'
    }}>
      <div style={{
        flex: 1,
        height: '4px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          background: progress.stage === 'complete' ? '#27ae60' : '#7461ef',
          width: `${progress.percentage}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>
      <span>{progress.percentage}%</span>
    </div>
    {progress.currentOperation && (
      <div style={{
        fontSize: '10px',
        color: '#a0a0a0',
        marginTop: '2px',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        {progress.currentOperation}
      </div>
    )}
  </div>
));

const StatusBadge: React.FC<{ status: VideoFileEnhanced['status']; enhanced?: boolean }> = memo(({ status, enhanced }) => {
  const statusConfig = {
    importing: { color: '#f39c12', icon: '📥', label: 'Importing' },
    analyzing: { color: '#3498db', icon: '🔍', label: 'Analyzing' },
    ready: { color: '#27ae60', icon: '✅', label: 'Ready' },
    processing: { color: '#9b59b6', icon: '⚙️', label: 'Processing' },
    completed: { 
      color: enhanced ? 'linear-gradient(135deg, #2ecc71, #7461ef)' : '#2ecc71', 
      icon: enhanced ? '🚀' : '✨', 
      label: enhanced ? 'Enhanced' : 'Completed' 
    },
    error: { color: '#e74c3c', icon: '❌', label: 'Error' },
    paused: { color: '#95a5a6', icon: '⏸️', label: 'Paused' }
  };

  const config = statusConfig[status];

  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      background: config.color,
      color: 'white',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      boxShadow: status === 'completed' && enhanced 
        ? '0 4px 15px rgba(116, 97, 239, 0.4)' 
        : '0 2px 4px rgba(0,0,0,0.2)',
      animation: status === 'completed' && enhanced ? 'completionGlow 2s ease-in-out infinite alternate' : 'none'
    }}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {status === 'completed' && enhanced && (
        <style>{`
          @keyframes completionGlow {
            0% { box-shadow: 0 4px 15px rgba(116, 97, 239, 0.4); }
            100% { box-shadow: 0 6px 20px rgba(116, 97, 239, 0.6); }
          }
        `}</style>
      )}
    </div>
  );
});

const QualityIndicator: React.FC<{ score?: number }> = memo(({ score }) => {
  if (score === undefined) return null;

  const getQualityColor = (score: number) => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      left: '8px',
      background: getQualityColor(score),
      color: 'white',
      padding: '2px 6px',
      borderRadius: '8px',
      fontSize: '9px',
      fontWeight: 'bold'
    }}>
      {getQualityLabel(score)}
    </div>
  );
});

const ExportIndicator: React.FC<{ path: string }> = memo(({ path }) => {
  const canExport = path && !path.startsWith('blob:');
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '8px',
      right: '8px',
      background: canExport ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)',
      color: 'white',
      padding: '2px 6px',
      borderRadius: '8px',
      fontSize: '9px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '3px'
    }} title={canExport ? 'Can be exported' : 'Re-import needed for export'}>
      {canExport ? '✓ Export' : '⚠ Import'}
    </div>
  );
});

const MetadataOverlay: React.FC<{ 
  video: VideoFileEnhanced;
  visible: boolean;
}> = memo(({ video, visible }) => {
  if (!visible || !video.metadata) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
      padding: '20px 8px 8px 8px',
      color: 'white',
      fontSize: '11px',
      lineHeight: '1.3'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>{video.metadata.resolution.width}×{video.metadata.resolution.height}</span>
        <span>{formatDuration(video.metadata.duration)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{video.metadata.codec.toUpperCase()}</span>
        <span>{formatFileSize(video.metadata.size)}</span>
      </div>
      {video.metadata.frameRate && (
        <div style={{ textAlign: 'center', marginTop: '2px', fontSize: '10px', opacity: 0.8 }}>
          {video.metadata.frameRate.toFixed(0)} FPS
        </div>
      )}
    </div>
  );
});

export const VideoCardEnhanced: React.FC<VideoCardEnhancedProps> = memo(({
  video,
  isSelected,
  viewMode,
  gridSize,
  showThumbnails,
  showMetadata,
  showProgress,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onPreview,
  onRemove,
  onEdit
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
  const [showMetadataOverlay, setShowMetadataOverlay] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const thumbnailCycleRef = useRef<NodeJS.Timeout>();

  // Card dimensions based on view mode and grid size
  const getDimensions = () => {
    if (viewMode === 'list') {
      return { width: '100%', height: '80px' };
    }
    
    const sizes = {
      small: { width: '160px', height: '120px' },
      medium: { width: '200px', height: '150px' },
      large: { width: '240px', height: '180px' }
    };
    
    return sizes[gridSize];
  };

  const dimensions = getDimensions();

  // Thumbnail cycling on hover
  useEffect(() => {
    if (isHovered && showThumbnails && video.thumbnails && video.thumbnails.length > 1) {
      thumbnailCycleRef.current = setInterval(() => {
        setCurrentThumbnailIndex(prev => 
          (prev + 1) % (video.thumbnails?.length || 1)
        );
      }, 1000);
    } else {
      if (thumbnailCycleRef.current) {
        clearInterval(thumbnailCycleRef.current);
      }
      setCurrentThumbnailIndex(0);
    }

    return () => {
      if (thumbnailCycleRef.current) {
        clearInterval(thumbnailCycleRef.current);
      }
    };
  }, [isHovered, showThumbnails, video.thumbnails]);

  // Metadata overlay delay
  useEffect(() => {
    if (isHovered && showMetadata) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowMetadataOverlay(true);
      }, 500);
    } else {
      setShowMetadataOverlay(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isHovered, showMetadata]);

  const handleClick = (event: React.MouseEvent) => {
    onSelect(video.id, event.ctrlKey || event.metaKey);
  };

  const handleDoubleClick = () => {
    onDoubleClick(video);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    onContextMenu(event, video);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const getCurrentThumbnail = () => {
    if (!showThumbnails || !video.thumbnails || video.thumbnails.length === 0) {
      return video.thumbnail;
    }
    return video.thumbnails[currentThumbnailIndex] || video.thumbnail;
  };

  const cardStyle: React.CSSProperties = {
    width: dimensions.width,
    height: dimensions.height,
    background: isSelected 
      ? 'linear-gradient(135deg, rgba(116, 97, 239, 0.3), rgba(116, 97, 239, 0.1))' 
      : 'rgba(255, 255, 255, 0.05)',
    border: isSelected 
      ? '2px solid #7461ef' 
      : isHovered 
        ? '1px solid rgba(116, 97, 239, 0.5)' 
        : '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    display: 'flex',
    flexDirection: viewMode === 'list' ? 'row' : 'column',
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: isHovered 
      ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
      : '0 2px 10px rgba(0, 0, 0, 0.1)'
  };

  const thumbnailStyle: React.CSSProperties = {
    width: viewMode === 'list' ? '120px' : '100%',
    height: viewMode === 'list' ? '100%' : '70%',
    background: 'linear-gradient(135deg, #2d2d47, #3a3a5c)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  };

  const currentThumbnail = getCurrentThumbnail();

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail Area */}
      <div style={thumbnailStyle}>
        {currentThumbnail ? (
          <img
            src={currentThumbnail.dataUrl}
            alt={video.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease'
            }}
            draggable={false}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#a0a0a0',
            fontSize: viewMode === 'list' ? '24px' : '32px'
          }}>
            <span>📹</span>
            {viewMode !== 'list' && (
              <span style={{ fontSize: '10px', marginTop: '4px' }}>
                No Preview
              </span>
            )}
          </div>
        )}

        {/* Status Badge */}
        <StatusBadge status={video.status} enhanced={video.enhanced} />

        {/* Quality Indicator */}
        <QualityIndicator score={video.qualityScore} />
        
        {/* Export Indicator */}
        <ExportIndicator path={video.path} />

        {/* Selection Indicator */}
        {isSelected && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#7461ef',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
        )}

        {/* Thumbnail Carousel */}
        {showThumbnails && video.thumbnails && video.thumbnails.length > 1 && (
          <ThumbnailCarousel
            thumbnails={video.thumbnails}
            currentIndex={currentThumbnailIndex}
            onIndexChange={setCurrentThumbnailIndex}
          />
        )}

        {/* Progress Indicator */}
        {showProgress && video.progress && (
          <ProgressIndicator progress={video.progress} />
        )}

        {/* Metadata Overlay */}
        <MetadataOverlay 
          video={video} 
          visible={showMetadataOverlay} 
        />

        {/* Hover Actions */}
        {isHovered && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            gap: '8px',
            opacity: 0.9
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(video);
              }}
              style={{
                background: 'rgba(116, 97, 239, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title="Preview"
            >
              👁️
            </button>
            
            {/* Show enhanced comparison button for completed enhanced videos */}
            {video.status === 'completed' && video.enhanced && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Open AI Preview Modal for comparison
                  console.log('Opening AI Preview comparison for:', video.name);
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                  boxShadow: '0 4px 15px rgba(116, 97, 239, 0.4)'
                }}
                title="Compare enhanced version"
              >
                🚀
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(video);
              }}
              style={{
                background: 'rgba(52, 152, 219, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title="Edit"
            >
              ✏️
            </button>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div style={{
        flex: 1,
        padding: viewMode === 'list' ? '8px 12px' : '8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: viewMode === 'list' ? 'center' : 'flex-start',
        minWidth: 0
      }}>
        {/* Title */}
        <div style={{
          fontSize: viewMode === 'list' ? '14px' : '12px',
          fontWeight: '600',
          color: '#ffffff',
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          title: video.customName || video.name
        }}>
          {video.customName || video.name}
        </div>

        {/* Metadata Summary */}
        {video.metadata && (
          <div style={{
            fontSize: '10px',
            color: '#a0a0a0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              {(video.metadata.size / (1024 * 1024)).toFixed(1)} MB
            </span>
            {viewMode !== 'list' && (
              <span>
                {Math.floor(video.metadata.duration / 60)}:
                {Math.floor(video.metadata.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && viewMode !== 'list' && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2px',
            marginTop: '4px'
          }}>
            {video.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                style={{
                  background: 'rgba(116, 97, 239, 0.2)',
                  color: '#7461ef',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  fontSize: '8px',
                  fontWeight: '500'
                }}
              >
                {tag}
              </span>
            ))}
            {video.tags.length > 2 && (
              <span style={{
                fontSize: '8px',
                color: '#666',
                alignSelf: 'center'
              }}>
                +{video.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Completion Metadata for Enhanced Videos */}
        {video.status === 'completed' && video.enhanced && video.completionMetadata && (
          <div style={{
            marginTop: '4px',
            padding: '6px',
            background: 'linear-gradient(135deg, rgba(116, 97, 239, 0.1), rgba(168, 85, 247, 0.1))',
            borderRadius: '6px',
            border: '1px solid rgba(116, 97, 239, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2px'
            }}>
              <span style={{
                fontSize: '8px',
                color: '#7461ef',
                fontWeight: '600'
              }}>
                🚀 Enhanced
              </span>
              <span style={{
                fontSize: '8px',
                color: '#a855f7',
                fontWeight: '500'
              }}>
                {video.completionMetadata.qualityScore || 95}%
              </span>
            </div>
            <div style={{
              fontSize: '7px',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{video.completionMetadata.enhancementType || '4x Upscale'}</span>
              {video.completionMetadata.processingTime && (
                <span>{Math.floor(video.completionMetadata.processingTime / 60)}m</span>
              )}
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {video.error && (
          <div style={{
            fontSize: '9px',
            color: '#e74c3c',
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {video.error.message}
          </div>
        )}
      </div>

      {/* Quick Action Buttons for Completed Enhanced Videos */}
      {video.status === 'completed' && video.enhanced && isHovered && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          justifyContent: 'center'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Open enhanced file
              window.electronAPI?.openFile(video.completionMetadata?.outputPath);
            }}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
            title="Play enhanced video"
          >
            ▶️ Play
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Copy output path
              navigator.clipboard.writeText(video.completionMetadata?.outputPath || '');
            }}
            style={{
              background: 'rgba(116, 97, 239, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Share enhanced video"
          >
            🔗 Share
          </button>
        </div>
      )}
      
      {/* Favorite Indicator */}
      {video.favorite && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          color: '#f1c40f',
          fontSize: '12px'
        }}>
          ⭐
        </div>
      )}
    </div>
  );
});

VideoCardEnhanced.displayName = 'VideoCardEnhanced';