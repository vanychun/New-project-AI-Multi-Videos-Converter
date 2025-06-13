import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { addVideos, selectVideo, deselectVideo, selectAllVideos, deselectAllVideos } from '../store/slices/videoSlice';

export const DebugReduxState: React.FC = () => {
  const dispatch = useDispatch();
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    addLog(`State update: ${videos.length} videos, ${selectedVideos.length} selected`);
  }, [videos, selectedVideos]);

  const addTestVideo = () => {
    const testVideo = {
      id: `test-${Date.now()}`,
      name: `Test Video ${Date.now()}`,
      path: './test-videos/test.mp4',
      size: 1000000,
      duration: 30,
      format: 'mp4',
      resolution: '1080p',
      fps: 30,
      bitrate: 2000,
      status: 'ready' as const,
      createdAt: Date.now(),
      metadata: { hasAudio: true, codec: 'h264' }
    };
    
    console.log('🧪 Debug Panel: Adding test video to Redux', testVideo);
    dispatch(addVideos([testVideo]));
    addLog(`Added test video: ${testVideo.id}`);
    
    // Check state immediately after dispatch
    setTimeout(() => {
      const state = (window as any).getReduxState?.();
      console.log('🧪 Debug Panel: State after adding video:', state?.videos);
      addLog(`State check: ${state?.videos?.videos?.length || 0} videos in store`);
    }, 100);
  };

  const selectFirstVideo = () => {
    if (videos.length > 0) {
      dispatch(selectVideo(videos[0].id));
      addLog(`Selected video: ${videos[0].id}`);
    } else {
      addLog('No videos to select');
    }
  };

  const clearSelection = () => {
    dispatch(deselectAllVideos());
    addLog('Cleared all selections');
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: '#1e293b',
      border: '2px solid #7461ef',
      borderRadius: '8px',
      padding: '16px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <h3 style={{ margin: '0 0 12px 0', color: '#7461ef' }}>🔧 Redux Debug Panel</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>Current State:</strong><br/>
        Videos: {videos.length}<br/>
        Selected: {selectedVideos.length}<br/>
        IDs: [{selectedVideos.join(', ')}]
      </div>

      <div style={{ marginBottom: '12px' }}>
        <button onClick={addTestVideo} style={buttonStyle}>➕ Add Test Video</button>
        <button onClick={selectFirstVideo} style={buttonStyle}>✅ Select First</button>
        <button onClick={clearSelection} style={buttonStyle}>❌ Clear Selection</button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <button 
          onClick={() => {
            const state = (window as any).getReduxState?.();
            console.log('Full Redux State:', state);
            addLog('Logged state to console');
          }}
          style={buttonStyle}
        >
          📊 Log State
        </button>
        <button 
          onClick={() => {
            setLogs([]);
            addLog('Debug panel initialized');
          }}
          style={buttonStyle}
        >
          🗑️ Clear Logs
        </button>
      </div>

      <div style={{
        background: '#0f172a',
        padding: '8px',
        borderRadius: '4px',
        maxHeight: '150px',
        overflowY: 'auto',
        fontSize: '10px'
      }}>
        <strong>Activity Log:</strong><br/>
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
};

const buttonStyle = {
  background: '#7461ef',
  border: 'none',
  color: 'white',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  margin: '2px',
  cursor: 'pointer'
};

export default DebugReduxState;