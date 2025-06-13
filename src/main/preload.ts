import { contextBridge, ipcRenderer } from 'electron';

declare global {
  interface Window {
    electronAPI: any;
  }
}

// Define the API that will be exposed to the renderer process
export interface ElectronAPI {
  // File system operations
  selectVideoFiles: () => Promise<string[]>;
  selectOutputDirectory: () => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  openFile: (filePath: string) => Promise<boolean>;
  revealFile: (filePath: string) => Promise<boolean>;

  // System information
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    cpus: number;
    memory: number;
    gpu: string;
    version: string;
  } | null>;

  // Configuration management
  getConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<boolean>;

  // AI Backend operations
  checkAIBackend: () => Promise<boolean>;
  restartAIBackend: () => Promise<boolean>;

  // Application information
  getAppInfo: () => Promise<{
    name: string;
    version: string;
    userDataPath: string;
    isPackaged: boolean;
    isDev: boolean;
  }>;

  // Window operations
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // Auto-updater
  checkForUpdates: () => Promise<boolean>;

  // Video processing
  getVideoMetadata: (filePath: string) => Promise<any>;
  extractThumbnail: (filePath: string, timeStamp?: number) => Promise<string>;
  extractThumbnailsBatch: (filePaths: string[]) => Promise<Record<string, string>>;
  validateVideoFile: (filePath: string) => Promise<{ valid: boolean; metadata?: any; error?: string }>;
  processVideo: (options: any) => Promise<{ success: boolean; outputPath: string }>;
  startVideoProcessing: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
  stopVideoProcessing: (jobId: string) => Promise<{ success: boolean; error?: string }>;
  cancelVideoProcessing: (processId: string) => Promise<boolean>;

  // Event listeners
  onMenuAction: (callback: (action: string) => void) => void;
  onAIBackendLog: (callback: (log: string) => void) => void;
  onAIBackendError: (callback: (error: string) => void) => void;
  onVideoProcessingStarted: (callback: (data: any) => void) => void;
  onVideoProcessingProgress: (callback: (data: any) => void) => void;
  onVideoProcessingComplete: (callback: (data: any) => void) => void;
  onVideoProcessingError: (callback: (data: any) => void) => void;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
  
  // Additional file operations
  openFileDialog: (options?: any) => Promise<any>;
  readVideoFile: (filePath: string) => Promise<{ buffer: string; size: number; mimeType: string } | null>;
  createDirectory: (dirPath: string) => Promise<boolean>;
  fileExists: (filePath: string) => Promise<boolean>;
  ensureOutputDirectory: (dirPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  getDefaultOutputDirectory: () => Promise<string | null>;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // File system operations
  selectVideoFiles: () => ipcRenderer.invoke('select-video-files'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  revealFile: (filePath: string) => ipcRenderer.invoke('reveal-file', filePath),

  // System information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Configuration management
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),

  // AI Backend operations
  checkAIBackend: () => ipcRenderer.invoke('check-ai-backend'),
  restartAIBackend: () => ipcRenderer.invoke('restart-ai-backend'),

  // Application information
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Window operations
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Video processing
  getVideoMetadata: (filePath: string) => ipcRenderer.invoke('getVideoMetadata', filePath),
  extractThumbnail: (filePath: string, timeStamp?: number) => ipcRenderer.invoke('extractThumbnail', filePath, timeStamp),
  extractThumbnailsBatch: (filePaths: string[]) => ipcRenderer.invoke('extract-thumbnails-batch', filePaths),
  validateVideoFile: (filePath: string) => ipcRenderer.invoke('validate-video-file', filePath),
  processVideo: (options: any) => ipcRenderer.invoke('process-video', options),
  startVideoProcessing: (options: any) => ipcRenderer.invoke('start-video-processing', options),
  stopVideoProcessing: (jobId: string) => ipcRenderer.invoke('stop-video-processing', jobId),
  cancelVideoProcessing: (processId: string) => ipcRenderer.invoke('cancel-video-processing', processId),

  // Event listeners
  onMenuAction: (callback: (action: string) => void) => {
    const channels = [
      'menu-add-videos',
      'menu-add-folder',
      'menu-export-settings',
      'menu-start-processing',
      'menu-pause-processing',
      'menu-clear-queue',
      'menu-download-models',
      'menu-ai-settings'
    ];

    channels.forEach(channel => {
      ipcRenderer.on(channel, () => callback(channel.replace('menu-', '')));
    });
  },

  onAIBackendLog: (callback: (log: string) => void) => {
    ipcRenderer.on('ai-backend-log', (_, log: string) => callback(log));
  },

  onAIBackendError: (callback: (error: string) => void) => {
    ipcRenderer.on('ai-backend-error', (_, error: string) => callback(error));
  },

  onVideoProcessingStarted: (callback: (data: any) => void) => {
    ipcRenderer.on('video-processing-started', (_, data: any) => callback(data));
    ipcRenderer.on('processing-job-started', (_, data: any) => callback(data));
  },

  onVideoProcessingProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('video-processing-progress', (_, data: any) => callback(data));
    ipcRenderer.on('processing-job-progress', (_, data: any) => callback(data));
  },

  onVideoProcessingComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('video-processing-complete', (_, data: any) => callback(data));
    ipcRenderer.on('processing-job-complete', (_, data: any) => callback(data));
  },

  onVideoProcessingError: (callback: (data: any) => void) => {
    ipcRenderer.on('video-processing-error', (_, data: any) => callback(data));
    ipcRenderer.on('processing-job-error', (_, data: any) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Additional file operations
  openFileDialog: (options?: any) => ipcRenderer.invoke('openFileDialog', options),
  readVideoFile: (filePath: string) => ipcRenderer.invoke('read-video-file', filePath),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('create-directory', dirPath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  ensureOutputDirectory: (dirPath: string) => ipcRenderer.invoke('ensure-output-directory', dirPath),
  getDefaultOutputDirectory: () => ipcRenderer.invoke('get-default-output-directory')
};

// Security: Only expose specific APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Debug: Log what methods are being exposed
console.log('Preload: Exposing electronAPI with methods:', Object.keys(electronAPI));

// Expose development tools in development mode
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
      send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
      on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
      removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
    }
  });
}

// Global error handling
window.addEventListener('unhandledrejection', (event: any) => {
  console.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event: any) => {
  console.error('Global error:', event.error);
});

// Prevent navigation and new windows
window.addEventListener('beforeunload', (e: any) => {
  // Allow the user to prevent closing during processing
  const isProcessing = false; // This would be determined from app state
  if (isProcessing) {
    e.preventDefault();
    e.returnValue = 'Processing is in progress. Are you sure you want to quit?';
  }
});

// Disable right-click context menu in production
if (process.env.NODE_ENV !== 'development') {
  window.addEventListener('contextmenu', (e: any) => {
    e.preventDefault();
  });
}

// Disable drag and drop of files on the window (except in designated areas)
window.addEventListener('dragover', (e: any) => {
  e.preventDefault();
});

window.addEventListener('drop', (e: any) => {
  e.preventDefault();
});

console.log('Preload script loaded successfully');