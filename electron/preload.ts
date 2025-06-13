import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog methods
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  openFileDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options), // Alias for compatibility
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  
  // App methods
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // File system operations
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, data: any) => ipcRenderer.invoke('write-file', filePath, data),
  
  // Video processing
  processVideo: (options: any) => ipcRenderer.invoke('process-video', options),
  startVideoProcessing: (options: any) => ipcRenderer.invoke('start-video-processing', options),
  getVideoInfo: (filePath: string) => ipcRenderer.invoke('getVideoMetadata', filePath),
  getVideoMetadata: (filePath: string) => ipcRenderer.invoke('getVideoMetadata', filePath),
  extractThumbnail: (filePath: string, time: number) => ipcRenderer.invoke('extractThumbnail', filePath, time),
  
  // File operations
  selectFiles: () => ipcRenderer.invoke('select-video-files'),
  selectVideoFiles: () => ipcRenderer.invoke('select-video-files'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  revealFile: (filePath: string) => ipcRenderer.invoke('reveal-file', filePath),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('create-directory', dirPath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  ensureOutputDirectory: (dirPath?: string) => ipcRenderer.invoke('ensure-output-directory', dirPath),
  getDefaultOutputDirectory: () => ipcRenderer.invoke('get-default-output-directory'),
  
  // Progress events
  onProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('processing-progress', (event, progress) => callback(progress));
  },
  
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('processing-progress');
  }
});

// Declare the global interface for TypeScript
declare global {
  interface Window {
    electronAPI: {
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      showMessageBox: (options: any) => Promise<any>;
      getAppVersion: () => Promise<string>;
      quitApp: () => Promise<void>;
      readFile: (filePath: string) => Promise<any>;
      writeFile: (filePath: string, data: any) => Promise<void>;
      processVideo: (options: any) => Promise<any>;
      startVideoProcessing: (options: any) => Promise<any>;
      getVideoInfo: (filePath: string) => Promise<any>;
      selectVideoFiles: () => Promise<string[]>;
      selectOutputDirectory: () => Promise<string>;
      openFile: (filePath: string) => Promise<boolean>;
      revealFile: (filePath: string) => Promise<boolean>;
      createDirectory: (dirPath: string) => Promise<boolean>;
      fileExists: (filePath: string) => Promise<boolean>;
      getAppInfo: () => Promise<any>;
      ensureOutputDirectory: (dirPath?: string) => Promise<{success: boolean; path?: string; error?: string}>;
      getDefaultOutputDirectory: () => Promise<string>;
      onProgress: (callback: (progress: any) => void) => void;
      removeProgressListener: () => void;
    };
  }
}