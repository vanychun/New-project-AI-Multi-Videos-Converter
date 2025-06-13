import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { autoUpdater } from 'electron-updater';

// Development check
const isDev = process.env.NODE_ENV === 'development';

// App configuration
const APP_CONFIG = {
  name: 'AI Multi Videos Converter',
  version: app.getVersion(),
  minWidth: 1200,
  minHeight: 800,
  defaultWidth: 1400,
  defaultHeight: 1000
};

// Global reference to window
let mainWindow: BrowserWindow | null = null;
let aiBackendProcess: any = null;
let activeProcessingJobs: Map<string, any> = new Map();

// Set FFmpeg paths
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

// App directories
const userDataPath = app.getPath('userData');
const configPath = join(userDataPath, 'config.json');
const logsPath = join(userDataPath, 'logs');

// Ensure directories exist
if (!existsSync(logsPath)) {
  mkdirSync(logsPath, { recursive: true });
}

// Configuration management
interface AppConfig {
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings?: {
    outputPath?: string;
    theme?: 'dark' | 'light';
    autoStart?: boolean;
    hardwareAcceleration?: boolean;
  };
  aiBackend?: {
    enabled?: boolean;
    port?: number;
    models?: string[];
  };
}

function loadConfig(): AppConfig {
  try {
    if (existsSync(configPath)) {
      const configData = readFileSync(configPath, 'utf-8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  return {};
}

function saveConfig(config: AppConfig): void {
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Create main application window
function createMainWindow(): void {
  const config = loadConfig();
  
  mainWindow = new BrowserWindow({
    width: config.windowBounds?.width || APP_CONFIG.defaultWidth,
    height: config.windowBounds?.height || APP_CONFIG.defaultHeight,
    ...(config.windowBounds?.x !== undefined && { x: config.windowBounds.x }),
    ...(config.windowBounds?.y !== undefined && { y: config.windowBounds.y }),
    minWidth: APP_CONFIG.minWidth,
    minHeight: APP_CONFIG.minHeight,
    show: false,
    title: APP_CONFIG.name,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: !isDev,
      sandbox: false
    },
    icon: isDev 
      ? join(__dirname, '../../assets/icon.png')
      : join(process.resourcesPath, 'assets/icon.png')
  });

  // Load the application
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Focus window
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Save window bounds on resize/move
  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function saveWindowBounds(): void {
  if (!mainWindow) return;
  
  const bounds = mainWindow.getBounds();
  const config = loadConfig();
  config.windowBounds = bounds;
  saveConfig(config);
}

// AI Backend management
function startAIBackend(): void {
  try {
    const pythonPath = isDev 
      ? 'python' 
      : join(process.resourcesPath, 'ai-backend/python/python.exe');
    
    const backendScript = isDev
      ? join(__dirname, '../../ai-backend/main.py')
      : join(process.resourcesPath, 'ai-backend/main.py');

    if (existsSync(backendScript)) {
      aiBackendProcess = spawn(pythonPath, [backendScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONPATH: join(__dirname, '../../ai-backend') }
      });

      aiBackendProcess.stdout?.on('data', (data: Buffer) => {
        console.log(`AI Backend: ${data.toString()}`);
        // Send logs to renderer if needed
        mainWindow?.webContents.send('ai-backend-log', data.toString());
      });

      aiBackendProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`AI Backend Error: ${data.toString()}`);
        mainWindow?.webContents.send('ai-backend-error', data.toString());
      });

      aiBackendProcess.on('close', (code: number) => {
        console.log(`AI Backend process exited with code ${code}`);
        aiBackendProcess = null;
      });

      console.log('AI Backend started successfully');
    } else {
      console.warn('AI Backend script not found, running without AI features');
    }
  } catch (error) {
    console.error('Failed to start AI backend:', error);
  }
}

function stopAIBackend(): void {
  if (aiBackendProcess) {
    aiBackendProcess.kill();
    aiBackendProcess = null;
    console.log('AI Backend stopped');
  }
}

// Application menu
function createMenu(): void {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Videos...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-add-videos');
          }
        },
        {
          label: 'Add Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            mainWindow?.webContents.send('menu-add-folder');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Settings...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu-export-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Processing',
      submenu: [
        {
          label: 'Start Queue',
          accelerator: 'F5',
          click: () => {
            mainWindow?.webContents.send('menu-start-processing');
          }
        },
        {
          label: 'Pause Queue',
          accelerator: 'F6',
          click: () => {
            mainWindow?.webContents.send('menu-pause-processing');
          }
        },
        {
          label: 'Clear Queue',
          accelerator: 'CmdOrCtrl+Shift+Delete',
          click: () => {
            mainWindow?.webContents.send('menu-clear-queue');
          }
        }
      ]
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Restart AI Backend',
          click: () => {
            stopAIBackend();
            setTimeout(startAIBackend, 1000);
          }
        },
        {
          label: 'Download Models...',
          click: () => {
            mainWindow?.webContents.send('menu-download-models');
          }
        },
        {
          label: 'AI Settings...',
          click: () => {
            mainWindow?.webContents.send('menu-ai-settings');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About',
              message: APP_CONFIG.name,
              detail: `Version: ${APP_CONFIG.version}\n\nAI-powered video converter with professional features.`
            });
          }
        },
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
function setupIPC(): void {
  // File system operations
  ipcMain.handle('select-video-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Video Files',
          extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'm4v', '3gp', 'wmv']
        },
        {
          name: 'All Files',
          extensions: ['*']
        }
      ]
    });
    
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    
    return result.canceled ? null : result.filePaths[0];
  });

  // File operations
  ipcMain.handle('open-file', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return true;
    } catch (error) {
      console.error('Failed to open file:', error);
      return false;
    }
  });

  ipcMain.handle('reveal-file', async (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return true;
    } catch (error) {
      console.error('Failed to reveal file:', error);
      return false;
    }
  });

  // System information
  ipcMain.handle('get-system-info', async () => {
    const os = require('os');
    const { execSync } = require('child_process');
    
    try {
      let gpuInfo = 'Unknown';
      try {
        if (process.platform === 'win32') {
          const wmic = execSync('wmic path win32_VideoController get name', { encoding: 'utf8' });
          gpuInfo = wmic.split('\n').filter((line: string) => line.trim() && !line.includes('Name'))[0]?.trim() || 'Unknown';
        }
      } catch (e) {
        console.warn('Could not detect GPU:', e);
      }

      return {
        platform: process.platform,
        arch: process.arch,
        cpus: os.cpus().length,
        memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
        gpu: gpuInfo,
        version: process.version
      };
    } catch (error) {
      console.error('Failed to get system info:', error);
      return null;
    }
  });

  // Configuration
  ipcMain.handle('get-config', async () => {
    return loadConfig();
  });

  ipcMain.handle('save-config', async (_, config: AppConfig) => {
    saveConfig(config);
    return true;
  });

  // AI Backend communication
  ipcMain.handle('check-ai-backend', async () => {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:8000/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('restart-ai-backend', async () => {
    stopAIBackend();
    setTimeout(startAIBackend, 1000);
    return true;
  });

  // Application info
  ipcMain.handle('get-app-info', async () => {
    return {
      name: APP_CONFIG.name,
      version: APP_CONFIG.version,
      userDataPath,
      isPackaged: app.isPackaged,
      isDev
    };
  });

  // Window operations
  ipcMain.handle('minimize-window', async () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('maximize-window', async () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('close-window', async () => {
    mainWindow?.close();
  });

  // Auto-updater events
  ipcMain.handle('check-for-updates', async () => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
    return !isDev;
  });

  // Video processing operations
  ipcMain.handle('get-video-metadata', async (_, filePath: string) => {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const ffprobePath = isDev 
        ? require('ffprobe-static') 
        : join(process.resourcesPath, 'ffmpeg/ffprobe.exe');
      
      ffmpeg.setFfprobePath(ffprobePath);
      
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              duration: metadata.format.duration,
              size: metadata.format.size,
              bitrate: metadata.format.bit_rate,
              width: metadata.streams[0].width,
              height: metadata.streams[0].height,
              fps: eval(metadata.streams[0].r_frame_rate),
              codec: metadata.streams[0].codec_name,
              audioCodec: metadata.streams[1]?.codec_name || null,
              audioChannels: metadata.streams[1]?.channels || 0,
              audioSampleRate: metadata.streams[1]?.sample_rate || 0
            });
          }
        });
      });
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      throw error;
    }
  });

  ipcMain.handle('extract-thumbnail', async (_, filePath: string, timeStamp: number = 5) => {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegPath = isDev 
        ? require('ffmpeg-static') 
        : join(process.resourcesPath, 'ffmpeg/ffmpeg.exe');
      
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      const thumbnailPath = join(userDataPath, 'thumbnails', `${Date.now()}.jpg`);
      const thumbnailDir = join(userDataPath, 'thumbnails');
      
      if (!existsSync(thumbnailDir)) {
        mkdirSync(thumbnailDir, { recursive: true });
      }
      
      return new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .seekInput(timeStamp)
          .outputOptions('-vframes 1')
          .output(thumbnailPath)
          .on('end', () => {
            resolve(`file://${thumbnailPath}`);
          })
          .on('error', (err: any) => {
            reject(err);
          })
          .run();
      });
    } catch (error) {
      console.error('Failed to extract thumbnail:', error);
      throw error;
    }
  });

  ipcMain.handle('process-video', async (_, options: any) => {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegPath = isDev 
        ? require('ffmpeg-static') 
        : join(process.resourcesPath, 'ffmpeg/ffmpeg.exe');
      
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      const { 
        inputPath, 
        outputPath, 
        codec = 'libx264', 
        resolution, 
        bitrate, 
        fps,
        audioCodec = 'aac',
        audioBitrate = '128k',
        preset = 'medium',
        crf = 23
      } = options;
      
      let command = ffmpeg(inputPath)
        .videoCodec(codec)
        .audioCodec(audioCodec)
        .audioBitrate(audioBitrate)
        .outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`
        ]);
      
      if (resolution) {
        command = command.size(resolution);
      }
      
      if (bitrate) {
        command = command.videoBitrate(bitrate);
      }
      
      if (fps) {
        command = command.fps(fps);
      }
      
      return new Promise((resolve, reject) => {
        command
          .output(outputPath)
          .on('start', (commandLine: string) => {
            console.log('Spawned FFmpeg with command: ' + commandLine);
            mainWindow?.webContents.send('video-processing-started', { inputPath, outputPath });
          })
          .on('progress', (progress: any) => {
            mainWindow?.webContents.send('video-processing-progress', {
              inputPath,
              outputPath,
              progress: progress.percent || 0,
              timemark: progress.timemark,
              currentFps: progress.currentFps,
              targetSize: progress.targetSize,
              currentKbps: progress.currentKbps
            });
          })
          .on('end', () => {
            console.log('Video processing finished');
            mainWindow?.webContents.send('video-processing-complete', { inputPath, outputPath });
            resolve({ success: true, outputPath });
          })
          .on('error', (err: any) => {
            console.error('Video processing error:', err);
            mainWindow?.webContents.send('video-processing-error', { 
              inputPath, 
              outputPath, 
              error: err.message 
            });
            reject(err);
          })
          .run();
      });
    } catch (error) {
      console.error('Failed to process video:', error);
      throw error;
    }
  });

  // Enhanced video processing with job management
  ipcMain.handle('start-video-processing', async (_, options: any) => {
    const { jobId, inputPath, outputPath, config } = options;
    
    try {
      const command = ffmpeg(inputPath);
      
      // Apply configuration
      if (config.format) {
        command.format(config.format);
      }
      
      if (config.codec) {
        command.videoCodec(config.codec);
      }
      
      if (config.audioCodec) {
        command.audioCodec(config.audioCodec);
      }
      
      if (config.resolution && config.resolution !== 'original') {
        command.size(config.resolution);
      }
      
      if (config.fps) {
        command.fps(config.fps);
      }
      
      if (config.bitrate) {
        command.videoBitrate(`${config.bitrate}k`);
      }
      
      if (config.audioBitrate) {
        command.audioBitrate(`${config.audioBitrate}k`);
      }
      
      // Hardware acceleration
      if (config.hardwareAcceleration?.enabled) {
        const hwAccel = detectHardwareAcceleration();
        if (hwAccel) {
          command.inputOptions([`-hwaccel ${hwAccel}`]);
        }
      }
      
      // Quality settings
      if (config.preset) {
        command.outputOptions([`-preset ${config.preset}`]);
      }
      
      if (config.quality && config.quality !== 'custom') {
        const crf = getQualityCRF(config.quality);
        command.outputOptions([`-crf ${crf}`]);
      }
      
      // Store the command for cancellation
      activeProcessingJobs.set(jobId, command);
      
      return new Promise((resolve, reject) => {
        command
          .output(outputPath)
          .on('start', (commandLine: string) => {
            console.log(`Started job ${jobId}:`, commandLine);
            mainWindow?.webContents.send('processing-job-started', { jobId, inputPath, outputPath });
          })
          .on('progress', (progress: any) => {
            const progressData = {
              jobId,
              inputPath,
              outputPath,
              progress: Math.round(progress.percent || 0),
              timemark: progress.timemark,
              currentFps: progress.currentFps,
              targetSize: progress.targetSize,
              currentKbps: progress.currentKbps
            };
            mainWindow?.webContents.send('processing-job-progress', progressData);
          })
          .on('end', () => {
            console.log(`Job ${jobId} completed`);
            activeProcessingJobs.delete(jobId);
            mainWindow?.webContents.send('processing-job-complete', { jobId, outputPath });
            resolve({ success: true, outputPath });
          })
          .on('error', (err: any) => {
            console.error(`Job ${jobId} error:`, err);
            activeProcessingJobs.delete(jobId);
            mainWindow?.webContents.send('processing-job-error', { jobId, error: err.message });
            reject({ success: false, error: err.message });
          })
          .run();
      });
    } catch (error) {
      console.error(`Failed to start job ${jobId}:`, error);
      throw error;
    }
  });
  
  ipcMain.handle('stop-video-processing', async (_, jobId: string) => {
    const command = activeProcessingJobs.get(jobId);
    if (command) {
      try {
        command.kill('SIGKILL');
        activeProcessingJobs.delete(jobId);
        mainWindow?.webContents.send('processing-job-cancelled', { jobId });
        return { success: true };
      } catch (error) {
        console.error(`Failed to stop job ${jobId}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
    return { success: false, error: 'Job not found' };
  });
  
  // Batch thumbnail generation
  ipcMain.handle('extract-thumbnails-batch', async (_, filePaths: string[]) => {
    const thumbnails: Record<string, string> = {};
    const thumbnailDir = join(userDataPath, 'thumbnails');
    
    if (!existsSync(thumbnailDir)) {
      mkdirSync(thumbnailDir, { recursive: true });
    }
    
    for (const filePath of filePaths) {
      try {
        const thumbnailPath = join(thumbnailDir, `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(filePath)
            .seekInput(5)
            .outputOptions('-vframes 1')
            .output(thumbnailPath)
            .on('end', () => {
              thumbnails[filePath] = `file://${thumbnailPath}`;
              resolve(thumbnailPath);
            })
            .on('error', (err: any) => {
              console.error(`Thumbnail generation failed for ${filePath}:`, err);
              reject(err);
            })
            .run();
        });
      } catch (error) {
        console.error(`Failed to generate thumbnail for ${filePath}:`, error);
        thumbnails[filePath] = '';
      }
    }
    
    return thumbnails;
  });
  
  // Video validation
  ipcMain.handle('validate-video-file', async (_, filePath: string) => {
    try {
      const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });
      
      const metadataTyped = metadata as any;
      return {
        valid: true,
        metadata: metadataTyped,
        hasVideo: metadataTyped.streams?.some((s: any) => s.codec_type === 'video') || false,
        hasAudio: metadataTyped.streams?.some((s: any) => s.codec_type === 'audio') || false
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  });
}

// Helper functions for video processing
function detectHardwareAcceleration(): string | null {
  // Simple hardware acceleration detection
  // In production, this should check for actual hardware capabilities
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows: prefer NVENC, then Quick Sync, then software
    return 'auto'; // FFmpeg will auto-detect
  } else if (platform === 'darwin') {
    // macOS: VideoToolbox
    return 'videotoolbox';
  } else {
    // Linux: VAAPI or software
    return 'auto';
  }
}

function getQualityCRF(quality: string): number {
  const crfMap: Record<string, number> = {
    low: 28,
    medium: 23,
    high: 18
  };
  return crfMap[quality] || 23;
}

// App event handlers
app.whenReady().then(() => {
  createMainWindow();
  createMenu();
  setupIPC();
  
  // Start AI backend
  if (!isDev) {
    setTimeout(startAIBackend, 2000);
  }

  // Auto-updater setup
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  stopAIBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  stopAIBackend();
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available. It will be downloaded in the background.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. The application will restart to apply the update.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// Handle deep links (for future features)
app.setAsDefaultProtocolClient('ai-video-converter');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

export { mainWindow };