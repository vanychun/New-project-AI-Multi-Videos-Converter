import React, { useState } from 'react';
import { MainLayout } from './components/layouts/MainLayout';
import { HeaderBarSimple } from './components/bridges/HeaderBarSimple';
import { BatchProgressIndicator, BatchOperation } from './components/common/BatchProgressIndicator';
import { useVideoManagement } from './hooks/useVideoManagement';
import { SearchQuery, ViewSettings } from './types/video-enhanced.types';

export const AppBatchTest: React.FC = () => {
  const {
    videos,
    selectedVideoIds,
    operations,
    isLoading,
    error,
    selectVideo,
    clearError
  } = useVideoManagement();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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
      <div style={{ height: '100vh', backgroundColor: '#1a1a2e' }} data-theme={theme}>
        <HeaderBarSimple
          projectName="Batch Test Project"
          videoCount={videos.length}
          selectedCount={selectedVideoIds.length}
          onImport={() => console.log('Import clicked')}
          onProcess={() => console.log('Process clicked')}
          onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          theme={theme}
          hasSelection={selectedVideoIds.length > 0}
        />
        
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

        <BatchProgressIndicator
          operations={operations}
          onCancel={(id) => console.log('Cancel:', id)}
          onPause={(id) => console.log('Pause:', id)}
          onResume={(id) => console.log('Resume:', id)}
          onRetry={(id, failed) => console.log('Retry:', id, failed)}
          onDismiss={(id) => console.log('Dismiss:', id)}
          position="bottom-right"
          maxVisible={3}
          showDetails={true}
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
        <h1>❌ BatchProgressIndicator Error</h1>
        <p>Error with BatchProgressIndicator:</p>
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