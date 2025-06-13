import React, { useState } from 'react';
import { MainLayout } from './components/layouts/MainLayout';
import { useVideoManagement } from './hooks/useVideoManagement';
import { SearchQuery, ViewSettings } from './types/video-enhanced.types';

export const AppMainLayoutTest: React.FC = () => {
  const {
    videos,
    selectedVideoIds,
    isLoading,
    error,
    selectVideo,
    searchVideos,
    clearError
  } = useVideoManagement();

  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    text: '',
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    layout: 'grid',
    gridSize: 'medium',
    showThumbnails: true,
    showMetadata: true,
    showProgress: true,
    itemsPerPage: 50
  });

  try {
    return (
      <div style={{ height: '100vh', backgroundColor: '#1a1a2e' }}>
        <div style={{
          padding: '10px',
          backgroundColor: '#16213e',
          color: 'white',
          borderBottom: '1px solid #333'
        }}>
          <h2>🧪 MainLayout Test</h2>
          <p>Testing MainLayout component...</p>
        </div>
        
        <MainLayout
          videos={videos}
          selectedVideoIds={selectedVideoIds}
          searchQuery={searchQuery}
          viewSettings={viewSettings}
          loading={isLoading}
          error={error}
          onSearchChange={setSearchQuery}
          onClearFilters={() => setSearchQuery({ text: '', filters: {}, sortBy: 'createdAt', sortOrder: 'desc' })}
          onViewSettingsChange={(settings) => setViewSettings(prev => ({ ...prev, ...settings }))}
          onVideoSelect={(videoId, multiSelect) => selectVideo(videoId)}
          onVideoDoubleClick={(video) => console.log('Double click:', video)}
          onVideoContextMenu={(event, video) => console.log('Context menu:', video)}
          onVideoPreview={(video) => console.log('Preview:', video)}
          onVideoRemove={(video) => console.log('Remove:', video)}
          onVideoEdit={(video) => console.log('Edit:', video)}
          onClearError={clearError}
        />
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
        <h1>❌ MainLayout Error</h1>
        <p>Error in MainLayout component:</p>
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