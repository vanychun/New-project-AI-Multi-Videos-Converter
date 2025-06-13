import { ProjectEnhanced, VideoFileEnhanced, ExportSettings, ProjectStatistics } from '../types/video-enhanced.types';

export interface ProjectSaveOptions {
  includeVideoFiles?: boolean; // Whether to store actual file data
  compression?: boolean;
  backup?: boolean;
  autoSave?: boolean;
}

export interface ProjectLoadOptions {
  validateFiles?: boolean;
  loadThumbnails?: boolean;
  skipMissingFiles?: boolean;
}

export interface ProjectBackup {
  id: string;
  projectId: string;
  timestamp: Date;
  size: number;
  version: number;
  description?: string;
}

export interface ProjectManagerStatistics {
  totalProjects: number;
  totalSize: number; // in bytes
  lastBackup?: Date;
  storageUsed: number;
  storageLimit: number;
}

export class ProjectManagerService {
  private static instance: ProjectManagerService;
  private readonly DB_NAME = 'AI_Multi_Video_Converter';
  private readonly DB_VERSION = 3;
  private readonly PROJECTS_STORE = 'projects';
  private readonly BACKUPS_STORE = 'backups';
  private readonly SETTINGS_STORE = 'settings';
  
  private db: IDBDatabase | null = null;
  private readonly STORAGE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB limit
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private pendingAutoSaves = new Map<string, NodeJS.Timeout>();

  public static getInstance(): ProjectManagerService {
    if (!ProjectManagerService.instance) {
      ProjectManagerService.instance = new ProjectManagerService();
    }
    return ProjectManagerService.instance;
  }

  private constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.setupAutoSave();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create projects store
        if (!db.objectStoreNames.contains(this.PROJECTS_STORE)) {
          const projectsStore = db.createObjectStore(this.PROJECTS_STORE, { keyPath: 'id' });
          projectsStore.createIndex('name', 'name', { unique: false });
          projectsStore.createIndex('createdAt', 'createdAt', { unique: false });
          projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projectsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Create backups store
        if (!db.objectStoreNames.contains(this.BACKUPS_STORE)) {
          const backupsStore = db.createObjectStore(this.BACKUPS_STORE, { keyPath: 'id' });
          backupsStore.createIndex('projectId', 'projectId', { unique: false });
          backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
          db.createObjectStore(this.SETTINGS_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save project to IndexedDB
   */
  public async saveProject(
    project: ProjectEnhanced, 
    options: ProjectSaveOptions = {}
  ): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const defaultOptions: Required<ProjectSaveOptions> = {
      includeVideoFiles: false, // Don't store actual file data by default
      compression: true,
      backup: true,
      autoSave: false,
      ...options
    };

    try {
      // Create backup if requested
      if (defaultOptions.backup && !defaultOptions.autoSave) {
        await this.createBackup(project.id);
      }

      // Prepare project data for storage
      const projectData = await this.prepareProjectForStorage(project, defaultOptions);

      // Check storage limits
      await this.checkStorageSpace(projectData);

      // Save to database
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(this.PROJECTS_STORE);

      return new Promise((resolve, reject) => {
        const request = store.put(projectData);

        request.onsuccess = () => {
          // Update project timestamps
          project.updatedAt = new Date();
          if (defaultOptions.autoSave) {
            project.version += 1;
          }
          resolve();
        };

        request.onerror = () => {
          reject(new Error('Failed to save project'));
        };
      });

    } catch (error) {
      throw new Error(`Project save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load project from IndexedDB
   */
  public async loadProject(
    projectId: string, 
    options: ProjectLoadOptions = {}
  ): Promise<ProjectEnhanced> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const defaultOptions: Required<ProjectLoadOptions> = {
      validateFiles: true,
      loadThumbnails: true,
      skipMissingFiles: false,
      ...options
    };

    try {
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(this.PROJECTS_STORE);

      const projectData = await new Promise<any>((resolve, reject) => {
        const request = store.get(projectId);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error('Project not found'));
          }
        };

        request.onerror = () => {
          reject(new Error('Failed to load project'));
        };
      });

      // Restore project from storage format
      const project = await this.restoreProjectFromStorage(projectData, defaultOptions);

      // Update last opened timestamp
      project.lastOpenedAt = new Date();
      await this.saveProject(project, { autoSave: true });

      return project;

    } catch (error) {
      throw new Error(`Project load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete project and its backups
   */
  public async deleteProject(projectId: string): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const transaction = this.db!.transaction([this.PROJECTS_STORE, this.BACKUPS_STORE], 'readwrite');
      
      // Delete project
      const projectStore = transaction.objectStore(this.PROJECTS_STORE);
      await new Promise<void>((resolve, reject) => {
        const request = projectStore.delete(projectId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete project'));
      });

      // Delete associated backups
      const backupsStore = transaction.objectStore(this.BACKUPS_STORE);
      const backupsIndex = backupsStore.index('projectId');
      await new Promise<void>((resolve, reject) => {
        const request = backupsIndex.openCursor(IDBKeyRange.only(projectId));
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(new Error('Failed to delete project backups'));
      });

      // Clear auto-save for this project
      if (this.pendingAutoSaves.has(projectId)) {
        clearTimeout(this.pendingAutoSaves.get(projectId)!);
        this.pendingAutoSaves.delete(projectId);
      }

    } catch (error) {
      throw new Error(`Project deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all projects with filtering and sorting
   */
  public async listProjects(options: {
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastOpenedAt';
    sortOrder?: 'asc' | 'desc';
    filter?: {
      tags?: string[];
      createdAfter?: Date;
      createdBefore?: Date;
    };
    limit?: number;
  } = {}): Promise<ProjectEnhanced[]> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const defaultOptions = {
      sortBy: 'updatedAt' as const,
      sortOrder: 'desc' as const,
      limit: 100,
      ...options
    };

    try {
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(this.PROJECTS_STORE);

      const projects = await new Promise<ProjectEnhanced[]>((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error('Failed to load projects list'));
        };
      });

      // Apply filtering
      let filteredProjects = projects;
      if (defaultOptions.filter) {
        filteredProjects = this.filterProjects(projects, defaultOptions.filter);
      }

      // Apply sorting
      filteredProjects.sort((a, b) => {
        const aValue = a[defaultOptions.sortBy];
        const bValue = b[defaultOptions.sortBy];
        
        if (defaultOptions.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      // Apply limit
      return filteredProjects.slice(0, defaultOptions.limit);

    } catch (error) {
      throw new Error(`Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create project backup
   */
  public async createBackup(projectId: string, description?: string): Promise<string> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      // Load the project
      const project = await this.loadProject(projectId, { validateFiles: false });
      
      // Create backup data
      const backup: ProjectBackup = {
        id: this.generateId(),
        projectId,
        timestamp: new Date(),
        size: JSON.stringify(project).length,
        version: project.version,
        description
      };

      // Store backup
      const transaction = this.db!.transaction([this.BACKUPS_STORE], 'readwrite');
      const store = transaction.objectStore(this.BACKUPS_STORE);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({ ...backup, projectData: project });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to create backup'));
      });

      // Clean old backups (keep only last 10 per project)
      await this.cleanOldBackups(projectId);

      return backup.id;

    } catch (error) {
      throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore project from backup
   */
  public async restoreFromBackup(backupId: string): Promise<ProjectEnhanced> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const transaction = this.db!.transaction([this.BACKUPS_STORE], 'readonly');
      const store = transaction.objectStore(this.BACKUPS_STORE);

      const backupData = await new Promise<any>((resolve, reject) => {
        const request = store.get(backupId);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error('Backup not found'));
          }
        };

        request.onerror = () => {
          reject(new Error('Failed to load backup'));
        };
      });

      const project = backupData.projectData as ProjectEnhanced;
      
      // Generate new project ID to avoid conflicts
      project.id = this.generateId();
      project.name += ' (Restored)';
      project.updatedAt = new Date();
      project.version = 1;

      // Save restored project
      await this.saveProject(project);

      return project;

    } catch (error) {
      throw new Error(`Backup restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get project manager statistics
   */
  public async getStatistics(): Promise<ProjectManagerStatistics> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const projects = await this.listProjects({ limit: 1000 });
      const totalProjects = projects.length;
      const totalSize = projects.reduce((sum, p) => sum + p.totalSize, 0);

      // Get storage usage
      const storageUsed = await this.calculateStorageUsage();

      // Get last backup date
      const backups = await this.listBackups();
      const lastBackup = backups.length > 0 
        ? new Date(Math.max(...backups.map(b => b.timestamp.getTime())))
        : undefined;

      return {
        totalProjects,
        totalSize,
        lastBackup,
        storageUsed,
        storageLimit: this.STORAGE_LIMIT
      };

    } catch (error) {
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-save functionality
   */
  public enableAutoSave(project: ProjectEnhanced, intervalSeconds: number = 30): void {
    // Clear existing auto-save for this project
    this.disableAutoSave(project.id);

    // Set up new auto-save
    const autoSaveTimer = setInterval(async () => {
      try {
        await this.saveProject(project, { autoSave: true, backup: false });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, intervalSeconds * 1000);

    this.pendingAutoSaves.set(project.id, autoSaveTimer);
  }

  public disableAutoSave(projectId: string): void {
    const timer = this.pendingAutoSaves.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.pendingAutoSaves.delete(projectId);
    }
  }

  /**
   * Export project to JSON file
   */
  public async exportProject(projectId: string): Promise<Blob> {
    const project = await this.loadProject(projectId, { loadThumbnails: false });
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        ...project,
        videos: project.videos.map(video => ({
          ...video,
          file: undefined, // Remove actual file data
          thumbnail: undefined, // Remove thumbnail data for smaller file
          thumbnails: undefined
        }))
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Import project from JSON file
   */
  public async importProject(file: File): Promise<ProjectEnhanced> {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.project) {
        throw new Error('Invalid project file format');
      }

      const project = importData.project as ProjectEnhanced;
      
      // Generate new ID to avoid conflicts
      project.id = this.generateId();
      project.name += ' (Imported)';
      project.updatedAt = new Date();
      project.version = 1;

      // Clear file references since actual files won't be available
      project.videos = project.videos.map(video => ({
        ...video,
        status: 'error' as const,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Original file not available after import',
          timestamp: new Date(),
          recoverable: true,
          suggestions: ['Re-import the original video files']
        }
      }));

      // Save imported project
      await this.saveProject(project);

      return project;

    } catch (error) {
      throw new Error(`Project import failed: ${error instanceof Error ? error.message : 'Invalid file format'}`);
    }
  }

  /**
   * Private helper methods
   */
  private async prepareProjectForStorage(
    project: ProjectEnhanced, 
    options: Required<ProjectSaveOptions>
  ): Promise<any> {
    const projectData = { ...project };

    if (!options.includeVideoFiles) {
      // Remove file data to save space
      projectData.videos = projectData.videos.map(video => ({
        ...video,
        file: undefined as any, // Keep structure but remove file data
        thumbnail: options.compression ? undefined : video.thumbnail,
        thumbnails: options.compression ? undefined : video.thumbnails
      }));
    }

    return projectData;
  }

  private async restoreProjectFromStorage(
    projectData: any, 
    options: Required<ProjectLoadOptions>
  ): Promise<ProjectEnhanced> {
    const project = projectData as ProjectEnhanced;

    // Restore Date objects
    project.createdAt = new Date(project.createdAt);
    project.updatedAt = new Date(project.updatedAt);
    if (project.lastOpenedAt) {
      project.lastOpenedAt = new Date(project.lastOpenedAt);
    }

    // Restore video dates
    project.videos = project.videos.map(video => ({
      ...video,
      createdAt: new Date(video.createdAt),
      updatedAt: new Date(video.updatedAt),
      lastAccessedAt: video.lastAccessedAt ? new Date(video.lastAccessedAt) : undefined
    }));

    return project;
  }

  private filterProjects(projects: ProjectEnhanced[], filter: any): ProjectEnhanced[] {
    return projects.filter(project => {
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some((tag: string) => 
          project.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      if (filter.createdAfter && project.createdAt < filter.createdAfter) {
        return false;
      }

      if (filter.createdBefore && project.createdAt > filter.createdBefore) {
        return false;
      }

      return true;
    });
  }

  private async cleanOldBackups(projectId: string): Promise<void> {
    const backups = await this.listBackups(projectId);
    
    if (backups.length <= 10) return;

    // Sort by timestamp and keep only the 10 most recent
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const backupsToDelete = backups.slice(10);

    const transaction = this.db!.transaction([this.BACKUPS_STORE], 'readwrite');
    const store = transaction.objectStore(this.BACKUPS_STORE);

    for (const backup of backupsToDelete) {
      store.delete(backup.id);
    }
  }

  private async listBackups(projectId?: string): Promise<ProjectBackup[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([this.BACKUPS_STORE], 'readonly');
    const store = transaction.objectStore(this.BACKUPS_STORE);

    return new Promise((resolve, reject) => {
      const request = projectId 
        ? store.index('projectId').getAll(projectId)
        : store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result.map(item => ({
          id: item.id,
          projectId: item.projectId,
          timestamp: new Date(item.timestamp),
          size: item.size,
          version: item.version,
          description: item.description
        })));
      };

      request.onerror = () => reject(new Error('Failed to list backups'));
    });
  }

  private async calculateStorageUsage(): Promise<number> {
    if (!navigator.storage?.estimate) {
      return 0; // Fallback for unsupported browsers
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch {
      return 0;
    }
  }

  private async checkStorageSpace(projectData: any): Promise<void> {
    const dataSize = JSON.stringify(projectData).length;
    const currentUsage = await this.calculateStorageUsage();
    
    if (currentUsage + dataSize > this.STORAGE_LIMIT) {
      throw new Error('Storage limit exceeded. Please delete old projects or backups.');
    }
  }

  private setupAutoSave(): void {
    // Global auto-save setup can be implemented here
    // For now, per-project auto-save is handled separately
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Clear all auto-save timers
    for (const timer of this.pendingAutoSaves.values()) {
      clearInterval(timer);
    }
    this.pendingAutoSaves.clear();

    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}