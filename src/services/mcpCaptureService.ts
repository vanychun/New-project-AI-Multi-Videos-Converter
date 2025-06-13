import { nanoid } from 'nanoid';

export interface ScreenshotOptions {
  name: string;
  selector?: string;
  width?: number;
  height?: number;
  delay?: number;
  fullPage?: boolean;
}

export interface CaptureResult {
  id: string;
  name: string;
  timestamp: number;
  path: string;
  success: boolean;
  error?: string;
}

export interface AppState {
  id: string;
  name: string;
  description: string;
  url: string;
  setupActions?: Array<{
    type: 'click' | 'fill' | 'wait' | 'evaluate';
    selector?: string;
    value?: string;
    script?: string;
    timeout?: number;
  }>;
}

export class MCPCaptureService {
  private baseUrl: string = 'http://localhost:3000';
  private screenshotDir: string = 'docs/screenshots';
  private captures: CaptureResult[] = [];

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  async captureAppState(state: AppState, options?: Partial<ScreenshotOptions>): Promise<CaptureResult> {
    const captureId = nanoid();
    const timestamp = Date.now();
    
    try {
      // Navigate to the app
      await this.navigateToApp(state.url || this.baseUrl);
      
      // Wait for app to load
      await this.waitForAppReady();
      
      // Setup the specific app state
      if (state.setupActions) {
        await this.executeSetupActions(state.setupActions);
      }
      
      // Wait for any animations or loading to complete
      if (options?.delay) {
        await this.wait(options.delay);
      }
      
      // Take the screenshot
      const screenshotName = `${state.id}_${timestamp}`;
      await this.takeScreenshot({
        name: screenshotName,
        selector: options?.selector,
        width: options?.width || 1920,
        height: options?.height || 1080,
        fullPage: options?.fullPage
      });
      
      const result: CaptureResult = {
        id: captureId,
        name: state.name,
        timestamp,
        path: `${this.screenshotDir}/${screenshotName}.png`,
        success: true
      };
      
      this.captures.push(result);
      return result;
      
    } catch (error) {
      const result: CaptureResult = {
        id: captureId,
        name: state.name,
        timestamp,
        path: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.captures.push(result);
      return result;
    }
  }

  async captureFeatureFlow(states: AppState[], options?: Partial<ScreenshotOptions>): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    for (const state of states) {
      const result = await this.captureAppState(state, options);
      results.push(result);
      
      // Small delay between captures
      await this.wait(1000);
    }
    
    return results;
  }

  async captureAllAppStates(): Promise<CaptureResult[]> {
    const appStates: AppState[] = [
      {
        id: 'empty_library',
        name: 'Empty Video Library',
        description: 'Initial state with no videos loaded',
        url: this.baseUrl
      },
      {
        id: 'with_videos',
        name: 'Library with Videos',
        description: 'Video library with sample videos loaded',
        url: this.baseUrl,
        setupActions: [
          { type: 'wait', timeout: 2000 },
          { 
            type: 'evaluate', 
            script: `
              // Simulate adding videos to the library
              if (window.store) {
                window.store.dispatch({
                  type: 'video/addVideos',
                  payload: [
                    { id: '1', name: 'sample1.mp4', duration: 120, thumbnail: '' },
                    { id: '2', name: 'sample2.mp4', duration: 180, thumbnail: '' }
                  ]
                });
              }
            `
          }
        ]
      },
      {
        id: 'timeline_view',
        name: 'Timeline Editing View',
        description: 'Timeline component with video loaded',
        url: this.baseUrl,
        setupActions: [
          { type: 'click', selector: '[data-testid="timeline-tab"]' },
          { type: 'wait', timeout: 1000 }
        ]
      },
      {
        id: 'settings_panel',
        name: 'Settings Panel Open',
        description: 'Settings panel with AI enhancement options',
        url: this.baseUrl,
        setupActions: [
          { type: 'click', selector: '[data-testid="settings-button"]' },
          { type: 'wait', timeout: 500 }
        ]
      },
      {
        id: 'processing_queue',
        name: 'Processing Queue Active',
        description: 'Processing queue with active jobs',
        url: this.baseUrl,
        setupActions: [
          { type: 'click', selector: '[data-testid="processing-tab"]' },
          { type: 'wait', timeout: 1000 }
        ]
      }
    ];

    return await this.captureFeatureFlow(appStates);
  }

  private async navigateToApp(url: string): Promise<void> {
    // This would use the MCP Puppeteer navigate function
    // For now, we'll simulate the call
    console.log(`Navigating to: ${url}`);
  }

  private async waitForAppReady(): Promise<void> {
    // Wait for React app to be ready
    await this.wait(3000);
  }

  private async executeSetupActions(actions: AppState['setupActions']): Promise<void> {
    if (!actions) return;
    
    for (const action of actions) {
      switch (action.type) {
        case 'click':
          if (action.selector) {
            console.log(`Clicking: ${action.selector}`);
            // MCP click would go here
          }
          break;
        case 'fill':
          if (action.selector && action.value) {
            console.log(`Filling ${action.selector} with: ${action.value}`);
            // MCP fill would go here
          }
          break;
        case 'wait':
          await this.wait(action.timeout || 1000);
          break;
        case 'evaluate':
          if (action.script) {
            console.log('Executing script:', action.script);
            // MCP evaluate would go here
          }
          break;
      }
    }
  }

  private async takeScreenshot(options: ScreenshotOptions): Promise<void> {
    console.log(`Taking screenshot: ${options.name}`);
    // MCP screenshot would go here
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCaptures(): CaptureResult[] {
    return [...this.captures];
  }

  getCaptureById(id: string): CaptureResult | undefined {
    return this.captures.find(capture => capture.id === id);
  }

  clearCaptures(): void {
    this.captures = [];
  }
}

export const mcpCaptureService = new MCPCaptureService();