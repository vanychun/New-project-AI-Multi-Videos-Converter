import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog methods
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  
  // App methods
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // File system operations
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, data: any) => ipcRenderer.invoke('write-file', filePath, data),
  
  // Video processing
  processVideo: (options: any) => ipcRenderer.invoke('process-video', options),
  getVideoInfo: (filePath: string) => ipcRenderer.invoke('get-video-info', filePath),
  
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
      getVideoInfo: (filePath: string) => Promise<any>;
      onProgress: (callback: (progress: any) => void) => void;
      removeProgressListener: () => void;
    };
  }
}