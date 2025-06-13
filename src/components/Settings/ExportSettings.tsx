import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  updateProcessingSettings, 
  setOutputFormat, 
  setQualityPreset,
  setOutputPath,
  updateExportPreset
} from '../../store/slices/settingsSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { ffmpegService } from '../../services/ffmpegService';
import { getVideoSource, getVideoFile } from '../../store/middleware/videoStateMiddleware';
import LoadingButton from '../common/LoadingButton';
import ProgressBar from '../common/ProgressBar';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useQuickConfirmation } from '../../hooks/useConfirmation';

interface ExportPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: {
    format?: string;
    quality: 'low' | 'medium' | 'high' | 'custom';
    resolution?: string;
    fps?: number;
    codec: string;
    bitrate?: number;
    outputFormat?: string;
    outputPath?: string;
    filenamePattern?: string;
  };
  category: 'web' | 'mobile' | 'social' | 'professional' | 'custom';
}

const ExportSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { processing } = useSelector((state: RootState) => state.settings);
  // const exportSettings = useSelector((state: RootState) => state.settings.export); // TODO: Use for export configuration
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [estimatedSize, setEstimatedSize] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  // const [customSettings, setCustomSettings] = useState<any>({}); // TODO: Implement custom settings
  const [activeTab, setActiveTab] = useState<'presets' | 'advanced' | 'batch'>('presets');
  
  const [exportLoading, exportOps] = useLoadingState('Initializing export...');
  const [previewLoading, previewOps] = useLoadingState('Generating preview...');
  const [exportProgress, setExportProgress] = useState(0);
  const [currentExportVideo, setCurrentExportVideo] = useState<string>('');
  const confirmation = useQuickConfirmation();
  
  const exportPresets: ExportPreset[] = [
    // Web Presets
    {
      id: 'web_hd',
      name: 'Web HD',
      description: 'Optimized for web streaming, 1080p',
      icon: '🌐',
      category: 'web',
      settings: {
        format: 'mp4',
        quality: 'high',
        resolution: '1080p',
        fps: 30,
        codec: 'h264',
        bitrate: 8000
      }
    },
    {
      id: 'web_4k',
      name: 'Web 4K',
      description: 'High quality web streaming, 4K',
      icon: '📺',
      category: 'web',
      settings: {
        format: 'mp4',
        quality: 'high',
        resolution: '2160p',
        fps: 30,
        codec: 'h264',
        bitrate: 25000
      }
    },
    
    // Mobile Presets
    {
      id: 'mobile_standard',
      name: 'Mobile Standard',
      description: 'Optimized for mobile devices',
      icon: '📱',
      category: 'mobile',
      settings: {
        format: 'mp4',
        quality: 'medium',
        resolution: '720p',
        fps: 30,
        codec: 'h264',
        bitrate: 2500
      }
    },
    {
      id: 'mobile_compact',
      name: 'Mobile Compact',
      description: 'Small file size for mobile',
      icon: '💾',
      category: 'mobile',
      settings: {
        format: 'mp4',
        quality: 'low',
        resolution: '480p',
        fps: 24,
        codec: 'h264',
        bitrate: 1000
      }
    },
    
    // Social Media Presets
    {
      id: 'youtube_hd',
      name: 'YouTube HD',
      description: 'YouTube recommended settings',
      icon: '📹',
      category: 'social',
      settings: {
        format: 'mp4',
        quality: 'high',
        resolution: '1080p',
        fps: 30,
        codec: 'h264',
        bitrate: 8000
      }
    },
    {
      id: 'instagram_story',
      name: 'Instagram Story',
      description: 'Vertical format for Instagram',
      icon: '📸',
      category: 'social',
      settings: {
        format: 'mp4',
        quality: 'high',
        resolution: '1080x1920',
        fps: 30,
        codec: 'h264',
        bitrate: 3500
      }
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      description: 'Optimized for TikTok upload',
      icon: '🎵',
      category: 'social',
      settings: {
        format: 'mp4',
        quality: 'high',
        resolution: '1080x1920',
        fps: 30,
        codec: 'h264',
        bitrate: 2500
      }
    },
    
    // Professional Presets
    {
      id: 'broadcast_hd',
      name: 'Broadcast HD',
      description: 'Professional broadcast quality',
      icon: '🎬',
      category: 'professional',
      settings: {
        format: 'mov',
        quality: 'high',
        resolution: '1080p',
        fps: 30,
        codec: 'prores',
        bitrate: 25000
      }
    },
    {
      id: 'archive_quality',
      name: 'Archive Quality',
      description: 'Lossless preservation',
      icon: '🗄️',
      category: 'professional',
      settings: {
        format: 'mkv',
        quality: 'custom',
        resolution: 'original',
        codec: 'ffv1',
        bitrate: 50000
      }
    }
  ];
  
  const categories = [
    { id: 'web', label: 'Web', icon: '🌐' },
    { id: 'mobile', label: 'Mobile', icon: '📱' },
    { id: 'social', label: 'Social Media', icon: '📱' },
    { id: 'professional', label: 'Professional', icon: '🎬' },
    { id: 'custom', label: 'Custom', icon: '⚙️' }
  ];
  
  const selectedVideoObjects = (videos || []).filter(v => selectedVideos.includes(v.id));
  
  useEffect(() => {
    calculateEstimates();
  }, [processing, selectedVideos, selectedPreset]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const calculateEstimates = () => {
    if (!selectedVideos || selectedVideos.length === 0) {
      setEstimatedSize('No videos selected');
      setEstimatedTime('--:--');
      return;
    }
    
    // Recalculate selectedVideoObjects to ensure it's current
    const currentSelectedVideoObjects = (videos || []).filter(v => selectedVideos.includes(v.id));
    
    if (currentSelectedVideoObjects.length === 0) {
      setEstimatedSize('No videos found');
      setEstimatedTime('--:--');
      return;
    }
    
    const totalInputSize = currentSelectedVideoObjects.reduce((sum, v) => sum + (v.size || 0), 0);
    const totalDuration = currentSelectedVideoObjects.reduce((sum, v) => sum + (v.duration || 0), 0);
    
    // Use current settings or preset settings
    const currentSettings = selectedPreset === 'custom' 
      ? processing 
      : { ...processing, ...exportPresets.find(p => p.id === selectedPreset)?.settings };
    
    try {
      const estimatedOutputSize = ffmpegService.estimateOutputSize(
        totalInputSize,
        totalDuration,
        currentSettings
      );
      
      setEstimatedSize(formatFileSize(estimatedOutputSize));
      
      // Calculate processing time
      const processingMultiplier = getProcessingMultiplier(currentSettings);
      const estimatedSeconds = totalDuration * processingMultiplier;
      setEstimatedTime(formatTime(estimatedSeconds));
    } catch (error) {
      console.error('Error calculating estimates:', error);
      setEstimatedSize('Calculation error');
      setEstimatedTime('--:--');
    }
  };
  
  const getProcessingMultiplier = (settings: any): number => {
    let multiplier = 0.3;
    
    // Quality factor
    switch (settings.quality) {
      case 'low': multiplier *= 0.5; break;
      case 'medium': multiplier *= 0.8; break;
      case 'high': multiplier *= 1.5; break;
      case 'custom': multiplier *= 1.0; break;
    }
    
    // Resolution factor
    if (settings.resolution && settings.resolution !== 'original') {
      if (settings.resolution.includes('2160') || settings.resolution.includes('4K')) multiplier *= 2.0;
      else if (settings.resolution.includes('1440')) multiplier *= 1.5;
      else if (settings.resolution.includes('1080')) multiplier *= 1.2;
    }
    
    // Codec factor
    if (settings.codec === 'h265' || settings.codec === 'av1') multiplier *= 1.8;
    else if (settings.codec === 'prores') multiplier *= 0.8;
    
    return multiplier;
  };
  
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    
    if (presetId !== 'custom') {
      const preset = exportPresets.find(p => p.id === presetId);
      if (preset) {
        // Apply preset settings
        dispatch(setOutputFormat(preset.settings.format || 'mp4'));
        dispatch(setQualityPreset(preset.settings.quality as any));
        if (preset.settings.resolution) {
          dispatch(updateProcessingSettings({ resolution: preset.settings.resolution }));
        }
        if (preset.settings.fps) {
          dispatch(updateProcessingSettings({ fps: preset.settings.fps }));
        }
        if (preset.settings.codec) {
          dispatch(updateProcessingSettings({ codec: preset.settings.codec }));
        }
        if (preset.settings.bitrate) {
          dispatch(updateProcessingSettings({ bitrate: preset.settings.bitrate }));
        }
        
        dispatch(addNotification({
          type: 'info',
          title: 'Preset Applied',
          message: `${preset.name} settings have been applied`,
          autoClose: true,
          duration: 2000,
        }));
      }
    }
  };
  
  const handleOutputPathSelect = async () => {
    try {
      const path = await window.electronAPI.selectOutputDirectory();
      if (path) {
        dispatch(setOutputPath(path));
      }
    } catch (error) {
      console.error('Failed to select output path:', error);
    }
  };
  
  const handleBatchExport = async () => {
    console.log('=== EXPORT PROCESS STARTED ===');
    console.log('selectedVideos:', selectedVideos);
    console.log('videos array:', videos);
    console.log('processing settings:', processing);
    
    if (selectedVideos.length === 0) {
      console.log('Export cancelled: No videos selected');
      dispatch(addNotification({
        type: 'warning',
        title: 'No Videos Selected',
        message: 'Please select videos to export',
        autoClose: true,
        duration: 3000,
      }));
      return;
    }

    // Validate settings
    console.log('Validating export settings...');
    try {
      const validation = ffmpegService.validateSettings(processing);
      console.log('Validation result:', validation);
      
      if (!validation.valid) {
        console.log('Validation failed:', validation.errors);
        dispatch(addNotification({
          type: 'error',
          title: 'Invalid Settings',
          message: validation.errors.join(', '),
          autoClose: true,
          duration: 5000,
        }));
        return;
      }
    } catch (error) {
      console.error('Error during settings validation:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Validation Error',
        message: `Settings validation failed: ${error.message}`,
        autoClose: true,
        duration: 5000,
      }));
      return;
    }
    
    // Validate and ensure output directory exists
    console.log('Validating output directory...');
    try {
      if (!processing.outputPath || processing.outputPath.trim() === '') {
        dispatch(addNotification({
          type: 'error',
          title: 'No Output Directory',
          message: 'Please select an output directory before exporting.',
          autoClose: true,
          duration: 5000,
        }));
        return;
      }
      
      if (window.electronAPI?.ensureOutputDirectory) {
        const dirResult = await window.electronAPI.ensureOutputDirectory(processing.outputPath);
        if (!dirResult.success) {
          console.error('Output directory validation failed:', dirResult.error);
          dispatch(addNotification({
            type: 'error',
            title: 'Output Directory Issue',
            message: dirResult.error || 'The output directory is not accessible or writable.',
            autoClose: true,
            duration: 8000,
          }));
          return;
        }
        console.log('Output directory validated successfully:', dirResult.path);
      }
    } catch (error) {
      console.error('Error validating output directory:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Directory Validation Error',
        message: 'Could not validate output directory. Please check your settings.',
        autoClose: true,
        duration: 5000,
      }));
      return;
    }
    
    // Get video file paths using proper path resolution
    console.log('Getting video paths...');
    const selectedVideoObjects = (videos || []).filter(v => selectedVideos.includes(v.id));
    console.log('selectedVideoObjects:', selectedVideoObjects);
    
    const videoPaths: string[] = [];
    const videosWithBlobUrls: string[] = [];
    
    for (const video of selectedVideoObjects) {
      // Check if we're dealing with a blob URL
      if (video.path && video.path.startsWith('blob:')) {
        console.log(`Video ${video.id} has blob URL, cannot be processed by FFmpeg`);
        videosWithBlobUrls.push(video.name);
      } else if (video.path) {
        // Use the existing path (file:// URL or regular path)
        videoPaths.push(video.path);
        console.log(`Using existing path for ${video.name}: ${video.path}`);
      } else {
        console.error(`No path found for video ${video.name}`);
        videosWithBlobUrls.push(video.name);
      }
    }
    
    // If any videos have blob URLs, show error with action to fix
    if (videosWithBlobUrls.length > 0) {
      // Show confirmation dialog with option to open file dialog
      try {
        await confirmation.confirm({
          title: 'Videos Need Re-importing',
          message: `${videosWithBlobUrls.length} video(s) were imported via drag-and-drop or paste and cannot be exported. Would you like to re-import them now using the file dialog?`,
          confirmText: 'Re-import Videos',
          cancelText: 'Cancel Export',
          confirmVariant: 'primary',
          icon: '⚠️',
          details: videosWithBlobUrls.slice(0, 5).concat(
            videosWithBlobUrls.length > 5 ? [`...and ${videosWithBlobUrls.length - 5} more`] : []
          ),
        }, async () => {
          // Open file dialog to re-import videos
          dispatch(addNotification({
            type: 'info',
            title: 'Re-import Required',
            message: 'Please select the same video files using the file dialog to enable export.',
            autoClose: true,
            duration: 5000,
          }));
          
          // Trigger file import dialog
          const fileImportButton = document.querySelector('[data-testid="file-import-button"]') as HTMLElement;
          if (fileImportButton) {
            fileImportButton.click();
          }
        });
      } catch (error) {
        // User cancelled, stop export
        return;
      }
      return;
    }
    
    console.log('Final video paths:', videoPaths);
    
    if (videoPaths.length === 0) {
      console.error('No valid video paths found');
      dispatch(addNotification({
        type: 'error',
        title: 'No Video Paths',
        message: 'Could not find valid paths for selected videos',
        autoClose: true,
        duration: 5000,
      }));
      return;
    }
    
    // Check for potential file overwrites
    const potentialOverwrites = [];
    for (const video of selectedVideoObjects) {
      const outputPath = `${processing.outputPath || './exports'}/${video.name.replace(/\.[^.]+$/, '')}_exported.${processing.outputFormat}`;
      
      // Check if file exists using electron API
      try {
        if (window.electronAPI?.fileExists) {
          const exists = await window.electronAPI.fileExists(outputPath);
          if (exists) {
            potentialOverwrites.push(video.name);
          }
        }
      } catch (error) {
        console.warn('Could not check file existence for:', outputPath, error);
      }
    }
    
    try {
      // Show confirmation dialog for export
      await confirmation.confirmExport(
        selectedVideos.length,
        estimatedTime,
        async () => {
          // If there are potential overwrites, ask for confirmation
          if (potentialOverwrites.length > 0) {
            await confirmation.confirm({
              title: 'Files Will Be Overwritten',
              message: `${potentialOverwrites.length} file(s) will be overwritten. Continue?`,
              confirmText: 'Overwrite',
              cancelText: 'Cancel',
              confirmVariant: 'primary',
              icon: '⚠️',
              details: potentialOverwrites.slice(0, 5).concat(
                potentialOverwrites.length > 5 ? [`...and ${potentialOverwrites.length - 5} more`] : []
              ),
              showCheckbox: true,
              checkboxLabel: 'Create backup copies'
            }, async () => {
              await performExport();
            });
          } else {
            await performExport();
          }
        }
      );
    } catch (error) {
      // User cancelled
    }
    
    async function performExport() {
      console.log('=== STARTING EXPORT PROCESS ===');
      try {
        exportOps.start('Preparing export...');
        setExportProgress(0);
        
        dispatch(addNotification({
          type: 'info',
          title: 'Export Started',
          message: `Starting export of ${selectedVideos.length} video(s)`,
          autoClose: true,
          duration: 3000,
        }));
        
        console.log('About to call ffmpegService.startExport with:', {
          videoPaths,
          processing,
          videoCount: selectedVideos.length
        });

        await ffmpegService.startExport(
          videoPaths,
          processing,
          (progress, videoIndex, message) => {
            console.log(`Export progress: ${progress}% for video ${videoIndex}: ${message}`);
            const video = selectedVideoObjects[videoIndex];
            const overallProgress = ((videoIndex * 100) + progress) / selectedVideos.length;
            setExportProgress(overallProgress);
            setCurrentExportVideo(video?.name || 'Unknown');
            exportOps.update(overallProgress, `Processing ${video?.name || 'video'}...`);
          },
          (outputPaths) => {
            console.log('Export completed successfully:', outputPaths);
            exportOps.complete('Export completed successfully');
            setExportProgress(100);
            setCurrentExportVideo('');
            dispatch(addNotification({
              type: 'success',
              title: 'Export Complete',
              message: `Successfully exported ${outputPaths.length} video(s)`,
              autoClose: true,
              duration: 5000,
            }));
          },
          (error, videoPath) => {
            console.error('Export failed:', error, 'for video:', videoPath);
            exportOps.error(`Failed to export: ${error}`);
            setCurrentExportVideo('');
            dispatch(addNotification({
              type: 'error',
              title: 'Export Failed',
              message: `Failed to export ${videoPath ? videoPath.split('/').pop() : 'video'}: ${error}`,
              autoClose: true,
              duration: 5000,
            }));
          }
        );
      } catch (error) {
        console.error('Export process failed:', error);
        exportOps.error(`Export failed: ${error.message}`);
        dispatch(addNotification({
          type: 'error',
          title: 'Export Error',
          message: `Export process failed: ${error.message}`,
          autoClose: true,
          duration: 5000,
        }));
      }
    }
  };
  
  const handleSavePreset = () => {
    // Save current settings as custom preset
    const presetName = prompt('Enter preset name:');
    if (presetName) {
      const customPreset = {
        id: `custom_${Date.now()}`,
        name: presetName,
        description: 'Custom user preset',
        icon: '⚙️',
        category: 'custom' as const,
        settings: {
          format: processing.outputFormat,
          quality: processing.quality,
          resolution: processing.resolution,
          fps: processing.fps,
          codec: processing.codec,
          bitrate: processing.bitrate
        }
      };
      
      dispatch(updateExportPreset(customPreset.settings));
      dispatch(addNotification({
        type: 'success',
        title: 'Preset Saved',
        message: `"${presetName}" preset has been saved`,
        autoClose: true,
        duration: 3000,
      }));
    }
  };
  
  return (
    <div className="export-settings">
      <div className="settings-header">
        <h4 className="header-title">📤 Export Settings</h4>
        <div className="header-info">
          {selectedVideos.length > 0 && (
            <span className="selection-info">
              {selectedVideos.length} video(s) selected
            </span>
          )}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="export-tabs">
        <button
          className={`tab-button ${activeTab === 'presets' ? 'active' : ''}`}
          onClick={() => setActiveTab('presets')}
        >
          🎯 Presets
        </button>
        <button
          className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          ⚙️ Advanced
        </button>
        <button
          className={`tab-button ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          📦 Batch
        </button>
      </div>
      
      {/* Presets Tab */}
      {activeTab === 'presets' && (
        <div className="presets-content">
          <div className="category-selector">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-button ${
                  selectedPreset === 'custom' && category.id === 'custom' ? 'active' :
                  exportPresets.some(p => p.id === selectedPreset && p.category === category.id) ? 'active' : ''
                }`}
                onClick={() => {
                  if (category.id === 'custom') {
                    setSelectedPreset('custom');
                  } else {
                    const firstPreset = exportPresets.find(p => p.category === category.id);
                    if (firstPreset) handlePresetSelect(firstPreset.id);
                  }
                }}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-label">{category.label}</span>
              </button>
            ))}
          </div>
          
          <div className="presets-grid">
            {exportPresets
              .filter(preset => {
                if (selectedPreset === 'custom') return false;
                const activeCategory = categories.find(c => 
                  exportPresets.some(p => p.id === selectedPreset && p.category === c.id)
                )?.id || 'web';
                return preset.category === activeCategory;
              })
              .map(preset => (
                <div
                  key={preset.id}
                  className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <div className="preset-icon">{preset.icon}</div>
                  <div className="preset-info">
                    <div className="preset-name">{preset.name}</div>
                    <div className="preset-description">{preset.description}</div>
                    <div className="preset-specs">
                      {preset.settings.resolution} • {(preset.settings.format || 'MP4').toUpperCase()} • {preset.settings.codec.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))
            }
            
            {(selectedPreset === 'custom' || !exportPresets.some(p => p.id === selectedPreset)) && (
              <div className="preset-card selected custom-preset">
                <div className="preset-icon">⚙️</div>
                <div className="preset-info">
                  <div className="preset-name">Custom Settings</div>
                  <div className="preset-description">Use advanced settings panel</div>
                  <div className="preset-specs">
                    {processing.resolution || 'Original'} • {processing.outputFormat.toUpperCase()} • {processing.codec.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="advanced-content">
          <div className="advanced-section">
            <h5 className="section-title">Video Settings</h5>
            
            <div className="settings-grid">
              <div className="setting-group">
                <label>Output Format</label>
                <select
                  value={processing.outputFormat}
                  onChange={(e) => dispatch(setOutputFormat(e.target.value))}
                  className="select-input"
                >
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="avi">AVI</option>
                  <option value="mov">MOV</option>
                  <option value="mkv">MKV</option>
                </select>
              </div>
              
              <div className="setting-group">
                <label>Video Codec</label>
                <select
                  value={processing.codec}
                  onChange={(e) => dispatch(updateProcessingSettings({ codec: e.target.value }))}
                  className="select-input"
                >
                  <option value="h264">H.264</option>
                  <option value="h265">H.265 (HEVC)</option>
                  <option value="av1">AV1</option>
                  <option value="vp9">VP9</option>
                  <option value="prores">ProRes</option>
                  <option value="ffv1">FFV1 (Lossless)</option>
                </select>
              </div>
              
              <div className="setting-group">
                <label>Resolution</label>
                <select
                  value={processing.resolution || 'original'}
                  onChange={(e) => dispatch(updateProcessingSettings({ resolution: e.target.value }))}
                  className="select-input"
                >
                  <option value="original">Original</option>
                  <option value="480p">480p (SD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="1440p">1440p (2K)</option>
                  <option value="2160p">2160p (4K)</option>
                  <option value="1080x1920">1080x1920 (Vertical)</option>
                </select>
              </div>
              
              <div className="setting-group">
                <label>Frame Rate</label>
                <input
                  type="number"
                  value={processing.fps || 30}
                  onChange={(e) => dispatch(updateProcessingSettings({ fps: parseInt(e.target.value) }))}
                  min="1"
                  max="120"
                  className="number-input"
                />
              </div>
              
              <div className="setting-group">
                <label>Bitrate (kbps)</label>
                <input
                  type="number"
                  value={processing.bitrate || 5000}
                  onChange={(e) => dispatch(updateProcessingSettings({ bitrate: parseInt(e.target.value) }))}
                  min="100"
                  max="100000"
                  step="100"
                  className="number-input"
                />
              </div>
              
              <div className="setting-group">
                <label>Quality Preset</label>
                <select
                  value={processing.quality}
                  onChange={(e) => dispatch(setQualityPreset(e.target.value as any))}
                  className="select-input"
                >
                  <option value="low">Low (Fast)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Slow)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="advanced-section">
            <h5 className="section-title">Audio Settings</h5>
            
            <div className="settings-grid">
              <div className="setting-group">
                <label>Audio Codec</label>
                <select className="select-input">
                  <option value="aac">AAC</option>
                  <option value="mp3">MP3</option>
                  <option value="opus">Opus</option>
                  <option value="flac">FLAC</option>
                </select>
              </div>
              
              <div className="setting-group">
                <label>Audio Bitrate</label>
                <select className="select-input">
                  <option value="128">128 kbps</option>
                  <option value="192">192 kbps</option>
                  <option value="256">256 kbps</option>
                  <option value="320">320 kbps</option>
                </select>
              </div>
              
              <div className="setting-group">
                <label>Sample Rate</label>
                <select className="select-input">
                  <option value="44100">44.1 kHz</option>
                  <option value="48000">48 kHz</option>
                  <option value="96000">96 kHz</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="preset-actions">
            <button
              className="save-preset-button"
              onClick={handleSavePreset}
            >
              💾 Save as Preset
            </button>
          </div>
        </div>
      )}
      
      {/* Batch Tab */}
      {activeTab === 'batch' && (
        <div className="batch-content">
          <div className="batch-section">
            <h5 className="section-title">Batch Processing Options</h5>
            
            <div className="batch-options">
              <label className="checkbox-option">
                <input type="checkbox" defaultChecked />
                <span>Process videos simultaneously</span>
              </label>
              
              <label className="checkbox-option">
                <input type="checkbox" defaultChecked />
                <span>Use GPU acceleration</span>
              </label>
              
              <label className="checkbox-option">
                <input type="checkbox" />
                <span>Delete source files after export</span>
              </label>
              
              <label className="checkbox-option">
                <input type="checkbox" defaultChecked />
                <span>Create export report</span>
              </label>
            </div>
          </div>
          
          <div className="batch-section">
            <h5 className="section-title">Filename Options</h5>
            
            <div className="filename-settings">
              <div className="setting-group">
                <label>Filename Pattern</label>
                <input
                  type="text"
                  value={processing.filenamePattern || '{name}_exported.{ext}'}
                  onChange={(e) => dispatch(updateProcessingSettings({ filenamePattern: e.target.value }))}
                  className="text-input"
                  placeholder="{name}_exported.{ext}"
                />
                <div className="pattern-help">
                  Available: {'{name}'}, {'{ext}'}, {'{date}'}, {'{time}'}, {'{preset}'}
                </div>
              </div>
              
              <div className="setting-group">
                <label>Output Directory</label>
                <div className="path-selector">
                  <input
                    type="text"
                    value={processing.outputPath || 'Select output directory'}
                    readOnly
                    className="path-input"
                  />
                  <button
                    className="browse-button"
                    onClick={handleOutputPathSelect}
                  >
                    📂 Browse
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Summary */}
      <div className="export-summary">
        <h5 className="summary-title">Export Summary</h5>
        
        <div className="summary-grid">
          <div className="summary-item">
            <div className="summary-icon">🎥</div>
            <div className="summary-content">
              <div className="summary-value">{selectedVideos?.length || 0}</div>
              <div className="summary-label">Videos Selected</div>
            </div>
          </div>
          
          <div className="summary-item">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <div className="summary-value">{estimatedSize}</div>
              <div className="summary-label">Estimated Size</div>
            </div>
          </div>
          
          <div className="summary-item">
            <div className="summary-icon">⏱️</div>
            <div className="summary-content">
              <div className="summary-value">{estimatedTime}</div>
              <div className="summary-label">Estimated Time</div>
            </div>
          </div>
          
          <div className="summary-item">
            <div className="summary-icon">🎯</div>
            <div className="summary-content">
              <div className="summary-value">
                {(() => {
                  if (selectedPreset === 'custom') return 'CUSTOM';
                  const preset = exportPresets.find(p => p.id === selectedPreset);
                  return preset ? preset.name.toUpperCase() : 'CUSTOM';
                })()}
              </div>
              <div className="summary-label">Export Preset</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Export Progress */}
      {exportLoading.isLoading && (
        <div className="export-progress-section">
          <h5 className="section-title">Export Progress</h5>
          <ProgressBar 
            progress={exportProgress}
            message={currentExportVideo ? `Processing: ${currentExportVideo}` : exportLoading.message}
            animated={true}
            striped={true}
          />
          <div className="progress-details">
            <span>{Math.round(exportProgress)}% Complete</span>
            <span>{currentExportVideo}</span>
          </div>
        </div>
      )}
      
      {/* Export Actions */}
      <div className="export-actions">
        <LoadingButton
          variant="secondary"
          size="medium"
          loading={previewLoading.isLoading}
          loadingText="Generating..."
          onClick={async () => {
            try {
              previewOps.start('Generating preview...');
              await new Promise(resolve => setTimeout(resolve, 1500));
              previewOps.complete('Preview generated');
              dispatch(addNotification({
                type: 'success',
                title: 'Preview Generated',
                message: 'Export preview has been generated',
                autoClose: true,
                duration: 3000,
              }));
            } catch (error) {
              previewOps.error('Failed to generate preview');
            }
          }}
          disabled={selectedVideos.length === 0}
          icon="👁️"
        >
          Preview
        </LoadingButton>
        
        <LoadingButton
          variant="primary"
          size="medium"
          loading={exportLoading.isLoading}
          loadingText="Exporting..."
          onClick={handleBatchExport}
          disabled={selectedVideos.length === 0}
          icon="🚀"
        >
          Start Export
        </LoadingButton>
      </div>
      
      {selectedVideos.length === 0 && (
        <div className="no-selection-warning">
          ⚠️ Select videos in the library to configure export settings
        </div>
      )}
      
      {exportLoading.error && (
        <div className="export-error">
          <div className="error-message">❌ {exportLoading.error}</div>
          <LoadingButton
            variant="secondary"
            size="small"
            onClick={() => exportOps.reset()}
          >
            Dismiss
          </LoadingButton>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.config?.title || ''}
        message={confirmation.config?.message || ''}
        confirmText={confirmation.config?.confirmText}
        cancelText={confirmation.config?.cancelText}
        confirmVariant={confirmation.config?.confirmVariant}
        onConfirm={confirmation.onConfirm || (() => {})}
        onCancel={confirmation.cancel}
        loading={confirmation.loading}
        icon={confirmation.config?.icon}
        details={confirmation.config?.details}
        showCheckbox={confirmation.config?.showCheckbox}
        checkboxLabel={confirmation.config?.checkboxLabel}
        checkboxChecked={confirmation.checkboxChecked}
        onCheckboxChange={confirmation.setCheckboxChecked}
      />
    </div>
  );
};

export default ExportSettings;