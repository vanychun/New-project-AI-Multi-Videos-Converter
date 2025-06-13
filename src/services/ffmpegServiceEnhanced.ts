import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

export interface FFmpegProgress {
  frame: number;
  fps: number;
  bitrate: string;
  totalSize: number;
  outTimeUs: number;
  outTime: string;
  dupFrames: number;
  dropFrames: number;
  speed: number;
  progress: number;
}

export interface ConversionSettings {
  outputFormat: string;
  videoCodec: string;
  audioCodec: string;
  quality: number;
  resolution?: { width: number; height: number };
  fps?: number;
  bitrate?: string;
  preset?: string;
  hardwareAcceleration?: boolean;
}

export class FFmpegServiceEnhanced extends EventEmitter {
  private ffmpegPath: string;
  private ffprobePath: string;
  private activeProcesses: Map<string, ChildProcess> = new Map();

  constructor() {
    super();
    this.ffmpegPath = this.getFfmpegPath();
    this.ffprobePath = this.getFfprobePath();
  }

  private getFfmpegPath(): string {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      return require('ffmpeg-static');
    } else {
      // Production path
      return path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
    }
  }

  private getFfprobePath(): string {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      return require('ffprobe-static').path;
    } else {
      // Production path
      return path.join(process.resourcesPath, 'bin', 'ffprobe.exe');
    }
  }

  async getVideoInfo(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const process = spawn(this.ffprobePath, args);
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        console.error('FFprobe stderr:', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve(this.parseVideoInfo(info));
          } catch (error) {
            reject(new Error(`Failed to parse FFprobe output: ${error}`));
          }
        } else {
          reject(new Error(`FFprobe exited with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseVideoInfo(info: any) {
    const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = info.streams.find((s: any) => s.codec_type === 'audio');
    
    return {
      duration: parseFloat(info.format.duration) || 0,
      size: parseInt(info.format.size) || 0,
      bitrate: parseInt(info.format.bit_rate) || 0,
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      fps: this.parseFPS(videoStream?.r_frame_rate),
      videoCodec: videoStream?.codec_name || 'unknown',
      audioCodec: audioStream?.codec_name || 'none',
      hasAudio: !!audioStream,
      format: info.format.format_name
    };
  }

  private parseFPS(frameRate: string): number {
    if (!frameRate) return 0;
    const [num, den] = frameRate.split('/').map(Number);
    return den ? num / den : num || 0;
  }

  async convertVideo(
    inputPath: string,
    outputPath: string,
    settings: ConversionSettings,
    jobId: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get input video info for progress calculation
        const inputInfo = await this.getVideoInfo(inputPath);
        const totalFrames = Math.ceil(inputInfo.duration * inputInfo.fps);

        // Build FFmpeg arguments
        const args = this.buildFFmpegArgs(inputPath, outputPath, settings);

        // Start FFmpeg process
        const process = spawn(this.ffmpegPath, args);
        this.activeProcesses.set(jobId, process);

        let progressData = '';

        process.stderr.on('data', (data) => {
          progressData += data.toString();
          
          // Parse progress information
          const progress = this.parseProgress(progressData, totalFrames);
          if (progress) {
            this.emit('progress', { jobId, progress });
          }
        });

        process.on('close', (code) => {
          this.activeProcesses.delete(jobId);
          
          if (code === 0) {
            this.emit('complete', { jobId, outputPath });
            resolve();
          } else {
            const error = new Error(`FFmpeg process exited with code ${code}`);
            this.emit('error', { jobId, error });
            reject(error);
          }
        });

        process.on('error', (error) => {
          this.activeProcesses.delete(jobId);
          this.emit('error', { jobId, error });
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private buildFFmpegArgs(
    inputPath: string,
    outputPath: string,
    settings: ConversionSettings
  ): string[] {
    const args: string[] = ['-y']; // Overwrite output file

    // Hardware acceleration
    if (settings.hardwareAcceleration) {
      args.push('-hwaccel', 'auto');
      // Try NVENC for NVIDIA cards
      if (settings.videoCodec === 'h264') {
        args.push('-c:v', 'h264_nvenc');
      } else if (settings.videoCodec === 'h265') {
        args.push('-c:v', 'hevc_nvenc');
      }
    }

    // Input file
    args.push('-i', inputPath);

    // Video codec
    if (!settings.hardwareAcceleration) {
      args.push('-c:v', this.getVideoCodec(settings.videoCodec));
    }

    // Video quality/bitrate
    if (settings.bitrate) {
      args.push('-b:v', settings.bitrate);
    } else {
      args.push('-crf', settings.quality.toString());
    }

    // Preset for x264/x265
    if (settings.preset) {
      args.push('-preset', settings.preset);
    }

    // Resolution
    if (settings.resolution) {
      args.push('-s', `${settings.resolution.width}x${settings.resolution.height}`);
    }

    // Frame rate
    if (settings.fps) {
      args.push('-r', settings.fps.toString());
    }

    // Audio codec
    args.push('-c:a', this.getAudioCodec(settings.audioCodec));

    // Progress reporting
    args.push('-progress', 'pipe:2');

    // Output file
    args.push(outputPath);

    return args;
  }

  private getVideoCodec(codec: string): string {
    const codecMap: { [key: string]: string } = {
      'h264': 'libx264',
      'h265': 'libx265',
      'vp9': 'libvpx-vp9',
      'av1': 'libaom-av1'
    };
    return codecMap[codec] || 'libx264';
  }

  private getAudioCodec(codec: string): string {
    const codecMap: { [key: string]: string } = {
      'aac': 'aac',
      'mp3': 'libmp3lame',
      'opus': 'libopus',
      'copy': 'copy'
    };
    return codecMap[codec] || 'aac';
  }

  private parseProgress(data: string, totalFrames: number): FFmpegProgress | null {
    const lines = data.split('\n');
    const progressInfo: any = {};

    for (const line of lines) {
      const match = line.match(/^(\w+)=(.+)$/);
      if (match) {
        const [, key, value] = match;
        progressInfo[key] = value;
      }
    }

    if (progressInfo.frame) {
      const currentFrame = parseInt(progressInfo.frame);
      const progress = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

      return {
        frame: currentFrame,
        fps: parseFloat(progressInfo.fps) || 0,
        bitrate: progressInfo.bitrate || '0',
        totalSize: parseInt(progressInfo.total_size) || 0,
        outTimeUs: parseInt(progressInfo.out_time_us) || 0,
        outTime: progressInfo.out_time || '00:00:00.000000',
        dupFrames: parseInt(progressInfo.dup_frames) || 0,
        dropFrames: parseInt(progressInfo.drop_frames) || 0,
        speed: parseFloat(progressInfo.speed) || 0,
        progress: Math.min(100, Math.max(0, progress))
      };
    }

    return null;
  }

  async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timestamp: number = 0,
    width: number = 320,
    height: number = 240
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', videoPath,
        '-ss', timestamp.toString(),
        '-vframes', '1',
        '-vf', `scale=${width}:${height}`,
        '-y',
        outputPath
      ];

      const process = spawn(this.ffmpegPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Thumbnail generation failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async extractFrames(
    videoPath: string,
    outputDir: string,
    startTime?: number,
    endTime?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['-i', videoPath];

      if (startTime !== undefined) {
        args.push('-ss', startTime.toString());
      }

      if (endTime !== undefined) {
        args.push('-t', (endTime - (startTime || 0)).toString());
      }

      args.push(
        '-vf', 'fps=1',
        '-q:v', '2',
        path.join(outputDir, 'frame_%04d.png')
      );

      const process = spawn(this.ffmpegPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Frame extraction failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  cancelJob(jobId: string): boolean {
    const process = this.activeProcesses.get(jobId);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(jobId);
      return true;
    }
    return false;
  }

  isJobActive(jobId: string): boolean {
    return this.activeProcesses.has(jobId);
  }

  getActiveJobs(): string[] {
    return Array.from(this.activeProcesses.keys());
  }
}

export const ffmpegServiceEnhanced = new FFmpegServiceEnhanced();