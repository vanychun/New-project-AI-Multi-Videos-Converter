import React, { useState, useEffect, useCallback } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { MainLayout } from './components/layouts/MainLayout';
import { HeaderBarSimple } from './components/bridges/HeaderBarSimple';
import { BatchProgressIndicator, BatchOperation } from './components/common/BatchProgressIndicator';
import { VideoImportFlow } from './components/VideoImport/VideoImportFlow';
import { TestBackendIntegration } from './components/TestBackendIntegration';
import { VideoImportTest } from './components/VideoImportTest';
import { VideoTrimmingTest } from './components/VideoTrimmingTest';
import { useVideoManagement } from './hooks/useVideoManagement';
import { VideoFileEnhanced, SearchQuery, ViewSettings } from './types/video-enhanced.types';
import { ProjectManagerService } from './services/ProjectManagerService';
import './styles/globals.css';

const AppContent: React.FC = () => {
  const {
    videos,
    selectedVideoIds,
    operations,
    isLoading,
    error,
    importVideos,
    selectVideo,
    selectMultipleVideos,
    removeVideos,
    updateVideo,
    searchVideos,
    processVideos,
    cancelOperation,
    pauseOperation,
    resumeOperation,
    retryOperation,
    dismissOperation,
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

  const [showImportFlow, setShowImportFlow] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  const [showImportTest, setShowImportTest] = useState(false);
  const [showTrimmingTest, setShowTrimmingTest] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentProject, setCurrentProject] = useState<string | null>(null);

  const projectManager = ProjectManagerService.getInstance();

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-save project
  useEffect(() => {
    if (currentProject && videos.length > 0) {
      const saveProject = async () => {
        try {
          await projectManager.saveProject({
            id: currentProject,
            name: 'Current Project',
            videos,
            totalSize: videos.reduce((sum, v) => sum + (v.metadata?.size || 0), 0),
            totalDuration: videos.reduce((sum, v) => sum + (v.metadata?.duration || 0), 0),
            defaultSettings: {
              outputFormat: 'mp4',
              quality: 'high'
            },
            exportSettings: {
              outputDirectory: './output',
              fileNaming: 'original',
              overwriteExisting: false,
              createSubfolders: true,
              preserveStructure: false
            },
            tags: [],
            categories: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            stats: {
              totalVideos: videos.length,
              completedVideos: videos.filter(v => v.status === 'completed').length,
              failedVideos: videos.filter(v => v.status === 'error').length,
              totalProcessingTime: 0,
              averageFileSize: videos.reduce((sum, v) => sum + (v.metadata?.size || 0), 0) / videos.length,
              mostCommonFormat: 'mp4',
              qualityDistribution: {}
            },
            version: 1,
            autoSave: true
          }, { autoSave: true });
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      };

      const debounceTimer = setTimeout(saveProject, 5000);
      return () => clearTimeout(debounceTimer);
    }
  }, [videos, currentProject]);

  // Initialize project
  useEffect(() => {
    if (!currentProject) {
      setCurrentProject(`project-${Date.now()}`);
    }
  }, []);

  const handleSearchChange = useCallback((query: SearchQuery) => {
    setSearchQuery(query);
    searchVideos(query);
  }, [searchVideos]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery({
      text: '',
      filters: {},
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    searchVideos({ text: '', filters: {}, sortBy: 'createdAt', sortOrder: 'desc' });
  }, [searchVideos]);

  const handleVideoSelect = useCallback((videoId: string, multiSelect: boolean) => {
    if (multiSelect) {
      selectMultipleVideos([videoId]);
    } else {
      selectVideo(videoId);
    }
  }, [selectVideo, selectMultipleVideos]);

  const handleVideoDoubleClick = useCallback((video: VideoFileEnhanced) => {
    // Preview video
    console.log('Preview video:', video.name);
  }, []);

  const handleVideoContextMenu = useCallback((event: React.MouseEvent, video: VideoFileEnhanced) => {
    event.preventDefault();
    // Show context menu
    console.log('Context menu for:', video.name);
  }, []);

  const handleVideoPreview = useCallback((video: VideoFileEnhanced) => {
    console.log('Preview:', video.name);
  }, []);

  const handleVideoRemove = useCallback((video: VideoFileEnhanced) => {
    if (window.confirm(`Remove ${video.name}?`)) {
      removeVideos([video.id]);
    }
  }, [removeVideos]);

  const handleVideoEdit = useCallback((video: VideoFileEnhanced) => {
    console.log('Edit:', video.name);
  }, []);

  const handleProcessSelected = useCallback(() => {
    if (selectedVideoIds.length > 0) {
      processVideos(selectedVideoIds, {
        outputFormat: 'mp4',
        quality: 'high'
      });
    }
  }, [selectedVideoIds, processVideos]);

  const handleImportComplete = useCallback((importedVideos: VideoFileEnhanced[]) => {
    setShowImportFlow(false);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + O: Open files
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setShowImportFlow(true);
      }
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectMultipleVideos(videos.map(v => v.id));
      }
      // Delete: Remove selected
      if (e.key === 'Delete' && selectedVideoIds.length > 0) {
        e.preventDefault();
        if (window.confirm(`Remove ${selectedVideoIds.length} video(s)?`)) {
          removeVideos(selectedVideoIds);
        }
      }
      // Escape: Clear selection
      if (e.key === 'Escape') {
        selectMultipleVideos([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videos, selectedVideoIds, selectMultipleVideos, removeVideos]);

  return (
    <div className="app-container" data-theme={theme}>
      <HeaderBarSimple
        projectName={currentProject || 'Untitled Project'}
        videoCount={videos.length}
        selectedCount={selectedVideoIds.length}
        onImport={() => setShowImportFlow(true)}
        onProcess={handleProcessSelected}
        onToggleTheme={toggleTheme}
        theme={theme}
        hasSelection={selectedVideoIds.length > 0}
      />

      {/* Test Mode Toggle Buttons */}
      <div style={{ 
        position: 'fixed', 
        top: '80px', 
        right: '20px', 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            setShowTestMode(!showTestMode);
            setShowImportTest(false);
            setShowTrimmingTest(false);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: showTestMode ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {showTestMode ? '🎬 Exit Backend Test' : '🧪 Test Backend'}
        </button>
        
        <button
          onClick={() => {
            setShowImportTest(!showImportTest);
            setShowTestMode(false);
            setShowTrimmingTest(false);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: showImportTest ? '#ef4444' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {showImportTest ? '🎬 Exit Import Test' : '🎥 Test Import'}
        </button>
        
        <button
          onClick={() => {
            setShowTrimmingTest(!showTrimmingTest);
            setShowTestMode(false);
            setShowImportTest(false);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: showTrimmingTest ? '#ef4444' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {showTrimmingTest ? '🎬 Exit Trim Test' : '✂️ Test Trimming'}
        </button>
      </div>

      {showTestMode ? (
        <TestBackendIntegration />
      ) : showImportTest ? (
        <VideoImportTest />
      ) : showTrimmingTest ? (
        <VideoTrimmingTest />
      ) : (
        <MainLayout
          videos={videos}
          selectedVideoIds={selectedVideoIds}
          searchQuery={searchQuery}
          viewSettings={viewSettings}
          loading={isLoading}
          error={error}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onViewSettingsChange={setViewSettings}
          onVideoSelect={handleVideoSelect}
          onVideoDoubleClick={handleVideoDoubleClick}
          onVideoContextMenu={handleVideoContextMenu}
          onVideoPreview={handleVideoPreview}
          onVideoRemove={handleVideoRemove}
          onVideoEdit={handleVideoEdit}
          onClearError={clearError}
        />
      )}

      {showImportFlow && (
        <VideoImportFlow
          onImport={importVideos}
          onComplete={handleImportComplete}
          onCancel={() => setShowImportFlow(false)}
        />
      )}

      <BatchProgressIndicator
        operations={operations}
        onCancel={cancelOperation}
        onPause={pauseOperation}
        onResume={resumeOperation}
        onRetry={retryOperation}
        onDismiss={dismissOperation}
        position="bottom-right"
        maxVisible={3}
        showDetails={true}
      />
    </div>
  );
};

export const AppIntegrated: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};