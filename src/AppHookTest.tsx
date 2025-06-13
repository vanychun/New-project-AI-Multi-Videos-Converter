import React from 'react';
import { useVideoManagement } from './hooks/useVideoManagement';

export const AppHookTest: React.FC = () => {
  try {
    const { videos, selectedVideoIds, isLoading, error } = useVideoManagement();
    
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#1a1a2e',
        color: 'white',
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1>🎬 Hook Test</h1>
        <p>Testing useVideoManagement hook...</p>
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#16213e',
          borderRadius: '8px'
        }}>
          <h3>Hook State:</h3>
          <p>Videos: {videos.length}</p>
          <p>Selected: {selectedVideoIds.length}</p>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Error: {error || 'None'}</p>
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#2d1b1b',
        color: '#ff6b6b',
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1>❌ Hook Error</h1>
        <p>Error in useVideoManagement hook:</p>
        <pre style={{
          backgroundColor: '#3d2525',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {err instanceof Error ? err.message : String(err)}
        </pre>
      </div>
    );
  }
};