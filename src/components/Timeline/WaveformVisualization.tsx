import React, { useEffect, useRef, useState } from 'react';
import { Video } from '../../types/video.types';

interface WaveformVisualizationProps {
  video: Video;
  startTime: number;
  endTime: number;
  pixelsPerSecond: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export const WaveformVisualization: React.FC<WaveformVisualizationProps> = ({
  video,
  startTime,
  endTime,
  pixelsPerSecond,
  height = 40,
  color = '#4ade80',
  backgroundColor = 'rgba(255, 255, 255, 0.1)'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const duration = endTime - startTime;
  const width = duration * pixelsPerSecond;

  // Generate or fetch waveform data
  useEffect(() => {
    if (!video.metadata?.hasAudio) return;

    const generateWaveform = async () => {
      setIsLoading(true);
      
      try {
        // Check if we can use the browser's Web Audio API
        if (typeof window !== 'undefined' && window.AudioContext) {
          await generateWebAudioWaveform();
        } else {
          // Fallback to mock data
          generateMockWaveform();
        }
      } catch (error) {
        console.warn('Failed to generate waveform, using mock data:', error);
        generateMockWaveform();
      } finally {
        setIsLoading(false);
      }
    };

    generateWaveform();
  }, [video.path, startTime, endTime]);

  const generateWebAudioWaveform = async () => {
    if (!video.path) return;

    try {
      // This would work with actual audio files
      // For now, we'll use mock data since we don't have real audio processing
      generateMockWaveform();
    } catch (error) {
      console.error('Web Audio waveform generation failed:', error);
      generateMockWaveform();
    }
  };

  const generateMockWaveform = () => {
    // Generate realistic-looking waveform data
    const sampleCount = Math.floor(duration * 44100 / 512); // ~86 samples per second
    const samples: number[] = [];
    
    for (let i = 0; i < sampleCount; i++) {
      const time = (i / sampleCount) * duration;
      
      // Create realistic audio patterns
      let amplitude = 0;
      
      // Base rhythm (like drums)
      amplitude += Math.sin(time * Math.PI * 2) * 0.3;
      
      // Mid frequencies (like vocals/instruments)
      amplitude += Math.sin(time * Math.PI * 6.5) * 0.4 * Math.random();
      
      // High frequencies (like cymbals)
      amplitude += Math.sin(time * Math.PI * 20) * 0.2 * Math.random();
      
      // Occasional peaks
      if (Math.random() > 0.95) {
        amplitude *= 2;
      }
      
      // Normalize and add some randomness
      amplitude = Math.abs(amplitude) * (0.8 + Math.random() * 0.4);
      amplitude = Math.min(amplitude, 1);
      
      samples.push(amplitude);
    }
    
    setWaveformData(samples);
  };

  // Draw waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || !waveformData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const centerY = height / 2;
    const samplesPerPixel = waveformData.length / width;

    for (let x = 0; x < width; x++) {
      const sampleIndex = Math.floor(x * samplesPerPixel);
      const amplitude = waveformData[sampleIndex] || 0;
      
      const barHeight = amplitude * centerY * 0.8;
      
      // Draw symmetric bars (top and bottom)
      ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }

    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

  }, [waveformData, width, height, color, backgroundColor]);

  if (!video.metadata?.hasAudio) {
    return (
      <div 
        className="waveform-no-audio"
        style={{
          width,
          height,
          background: 'rgba(100, 100, 100, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '2px'
        }}
      >
        No Audio
      </div>
    );
  }

  return (
    <div className="waveform-container" style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '2px'
        }}
      />
      
      {isLoading && (
        <div
          className="waveform-loading"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white',
            borderRadius: '2px'
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
};

export default WaveformVisualization;