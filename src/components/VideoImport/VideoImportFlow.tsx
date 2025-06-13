import React, { useState, useCallback, useRef } from 'react';
import { VideoFileEnhanced, ImportResult } from '../../types/video-enhanced.types';
import { FileValidationService } from '../../services/FileValidationService';
import './VideoImportFlow.css';

export interface VideoImportFlowProps {
  onImport: (files: File[]) => Promise<ImportResult>;
  onComplete: (videos: VideoFileEnhanced[]) => void;
  onCancel: () => void;
}

interface ImportState {
  isDragging: boolean;
  files: File[];
  importing: boolean;
  validationResults: Map<string, { valid: boolean; error?: string }>;
  importProgress: number;
  currentFile: string;
}

export const VideoImportFlow: React.FC<VideoImportFlowProps> = ({
  onImport,
  onComplete,
  onCancel
}) => {
  const [state, setState] = useState<ImportState>({
    isDragging: false,
    files: [],
    importing: false,
    validationResults: new Map(),
    importProgress: 0,
    currentFile: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileValidator = FileValidationService.getInstance();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: false }));

    const droppedFiles = Array.from(e.dataTransfer.files);
    validateAndAddFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    validateAndAddFiles(selectedFiles);
  }, []);

  const validateAndAddFiles = async (newFiles: File[]) => {
    const validationResults = new Map<string, { valid: boolean; error?: string }>();
    const validFiles: File[] = [];

    // Quick validation
    for (const file of newFiles) {
      const quickResult = fileValidator.quickValidate(file);
      if (quickResult.isValid) {
        validFiles.push(file);
        validationResults.set(file.name, { valid: true });
      } else {
        validationResults.set(file.name, { 
          valid: false, 
          error: quickResult.reason 
        });
      }
    }

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      validationResults: new Map([...prev.validationResults, ...validationResults])
    }));
  };

  const removeFile = useCallback((fileName: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.name !== fileName),
      validationResults: new Map(
        Array.from(prev.validationResults).filter(([name]) => name !== fileName)
      )
    }));
  }, []);

  const startImport = async () => {
    if (state.files.length === 0) return;

    setState(prev => ({ ...prev, importing: true, importProgress: 0 }));

    try {
      const result = await onImport(state.files);
      
      if (result.successful.length > 0) {
        onComplete(result.successful);
      }

      // Show results
      if (result.failed.length > 0) {
        console.error('Failed imports:', result.failed);
      }

    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setState(prev => ({ ...prev, importing: false }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = state.files.reduce((sum, file) => sum + file.size, 0);
  const supportedFormats = fileValidator.getSupportedFormats();

  return (
    <div className="import-flow-overlay">
      <div className="import-flow-modal">
        <div className="import-header">
          <h2>Import Videos</h2>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>

        <div className="import-content">
          {/* Drop Zone */}
          <div
            className={`drop-zone ${state.isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !state.importing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={supportedFormats.mimeTypes.join(',')}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div className="drop-zone-content">
              <div className="drop-icon">📁</div>
              <h3>Drag & Drop Videos Here</h3>
              <p>or click to browse</p>
              <div className="supported-formats">
                {supportedFormats.description}
              </div>
            </div>
          </div>

          {/* File List */}
          {state.files.length > 0 && (
            <div className="file-list">
              <div className="file-list-header">
                <h3>Selected Files ({state.files.length})</h3>
                <span className="total-size">Total: {formatFileSize(totalSize)}</span>
              </div>

              <div className="file-items">
                {state.files.map((file) => {
                  const validation = state.validationResults.get(file.name);
                  return (
                    <div key={file.name} className="file-item">
                      <div className="file-icon">📹</div>
                      <div className="file-info">
                        <div className="file-name">{file.name}</div>
                        <div className="file-meta">
                          <span className="file-size">{formatFileSize(file.size)}</span>
                          {validation && !validation.valid && (
                            <span className="file-error">{validation.error}</span>
                          )}
                        </div>
                      </div>
                      {!state.importing && (
                        <button
                          className="remove-file"
                          onClick={() => removeFile(file.name)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import Progress */}
          {state.importing && (
            <div className="import-progress">
              <div className="progress-info">
                <span>Importing videos...</span>
                {state.currentFile && (
                  <span className="current-file">{state.currentFile}</span>
                )}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${state.importProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="import-actions">
          <button
            className="cancel-button"
            onClick={onCancel}
            disabled={state.importing}
          >
            Cancel
          </button>
          <button
            className="import-button"
            onClick={startImport}
            disabled={state.files.length === 0 || state.importing}
          >
            {state.importing ? 'Importing...' : `Import ${state.files.length} Video${state.files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};