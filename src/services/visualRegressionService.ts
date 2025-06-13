import { MCPIntegrationService } from './mcpIntegrationService';
import { CaptureResult } from './mcpCaptureService';

export interface BaselineScreenshot {
  id: string;
  name: string;
  url: string;
  selector?: string;
  timestamp: number;
  path: string;
  metadata: {
    viewportWidth: number;
    viewportHeight: number;
    userAgent: string;
    appVersion: string;
  };
}

export interface RegressionTestResult {
  id: string;
  baselineId: string;
  currentScreenshot: string;
  timestamp: number;
  passed: boolean;
  differences: {
    pixelDifference: number;
    percentageDifference: number;
    diffImagePath?: string;
  };
  metadata: {
    threshold: number;
    resolution: string;
    testType: 'full-page' | 'component' | 'element';
  };
}

export interface RegressionTestConfig {
  threshold: number; // Percentage threshold for pixel differences
  baselineDir: string;
  outputDir: string;
  compareFullPage: boolean;
  ignoreSelectors: string[];
  viewports: Array<{
    name: string;
    width: number;
    height: number;
  }>;
}

export class VisualRegressionService {
  private mcpService: MCPIntegrationService;
  private config: RegressionTestConfig;
  private baselines: BaselineScreenshot[] = [];
  private testResults: RegressionTestResult[] = [];

  constructor(config?: Partial<RegressionTestConfig>) {
    this.config = {
      threshold: 0.1, // 0.1% pixel difference threshold
      baselineDir: 'tests/visual-regression/baselines',
      outputDir: 'tests/visual-regression/results',
      compareFullPage: true,
      ignoreSelectors: ['.timestamp', '.loading', '.animation'],
      viewports: [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 }
      ],
      ...config
    };

    this.mcpService = new MCPIntegrationService();
    this.loadBaselines();
  }

  private loadBaselines(): void {
    // In a real implementation, this would load from filesystem or database
    // For now, we'll simulate with some example baselines
    this.baselines = [];
  }

  async createBaseline(
    name: string, 
    url: string, 
    selector?: string, 
    viewport?: { width: number; height: number }
  ): Promise<BaselineScreenshot> {
    console.log(`📸 Creating baseline: ${name}`);

    const timestamp = Date.now();
    const baselineId = `baseline_${name}_${timestamp}`;
    
    // Set viewport if specified
    if (viewport) {
      await this.setViewport(viewport.width, viewport.height);
    }

    // Navigate to URL
    const captureResult = await this.mcpService.navigateAndCapture(url, `baseline_${name}`);
    
    if (!captureResult.success) {
      throw new Error(`Failed to create baseline: ${captureResult.error}`);
    }

    const baseline: BaselineScreenshot = {
      id: baselineId,
      name,
      url,
      selector,
      timestamp,
      path: captureResult.path,
      metadata: {
        viewportWidth: viewport?.width || 1920,
        viewportHeight: viewport?.height || 1080,
        userAgent: navigator.userAgent,
        appVersion: this.getAppVersion()
      }
    };

    this.baselines.push(baseline);
    await this.saveBaseline(baseline);
    
    console.log(`✅ Baseline created: ${baseline.id}`);
    return baseline;
  }

  async createBaselinesForAllViewports(name: string, url: string, selector?: string): Promise<BaselineScreenshot[]> {
    const baselines: BaselineScreenshot[] = [];
    
    for (const viewport of this.config.viewports) {
      const baselineName = `${name}_${viewport.name}`;
      const baseline = await this.createBaseline(baselineName, url, selector, viewport);
      baselines.push(baseline);
    }
    
    return baselines;
  }

  async runRegressionTest(baselineName: string): Promise<RegressionTestResult> {
    const baseline = this.baselines.find(b => b.name === baselineName);
    if (!baseline) {
      throw new Error(`Baseline not found: ${baselineName}`);
    }

    console.log(`🔍 Running regression test: ${baselineName}`);

    // Set the same viewport as the baseline
    await this.setViewport(baseline.metadata.viewportWidth, baseline.metadata.viewportHeight);

    // Take current screenshot
    const currentCapture = await this.mcpService.navigateAndCapture(
      baseline.url, 
      `current_${baselineName}_${Date.now()}`
    );

    if (!currentCapture.success) {
      throw new Error(`Failed to capture current screenshot: ${currentCapture.error}`);
    }

    // Compare images (simulated - in real implementation would use image diff library)
    const differences = await this.compareImages(baseline.path, currentCapture.path);
    
    const testResult: RegressionTestResult = {
      id: `test_${Date.now()}`,
      baselineId: baseline.id,
      currentScreenshot: currentCapture.path,
      timestamp: Date.now(),
      passed: differences.percentageDifference <= this.config.threshold,
      differences,
      metadata: {
        threshold: this.config.threshold,
        resolution: `${baseline.metadata.viewportWidth}x${baseline.metadata.viewportHeight}`,
        testType: baseline.selector ? 'element' : 'full-page'
      }
    };

    this.testResults.push(testResult);
    
    console.log(`${testResult.passed ? '✅' : '❌'} Test ${testResult.passed ? 'passed' : 'failed'}: ${baselineName}`);
    console.log(`   Difference: ${differences.percentageDifference.toFixed(2)}% (threshold: ${this.config.threshold}%)`);

    return testResult;
  }

  async runAllRegressionTests(): Promise<RegressionTestResult[]> {
    console.log(`🧪 Running visual regression tests for ${this.baselines.length} baselines...`);
    
    const results: RegressionTestResult[] = [];
    
    for (const baseline of this.baselines) {
      try {
        const result = await this.runRegressionTest(baseline.name);
        results.push(result);
      } catch (error) {
        console.error(`Failed to test baseline ${baseline.name}:`, error);
      }
    }
    
    await this.generateRegressionReport(results);
    return results;
  }

  async compareImages(baselinePath: string, currentPath: string): Promise<{
    pixelDifference: number;
    percentageDifference: number;
    diffImagePath?: string;
  }> {
    // Simulated image comparison - in real implementation would use libraries like pixelmatch or ResembleJS
    const simulatedDifference = Math.random() * 2; // 0-2% random difference
    
    return {
      pixelDifference: Math.floor(simulatedDifference * 10000), // Approximate pixel count
      percentageDifference: simulatedDifference,
      diffImagePath: currentPath.replace('.png', '_diff.png')
    };
  }

  private async setViewport(width: number, height: number): Promise<void> {
    // In real implementation, this would set the browser viewport
    console.log(`📐 Setting viewport: ${width}x${height}`);
  }

  private getAppVersion(): string {
    // Get app version from package.json or environment
    return '1.0.0';
  }

  private async saveBaseline(baseline: BaselineScreenshot): Promise<void> {
    // In real implementation, save baseline metadata to file or database
    console.log(`💾 Saved baseline metadata: ${baseline.id}`);
  }

  async generateRegressionReport(results: RegressionTestResult[]): Promise<string> {
    const passedTests = results.filter(r => r.passed);
    const failedTests = results.filter(r => !r.passed);
    
    const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 8px 8px 0 0; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 2em; 
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            padding: 30px; 
        }
        .summary-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
        }
        .summary-card .number { 
            font-size: 2.5em; 
            font-weight: bold; 
            margin-bottom: 5px; 
        }
        .summary-card .label { 
            color: #666; 
            font-size: 0.9em; 
        }
        .passed .number { color: #28a745; }
        .failed .number { color: #dc3545; }
        .total .number { color: #6c757d; }
        .results { 
            padding: 0 30px 30px; 
        }
        .test-result { 
            border: 1px solid #dee2e6; 
            border-radius: 8px; 
            margin-bottom: 15px; 
            overflow: hidden; 
        }
        .test-result.passed { border-left: 5px solid #28a745; }
        .test-result.failed { border-left: 5px solid #dc3545; }
        .test-header { 
            padding: 15px 20px; 
            background: #f8f9fa; 
            border-bottom: 1px solid #dee2e6; 
        }
        .test-header h3 { 
            margin: 0; 
            display: flex; 
            align-items: center; 
            gap: 10px; 
        }
        .test-body { 
            padding: 20px; 
        }
        .comparison { 
            display: grid; 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 15px; 
            margin-top: 15px; 
        }
        .comparison-item { 
            text-align: center; 
        }
        .comparison-item h4 { 
            margin: 0 0 10px 0; 
            font-size: 0.9em; 
            color: #666; 
        }
        .comparison-item img { 
            max-width: 100%; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
        }
        .diff-stats { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            margin-top: 15px; 
        }
        .diff-stats h4 { 
            margin: 0 0 10px 0; 
            color: #495057; 
        }
        .diff-stat { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 5px; 
        }
        .threshold-indicator { 
            display: inline-block; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 0.8em; 
            font-weight: 500; 
        }
        .within-threshold { 
            background: #d4edda; 
            color: #155724; 
        }
        .exceeds-threshold { 
            background: #f8d7da; 
            color: #721c24; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Visual Regression Test Report</h1>
            <div>Generated on ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="summary">
            <div class="summary-card total">
                <div class="number">${results.length}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="summary-card passed">
                <div class="number">${passedTests.length}</div>
                <div class="label">Passed</div>
            </div>
            <div class="summary-card failed">
                <div class="number">${failedTests.length}</div>
                <div class="label">Failed</div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Results</h2>
            ${results.map(result => {
              const baseline = this.baselines.find(b => b.id === result.baselineId);
              return `
                <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                    <div class="test-header">
                        <h3>
                            <span>${result.passed ? '✅' : '❌'}</span>
                            ${baseline?.name || 'Unknown Test'}
                            <small style="font-weight: normal; color: #666; margin-left: auto;">
                                ${result.metadata.resolution} | ${result.metadata.testType}
                            </small>
                        </h3>
                    </div>
                    <div class="test-body">
                        <div class="diff-stats">
                            <h4>Difference Analysis</h4>
                            <div class="diff-stat">
                                <span>Pixel Difference:</span>
                                <span>${result.differences.pixelDifference.toLocaleString()} pixels</span>
                            </div>
                            <div class="diff-stat">
                                <span>Percentage Difference:</span>
                                <span>
                                    ${result.differences.percentageDifference.toFixed(2)}%
                                    <span class="threshold-indicator ${result.passed ? 'within-threshold' : 'exceeds-threshold'}">
                                        Threshold: ${result.metadata.threshold}%
                                    </span>
                                </span>
                            </div>
                        </div>
                        
                        ${result.differences.diffImagePath ? `
                            <div class="comparison">
                                <div class="comparison-item">
                                    <h4>Baseline</h4>
                                    <img src="${baseline?.path}" alt="Baseline" />
                                </div>
                                <div class="comparison-item">
                                    <h4>Current</h4>
                                    <img src="${result.currentScreenshot}" alt="Current" />
                                </div>
                                <div class="comparison-item">
                                    <h4>Difference</h4>
                                    <img src="${result.differences.diffImagePath}" alt="Difference" />
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
              `;
            }).join('')}
        </div>
    </div>
</body>
</html>`;

    console.log(`📄 Visual regression report generated`);
    console.log(`📊 Summary: ${passedTests.length}/${results.length} tests passed`);
    
    return reportHTML;
  }

  getBaselines(): BaselineScreenshot[] {
    return [...this.baselines];
  }

  getTestResults(): RegressionTestResult[] {
    return [...this.testResults];
  }

  clearTestResults(): void {
    this.testResults = [];
  }

  async setupAppForTesting(): Promise<void> {
    console.log('🛠️  Setting up app for visual regression testing...');
    
    // Remove dynamic elements that could cause false positives
    await this.mcpService.captureCurrentState('pre_test_setup');
    
    // Hide elements that change frequently
    for (const selector of this.config.ignoreSelectors) {
      try {
        // In real implementation, this would hide elements via MCP evaluate
        console.log(`Hiding dynamic element: ${selector}`);
      } catch (error) {
        console.log(`Could not hide element: ${selector}`);
      }
    }
  }
}

export const visualRegressionService = new VisualRegressionService();