// Type declarations for Electron API exposed to renderer process

interface ElectronAPI {
  // File system operations
  selectFiles: () => Promise<string[]>;
  selectVideoFiles?: () => Promise<string[]>; // Keep for backward compatibility
  selectOutputDirectory: () => Promise<string | null>;
  selectFolder?: () => Promise<string | null>;
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
    ffmpegAvailable?: boolean;
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
  processVideo: (options: any) => Promise<{ success: boolean; outputPath: string }>;
  cancelVideoProcessing: (processId: string) => Promise<boolean>;
  startVideoProcessing: (config: any) => Promise<{ success: boolean; message: string; outputPath?: string; error?: string }>;
  stopVideoProcessing: (processId: string) => Promise<{ success: boolean; message: string; error?: string }>;

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
}

// Development tools (only available in development)
interface ElectronDev {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
}

// Extend the Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron?: ElectronDev; // Only available in development
  }
}

// Export types for use in React components
export type { ElectronAPI, ElectronDev };