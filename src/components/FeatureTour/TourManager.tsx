import React, { useState, useEffect } from 'react';
import { FeatureTour, TourDefinition } from './FeatureTour';
import { mcpIntegrationService } from '../../services/mcpIntegrationService';

export interface TourManagerProps {
  children: React.ReactNode;
  autoStartTours?: boolean;
  enableKeyboardShortcuts?: boolean;
}

export interface TourManagerState {
  activeTour: string | null;
  completedTours: string[];
  availableTours: TourDefinition[];
}

export const TourManager: React.FC<TourManagerProps> = ({
  children,
  autoStartTours = true,
  enableKeyboardShortcuts = true
}) => {
  const [state, setState] = useState<TourManagerState>({
    activeTour: null,
    completedTours: [],
    availableTours: []
  });

  useEffect(() => {
    // Load tour definitions
    loadTourDefinitions();
    
    // Load completed tours from localStorage
    const completed = localStorage.getItem('completed-tours');
    if (completed) {
      setState(prev => ({
        ...prev,
        completedTours: JSON.parse(completed)
      }));
    }

    // Auto-start first-time user tour
    if (autoStartTours) {
      checkForFirstTimeUser();
    }

    // Setup keyboard shortcuts
    if (enableKeyboardShortcuts) {
      setupKeyboardShortcuts();
    }
  }, [autoStartTours, enableKeyboardShortcuts]);

  const loadTourDefinitions = () => {
    const tours = getTourDefinitions();
    setState(prev => ({ ...prev, availableTours: tours }));
  };

  const checkForFirstTimeUser = () => {
    const hasSeenTour = localStorage.getItem('has-seen-welcome-tour');
    if (!hasSeenTour) {
      setTimeout(() => {
        startTour('welcome');
      }, 2000); // Start welcome tour after 2 seconds
    }
  };

  const setupKeyboardShortcuts = () => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + T to start tour menu
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        showTourMenu();
      }
      
      // F1 for help tour
      if (event.key === 'F1') {
        event.preventDefault();
        startTour('help');
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  };

  const startTour = (tourId: string) => {
    const tour = state.availableTours.find(t => t.id === tourId);
    if (!tour) {
      console.warn(`Tour not found: ${tourId}`);
      return;
    }

    setState(prev => ({ ...prev, activeTour: tourId }));
  };

  const completeTour = (tourId: string) => {
    setState(prev => {
      const newCompleted = [...prev.completedTours, tourId];
      localStorage.setItem('completed-tours', JSON.stringify(newCompleted));
      localStorage.setItem('has-seen-welcome-tour', 'true');
      
      return {
        ...prev,
        activeTour: null,
        completedTours: newCompleted
      };
    });
  };

  const skipTour = () => {
    setState(prev => ({ ...prev, activeTour: null }));
    localStorage.setItem('has-seen-welcome-tour', 'true');
  };

  const showTourMenu = () => {
    // Create and show tour selection modal
    const modal = document.createElement('div');
    modal.className = 'tour-menu-modal';
    modal.innerHTML = `
      <div class="tour-menu-backdrop"></div>
      <div class="tour-menu-content">
        <div class="tour-menu-header">
          <h2>Available Tours</h2>
          <button class="tour-menu-close">×</button>
        </div>
        <div class="tour-menu-list">
          ${state.availableTours.map(tour => `
            <div class="tour-menu-item ${state.completedTours.includes(tour.id) ? 'completed' : ''}" 
                 data-tour-id="${tour.id}">
              <div class="tour-menu-item-icon">
                ${state.completedTours.includes(tour.id) ? '✅' : '🎯'}
              </div>
              <div class="tour-menu-item-content">
                <h3>${tour.name}</h3>
                <p>${tour.description}</p>
              </div>
              <button class="tour-menu-item-button">
                ${state.completedTours.includes(tour.id) ? 'Replay' : 'Start'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .tour-menu-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .tour-menu-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }
      .tour-menu-content {
        position: relative;
        background: white;
        border-radius: 12px;
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      }
      .tour-menu-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .tour-menu-header h2 {
        margin: 0;
        color: #333;
      }
      .tour-menu-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      .tour-menu-close:hover {
        background: #f5f5f5;
      }
      .tour-menu-list {
        max-height: 400px;
        overflow-y: auto;
        padding: 10px;
      }
      .tour-menu-item {
        display: flex;
        align-items: center;
        padding: 15px;
        margin-bottom: 10px;
        border: 1px solid #eee;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tour-menu-item:hover {
        border-color: #007bff;
        background: #f8f9ff;
      }
      .tour-menu-item.completed {
        background: #f8f9fa;
      }
      .tour-menu-item-icon {
        font-size: 24px;
        margin-right: 15px;
      }
      .tour-menu-item-content {
        flex: 1;
      }
      .tour-menu-item-content h3 {
        margin: 0 0 5px 0;
        font-size: 1em;
        color: #333;
      }
      .tour-menu-item-content p {
        margin: 0;
        font-size: 0.85em;
        color: #666;
      }
      .tour-menu-item-button {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85em;
      }
      .tour-menu-item-button:hover {
        background: #0056b3;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Add event listeners
    const close = () => {
      document.body.removeChild(modal);
      document.head.removeChild(style);
    };

    modal.querySelector('.tour-menu-close')?.addEventListener('click', close);
    modal.querySelector('.tour-menu-backdrop')?.addEventListener('click', close);

    modal.querySelectorAll('.tour-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const tourId = item.getAttribute('data-tour-id');
        if (tourId) {
          startTour(tourId);
          close();
        }
      });
    });
  };

  const handleStepChange = async (stepIndex: number) => {
    if (!state.activeTour) return;
    
    // Capture screenshot for documentation if MCP service is available
    try {
      await mcpIntegrationService.captureCurrentState(
        `tour_${state.activeTour}_step_${stepIndex + 1}`
      );
    } catch (error) {
      console.log('Could not capture tour screenshot:', error);
    }
  };

  const currentTour = state.activeTour 
    ? state.availableTours.find(t => t.id === state.activeTour)
    : null;

  return (
    <>
      {children}
      {currentTour && (
        <FeatureTour
          tour={currentTour}
          isActive={!!state.activeTour}
          onComplete={() => completeTour(currentTour.id)}
          onSkip={skipTour}
          onStepChange={handleStepChange}
          mcpService={mcpIntegrationService}
        />
      )}
    </>
  );
};

// Tour definitions
export const getTourDefinitions = (): TourDefinition[] => [
  {
    id: 'welcome',
    name: 'Welcome to AI Multi Videos Converter',
    description: 'Get started with the basics of video conversion and AI enhancement',
    autoStart: true,
    showProgress: true,
    allowKeyboardNavigation: true,
    steps: [
      {
        id: 'welcome',
        title: '👋 Welcome!',
        content: 'Welcome to AI Multi Videos Converter! Let\'s take a quick tour to show you the key features.',
        selector: 'body',
        position: 'center',
        autoAdvance: 3000,
        screenshot: true
      },
      {
        id: 'video_library',
        title: '📚 Video Library',
        content: 'This is your video library where all imported videos are displayed. You can drag and drop videos here or use the add button.',
        selector: '[data-testid="video-library"], .video-library, .library-container',
        position: 'right',
        action: { type: 'highlight', delay: 500 }
      },
      {
        id: 'add_video',
        title: '➕ Add Videos',
        content: 'Click here to add new videos to your library. Supports multiple formats including MP4, AVI, MOV, and more.',
        selector: '[data-testid="add-video-button"], .file-input-button, .add-video',
        position: 'bottom',
        action: { type: 'click', delay: 1000 }
      },
      {
        id: 'timeline',
        title: '🎬 Timeline Editor',
        content: 'The timeline allows you to trim and edit your videos with precision. Click here to access timeline features.',
        selector: '[data-testid="timeline-tab"], .timeline-button',
        position: 'bottom',
        action: { type: 'hover', delay: 500 }
      },
      {
        id: 'settings',
        title: '⚙️ Settings & AI',
        content: 'Access powerful AI enhancement tools and export settings here. Configure upscaling, interpolation, and more.',
        selector: '[data-testid="settings-button"], .settings-button',
        position: 'left',
        action: { type: 'highlight', delay: 500 }
      },
      {
        id: 'processing',
        title: '🚀 Processing Queue',
        content: 'Monitor your video processing jobs here. You can pause, resume, and track progress of all your conversions.',
        selector: '[data-testid="processing-tab"], .processing-queue',
        position: 'bottom'
      },
      {
        id: 'complete',
        title: '🎉 You\'re Ready!',
        content: 'That\'s the basics! You can access this tour again by pressing F1 or Ctrl+Shift+T. Happy converting!',
        selector: 'body',
        position: 'center',
        autoAdvance: 4000
      }
    ]
  },
  {
    id: 'video_library',
    name: 'Video Library Deep Dive',
    description: 'Learn advanced video library features and organization',
    showProgress: true,
    allowKeyboardNavigation: true,
    steps: [
      {
        id: 'library_overview',
        title: '📚 Library Overview',
        content: 'The video library is the heart of the application. Let\'s explore its features in detail.',
        selector: '[data-testid="video-library"], .video-library',
        position: 'top'
      },
      {
        id: 'view_modes',
        title: '👁️ View Modes',
        content: 'Switch between grid and list views to organize your videos the way you prefer.',
        selector: '[data-testid="view-mode-controls"], .view-controls',
        position: 'bottom'
      },
      {
        id: 'search_filter',
        title: '🔍 Search & Filter',
        content: 'Use the search bar to quickly find specific videos, and apply filters to organize by type, date, or status.',
        selector: '[data-testid="search-filter"], .search-bar',
        position: 'bottom'
      },
      {
        id: 'bulk_actions',
        title: '📦 Bulk Actions',
        content: 'Select multiple videos to perform batch operations like processing or deletion.',
        selector: '[data-testid="bulk-actions"], .bulk-toolbar',
        position: 'top'
      }
    ]
  },
  {
    id: 'ai_enhancement',
    name: 'AI Enhancement Guide',
    description: 'Master the AI tools for video upscaling and enhancement',
    showProgress: true,
    allowKeyboardNavigation: true,
    steps: [
      {
        id: 'ai_intro',
        title: '🤖 AI Enhancement',
        content: 'Learn how to use cutting-edge AI models to enhance your videos.',
        selector: '[data-testid="ai-enhancement"], .ai-settings',
        position: 'center'
      },
      {
        id: 'upscaling',
        title: '📈 Upscaling',
        content: 'Use Real-ESRGAN to increase video resolution up to 8x while maintaining quality.',
        selector: '[data-testid="upscaling-settings"], .upscaling-controls',
        position: 'right'
      },
      {
        id: 'interpolation',
        title: '🎞️ Frame Interpolation',
        content: 'RIFE technology creates smooth slow-motion by generating intermediate frames.',
        selector: '[data-testid="interpolation-settings"], .interpolation-controls',
        position: 'right'
      },
      {
        id: 'face_enhancement',
        title: '👤 Face Enhancement',
        content: 'GFPGAN specifically improves facial features in your videos.',
        selector: '[data-testid="face-enhancement"], .face-enhancement-controls',
        position: 'right'
      }
    ]
  },
  {
    id: 'help',
    name: 'Quick Help',
    description: 'Get quick help and keyboard shortcuts',
    showProgress: false,
    allowKeyboardNavigation: true,
    steps: [
      {
        id: 'keyboard_shortcuts',
        title: '⌨️ Keyboard Shortcuts',
        content: 'Press Ctrl+Shift+T to open tour menu, F1 for help, Space to play/pause videos.',
        selector: 'body',
        position: 'center',
        autoAdvance: 5000
      }
    ]
  }
];

export default TourManager;