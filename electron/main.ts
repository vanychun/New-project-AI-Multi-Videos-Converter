import { app, BrowserWindow, ipcMain, dialog, shell, Menu, protocol } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import { readFile, mkdir, writeFile, unlink } from 'fs/promises';
import { createReadStream, statSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { registerFFmpegHandlers } from './ffmpegHandler';

// Replace electron-is-dev with simple check
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Removed squirrel-startup check for development

// Add GPU and WSL compatibility flags
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow: BrowserWindow;

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    minHeight: 600,
    minWidth: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: false, // For development
    },
    show: false,
    titleBarStyle: 'default'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null as any;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

// Register custom protocol for serving local video files
function registerVideoProtocol() {
  protocol.registerFileProtocol('video', (request, callback) => {
    const url = request.url.substr(8); // Remove 'video://'
    const decodedPath = decodeURI(url);
    callback({ path: decodedPath });
  });
}

// Create default output directory on app startup
async function ensureDefaultOutputDirectory() {
  try {
    const documentsPath = app.getPath('documents');
    const defaultOutputPath = join(documentsPath, 'AI Video Converter');
    
    console.log('Ensuring default output directory exists:', defaultOutputPath);
    
    if (!existsSync(defaultOutputPath)) {
      await mkdir(defaultOutputPath, { recursive: true });
      console.log('Created default output directory:', defaultOutputPath);
    } else {
      console.log('Default output directory already exists:', defaultOutputPath);
    }
    
    return defaultOutputPath;
  } catch (error) {
    console.error('Failed to create default output directory:', error);
    throw error;
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Register custom protocol
  registerVideoProtocol();
  
  // Register FFmpeg handlers
  registerFFmpegHandlers();
  
  // Ensure default output directory exists
  try {
    await ensureDefaultOutputDirectory();
  } catch (error) {
    console.error('Warning: Could not create default output directory:', error);
  }
  
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto updater
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation to external websites
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (url !== contents.getURL()) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// IPC handlers
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

// Application info handler
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    userDataPath: app.getPath('userData'),
    isPackaged: app.isPackaged,
    isDev: isDev
  };
});

// Video file handlers
ipcMain.handle('select-video-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    return result.filePaths;
  }
  return [];
});

ipcMain.handle('read-video-file', async (event, filePath) => {
  try {
    const stats = statSync(filePath);
    const buffer = await readFile(filePath);
    return {
      buffer: buffer.toString('base64'),
      size: stats.size,
      mimeType: getMimeType(filePath)
    };
  } catch (error) {
    console.error('Error reading video file:', error);
    return null;
  }
});

// Handle file dialog (alias for openFileDialog)
ipcMain.handle('openFileDialog', async (event, options) => {
  const defaultOptions = {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp', 'ts', 'mts', 'mxf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  };
  
  const result = await dialog.showOpenDialog(mainWindow, { ...defaultOptions, ...options });
  return result;
});

// Video metadata and thumbnail handlers are now in ffmpegHandler.ts

// Helper function to get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'm4v': 'video/x-m4v',
    '3gp': 'video/3gpp'
  };
  return mimeTypes[ext] || 'video/mp4';
}

// File operation handlers
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return true;
  } catch (error) {
    console.error('Error opening file:', error);
    return false;
  }
});

ipcMain.handle('reveal-file', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (error) {
    console.error('Error revealing file:', error);
    return false;
  }
});

ipcMain.handle('select-output-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Output Directory'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error selecting output directory:', error);
    return null;
  }
});

ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error selecting folder:', error);
    return null;
  }
});

// Directory creation handler
ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    await mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    return false;
  }
});

// File existence check handler
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    console.log('Checking file existence for:', filePath);
    
    // Expand home directory if needed
    let expandedPath = filePath;
    if (filePath.startsWith('~/')) {
      expandedPath = join(app.getPath('home'), filePath.slice(2));
      console.log('Expanded path:', expandedPath);
    }
    
    const exists = existsSync(expandedPath);
    console.log('File exists:', exists);
    return exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
});

// Ensure output directory exists handler
ipcMain.handle('ensure-output-directory', async (event, dirPath) => {
  try {
    console.log('Ensuring output directory exists:', dirPath);
    
    // Use default path if none provided
    let targetPath = dirPath;
    if (!targetPath || targetPath.trim() === '') {
      const documentsPath = app.getPath('documents');
      targetPath = join(documentsPath, 'AI Video Converter');
      console.log('Using default output path:', targetPath);
    }
    
    // Expand home directory if needed
    if (targetPath.startsWith('~/')) {
      targetPath = join(app.getPath('home'), targetPath.slice(2));
      console.log('Expanded path:', targetPath);
    }
    
    // Create directory if it doesn't exist
    if (!existsSync(targetPath)) {
      await mkdir(targetPath, { recursive: true });
      console.log('Created output directory:', targetPath);
    }
    
    // Check if directory is writable
    try {
      await writeFile(join(targetPath, '.write-test'), '');
      await unlink(join(targetPath, '.write-test'));
      console.log('Directory is writable:', targetPath);
    } catch (writeError) {
      console.error('Directory is not writable:', targetPath, writeError);
      return {
        success: false,
        path: targetPath,
        error: 'Directory is not writable'
      };
    }
    
    return {
      success: true,
      path: targetPath
    };
  } catch (error) {
    console.error('Error ensuring output directory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});

// Get default output directory handler
ipcMain.handle('get-default-output-directory', async () => {
  try {
    const documentsPath = app.getPath('documents');
    const defaultPath = join(documentsPath, 'AI Video Converter');
    return defaultPath;
  } catch (error) {
    console.error('Error getting default output directory:', error);
    return null;
  }
});

// Video processing handler is now in ffmpegHandler.ts


// Auto updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available.');
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.');
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  autoUpdater.quitAndInstall();
});