import '@testing-library/jest-dom';

// Mock process.resourcesPath for Electron
Object.defineProperty(process, 'resourcesPath', {
  value: '/mock/resources/path',
  writable: true,
});

// Mock NODE_ENV
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
});

// Mock window.electronAPI globally
const mockElectronAPI = {
  // Main API methods that videoService expects
  getVideoMetadata: jest.fn(),
  extractThumbnail: jest.fn(),
  extractThumbnailsBatch: jest.fn(),
  validateVideoFile: jest.fn(),
  
  dialog: {
    openFiles: jest.fn(),
    saveFile: jest.fn(),
    selectFolder: jest.fn(),
    selectOutputDirectory: jest.fn(),
  },
  video: {
    getMetadata: jest.fn(),
    generateThumbnail: jest.fn(),
    extractThumbnailsBatch: jest.fn(),
    validateVideoFile: jest.fn(),
    process: jest.fn(),
    startProcessing: jest.fn(),
    stopProcessing: jest.fn(),
  },
  ai: {
    processVideo: jest.fn(),
    getJobStatus: jest.fn(),
    cancelJob: jest.fn(),
    checkBackend: jest.fn(),
    restartBackend: jest.fn(),
  },
  system: {
    getInfo: jest.fn(),
    openInExplorer: jest.fn(),
    openFile: jest.fn(),
    revealFile: jest.fn(),
  },
  app: {
    minimize: jest.fn(),
    maximize: jest.fn(),
    close: jest.fn(),
    getInfo: jest.fn(),
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
    checkForUpdates: jest.fn(),
  },
  on: jest.fn(),
  off: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [0];
  
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return []; }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});