import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

// Set FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

interface VideoProcessingOptions {
  inputPath: string;
  outputPath: string;
  settings: {
    format?: string;
    codec?: string;
    quality?: string;
    resolution?: string;
    fps?: number;
    bitrate?: number;
    audioCodec?: string;
    audioBitrate?: number;
    hardwareAcceleration?: any;
    preset?: string;
    operation?: string;
    startTime?: number;
    endTime?: number;
    duration?: number;
    videoCodec?: string;
  };
}

export function registerFFmpegHandlers() {
  // Video processing handler
  ipcMain.handle('start-video-processing', async (event, options: VideoProcessingOptions) => {
    const { inputPath, outputPath, settings } = options;
    
    try {
      console.log('FFmpeg: Starting video processing:', { inputPath, outputPath, settings });
      
      // Ensure output directory exists
      const outputDir = outputPath.substring(0, outputPath.lastIndexOf(outputPath.includes('\\') ? '\\' : '/'));
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      return new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath);
        
        // Handle different operations
        if (settings.operation === 'trim') {
          // Trimming operation
          if (settings.startTime !== undefined) {
            command.setStartTime(settings.startTime);
          }
          if (settings.duration !== undefined) {
            command.setDuration(settings.duration);
          }
          
          // Use stream copy for faster trimming if codecs are 'copy'
          if (settings.videoCodec === 'copy') {
            command.videoCodec('copy');
          }
          if (settings.audioCodec === 'copy') {
            command.audioCodec('copy');
          }
        } else {
          // Regular conversion operation
          
          // Set video codec
          if (settings.codec) {
            const codecMap: Record<string, string> = {
              'h264': 'libx264',
              'h265': 'libx265',
              'av1': 'libaom-av1',
              'vp9': 'libvpx-vp9',
              'prores': 'prores_ks',
              'ffv1': 'ffv1'
            };
            command.videoCodec(codecMap[settings.codec] || settings.codec);
          }
          
          // Set video bitrate
          if (settings.bitrate) {
            command.videoBitrate(`${settings.bitrate}k`);
          }
          
          // Set resolution
          if (settings.resolution && settings.resolution !== 'original') {
            const resolutionMap: Record<string, string> = {
              '480p': '854x480',
              '720p': '1280x720',
              '1080p': '1920x1080',
              '1440p': '2560x1440',
              '2160p': '3840x2160',
              '1080x1920': '1080x1920'
            };
            const size = resolutionMap[settings.resolution] || settings.resolution;
            command.size(size);
          }
          
          // Set frame rate
          if (settings.fps) {
            command.fps(settings.fps);
          }
          
          // Set audio codec
          if (settings.audioCodec) {
            command.audioCodec(settings.audioCodec);
          }
          
          // Set audio bitrate
          if (settings.audioBitrate) {
            command.audioBitrate(`${settings.audioBitrate}k`);
          }
          
          // Set quality preset
          // Set encoding preset (for x264/x265)
          if (settings.codec === 'h264' || settings.codec === 'h265') {
            // Map quality to encoding preset
            const presetMap: { [key: string]: string } = {
              'low': 'ultrafast',
              'medium': 'medium',
              'high': 'slow',
              'highest': 'veryslow'
            };
            const encodingPreset = presetMap[settings.quality || 'medium'] || 'medium';
            command.outputOptions([`-preset ${encodingPreset}`]);
          }
          
          // Set output format
          if (settings.format) {
            command.format(settings.format);
          }
        }
        
        // Track progress
        let lastProgress = 0;
        command.on('progress', (progress: any) => {
          const currentProgress = Math.round(progress.percent || 0);
          if (currentProgress !== lastProgress) {
            lastProgress = currentProgress;
            event.sender.send('video-processing-progress', {
              progress: currentProgress,
              message: `Processing: ${currentProgress}%`
            });
          }
        });
        
        command.on('error', (err: Error) => {
          console.error('FFmpeg error:', err);
          reject({
            success: false,
            error: err.message
          });
        });
        
        command.on('end', () => {
          console.log('FFmpeg: Processing complete');
          resolve({
            success: true,
            outputPath: outputPath
          });
        });
        
        // Save to output path
        command.save(outputPath);
      });
    } catch (error) {
      console.error('FFmpeg: Processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });
  
  // Get video metadata
  ipcMain.handle('getVideoMetadata', async (event, filePath: string) => {
    try {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: Error, metadata: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
          const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
          
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            bitrate: metadata.format.bit_rate,
            format: metadata.format.format_name,
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps: videoStream ? eval(videoStream.r_frame_rate) : 0,
            codec: videoStream?.codec_name || '',
            hasVideo: !!videoStream,
            hasAudio: !!audioStream,
            audioCodec: audioStream?.codec_name || '',
            audioChannels: audioStream?.channels || 0,
            audioSampleRate: audioStream?.sample_rate || 0,
            aspectRatio: videoStream ? `${videoStream.width}:${videoStream.height}` : ''
          });
        });
      });
    } catch (error) {
      console.error('Error getting video metadata:', error);
      return null;
    }
  });
  
  // Extract thumbnail
  ipcMain.handle('extractThumbnail', async (event, filePath: string, timeStamp: number = 1) => {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const thumbnailPath = path.join(tempDir, `thumb_${Date.now()}.jpg`);
      
      return new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            timestamps: [timeStamp],
            filename: thumbnailPath,
            folder: tempDir,
            size: '320x240'
          })
          .on('end', () => {
            resolve(thumbnailPath);
          })
          .on('error', (err: Error) => {
            console.error('Thumbnail extraction error:', err);
            resolve(''); // Return empty string on error
          });
      });
    } catch (error) {
      console.error('Error extracting thumbnail:', error);
      return '';
    }
  });
  
  // Check FFmpeg availability
  ipcMain.handle('get-system-info', async () => {
    try {
      const platform = process.platform;
      const arch = process.arch;
      const cpus = os.cpus().length;
      const memory = Math.round(os.totalmem() / (1024 * 1024 * 1024));
      
      return {
        platform,
        arch,
        cpus,
        memory,
        gpu: 'Unknown', // GPU detection would require additional libraries
        version: app.getVersion(),
        ffmpegAvailable: !!ffmpegStatic
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  });
}