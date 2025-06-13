import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { Video, ProcessingStatus } from '../../types/video.types';
import { 
  toggleAIFeature,
  updateAIUpscaling,
  updateAIFrameInterpolation,
  updateAIFaceEnhancement,
  updateAIDenoising
} from '../../store/slices/settingsSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { addVideos } from '../../store/slices/videoSlice';
import { addJob, updateJobStatus, updateJobProgress } from '../../store/slices/processingSlice';
import AIPreviewModal from './AIPreviewModal';
import { aiService } from '../../services/aiService';

const AIEnhancement: React.FC = () => {
  const dispatch = useDispatch();
  const [forceUpdate, setForceUpdate] = useState(0);
  const { selectedVideos, videos } = useSelector((state: RootState) => {
    // Force component to re-render when videos state changes
    return state.videos;
  });
  const { ai: aiSettings } = useSelector((state: RootState) => state.settings);
  
  // Debug logging to console
  useEffect(() => {
    console.log('🔍 AIEnhancement Redux State Update:');
    console.log('  Videos:', videos);
    console.log('  Selected Videos:', selectedVideos);
    console.log('  Full videos state:', (window as any).store?.getState?.()?.videos);
  }, [videos, selectedVideos]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [gpuInfo, setGpuInfo] = useState<any>(null);
  const [backendStatus, setBackendStatus] = useState<boolean>(false);

  // Check backend and GPU status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isAvailable = await aiService.checkBackendStatus();
        setBackendStatus(isAvailable);
        
        if (isAvailable) {
          const systemInfo = await aiService.getSystemInfo();
          setGpuInfo(systemInfo);
        }
      } catch (error) {
        console.error('Failed to check AI backend status:', error);
        setBackendStatus(false);
      }
    };

    checkStatus();
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate estimated processing time based on settings
  const estimatedProcessingTime = useMemo(() => {
    if (selectedVideos.length === 0) return 0;
    
    const selectedVideoData = videos.filter((v: Video) => selectedVideos.includes(v.id));
    const totalDuration = selectedVideoData.reduce((sum: number, v: Video) => sum + v.duration, 0);
    
    let timeMultiplier = 1;
    if (aiSettings.upscaling.enabled) timeMultiplier *= aiSettings.upscaling.factor * 0.8;
    if (aiSettings.frameInterpolation.enabled) timeMultiplier *= 2;
    if (aiSettings.faceEnhancement.enabled) timeMultiplier *= 1.5;
    if (aiSettings.denoising.enabled) timeMultiplier *= 1.3;
    
    return Math.round(totalDuration * timeMultiplier / 60); // minutes
  }, [selectedVideos, videos, aiSettings]);

  // Quality presets
  const applyQualityPreset = useCallback((preset: 'fast' | 'balanced' | 'quality') => {
    switch (preset) {
      case 'fast':
        dispatch(updateAIUpscaling({ factor: 2, quality: 60 }));
        dispatch(updateAIFaceEnhancement({ strength: 50 }));
        dispatch(updateAIDenoising({ level: 'low' }));
        break;
      case 'balanced':
        dispatch(updateAIUpscaling({ factor: 2, quality: 80 }));
        dispatch(updateAIFaceEnhancement({ strength: 70 }));
        dispatch(updateAIDenoising({ level: 'medium' }));
        break;
      case 'quality':
        dispatch(updateAIUpscaling({ factor: 4, quality: 95 }));
        dispatch(updateAIFaceEnhancement({ strength: 90 }));
        dispatch(updateAIDenoising({ level: 'high' }));
        break;
    }
    
    dispatch(addNotification({
      type: 'success',
      title: 'Preset Applied',
      message: `${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied to AI settings`,
      autoClose: true,
      duration: 2000
    }));
  }, [dispatch]);

  const startProcessing = useCallback(async () => {
    if (selectedVideos.length === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: 'No Videos Selected',
        message: 'Please select videos to process',
        autoClose: true,
        duration: 3000
      }));
      return;
    }

    console.log('🚀 Starting AI processing for videos:', selectedVideos);

    // Check AI backend availability with better error handling
    console.log('🔍 Checking AI backend availability...');
    const isBackendAvailable = await aiService.checkBackendStatus();
    
    if (!isBackendAvailable) {
      console.warn('⚠️ AI Backend not available - showing development mode simulation');
      
      // Show notification but continue with simulation for development
      dispatch(addNotification({
        type: 'warning',
        title: 'AI Backend Not Available',
        message: 'Backend not running. Continuing with simulation mode for development.',
        autoClose: true,
        duration: 5000
      }));
      
      // For development: simulate processing without backend
      for (const videoId of selectedVideos) {
        const video = videos.find(v => v.id === videoId);
        if (!video) continue;

        const jobId = `ai_sim_${Date.now()}_${videoId}`;
        
        console.log(`🎬 Creating simulated job for video: ${video.name}`);
        
        // Create processing job
        dispatch(addJob({
          id: jobId,
          videoId: video.id,
          status: ProcessingStatus.PENDING,
          progress: 0,
          processingSettings: {
            outputFormat: 'mp4',
            quality: 'high',
            resolution: video.resolution || '1920x1080',
            enableAI: true
          },
          aiSettings: aiSettings
        }));

        // Simulate processing with progress updates
        dispatch(updateJobStatus({ 
          jobId, 
          status: ProcessingStatus.PROCESSING 
        }));

        // Simulate progress over 10 seconds
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          dispatch(updateJobProgress({ 
            jobId, 
            progress: progress
          }));
          console.log(`📈 Processing progress for ${video.name}: ${progress}%`);
        }

        // Mark as completed
        dispatch(updateJobProgress({ 
          jobId, 
          progress: 100
        }));
        dispatch(updateJobStatus({ 
          jobId, 
          status: ProcessingStatus.COMPLETED
        }));

        dispatch(addNotification({
          type: 'success',
          title: 'Simulation Complete',
          message: `Simulated AI processing for ${video.name}`,
          autoClose: true,
          duration: 3000
        }));
      }
      
      return;
    }

    console.log('✅ AI Backend is available - proceeding with real processing');

    // Validate AI settings
    const validation = await aiService.validateAISettings(aiSettings);
    if (validation.warnings.length > 0) {
      dispatch(addNotification({
        type: 'warning',
        title: 'AI Settings Warning',
        message: validation.warnings.join('\n'),
        autoClose: true,
        duration: 5000
      }));
    }

    // Process each selected video with real backend
    for (const videoId of selectedVideos) {
      const video = videos.find(v => v.id === videoId);
      if (!video) continue;

      const jobId = `ai_${Date.now()}_${videoId}`;
      
      console.log(`🎬 Creating real processing job for video: ${video.name}`);
      
              // Create processing job
        dispatch(addJob({
          id: jobId,
          videoId: video.id,
          status: ProcessingStatus.PENDING,
          progress: 0,
          processingSettings: {
            outputFormat: 'mp4',
            quality: 'high',
            resolution: video.resolution || '1920x1080',
            codec: 'h264',
            outputPath: video.path.replace(/\.[^/.]+$/, '_ai_enhanced.mp4'),
            filenamePattern: '{name}_ai_enhanced'
          },
          aiSettings: aiSettings
        }));

      // Start AI processing
      try {
        dispatch(updateJobStatus({ 
          jobId, 
          status: ProcessingStatus.PROCESSING 
        }));

        const outputPath = video.path.replace(/\.[^/.]+$/, '_ai_enhanced.mp4');
        
        // Process with enabled AI features
        if (aiSettings.upscaling.enabled) {
          console.log(`🔍 Upscaling video: ${video.name}`);
          await aiService.upscaleVideo(
            video.path,
            outputPath,
            aiSettings.upscaling,
            (progress) => {
              dispatch(updateJobProgress({ 
                jobId, 
                progress: progress * 0.25 // 25% of total progress
              }));
            }
          );
        }

        if (aiSettings.denoising.enabled) {
          console.log(`🎨 Denoising video: ${video.name}`);
          await aiService.denoiseVideo(
            aiSettings.upscaling.enabled ? outputPath : video.path,
            outputPath,
            aiSettings.denoising,
            (progress) => {
              dispatch(updateJobProgress({ 
                jobId, 
                progress: 25 + progress * 0.25 // 25-50% of total progress
              }));
            }
          );
        }

        if (aiSettings.faceEnhancement.enabled) {
          console.log(`👤 Enhancing faces in video: ${video.name}`);
          await aiService.enhanceFaces(
            outputPath,
            outputPath,
            aiSettings.faceEnhancement,
            (progress) => {
              dispatch(updateJobProgress({ 
                jobId, 
                progress: 50 + progress * 0.25 // 50-75% of total progress
              }));
            }
          );
        }

        if (aiSettings.frameInterpolation.enabled) {
          console.log(`🎬 Interpolating frames in video: ${video.name}`);
          await aiService.interpolateFrames(
            outputPath,
            outputPath,
            aiSettings.frameInterpolation,
            (progress) => {
              dispatch(updateJobProgress({ 
                jobId, 
                progress: 75 + progress * 0.25 // 75-100% of total progress
              }));
            }
          );
        }

        // Mark as completed
        dispatch(updateJobProgress({ 
          jobId, 
          progress: 100
        }));
        dispatch(updateJobStatus({ 
          jobId, 
          status: ProcessingStatus.COMPLETED
        }));

        dispatch(addNotification({
          type: 'success',
          title: 'AI Processing Complete',
          message: `Successfully enhanced ${video.name}`,
          autoClose: true,
          duration: 5000
        }));

      } catch (error) {
        console.error('AI processing error:', error);
        dispatch(updateJobStatus({ 
          jobId, 
          status: ProcessingStatus.ERROR,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));

        dispatch(addNotification({
          type: 'error',
          title: 'AI Processing Failed',
          message: `Failed to process ${video.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          autoClose: false,
          duration: 0
        }));
      }
    }
  }, [dispatch, selectedVideos, videos, aiSettings]);

  const testAIProcessing = useCallback(async () => {
    console.log('🧪 === TESTING AI PROCESSING SYSTEM ===');
    
    // 1. Check videos state
    console.log('📹 Video State Check:');
    console.log('  - Total videos in store:', videos.length);
    console.log('  - Selected video IDs:', selectedVideos);
    console.log('  - Videos data:', videos);
    
    if (selectedVideos.length === 0) {
      console.warn('⚠️ No videos selected for processing');
      dispatch(addNotification({
        type: 'warning',
        title: 'No Videos Selected',
        message: 'Please select videos from the library first',
        autoClose: true,
        duration: 4000
      }));
      return;
    }
    
    // 2. Check AI settings
    const activeAIFeatures = Object.entries(aiSettings).filter(([_, setting]) => setting.enabled);
    console.log('🤖 AI Settings Check:');
    console.log('  - Active AI features:', activeAIFeatures.map(([name]) => name));
    console.log('  - Full AI settings:', aiSettings);
    
    if (activeAIFeatures.length === 0) {
      console.warn('⚠️ No AI features enabled');
      dispatch(addNotification({
        type: 'warning',
        title: 'No AI Features Enabled',
        message: 'Please enable at least one AI enhancement feature',
        autoClose: true,
        duration: 4000
      }));
      return;
    }
    
    // 3. Test backend connection
    console.log('🔗 Backend Connection Test:');
    try {
      const isAvailable = await aiService.checkBackendStatus();
      console.log('  - Backend available:', isAvailable);
      
      if (isAvailable) {
        const systemInfo = await aiService.getSystemInfo();
        console.log('  - System info:', systemInfo);
      }
      
      setBackendStatus(isAvailable);
    } catch (error) {
      console.error('  - Backend connection error:', error);
      setBackendStatus(false);
    }
    
    // 4. Show success message
    dispatch(addNotification({
      type: 'success',
      title: 'AI System Test Complete',
      message: `✅ Found ${selectedVideos.length} videos, ${activeAIFeatures.length} AI features enabled, Backend: ${backendStatus ? 'Available' : 'Unavailable'}`,
      autoClose: true,
      duration: 6000
    }));
    
    console.log('🧪 === AI PROCESSING TEST COMPLETE ===');
  }, [videos, selectedVideos, aiSettings, backendStatus, dispatch]);

  const AIToggleSection: React.FC<{
    id: string;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    icon: string;
  }> = ({ id, title, description, enabled, onToggle, children, icon }) => (
    <div style={{
      marginBottom: '20px',
      background: enabled ? 'rgba(116, 97, 239, 0.08)' : 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${enabled ? 'rgba(116, 97, 239, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        padding: '16px',
        cursor: 'pointer',
        userSelect: 'none'
      }} onClick={onToggle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <div>
              <h4 style={{
                margin: '0 0 4px 0',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                {title}
              </h4>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#94a3b8',
                lineHeight: '1.4'
              }}>
                {description}
              </p>
            </div>
          </div>
          
          {/* Custom Toggle Switch */}
          <div style={{
            position: 'relative',
            width: '56px',
            height: '30px',
            background: enabled 
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
              : 'rgba(120, 119, 198, 0.3)',
            borderRadius: '15px',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            cursor: 'pointer',
            border: `2px solid ${enabled ? 'rgba(99, 102, 241, 0.6)' : 'rgba(99, 102, 241, 0.2)'}`,
            boxShadow: enabled 
              ? `inset 0 2px 4px rgba(99, 102, 241, 0.2),
                 0 0 20px rgba(99, 102, 241, 0.4),
                 0 4px 12px rgba(99, 102, 241, 0.3)` 
              : `inset 0 2px 4px rgba(0, 0, 0, 0.1),
                 0 1px 2px rgba(0, 0, 0, 0.1)`,
            overflow: 'hidden'
          }}>
            {/* Background gradient overlay when enabled */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '50px',
              height: '22px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              borderRadius: '11px',
              transform: `translate(-50%, -50%) scale(${enabled ? 1 : 0})`,
              transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              opacity: enabled ? 0.15 : 0
            }} />
            
            {/* Toggle knob */}
            <div style={{
              position: 'absolute',
              top: '3px',
              left: enabled ? '28px' : '3px',
              width: '20px',
              height: '20px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '10px',
              transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              transform: `scale(${enabled ? 1.1 : 1})`,
              boxShadow: enabled 
                ? `0 3px 6px rgba(0, 0, 0, 0.2),
                   0 6px 12px rgba(99, 102, 241, 0.3),
                   inset 0 1px 2px rgba(255, 255, 255, 0.9)` 
                : `0 2px 4px rgba(0, 0, 0, 0.15),
                   0 4px 8px rgba(0, 0, 0, 0.1),
                   inset 0 1px 1px rgba(255, 255, 255, 0.9)`
            }} />
          </div>
        </div>
      </div>
      
      {enabled && (
        <div style={{
          padding: '0 16px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {children}
        </div>
      )}
    </div>
  );

  // GPU Status Display Component
  const GPUStatusDisplay: React.FC = () => {
    if (!backendStatus) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '13px',
              color: '#ffffff',
              fontWeight: '500'
            }}>
              AI Backend Not Available
            </div>
            <div style={{
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              Please ensure the AI backend is running
            </div>
          </div>
          <button
            onClick={async () => {
              const isAvailable = await aiService.checkBackendStatus();
              setBackendStatus(isAvailable);
              if (isAvailable) {
                const systemInfo = await aiService.getSystemInfo();
                setGpuInfo(systemInfo);
              }
            }}
            style={{
              padding: '4px 8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    const hasGPU = gpuInfo?.gpu_available;
    const gpuName = gpuInfo?.gpu_name || 'No GPU detected';
    const vram = gpuInfo?.gpu_memory ? `${Math.round(gpuInfo.gpu_memory / 1024)}GB VRAM` : 'Unknown VRAM';

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        padding: '12px',
        background: hasGPU ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
        border: `1px solid ${hasGPU ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
        borderRadius: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>{hasGPU ? '🎮' : '💻'}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            color: '#ffffff',
            fontWeight: '500'
          }}>
            {hasGPU ? 'GPU Acceleration Available' : 'CPU Processing Mode'}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#94a3b8'
          }}>
            {hasGPU ? `${gpuName} (${vram})` : 'Processing will be slower'}
          </div>
        </div>
        <span style={{
          fontSize: '12px',
          color: hasGPU ? '#34d399' : '#fbbf24',
          fontWeight: '500'
        }}>
          Ready
        </span>
      </div>
    );
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header with Presets */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(116, 97, 239, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(116, 97, 239, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: 0,
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🚀</span>
            AI Enhancement Suite
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                background: showPreview ? '#7461ef' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {showPreview ? '👁️ Live Preview' : '👁️ Live Preview'}
            </button>
            <button
              onClick={() => setPreviewModalOpen(true)}
              disabled={selectedVideos.length === 0}
              style={{
                background: selectedVideos.length > 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${selectedVideos.length > 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                padding: '6px 12px',
                color: selectedVideos.length > 0 ? '#34d399' : '#64748b',
                fontSize: '12px',
                cursor: selectedVideos.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease'
              }}
            >
              🎬 Full Preview
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '8px'
          }}>
            Quick Presets:
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => applyQualityPreset('fast')}
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              ⚡ Fast
            </button>
            <button
              onClick={() => applyQualityPreset('balanced')}
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              ⚖️ Balanced
            </button>
            <button
              onClick={() => applyQualityPreset('quality')}
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              💎 Quality
            </button>
          </div>
        </div>

        {/* Selection Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          <span>
            {selectedVideos.length > 0 
              ? `${selectedVideos.length} video${selectedVideos.length !== 1 ? 's' : ''} selected`
              : 'No videos selected'
            }
          </span>
          {estimatedProcessingTime > 0 && (
            <span>Est. time: ~{estimatedProcessingTime} min</span>
          )}
        </div>
      </div>

      {/* Video Upscaling */}
      <AIToggleSection
        id="upscaling"
        title="AI Video Upscaling"
        description="Enhance resolution using state-of-the-art AI models"
        icon="🔍"
        enabled={aiSettings.upscaling.enabled}
        onToggle={() => dispatch(toggleAIFeature('upscaling'))}
      >
        <div style={{ marginTop: '16px' }}>
          {/* Model Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              AI Model
            </label>
            <select 
              value={aiSettings.upscaling.model}
              onChange={(e) => dispatch(updateAIUpscaling({ model: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="realesrgan-x4plus">Real-ESRGAN x4+ (Best Quality)</option>
              <option value="realesrgan-x4plus-anime">Real-ESRGAN x4+ Anime</option>
              <option value="realesrgan-x2plus">Real-ESRGAN x2+ (Faster)</option>
              <option value="esrgan">ESRGAN (Classic)</option>
              <option value="waifu2x">Waifu2x (Anime/Cartoon)</option>
            </select>
          </div>

          {/* Upscaling Factor */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Upscaling Factor
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 3, 4, 8].map(factor => (
                <button
                  key={factor}
                  onClick={() => dispatch(updateAIUpscaling({ factor: factor as 2 | 3 | 4 | 8 }))}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: aiSettings.upscaling.factor === factor ? '#7461ef' : '#1e293b',
                    border: `1px solid ${aiSettings.upscaling.factor === factor ? '#7461ef' : '#334155'}`,
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {factor}x
                </button>
              ))}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#64748b',
              marginTop: '6px'
            }}>
              Higher factors require more processing time and VRAM
            </div>
          </div>

          {/* Quality Slider */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              <span>Output Quality</span>
              <span style={{ color: '#7461ef' }}>{aiSettings.upscaling.quality}%</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="range"
                min="50"
                max="100"
                value={aiSettings.upscaling.quality}
                onChange={(e) => dispatch(updateAIUpscaling({ quality: parseInt(e.target.value) }))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: `linear-gradient(to right, #7461ef 0%, #7461ef ${(aiSettings.upscaling.quality - 50) * 2}%, #334155 ${(aiSettings.upscaling.quality - 50) * 2}%, #334155 100%)`,
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  cursor: 'pointer'
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  width: 16px;
                  height: 16px;
                  background: #7461ef;
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 2px 8px rgba(116, 97, 239, 0.3);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 16px;
                  height: 16px;
                  background: #7461ef;
                  border-radius: 50%;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 2px 8px rgba(116, 97, 239, 0.3);
                }
              `}</style>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#64748b',
              marginTop: '4px'
            }}>
              <span>Faster</span>
              <span>Better</span>
            </div>
          </div>

          {/* Advanced Options */}
          <details style={{ marginTop: '12px' }}>
            <summary style={{
              fontSize: '12px',
              color: '#94a3b8',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '8px 0'
            }}>
              Advanced Options
            </summary>
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  style={{ cursor: 'pointer' }}
                />
                <span>Use GPU acceleration</span>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#cbd5e1',
                cursor: 'pointer',
                marginTop: '8px'
              }}>
                <input
                  type="checkbox"
                  style={{ cursor: 'pointer' }}
                />
                <span>Preserve film grain</span>
              </label>
            </div>
          </details>
        </div>
      </AIToggleSection>

      {/* Denoising */}
      <AIToggleSection
        id="denoising"
        title="AI Denoising"
        description="Remove noise and grain while preserving details"
        icon="🎨"
        enabled={aiSettings.denoising.enabled}
        onToggle={() => dispatch(toggleAIFeature('denoising'))}
      >
        <div style={{ marginTop: '16px' }}>
          {/* Noise Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Noise Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { value: 'gaussian', label: 'Gaussian', icon: '📊' },
                { value: 'film', label: 'Film Grain', icon: '🎞️' },
                { value: 'digital', label: 'Digital', icon: '📷' },
                { value: 'auto', label: 'Auto Detect', icon: '🔍' }
              ].map(type => (
                <button
                  key={type.value}
                  style={{
                    padding: '8px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Denoising Strength */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Denoising Strength
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['low', 'medium', 'high', 'extreme'].map(level => (
                <button
                  key={level}
                  onClick={() => dispatch(updateAIDenoising({ level: level as 'low' | 'medium' | 'high' | 'extreme' }))}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: aiSettings.denoising.level === level ? '#7461ef' : '#1e293b',
                    border: `1px solid ${aiSettings.denoising.level === level ? '#7461ef' : '#334155'}`,
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'capitalize'
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Detail Preservation */}
          <div>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              <span>Detail Preservation</span>
              <span style={{ color: '#7461ef' }}>80%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="80"
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: 'linear-gradient(to right, #7461ef 0%, #7461ef 80%, #334155 80%, #334155 100%)',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </AIToggleSection>

      {/* Face Enhancement */}
      <AIToggleSection
        id="face"
        title="AI Face Enhancement" 
        description="Restore and enhance facial details using GFPGAN"
        icon="👤"
        enabled={aiSettings.faceEnhancement.enabled}
        onToggle={() => dispatch(toggleAIFeature('faceEnhancement'))}
      >
        <div style={{ marginTop: '16px' }}>
          {/* Model Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Enhancement Model
            </label>
            <select 
              value={aiSettings.faceEnhancement.model}
              onChange={(e) => dispatch(updateAIFaceEnhancement({ model: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="gfpgan">GFPGAN v1.4 (Recommended)</option>
              <option value="gfpgan-v13">GFPGAN v1.3 (Balanced)</option>
              <option value="restoreformer">RestoreFormer (Natural)</option>
              <option value="codeformer">CodeFormer (Detailed)</option>
            </select>
          </div>

          {/* Enhancement Strength */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              <span>Enhancement Strength</span>
              <span style={{ color: '#7461ef' }}>{aiSettings.faceEnhancement.strength}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={aiSettings.faceEnhancement.strength}
              onChange={(e) => dispatch(updateAIFaceEnhancement({ strength: parseInt(e.target.value) }))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, #7461ef 0%, #7461ef ${aiSettings.faceEnhancement.strength}%, #334155 ${aiSettings.faceEnhancement.strength}%, #334155 100%)`,
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#64748b',
              marginTop: '4px'
            }}>
              <span>Natural</span>
              <span>Enhanced</span>
            </div>
          </div>

          {/* Face Detection Settings */}
          <div style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Face Detection Settings
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#94a3b8',
              cursor: 'pointer'
            }}>
              <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
              <span>Detect multiple faces</span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#94a3b8',
              cursor: 'pointer',
              marginTop: '8px'
            }}>
              <input type="checkbox" style={{ cursor: 'pointer' }} />
              <span>Process small faces</span>
            </label>
          </div>
        </div>
      </AIToggleSection>

      {/* Frame Interpolation */}
      <AIToggleSection
        id="interpolation"
        title="AI Frame Interpolation"
        description="Create smooth slow motion or increase frame rate"
        icon="🎬"
        enabled={aiSettings.frameInterpolation.enabled}
        onToggle={() => dispatch(toggleAIFeature('frameInterpolation'))}
      >
        <div style={{ marginTop: '16px' }}>
          {/* Target FPS */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Target Frame Rate
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[30, 60, 120, 240].map(fps => (
                <button
                  key={fps}
                  onClick={() => dispatch(updateAIFrameInterpolation({ targetFps: fps }))}
                  style={{
                    padding: '10px',
                    background: aiSettings.frameInterpolation.targetFps === fps ? '#7461ef' : '#1e293b',
                    border: `1px solid ${aiSettings.frameInterpolation.targetFps === fps ? '#7461ef' : '#334155'}`,
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {fps} fps
                </button>
              ))}
            </div>
          </div>

          {/* Custom FPS Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Custom FPS
            </label>
            <input
              type="number"
              min="24"
              max="480"
              value={aiSettings.frameInterpolation.targetFps}
              onChange={(e) => dispatch(updateAIFrameInterpolation({ targetFps: parseInt(e.target.value) }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Interpolation Mode */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Interpolation Mode
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🎯 Standard
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🌀 Motion Blur
              </button>
            </div>
          </div>

          {/* Scene Detection */}
          <div style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}>
              <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
              <span>Enable scene change detection</span>
            </label>
            <div style={{
              fontSize: '11px',
              color: '#64748b',
              marginTop: '6px',
              paddingLeft: '24px'
            }}>
              Prevents artifacts at scene cuts
            </div>
          </div>
        </div>
      </AIToggleSection>

      {/* GPU Info & Processing Button */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px'
      }}>
        {/* GPU Status */}
        <GPUStatusDisplay />

        {/* Processing Info */}
        {selectedVideos.length > 0 && (
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            <div>Ready to process {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''}</div>
            {estimatedProcessingTime > 0 && (
              <div style={{ marginTop: '4px' }}>
                Estimated time: ~{estimatedProcessingTime} minutes
              </div>
            )}
          </div>
        )}

        {/* Debug Information Panel */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '11px',
          color: '#94a3b8'
        }}>
          <div><strong>🔍 Debug Info:</strong></div>
          <div>Total Videos: {videos.length}</div>
          <div>Selected Videos: {selectedVideos.length}</div>
          <div>Backend Status: {backendStatus ? '✅ Available' : '❌ Not Available'}</div>
          <div>AI Settings: {Object.values(aiSettings).some(setting => setting.enabled) ? '✅ Enabled' : '❌ Disabled'}</div>
        </div>

        {/* Test Helper (temporary) */}
        {videos.length === 0 && (
          <div style={{
            background: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '12px',
            textAlign: 'center',
            fontSize: '13px'
          }}>
            ⚠️ No videos loaded! Import videos first using the "📁 Import Videos" button in the Video Library.
            <button
              onClick={() => {
                // Add sample test videos for testing
                const sampleVideos = [
                  {
                    id: 'test-1',
                    name: 'test-video-10s.mp4',
                    path: './test-videos/test-video-10s.mp4',
                    size: 2048000,
                    duration: 10,
                    format: 'mp4',
                    resolution: '1080p',
                    fps: 30,
                    bitrate: 2000,
                    status: 'ready' as const,
                    createdAt: Date.now(),
                    metadata: { hasAudio: true, codec: 'h264' }
                  },
                  {
                    id: 'test-2', 
                    name: 'manual-trim-test.mp4',
                    path: './test-videos/manual-trim-test.mp4',
                    size: 4096000,
                    duration: 15,
                    format: 'mp4',
                    resolution: '720p',
                    fps: 24,
                    bitrate: 1500,
                    status: 'ready' as const,
                    createdAt: Date.now(),
                    metadata: { hasAudio: true, codec: 'h264' }
                  }
                ];
                dispatch(addVideos(sampleVideos));
                dispatch(addNotification({
                  type: 'success',
                  title: 'Test Videos Added',
                  message: 'Sample videos loaded for testing',
                  autoClose: true,
                  duration: 3000
                }));
              }}
              style={{
                background: '#059669',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                marginTop: '8px',
                cursor: 'pointer'
              }}
            >
              🧪 Load Test Videos
            </button>
          </div>
        )}
        
        {videos.length > 0 && selectedVideos.length === 0 && (
          <div style={{
            background: '#d97706',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '12px',
            textAlign: 'center',
            fontSize: '13px'
          }}>
            ⚠️ Videos loaded but none selected! Click on video cards in the library to select them.
          </div>
        )}

        {/* Comprehensive AI System Test Button */}
        <button
          onClick={testAIProcessing}
          style={{
            width: '100%',
            padding: '10px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span>🧪</span>
          <span>Run Full AI System Test</span>
        </button>

        {/* Start Processing Button */}
        <button
          onClick={startProcessing}
          disabled={selectedVideos.length === 0}
          style={{
            width: '100%',
            padding: '12px',
            background: selectedVideos.length > 0 
              ? 'linear-gradient(135deg, #7461ef 0%, #8b5cf6 100%)' 
              : '#475569',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: selectedVideos.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: selectedVideos.length > 0 ? 1 : 0.6
          }}
          onMouseEnter={(e) => {
            if (selectedVideos.length > 0) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(116, 97, 239, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span>🚀</span>
          <span>
            {selectedVideos.length === 0 
              ? 'Start AI Processing (No videos selected)'
              : `Start AI Processing (${selectedVideos.length} video${selectedVideos.length !== 1 ? 's' : ''})`
            }
          </span>
        </button>
      </div>

      {/* AI Preview Modal */}
      <AIPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        videoId={selectedVideos[0]} // Use first selected video for preview
      />
    </div>
  );
};

export default AIEnhancement;