import React, { useMemo } from 'react';

interface TimelineRulerProps {
  duration: number;
  pixelsPerSecond: number;
  currentTime: number;
  gridInterval: number;
  hoveredTime?: number | null;
  zoomLevel?: number;
  onTimeClick?: (time: number) => void;
}

// Utility function to format time
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TimelineRuler: React.FC<TimelineRulerProps> = ({
  duration,
  pixelsPerSecond,
  currentTime,
  gridInterval,
  hoveredTime: _hoveredTime,
  zoomLevel: _zoomLevel,
  onTimeClick: _onTimeClick,
}) => {
  const { majorMarkers, minorMarkers } = useMemo(() => {
    const major: Array<{ time: number; label: string; position: number }> = [];
    const minor: Array<{ time: number; position: number }> = [];
    
    // Determine marker intervals based on zoom level
    const getMarkerIntervals = () => {
      if (pixelsPerSecond >= 50) return { major: 1, minor: 0.2 }; // Very zoomed in
      if (pixelsPerSecond >= 20) return { major: 5, minor: 1 };   // Zoomed in
      if (pixelsPerSecond >= 10) return { major: 10, minor: 2 };  // Normal
      if (pixelsPerSecond >= 5) return { major: 30, minor: 5 };   // Zoomed out
      if (pixelsPerSecond >= 2) return { major: 60, minor: 10 };  // Very zoomed out
      return { major: 300, minor: 60 }; // Extremely zoomed out
    };
    
    const { major: majorInterval, minor: minorInterval } = getMarkerIntervals();
    
    // Generate major markers
    for (let time = 0; time <= duration; time += majorInterval) {
      const position = (time / duration) * (duration * pixelsPerSecond);
      major.push({
        time,
        label: formatTime(time),
        position,
      });
    }
    
    // Generate minor markers
    for (let time = 0; time <= duration; time += minorInterval) {
      if (time % majorInterval !== 0) { // Don't duplicate major markers
        const position = (time / duration) * (duration * pixelsPerSecond);
        minor.push({
          time,
          position,
        });
      }
    }
    
    return { majorMarkers: major, minorMarkers: minor };
  }, [duration, pixelsPerSecond]);
  
  const currentTimePosition = (currentTime / duration) * (duration * pixelsPerSecond);
  
  return (
    <div className="timeline-ruler" style={{ width: duration * pixelsPerSecond }}>
      {/* Background */}
      <div className="ruler-background" />
      
      {/* Grid lines */}
      <div className="ruler-grid">
        {/* Minor grid lines */}
        {minorMarkers.map((marker, index) => (
          <div
            key={`minor-${index}`}
            className="grid-line minor"
            style={{
              left: marker.position,
              height: '8px',
              top: '16px',
            }}
          />
        ))}
        
        {/* Major grid lines */}
        {majorMarkers.map((marker, index) => (
          <div
            key={`major-${index}`}
            className="grid-line major"
            style={{
              left: marker.position,
              height: '12px',
              top: '12px',
            }}
          />
        ))}
      </div>
      
      {/* Time labels */}
      <div className="ruler-labels">
        {majorMarkers.map((marker, index) => (
          <div
            key={`label-${index}`}
            className="time-label"
            style={{
              left: marker.position - 20, // Center the label
              width: '40px',
              textAlign: 'center',
            }}
          >
            {marker.label}
          </div>
        ))}
      </div>
      
      {/* Current time indicator */}
      <div
        className="current-time-indicator"
        style={{
          left: currentTimePosition,
          top: 0,
          height: '100%',
          width: '2px',
          backgroundColor: 'var(--selection)',
          position: 'absolute',
          zIndex: 10,
        }}
      >
        <div className="current-time-handle" />
      </div>
      
      {/* Snap grid overlay */}
      {gridInterval > 0 && (
        <div className="snap-grid">
          {Array.from({ length: Math.ceil(duration / gridInterval) + 1 }, (_, i) => {
            const time = i * gridInterval;
            const position = (time / duration) * (duration * pixelsPerSecond);
            
            return (
              <div
                key={`snap-${i}`}
                className="snap-line"
                style={{
                  left: position,
                  height: '100%',
                  width: '1px',
                  backgroundColor: 'rgba(0, 120, 212, 0.2)',
                  position: 'absolute',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimelineRuler;