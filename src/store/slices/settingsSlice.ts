import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProcessingSettings, AISettings } from '../../types/video.types';

export interface SettingsState {
  processing: ProcessingSettings;
  ai: AISettings;
  export: ProcessingSettings;
  ui: {
    theme: 'dark' | 'light';
    language: string;
    autoSave: boolean;
    showThumbnails: boolean;
    showWaveforms: boolean;
    defaultOutputPath: string;
    maxConcurrentJobs: number;
    enableGPU: boolean;
    enableHardwareAcceleration: boolean;
  };
  advanced: {
    ffmpegPath: string;
    pythonPath: string;
    tempDirectory: string;
    maxMemoryUsage: number; // GB
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableCrashReporting: boolean;
    enableAnalytics: boolean;
  };
}

const getDefaultOutputPath = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    // In Electron, we'll get the proper path from the main process
    // For initialization, use a placeholder that will be resolved later
    return ''; // Will be resolved by the app startup logic
  }
  return './output'; // Fallback for browser
};

const initialState: SettingsState = {
  processing: {
    outputFormat: 'mp4',
    quality: 'high',
    resolution: 'original',
    fps: 30,
    bitrate: 5000,
    codec: 'h264',
    outputPath: getDefaultOutputPath(),
    filenamePattern: '{name}_converted.{ext}',
  },
  export: {
    outputFormat: 'mp4',
    quality: 'high',
    resolution: 'original',
    fps: 30,
    bitrate: 5000,
    codec: 'h264',
    outputPath: getDefaultOutputPath(),
    filenamePattern: '{name}_converted.{ext}',
  },
  ai: {
    upscaling: {
      enabled: false,
      factor: 2,
      model: 'realesrgan-x4plus',
      quality: 80,
    },
    frameInterpolation: {
      enabled: false,
      targetFps: 60,
      model: 'rife',
    },
    faceEnhancement: {
      enabled: false,
      strength: 70,
      model: 'gfpgan',
    },
    denoising: {
      enabled: false,
      level: 'medium',
      model: 'dncnn',
    },
    objectRemoval: {
      enabled: false,
      regions: [],
    },
    styleTransfer: {
      enabled: false,
      style: 'none',
      strength: 50,
    },
  },
  ui: {
    theme: 'dark',
    language: 'en',
    autoSave: true,
    showThumbnails: true,
    showWaveforms: false,
    defaultOutputPath: getDefaultOutputPath(),
    maxConcurrentJobs: 3,
    enableGPU: true,
    enableHardwareAcceleration: true,
  },
  advanced: {
    ffmpegPath: '',
    pythonPath: '',
    tempDirectory: '',
    maxMemoryUsage: 8,
    logLevel: 'info',
    enableCrashReporting: true,
    enableAnalytics: false,
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateProcessingSettings: (state, action: PayloadAction<Partial<ProcessingSettings>>) => {
      state.processing = { ...state.processing, ...action.payload };
    },
    
    updateAISettings: (state, action: PayloadAction<Partial<AISettings>>) => {
      state.ai = { ...state.ai, ...action.payload };
    },
    
    updateAIUpscaling: (state, action: PayloadAction<Partial<AISettings['upscaling']>>) => {
      state.ai.upscaling = { ...state.ai.upscaling, ...action.payload };
    },
    
    updateAIFrameInterpolation: (state, action: PayloadAction<Partial<AISettings['frameInterpolation']>>) => {
      state.ai.frameInterpolation = { ...state.ai.frameInterpolation, ...action.payload };
    },
    
    updateAIFaceEnhancement: (state, action: PayloadAction<Partial<AISettings['faceEnhancement']>>) => {
      state.ai.faceEnhancement = { ...state.ai.faceEnhancement, ...action.payload };
    },
    
    updateAIDenoising: (state, action: PayloadAction<Partial<AISettings['denoising']>>) => {
      state.ai.denoising = { ...state.ai.denoising, ...action.payload };
    },
    
    updateUISettings: (state, action: PayloadAction<Partial<SettingsState['ui']>>) => {
      state.ui = { ...state.ui, ...action.payload };
    },
    
    updateAdvancedSettings: (state, action: PayloadAction<Partial<SettingsState['advanced']>>) => {
      state.advanced = { ...state.advanced, ...action.payload };
    },
    
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.ui.theme = action.payload;
    },
    
    setOutputFormat: (state, action: PayloadAction<string>) => {
      state.processing.outputFormat = action.payload;
    },
    
    setOutputPath: (state, action: PayloadAction<string>) => {
      state.processing.outputPath = action.payload;
      state.export.outputPath = action.payload;
      state.ui.defaultOutputPath = action.payload;
    },
    
    setQualityPreset: (state, action: PayloadAction<'low' | 'medium' | 'high' | 'custom'>) => {
      state.processing.quality = action.payload;
      
      // Apply preset values
      switch (action.payload) {
        case 'low':
          state.processing.bitrate = 1000;
          state.processing.resolution = '720p';
          break;
        case 'medium':
          state.processing.bitrate = 3000;
          state.processing.resolution = '1080p';
          break;
        case 'high':
          state.processing.bitrate = 8000;
          state.processing.resolution = 'original';
          break;
        case 'custom':
          // Keep current values
          break;
      }
    },
    
    enableAIFeature: (state, action: PayloadAction<keyof AISettings>) => {
      const feature = action.payload;
      if (feature in state.ai) {
        (state.ai[feature] as any).enabled = true;
      }
    },
    
    disableAIFeature: (state, action: PayloadAction<keyof AISettings>) => {
      const feature = action.payload;
      if (feature in state.ai) {
        (state.ai[feature] as any).enabled = false;
      }
    },
    
    toggleAIFeature: (state, action: PayloadAction<keyof AISettings>) => {
      const feature = action.payload;
      if (feature in state.ai) {
        (state.ai[feature] as any).enabled = !(state.ai[feature] as any).enabled;
      }
    },
    
    setOutputPath: (state, action: PayloadAction<string>) => {
      state.processing.outputPath = action.payload;
      state.ui.defaultOutputPath = action.payload;
    },
    
    initializeDefaultOutputPath: (state, action: PayloadAction<string>) => {
      // Only set if current path is empty (initial state)
      if (!state.processing.outputPath || state.processing.outputPath.trim() === '') {
        state.processing.outputPath = action.payload;
        state.ui.defaultOutputPath = action.payload;
      }
      if (!state.export.outputPath || state.export.outputPath.trim() === '') {
        state.export.outputPath = action.payload;
      }
    },
    
    setMaxConcurrentJobs: (state, action: PayloadAction<number>) => {
      state.ui.maxConcurrentJobs = Math.max(1, Math.min(10, action.payload));
    },
    
    resetToDefaults: (state, action: PayloadAction<'processing' | 'ai' | 'ui' | 'advanced' | 'all'>) => {
      const section = action.payload;
      
      switch (section) {
        case 'processing':
          state.processing = initialState.processing;
          break;
        case 'ai':
          state.ai = initialState.ai;
          break;
        case 'ui':
          state.ui = initialState.ui;
          break;
        case 'advanced':
          state.advanced = initialState.advanced;
          break;
        case 'all':
          return initialState;
      }
    },
    
    importSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
    
    loadSettingsFromStorage: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
    
    updateExportPreset: (state, action: PayloadAction<Partial<ProcessingSettings>>) => {
      state.export = { ...state.export, ...action.payload };
    },
  },
});

export const {
  updateProcessingSettings,
  updateAISettings,
  updateAIUpscaling,
  updateAIFrameInterpolation,
  updateAIFaceEnhancement,
  updateAIDenoising,
  updateUISettings,
  updateAdvancedSettings,
  setTheme,
  setOutputFormat,
  setOutputPath,
  setQualityPreset,
  enableAIFeature,
  disableAIFeature,
  toggleAIFeature,
  initializeDefaultOutputPath,
  setMaxConcurrentJobs,
  resetToDefaults,
  importSettings,
  loadSettingsFromStorage,
  updateExportPreset,
} = settingsSlice.actions;

export default settingsSlice.reducer;