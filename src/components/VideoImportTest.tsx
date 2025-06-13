import React, { useState } from 'react';
import { videoService } from '../services/videoService';
import { Video } from '../types/video.types';

interface ImportResult {
  status: 'success' | 'error';
  message: string;
  video?: Video;
  details?: any;
}

export const VideoImportTest: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Check if running in Electron
  const isElectronAvailable = !!(window.electronAPI?.selectFiles);

  const handleFileSelect = async () => {
    try {
      if (window.electronAPI?.selectFiles) {
        const filePaths = await window.electronAPI.selectFiles();
        if (filePaths && filePaths.length > 0) {
          await processFiles(filePaths);
        }
      }
    } catch (error) {
      console.error('File selection failed:', error);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processDroppedFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const processFiles = async (filePaths: string[]) => {
    setIsImporting(true);
    setResults([]);
    
    const newResults: ImportResult[] = [];
    
    for (const filePath of filePaths) {
      try {
        console.log('Processing file:', filePath);
        
        // Test validation
        const validation = await videoService.validateVideoFilePath(filePath);
        if (!validation.valid) {
          newResults.push({
            status: 'error',
            message: `Validation failed: ${validation.error}`,
            details: { filePath, validation }
          });
          continue;
        }
        
        // Test video creation
        const video = await videoService.createVideoFromPath(filePath);
        newResults.push({
          status: 'success',
          message: `Successfully imported: ${video.name}`,
          video,
          details: {
            size: video.size,
            duration: video.duration,
            resolution: video.resolution,
            format: video.format,
            hasMetadata: !!video.metadata,
            hasThumbnail: !!video.thumbnail
          }
        });
        
      } catch (error) {
        newResults.push({
          status: 'error',
          message: `Import failed: ${error.message}`,
          details: { filePath, error: error.message }
        });
      }
    }
    
    setResults(newResults);
    setIsImporting(false);
  };

  const processDroppedFiles = async (files: File[]) => {
    setIsImporting(true);
    setResults([]);
    
    const newResults: ImportResult[] = [];
    
    for (const file of files) {
      try {
        console.log('Processing dropped file:', file.name);
        
        // Test validation
        const validation = await videoService.validateVideoFile(file);
        if (!validation.isValid) {
          newResults.push({
            status: 'error',
            message: `Validation failed: ${validation.error}`,
            details: { fileName: file.name, validation }
          });
          continue;
        }
        
        // Test video creation
        const video = await videoService.createVideoFromFile(file);
        newResults.push({
          status: 'success',
          message: `Successfully imported: ${video.name}`,
          video,
          details: {
            size: video.size,
            duration: video.duration,
            resolution: video.resolution,
            format: video.format,
            hasMetadata: !!video.metadata,
            hasThumbnail: !!video.thumbnail
          }
        });
        
      } catch (error) {
        newResults.push({
          status: 'error',
          message: `Import failed: ${error.message}`,
          details: { fileName: file.name, error: error.message }
        });
      }
    }
    
    setResults(newResults);
    setIsImporting(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  const getStatusIcon = (status: 'success' | 'error') => {
    return status === 'success' ? '✅' : '❌';
  };

  const getStatusColor = (status: 'success' | 'error') => {
    return status === 'success' ? '#10b981' : '#ef4444';
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1000px',
      margin: '0 auto',
      backgroundColor: 'var(--surface-primary)',
      borderRadius: '12px',
      border: '1px solid var(--border)'
    }}>
      <h2 style={{ 
        color: 'var(--text-primary)', 
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        🎥 Video Import Test Suite
      </h2>

      {/* Environment Status */}
      <div style={{
        padding: '12px',
        marginBottom: '24px',
        borderRadius: '8px',
        textAlign: 'center',
        backgroundColor: isElectronAvailable ? 'var(--success-bg)' : 'var(--warning-bg)',
        border: `1px solid ${isElectronAvailable ? 'var(--success)' : 'var(--warning)'}`,
        color: 'var(--text-primary)'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          {isElectronAvailable ? '✅ Electron Environment Active' : '⚠️ Browser Mode - Limited Functionality'}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {isElectronAvailable 
            ? 'All video import features are available'
            : 'Drag & drop still works, but file dialog requires Electron'
          }
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragActive ? 'var(--text-accent)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: dragActive ? 'var(--text-accent)10' : 'var(--surface-secondary)',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={handleFileSelect}
      >
        <div style={{
          color: 'var(--text-primary)',
          fontSize: '18px',
          marginBottom: '8px'
        }}>
          {dragActive ? '📁 Drop files here' : '🎬 Drop video files or click to select'}
        </div>
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          Supports: MP4, AVI, MOV, MKV, WebM, WMV, FLV, M4V, 3GP
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <button
          onClick={handleFileSelect}
          disabled={isImporting}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--text-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isImporting ? 'not-allowed' : 'pointer',
            opacity: isImporting ? 0.6 : 1
          }}
        >
          {isImporting ? '⏳ Importing...' : '📂 Select Files'}
        </button>
        
        {results.length > 0 && (
          <button
            onClick={clearResults}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--surface-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Results
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{
            color: 'var(--text-primary)',
            marginBottom: '16px',
            fontSize: '18px'
          }}>
            Import Results ({results.length} files)
          </h3>
          
          {results.map((result, index) => (
            <div key={index} style={{
              padding: '16px',
              backgroundColor: 'var(--surface-secondary)',
              borderRadius: '8px',
              border: `1px solid ${getStatusColor(result.status)}20`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{ 
                fontSize: '24px',
                lineHeight: '1'
              }}>
                {getStatusIcon(result.status)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  {result.message}
                </div>
                
                {result.video && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <strong>Size:</strong> {videoService.formatFileSize(result.video.size)}
                    </div>
                    <div>
                      <strong>Duration:</strong> {videoService.formatDuration(result.video.duration)}
                    </div>
                    <div>
                      <strong>Resolution:</strong> {result.video.resolution}
                    </div>
                    <div>
                      <strong>Format:</strong> {result.video.format.toUpperCase()}
                    </div>
                    <div>
                      <strong>FPS:</strong> {result.video.fps}
                    </div>
                    <div>
                      <strong>Thumbnail:</strong> {result.video.thumbnail ? '✅' : '❌'}
                    </div>
                  </div>
                )}
                
                {result.details && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{
                      color: 'var(--text-accent)',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}>
                      Show Details
                    </summary>
                    <pre style={{
                      backgroundColor: 'var(--surface-tertiary)',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      overflow: 'auto',
                      maxHeight: '200px',
                      marginTop: '8px'
                    }}>
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              
              {result.video?.thumbnail && (
                <div style={{
                  width: '80px',
                  height: '45px',
                  backgroundColor: 'var(--surface-tertiary)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <img
                    src={result.video.thumbnail}
                    alt="Thumbnail"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'var(--info-bg)',
          borderRadius: '8px',
          border: '1px solid var(--info)',
          color: 'var(--text-primary)',
          fontSize: '14px'
        }}>
          <strong>Test Summary:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>✅ Successful imports: {results.filter(r => r.status === 'success').length}</li>
            <li>❌ Failed imports: {results.filter(r => r.status === 'error').length}</li>
            <li>🎯 Total files tested: {results.length}</li>
            <li>📊 Success rate: {results.length > 0 ? Math.round((results.filter(r => r.status === 'success').length / results.length) * 100) : 0}%</li>
          </ul>
        </div>
      )}
    </div>
  );
};