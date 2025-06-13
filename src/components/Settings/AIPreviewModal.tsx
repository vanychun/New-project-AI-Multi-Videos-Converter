import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { getVideoSource } from '../../store/middleware/videoStateMiddleware';

interface AIPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId?: string;
}

const AIPreviewModal: React.FC<AIPreviewModalProps> = ({ isOpen, onClose, videoId }) => {
  const [previewMode, setPreviewMode] = useState<'split' | 'side-by-side' | 'toggle'>('split');
  const [showOriginal, setShowOriginal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enhancedVideoRef = useRef<HTMLVideoElement>(null);
  
  const { videos } = useSelector((state: RootState) => state.videos);
  const { ai: aiSettings } = useSelector((state: RootState) => state.settings);
  
  const video = videos.find((v: any) => v.id === videoId);

  useEffect(() => {
    if (isOpen && video) {
      console.log('🎬 Modal opened, generating preview for:', video.name);
      generatePreview();
    }
  }, [isOpen, video, aiSettings]);

  // Force enhanced preview render when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🎨 Modal opened - setting up immediate preview');
      // Set up enhanced preview immediately
      setTimeout(() => {
        setupEnhancedPreview();
      }, 100);
    }
  }, [isOpen]);

  // Update enhanced preview when AI settings change
  useEffect(() => {
    if (isOpen && previewReady) {
      console.log('🎨 AI settings changed - updating enhanced preview');
      setupEnhancedPreview();
    }
  }, [isOpen, previewReady, aiSettings]);

  const generatePreview = async () => {
    setLoading(true);
    setPreviewReady(false);
    
    console.log('🎬 Generating AI Preview for video:', video);
    
    // Always set a timeout to ensure loading completes
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Loading timeout reached - forcing preview ready');
      setLoading(false);
      setPreviewReady(true);
      setupEnhancedPreview();
    }, 2000); // 2 seconds max loading time
    
    if (video) {
      // Use the new video source helper that handles File objects properly
      let videoSrc = getVideoSource(video);
      
      console.log('🎬 Getting video source for:', video.name);
      console.log('📊 Video source result:', videoSrc);
      
      // Fallback strategies if no source available
      if (!videoSrc) {
        console.log('🔍 No direct video source found, trying fallbacks...');
        
        // Strategy 1: Use thumbnail if available
        if (video.thumbnail) {
          console.log('🖼️ Using video thumbnail as fallback');
          videoSrc = video.thumbnail;
        }
        // Strategy 2: Create placeholder
        else {
          console.log('🎭 Creating placeholder video content');
          videoSrc = createTestVideoUrl(video.name);
        }
      } else {
        console.log('✅ Video source found:', videoSrc.substring(0, 50) + '...');
      }
      
      console.log('🎬 Final video source selected:', videoSrc);
      console.log('📊 Video object details:', {
        path: video.path,
        thumbnail: video.thumbnail ? 'present' : 'missing',
        name: video.name,
        videoSrcType: videoSrc?.startsWith('blob:') ? 'blob' : 
                     videoSrc?.startsWith('file:') ? 'file' : 
                     videoSrc?.startsWith('data:') ? 'data' : 'other'
      });
      
      // Load the video
      if (videoRef.current && videoSrc) {
        console.log('🎥 Setting video element src to:', videoSrc);
        videoRef.current.src = videoSrc;
        
        videoRef.current.onloadeddata = () => {
          console.log('✅ Video loaded successfully');
          clearTimeout(loadingTimeout);
          setVideoLoaded(true);
          setLoading(false);
          setPreviewReady(true);
          setupEnhancedPreview();
        };
        
        videoRef.current.onerror = (e) => {
          console.warn('❌ Video load error:', e);
          console.log('🔍 Video src that failed:', videoRef.current?.src);
          console.log('🎭 Falling back to placeholder');
          
          // If file:// URL failed, try creating a placeholder
          if (videoSrc.startsWith('file://')) {
            console.log('📌 Note: file:// URLs may be blocked by browser security');
            console.log('💡 Consider using Electron protocol or serving files locally');
          }
          
          clearTimeout(loadingTimeout);
          setVideoLoaded(false);
          setLoading(false);
          setPreviewReady(true);
          setupEnhancedPreview();
        };
      } else {
        // No video element, just show preview
        clearTimeout(loadingTimeout);
        setLoading(false);
        setPreviewReady(true);
        setupEnhancedPreview();
      }
    } else {
      // No video data, just show preview
      clearTimeout(loadingTimeout);
      setLoading(false);
      setPreviewReady(true);
      setupEnhancedPreview();
    }
  };

  const createTestVideoUrl = (fileName: string) => {
    // Create a sophisticated static placeholder
    console.log('🎭 Creating placeholder for:', fileName);
    
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(0.5, '#334155');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);
      
      // Grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }
      
      // Video icon
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🎬', 640, 280);
      
      // Title
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Video Preview', 640, 380);
      
      // Filename
      ctx.font = '32px Arial';
      ctx.fillStyle = '#94a3b8';
      const truncatedName = fileName.length > 35 ? fileName.substring(0, 32) + '...' : fileName;
      ctx.fillText(truncatedName, 640, 430);
      
      // Status indicator
      ctx.font = '24px Arial';
      ctx.fillStyle = '#7c3aed';
      ctx.fillText('📁 No video file loaded - Preview mode active', 640, 480);
      
      // Resolution indicator
      ctx.font = '18px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('1280 × 720 • Placeholder', 640, 520);
    }
    
    return canvas.toDataURL('image/png');
  };

  const setupEnhancedPreview = () => {
    console.log('🎨 Setting up enhanced preview canvas');
    
    // Create enhanced preview effect on canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 1280;
        canvas.height = 720;
        
        console.log('🖼️ Drawing enhanced preview content');
        
        // Create enhanced version visual effect with animation
        const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
        gradient.addColorStop(0, '#7c3aed');
        gradient.addColorStop(0.3, '#8b5cf6');
        gradient.addColorStop(0.7, '#a855f7');
        gradient.addColorStop(1, '#c084fc');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1280, 720);
        
        // Add subtle pattern overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let x = 0; x < 1280; x += 60) {
          for (let y = 0; y < 720; y += 60) {
            ctx.fillRect(x, y, 30, 30);
          }
        }
        
        // Add enhancement indicators with better positioning
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🚀', 640, 280);
        
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('AI Enhanced', 640, 340);
        
        // Add enabled AI features with better styling
        const enabledFeatures = [];
        if (aiSettings.upscaling?.enabled) enabledFeatures.push(`📈 Upscaling ${aiSettings.upscaling.factor}x`);
        if (aiSettings.frameInterpolation?.enabled) enabledFeatures.push(`🎬 Frame Interpolation ${aiSettings.frameInterpolation.targetFps}fps`);
        if (aiSettings.faceEnhancement?.enabled) enabledFeatures.push(`👤 Face Enhancement ${aiSettings.faceEnhancement.strength}%`);
        if (aiSettings.denoising?.enabled) enabledFeatures.push(`✨ Denoising (${aiSettings.denoising.level})`);
        
        if (enabledFeatures.length > 0) {
          ctx.font = 'bold 24px Arial';
          ctx.fillStyle = '#ffffff';
          
          // Draw each feature on a separate line
          enabledFeatures.forEach((feature, index) => {
            ctx.fillText(feature, 640, 400 + (index * 35));
          });
          
          // Add processing indicator
          ctx.font = '20px Arial';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(`${enabledFeatures.length} AI enhancement${enabledFeatures.length !== 1 ? 's' : ''} active`, 640, 400 + (enabledFeatures.length * 35) + 40);
        } else {
          ctx.font = '24px Arial';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText('Enable AI features to see enhancements', 640, 400);
        }
        
        // Add video info if available
        if (video) {
          ctx.font = '18px Arial';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(`Processing: ${video.name}`, 640, 600);
          ctx.fillText(`${video.resolution || '1920×1080'} • ${video.fps || 30}fps • ${Math.round(video.duration || 0)}s`, 640, 630);
        }
        
        console.log('✅ Enhanced preview canvas rendered successfully');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '1200px',
        height: '80%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              AI Enhancement Preview
            </h2>
            {video && (
              <p style={{
                margin: '4px 0 0',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                {video.name}
              </p>
            )}
          </div>
          
          {/* Preview Mode Selector */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '4px'
            }}>
              {[
                { id: 'split', icon: '⬛', label: 'Split' },
                { id: 'side-by-side', icon: '◧', label: 'Side by Side' },
                { id: 'toggle', icon: '🔄', label: 'Toggle' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setPreviewMode(mode.id as any)}
                  style={{
                    padding: '6px 12px',
                    background: previewMode === mode.id ? '#7461ef' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: previewMode === mode.id ? 'white' : '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{mode.icon}</span>
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                color: '#ffffff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Preview Area */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(116, 97, 239, 0.2)',
                borderTopColor: '#7461ef',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }} />
              <p>Generating AI preview...</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>This may take a few moments</p>
              
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : previewReady ? (
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {previewMode === 'split' && (
                <div style={{
                  position: 'relative',
                  width: '85%',
                  maxWidth: '1000px',
                  aspectRatio: '16 / 9',
                  background: '#000',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  border: '2px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {/* Original Video - Left Half */}
                  <div style={{ width: '50%', height: '100%', position: 'relative' }}>
                    {videoLoaded && videoRef.current?.src ? (
                      <video 
                        ref={videoRef} 
                        style={{ 
                          width: '200%', 
                          height: '100%', 
                          objectFit: 'cover',
                          objectPosition: 'left center'
                        }}
                        autoPlay
                        loop
                        muted
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: '#94a3b8',
                        position: 'relative'
                      }}>
                        {/* Animated grid pattern */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                          `,
                          backgroundSize: '40px 40px',
                          animation: 'gridMove 8s linear infinite'
                        }} />
                        
                        <div style={{ fontSize: '48px', marginBottom: '12px', zIndex: 1 }}>📹</div>
                        <div style={{ fontSize: '18px', fontWeight: '600', zIndex: 1 }}>Original Video</div>
                        <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7, zIndex: 1, textAlign: 'center', maxWidth: '80%' }}>
                          {video?.name || 'No video loaded'}
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.5, zIndex: 1 }}>
                          {video?.resolution || '1920×1080'} • {video?.fps || 30}fps
                        </div>
                      </div>
                    )}
                    
                    {/* Quality indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(0, 0, 0, 0.8)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#94a3b8',
                      backdropFilter: 'blur(10px)'
                    }}>
                      Standard Quality
                    </div>
                  </div>
                  
                  {/* Enhanced Preview - Right Half */}
                  <div style={{ width: '50%', height: '100%', position: 'relative' }}>
                    <canvas
                      ref={canvasRef}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    
                    {/* Quality indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(116, 97, 239, 0.9)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'white',
                      backdropFilter: 'blur(10px)'
                    }}>
                      AI Enhanced • 4K
                    </div>
                  </div>
                  
                  {/* Interactive Split Line */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '50%',
                    width: '4px',
                    height: '100%',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(116,97,239,0.8), rgba(255,255,255,0.8))',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    boxShadow: '0 0 20px rgba(116, 97, 239, 0.5)',
                    animation: 'glow 2s ease-in-out infinite alternate'
                  }} />
                  
                  {/* Enhanced Labels */}
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'white',
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    📹 Original
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'linear-gradient(135deg, #7461ef, #a855f7)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'white',
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 15px rgba(116, 97, 239, 0.4)'
                  }}>
                    🚀 AI Enhanced
                  </div>
                  
                  {/* CSS animations */}
                  <style>{`
                    @keyframes gridMove {
                      0% { transform: translate(0, 0); }
                      100% { transform: translate(40px, 40px); }
                    }
                    @keyframes glow {
                      0% { box-shadow: 0 0 20px rgba(116, 97, 239, 0.3); }
                      100% { box-shadow: 0 0 30px rgba(116, 97, 239, 0.8); }
                    }
                  `}</style>
                </div>
              )}
              
              {previewMode === 'side-by-side' && (
                <div style={{
                  display: 'flex',
                  gap: '24px',
                  width: '95%',
                  maxWidth: '1200px',
                  alignItems: 'center'
                }}>
                  {/* Original Video Panel */}
                  <div style={{
                    flex: 1,
                    aspectRatio: '16 / 9',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.6)';
                  }}>
                    {videoLoaded ? (
                      <video 
                        ref={videoRef} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        autoPlay
                        loop
                        muted
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: '#94a3b8',
                        position: 'relative'
                      }}>
                        {/* Subtle animation */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)',
                          animation: 'pulse 3s ease-in-out infinite'
                        }} />
                        
                        <div style={{ fontSize: '48px', marginBottom: '12px', zIndex: 1 }}>📹</div>
                        <div style={{ fontSize: '18px', fontWeight: '600', zIndex: 1 }}>Original Video</div>
                        <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7, zIndex: 1, textAlign: 'center', maxWidth: '90%' }}>
                          {video?.name || 'No video loaded'}
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.5, zIndex: 1 }}>
                          {video?.resolution || '1920×1080'} • {video?.fps || 30}fps
                        </div>
                      </div>
                    )}
                    
                    {/* Header label */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      right: '16px',
                      background: 'rgba(0, 0, 0, 0.8)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'white',
                      fontWeight: '600',
                      textAlign: 'center',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      📹 Original Version
                    </div>
                    
                    {/* Bottom info panel */}
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                      padding: '20px 16px 16px',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>Quality: Standard</div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>Resolution: {video?.resolution || '1920×1080'}</div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>Size: {Math.round((video?.size || 0) / 1024 / 1024)}MB</div>
                    </div>
                  </div>
                  
                  {/* VS Divider */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '60px',
                      background: 'linear-gradient(to bottom, transparent, rgba(116,97,239,0.8), transparent)',
                      borderRadius: '2px'
                    }} />
                    <div style={{
                      background: 'linear-gradient(135deg, #7461ef, #a855f7)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(116, 97, 239, 0.4)',
                      animation: 'bounce 2s ease-in-out infinite'
                    }}>
                      VS
                    </div>
                    <div style={{
                      width: '4px',
                      height: '60px',
                      background: 'linear-gradient(to bottom, transparent, rgba(116,97,239,0.8), transparent)',
                      borderRadius: '2px'
                    }} />
                  </div>
                  
                  {/* Enhanced Video Panel */}
                  <div style={{
                    flex: 1,
                    aspectRatio: '16 / 9',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 15px 35px rgba(116, 97, 239, 0.3)',
                    border: '2px solid rgba(116, 97, 239, 0.3)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(116, 97, 239, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(116, 97, 239, 0.3)';
                  }}>
                    <canvas 
                      ref={canvasRef}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    
                    {/* Header label */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      right: '16px',
                      background: 'linear-gradient(135deg, #7461ef, #a855f7)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'white',
                      fontWeight: '600',
                      textAlign: 'center',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 15px rgba(116, 97, 239, 0.4)'
                    }}>
                      🚀 AI Enhanced Version
                    </div>
                    
                    {/* Enhancement badges */}
                    <div style={{
                      position: 'absolute',
                      top: '60px',
                      left: '16px',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        background: 'rgba(116, 97, 239, 0.9)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        4K UPSCALE
                      </div>
                      <div style={{
                        background: 'rgba(168, 85, 247, 0.9)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        AI ENHANCED
                      </div>
                    </div>
                    
                    {/* Bottom info panel */}
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'linear-gradient(to top, rgba(116,97,239,0.9), transparent)',
                      padding: '20px 16px 16px',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Quality: AI Enhanced • 95%</div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Resolution: 3840×2160 (4K)</div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Estimated Size: {Math.round((video?.size || 0) * 2.5 / 1024 / 1024)}MB</div>
                    </div>
                  </div>
                  
                  {/* CSS animations */}
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 0.3; }
                      50% { opacity: 0.6; }
                    }
                    @keyframes bounce {
                      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                      40% { transform: translateY(-5px); }
                      60% { transform: translateY(-3px); }
                    }
                  `}</style>
                </div>
              )}
              
              {previewMode === 'toggle' && (
                <div style={{
                  position: 'relative',
                  width: '85%',
                  maxWidth: '1000px',
                  aspectRatio: '16 / 9',
                  background: '#000',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: showOriginal 
                    ? '0 20px 40px rgba(0, 0, 0, 0.6)' 
                    : '0 20px 40px rgba(116, 97, 239, 0.4)',
                  border: showOriginal 
                    ? '2px solid rgba(255, 255, 255, 0.1)' 
                    : '2px solid rgba(116, 97, 239, 0.3)',
                  transition: 'all 0.5s ease'
                }}>
                  {/* Enhanced Preview Canvas */}
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: showOriginal ? 'none' : 'block',
                      objectFit: 'cover',
                      transition: 'opacity 0.3s ease'
                    }}
                  />
                  
                  {/* Original Video */}
                  {showOriginal && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      transition: 'opacity 0.3s ease'
                    }}>
                      {videoLoaded ? (
                        <video
                          ref={videoRef}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          autoPlay
                          loop
                          muted
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          color: '#94a3b8',
                          position: 'relative'
                        }}>
                          {/* Animated background */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.05) 0%, transparent 50%)',
                            animation: 'float 4s ease-in-out infinite'
                          }} />
                          
                          <div style={{ fontSize: '64px', marginBottom: '16px', zIndex: 1 }}>📹</div>
                          <div style={{ fontSize: '24px', fontWeight: '600', zIndex: 1 }}>Original Video</div>
                          <div style={{ fontSize: '16px', marginTop: '12px', opacity: 0.7, zIndex: 1, textAlign: 'center', maxWidth: '80%' }}>
                            {video?.name || 'No video loaded'}
                          </div>
                          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.5, zIndex: 1 }}>
                            {video?.resolution || '1920×1080'} • {video?.fps || 30}fps
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Dynamic status indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    {/* Current mode indicator */}
                    <div style={{
                      background: showOriginal 
                        ? 'rgba(0, 0, 0, 0.8)' 
                        : 'linear-gradient(135deg, #7461ef, #a855f7)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: showOriginal 
                        ? '1px solid rgba(255, 255, 255, 0.1)' 
                        : 'none',
                      boxShadow: showOriginal 
                        ? 'none' 
                        : '0 4px 15px rgba(116, 97, 239, 0.4)',
                      transition: 'all 0.3s ease'
                    }}>
                      {showOriginal ? '📹 Original Quality' : '🚀 AI Enhanced Quality'}
                    </div>
                    
                    {/* Toggle hint */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      animation: 'pulse 2s ease-in-out infinite'
                    }}>
                      Click to toggle
                    </div>
                  </div>
                  
                  {/* Enhancement details overlay (only when enhanced is shown) */}
                  {!showOriginal && (
                    <div style={{
                      position: 'absolute',
                      top: '60px',
                      left: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{
                        background: 'rgba(116, 97, 239, 0.9)',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        color: 'white',
                        fontWeight: '600',
                        width: 'fit-content'
                      }}>
                        4X UPSCALE
                      </div>
                      <div style={{
                        background: 'rgba(168, 85, 247, 0.9)',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        color: 'white',
                        fontWeight: '600',
                        width: 'fit-content'
                      }}>
                        95% QUALITY SCORE
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced toggle button */}
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: showOriginal 
                        ? 'linear-gradient(135deg, #374151, #1f2937)' 
                        : 'linear-gradient(135deg, #7461ef, #a855f7)',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 24px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)',
                      boxShadow: showOriginal 
                        ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
                        : '0 8px 25px rgba(116, 97, 239, 0.4)',
                      minWidth: '160px',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(-50%) translateY(-3px) scale(1.05)';
                      e.currentTarget.style.boxShadow = showOriginal 
                        ? '0 12px 35px rgba(0, 0, 0, 0.4)' 
                        : '0 12px 35px rgba(116, 97, 239, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(-50%) translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = showOriginal 
                        ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
                        : '0 8px 25px rgba(116, 97, 239, 0.4)';
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>
                      {showOriginal ? '🚀' : '📹'}
                    </span>
                    <span>
                      {showOriginal ? 'Show AI Enhanced' : 'Show Original'}
                    </span>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      background: 'currentColor',
                      borderRadius: '50%',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                  </button>
                  
                  {/* CSS animations */}
                  <style>{`
                    @keyframes float {
                      0%, 100% { transform: translateY(0px) rotate(0deg); }
                      50% { transform: translateY(-10px) rotate(2deg); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 0.6; }
                      50% { opacity: 1; }
                    }
                  `}</style>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <p>Select a video to preview AI enhancements</p>
            </div>
          )}
        </div>
        
        {/* Enhancement Info Bar */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(116, 97, 239, 0.05)',
          display: 'flex',
          gap: '24px',
          fontSize: '12px',
          color: '#cbd5e1'
        }}>
          {aiSettings.upscaling.enabled && (
            <div>
              <span style={{ color: '#94a3b8' }}>Upscaling:</span>{' '}
              <span style={{ fontWeight: '500' }}>{aiSettings.upscaling.factor}x ({aiSettings.upscaling.model})</span>
            </div>
          )}
          {aiSettings.denoising.enabled && (
            <div>
              <span style={{ color: '#94a3b8' }}>Denoising:</span>{' '}
              <span style={{ fontWeight: '500' }}>{aiSettings.denoising.level}</span>
            </div>
          )}
          {aiSettings.faceEnhancement.enabled && (
            <div>
              <span style={{ color: '#94a3b8' }}>Face Enhancement:</span>{' '}
              <span style={{ fontWeight: '500' }}>{aiSettings.faceEnhancement.strength}%</span>
            </div>
          )}
          {aiSettings.frameInterpolation.enabled && (
            <div>
              <span style={{ color: '#94a3b8' }}>Frame Interpolation:</span>{' '}
              <span style={{ fontWeight: '500' }}>{aiSettings.frameInterpolation.targetFps} fps</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIPreviewModal;