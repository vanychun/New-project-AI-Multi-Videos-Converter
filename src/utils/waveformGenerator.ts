export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

export interface WaveformOptions {
  width: number;
  height: number;
  barCount?: number;
  barGap?: number;
  amplitudeScale?: number;
}

/**
 * Generate mock waveform data for visualization
 * In a real implementation, this would analyze audio from the video file
 */
export function generateMockWaveform(
  duration: number, 
  options: WaveformOptions
): WaveformData {
  const barCount = options.barCount || Math.floor(options.width / 3);
  const peaks: number[] = [];
  
  for (let i = 0; i < barCount; i++) {
    const progress = i / barCount;
    const time = progress * duration;
    
    // Generate realistic-looking waveform with multiple frequency components
    const lowFreq = Math.sin(time * Math.PI * 0.5) * 0.3;
    const midFreq = Math.sin(time * Math.PI * 2) * 0.5;
    const highFreq = Math.sin(time * Math.PI * 8) * 0.2;
    const noise = (Math.random() - 0.5) * 0.1;
    
    const amplitude = Math.abs(lowFreq + midFreq + highFreq + noise);
    const scaledAmplitude = Math.min(1, amplitude * (options.amplitudeScale || 1));
    
    peaks.push(scaledAmplitude);
  }
  
  return {
    peaks,
    duration,
    sampleRate: barCount / duration
  };
}

/**
 * Generate waveform bars for rendering
 */
export function generateWaveformBars(
  waveformData: WaveformData,
  options: WaveformOptions
): Array<{ height: number; opacity: number }> {
  const { peaks } = waveformData;
  const { height } = options;
  
  return peaks.map(peak => ({
    height: Math.max(2, peak * height),
    opacity: Math.max(0.3, peak)
  }));
}

/**
 * Get waveform color based on video status and selection
 */
export function getWaveformColor(
  isSelected: boolean,
  videoStatus: string,
  theme: 'light' | 'dark' = 'dark'
): string {
  if (isSelected) {
    return theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
  }
  
  switch (videoStatus) {
    case 'processing':
      return '#f59e0b'; // warning color
    case 'completed':
      return '#10b981'; // success color
    case 'error':
      return '#ef4444'; // error color
    default:
      return theme === 'dark' ? '#6b7280' : '#9ca3af'; // muted color
  }
}

/**
 * Analyze audio from video file (stub for future implementation)
 */
export async function analyzeVideoAudio(
  _videoPath: string
): Promise<WaveformData> {
  // This would use Web Audio API or FFmpeg to analyze actual audio
  // For now, return mock data
  return generateMockWaveform(60, { width: 300, height: 32 });
}

/**
 * Cache for waveform data to avoid regenerating
 */
class WaveformCache {
  private cache = new Map<string, WaveformData>();
  
  get(key: string): WaveformData | undefined {
    return this.cache.get(key);
  }
  
  set(key: string, data: WaveformData): void {
    this.cache.set(key, data);
    
    // Simple LRU: remove oldest entries if cache gets too large
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const waveformCache = new WaveformCache();