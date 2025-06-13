import { MCPCaptureService, AppState, ScreenshotOptions, CaptureResult } from './mcpCaptureService';

declare global {
  interface Window {
    mcpPuppeteer?: {
      navigate: (url: string) => Promise<void>;
      screenshot: (options: { name: string; selector?: string; width?: number; height?: number }) => Promise<void>;
      click: (selector: string) => Promise<void>;
      fill: (selector: string, value: string) => Promise<void>;
      evaluate: (script: string) => Promise<any>;
      hover: (selector: string) => Promise<void>;
      select: (selector: string, value: string) => Promise<void>;
    };
  }
}

export class MCPIntegrationService extends MCPCaptureService {
  private isElectron: boolean = false;
  private mcpAvailable: boolean = false;

  constructor(baseUrl?: string) {
    super(baseUrl);
    this.checkEnvironment();
  }

  private checkEnvironment(): void {
    this.isElectron = typeof window !== 'undefined' && 
                     typeof window.process === 'object' && 
                     window.process.type === 'renderer';
    
    this.mcpAvailable = typeof window !== 'undefined' && 
                       typeof window.mcpPuppeteer === 'object';
    
    if (!this.mcpAvailable) {
      console.warn('MCP Puppeteer not available. Running in simulation mode.');
    }
  }

  async captureCurrentState(name: string, options?: Partial<ScreenshotOptions>): Promise<CaptureResult> {
    const timestamp = Date.now();
    const screenshotName = `${name}_${timestamp}`;
    
    try {
      if (this.mcpAvailable && window.mcpPuppeteer) {
        await window.mcpPuppeteer.screenshot({
          name: screenshotName,
          selector: options?.selector,
          width: options?.width || 1920,
          height: options?.height || 1080
        });
      } else {
        console.log(`[Simulation] Taking screenshot: ${screenshotName}`);
      }
      
      return {
        id: `capture_${timestamp}`,
        name,
        timestamp,
        path: `docs/screenshots/${screenshotName}.png`,
        success: true
      };
    } catch (error) {
      return {
        id: `capture_${timestamp}`,
        name,
        timestamp,
        path: '',
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed'
      };
    }
  }

  async navigateAndCapture(url: string, name: string): Promise<CaptureResult> {
    try {
      if (this.mcpAvailable && window.mcpPuppeteer) {
        await window.mcpPuppeteer.navigate(url);
        await this.wait(2000); // Wait for page load
        return await this.captureCurrentState(name);
      } else {
        console.log(`[Simulation] Navigate to ${url} and capture ${name}`);
        return await this.captureCurrentState(name);
      }
    } catch (error) {
      return {
        id: `nav_capture_${Date.now()}`,
        name,
        timestamp: Date.now(),
        path: '',
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
    }
  }

  async clickAndCapture(selector: string, captureName: string): Promise<CaptureResult> {
    try {
      if (this.mcpAvailable && window.mcpPuppeteer) {
        await window.mcpPuppeteer.click(selector);
        await this.wait(500); // Wait for UI update
        return await this.captureCurrentState(captureName);
      } else {
        console.log(`[Simulation] Click ${selector} and capture ${captureName}`);
        return await this.captureCurrentState(captureName);
      }
    } catch (error) {
      return {
        id: `click_capture_${Date.now()}`,
        name: captureName,
        timestamp: Date.now(),
        path: '',
        success: false,
        error: error instanceof Error ? error.message : 'Click and capture failed'
      };
    }
  }

  async fillAndCapture(selector: string, value: string, captureName: string): Promise<CaptureResult> {
    try {
      if (this.mcpAvailable && window.mcpPuppeteer) {
        await window.mcpPuppeteer.fill(selector, value);
        await this.wait(300); // Wait for UI update
        return await this.captureCurrentState(captureName);
      } else {
        console.log(`[Simulation] Fill ${selector} with "${value}" and capture ${captureName}`);
        return await this.captureCurrentState(captureName);
      }
    } catch (error) {
      return {
        id: `fill_capture_${Date.now()}`,
        name: captureName,
        timestamp: Date.now(),
        path: '',
        success: false,
        error: error instanceof Error ? error.message : 'Fill and capture failed'
      };
    }
  }

  async captureVideoLibraryStates(): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    // Empty library state
    results.push(await this.captureCurrentState('empty_video_library'));
    
    // Try to add videos (if possible)
    try {
      const addVideoResult = await this.clickAndCapture(
        '[data-testid="add-video-button"], .file-input-button, [aria-label*="add"], [title*="add"]',
        'add_video_dialog'
      );
      results.push(addVideoResult);
    } catch (error) {
      console.log('Could not find add video button');
    }
    
    return results;
  }

  async captureTimelineStates(): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    // Try to navigate to timeline
    try {
      const timelineResult = await this.clickAndCapture(
        '[data-testid="timeline-tab"], .timeline-button, [aria-label*="timeline"]',
        'timeline_view'
      );
      results.push(timelineResult);
      
      // Capture timeline controls
      results.push(await this.captureCurrentState('timeline_controls', {
        selector: '.timeline-controls, [data-testid="timeline-controls"]'
      }));
      
    } catch (error) {
      console.log('Could not access timeline view');
    }
    
    return results;
  }

  async captureSettingsStates(): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    // Try to open settings
    try {
      const settingsResult = await this.clickAndCapture(
        '[data-testid="settings-button"], .settings-button, [aria-label*="settings"]',
        'settings_panel'
      );
      results.push(settingsResult);
      
      // Capture AI settings if available
      try {
        const aiSettingsResult = await this.clickAndCapture(
          '[data-testid="ai-enhancement-tab"], .ai-settings, [aria-label*="AI"]',
          'ai_enhancement_settings'
        );
        results.push(aiSettingsResult);
      } catch (error) {
        console.log('AI settings not found');
      }
      
    } catch (error) {
      console.log('Could not access settings');
    }
    
    return results;
  }

  async captureProcessingStates(): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    // Try to access processing queue
    try {
      const processingResult = await this.clickAndCapture(
        '[data-testid="processing-tab"], .processing-queue, [aria-label*="processing"]',
        'processing_queue'
      );
      results.push(processingResult);
      
    } catch (error) {
      console.log('Could not access processing queue');
    }
    
    return results;
  }

  async captureFullAppFlow(): Promise<CaptureResult[]> {
    const allResults: CaptureResult[] = [];
    
    console.log('Starting full app capture flow...');
    
    // Initial app state
    allResults.push(await this.captureCurrentState('app_initial_state'));
    
    // Video library states
    const libraryResults = await this.captureVideoLibraryStates();
    allResults.push(...libraryResults);
    
    // Timeline states
    const timelineResults = await this.captureTimelineStates();
    allResults.push(...timelineResults);
    
    // Settings states
    const settingsResults = await this.captureSettingsStates();
    allResults.push(...settingsResults);
    
    // Processing states
    const processingResults = await this.captureProcessingStates();
    allResults.push(...processingResults);
    
    console.log(`Capture flow completed. ${allResults.length} screenshots taken.`);
    
    return allResults;
  }

  async testUserFlow(flowName: string, steps: Array<{
    action: 'click' | 'fill' | 'navigate' | 'wait' | 'capture';
    selector?: string;
    value?: string;
    url?: string;
    duration?: number;
    captureName?: string;
  }>): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    console.log(`Starting user flow test: ${flowName}`);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        switch (step.action) {
          case 'navigate':
            if (step.url) {
              results.push(await this.navigateAndCapture(step.url, step.captureName || `${flowName}_step_${i + 1}`));
            }
            break;
          case 'click':
            if (step.selector) {
              results.push(await this.clickAndCapture(step.selector, step.captureName || `${flowName}_step_${i + 1}`));
            }
            break;
          case 'fill':
            if (step.selector && step.value) {
              results.push(await this.fillAndCapture(step.selector, step.value, step.captureName || `${flowName}_step_${i + 1}`));
            }
            break;
          case 'wait':
            await this.wait(step.duration || 1000);
            break;
          case 'capture':
            results.push(await this.captureCurrentState(step.captureName || `${flowName}_step_${i + 1}`));
            break;
        }
      } catch (error) {
        console.error(`Step ${i + 1} failed in flow ${flowName}:`, error);
      }
    }
    
    return results;
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mcpIntegrationService = new MCPIntegrationService();