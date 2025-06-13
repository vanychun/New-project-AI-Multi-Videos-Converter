import { MCPIntegrationService } from './mcpIntegrationService';
import { CaptureResult } from './mcpCaptureService';

export interface DocumentationPage {
  id: string;
  title: string;
  description: string;
  sections: DocumentationSection[];
}

export interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  steps: DocumentationStep[];
}

export interface DocumentationStep {
  id: string;
  title: string;
  description: string;
  screenshot?: string;
  highlights?: Array<{
    selector: string;
    color: string;
    label: string;
  }>;
  code?: string;
  notes?: string[];
}

export class DocumentationGenerator {
  private mcpService: MCPIntegrationService;
  private baseUrl: string;
  private outputDir: string;

  constructor(baseUrl: string = 'http://localhost:3000', outputDir: string = 'docs/generated') {
    this.mcpService = new MCPIntegrationService(baseUrl);
    this.baseUrl = baseUrl;
    this.outputDir = outputDir;
  }

  async generateFullDocumentation(): Promise<DocumentationPage[]> {
    console.log('📚 Generating comprehensive documentation...');

    const pages: DocumentationPage[] = [
      await this.generateGettingStartedDocs(),
      await this.generateVideoLibraryDocs(),
      await this.generateTimelineDocs(),
      await this.generateAIEnhancementDocs(),
      await this.generateSettingsDocs(),
      await this.generateProcessingDocs()
    ];

    // Generate the main documentation index
    await this.generateDocumentationIndex(pages);

    console.log(`✅ Documentation generated for ${pages.length} pages`);
    return pages;
  }

  private async generateGettingStartedDocs(): Promise<DocumentationPage> {
    console.log('📖 Generating Getting Started documentation...');

    const captures: CaptureResult[] = [];

    // Capture initial app state
    captures.push(await this.mcpService.captureCurrentState('getting_started_welcome'));

    return {
      id: 'getting_started',
      title: 'Getting Started',
      description: 'Learn how to use the AI Multi Videos Converter',
      sections: [
        {
          id: 'welcome',
          title: 'Welcome Screen',
          description: 'The main interface when you first open the application',
          steps: [
            {
              id: 'initial_state',
              title: 'Application Launch',
              description: 'When you first open the AI Multi Videos Converter, you\'ll see the main interface with an empty video library.',
              screenshot: captures[0]?.path,
              notes: [
                'The application opens in dark mode by default',
                'The video library starts empty',
                'Navigation tabs are visible at the top'
              ]
            }
          ]
        }
      ]
    };
  }

  private async generateVideoLibraryDocs(): Promise<DocumentationPage> {
    console.log('📖 Generating Video Library documentation...');

    const captures: CaptureResult[] = [];

    // Capture different library states
    captures.push(await this.mcpService.captureCurrentState('library_empty_state'));
    
    try {
      captures.push(await this.mcpService.clickAndCapture(
        '[data-testid="add-video-button"], .file-input-button, .add-video',
        'library_add_video_dialog'
      ));
    } catch (error) {
      console.log('Could not capture video import dialog');
    }

    return {
      id: 'video_library',
      title: 'Video Library',
      description: 'Managing your video collection',
      sections: [
        {
          id: 'empty_state',
          title: 'Empty Library',
          description: 'What you see when no videos are loaded',
          steps: [
            {
              id: 'empty_library',
              title: 'No Videos State',
              description: 'The library shows a helpful empty state with instructions on how to add videos.',
              screenshot: captures[0]?.path,
              highlights: [
                {
                  selector: '.empty-state, [data-testid="empty-library"]',
                  color: '#007bff',
                  label: 'Empty State Message'
                }
              ]
            }
          ]
        },
        {
          id: 'adding_videos',
          title: 'Adding Videos',
          description: 'How to import videos into your library',
          steps: [
            {
              id: 'add_video_button',
              title: 'Add Video Button',
              description: 'Click the "Add Video" button to start importing videos.',
              screenshot: captures[1]?.path,
              notes: [
                'Supports drag and drop',
                'Multiple file selection',
                'Various video formats supported'
              ]
            }
          ]
        }
      ]
    };
  }

  private async generateTimelineDocs(): Promise<DocumentationPage> {
    console.log('📖 Generating Timeline documentation...');

    const captures: CaptureResult[] = [];

    try {
      captures.push(await this.mcpService.clickAndCapture(
        '[data-testid="timeline-tab"], .timeline-button',
        'timeline_main_view'
      ));
      
      captures.push(await this.mcpService.captureCurrentState('timeline_controls', {
        selector: '.timeline-controls'
      }));
    } catch (error) {
      console.log('Could not capture timeline views');
    }

    return {
      id: 'timeline',
      title: 'Timeline Editor',
      description: 'Editing and trimming your videos',
      sections: [
        {
          id: 'timeline_interface',
          title: 'Timeline Interface',
          description: 'Understanding the timeline editor components',
          steps: [
            {
              id: 'timeline_overview',
              title: 'Timeline Overview',
              description: 'The timeline provides precise control over video editing with visual feedback.',
              screenshot: captures[0]?.path,
              highlights: [
                {
                  selector: '.timeline-container',
                  color: '#28a745',
                  label: 'Timeline Container'
                },
                {
                  selector: '.timeline-controls',
                  color: '#ffc107',
                  label: 'Playback Controls'
                }
              ]
            }
          ]
        }
      ]
    };
  }

  private async generateAIEnhancementDocs(): Promise<DocumentationPage> {
    console.log('📖 Generating AI Enhancement documentation...');

    const captures: CaptureResult[] = [];

    try {
      captures.push(await this.mcpService.clickAndCapture(
        '[data-testid="settings-button"]',
        'settings_panel_open'
      ));
      
      captures.push(await this.mcpService.clickAndCapture(
        '[data-testid="ai-enhancement-tab"], .ai-settings',
        'ai_enhancement_panel'
      ));
    } catch (error) {
      console.log('Could not capture AI enhancement settings');
    }

    return {
      id: 'ai_enhancement',
      title: 'AI Enhancement',
      description: 'Using AI to improve your videos',
      sections: [
        {
          id: 'ai_settings',
          title: 'AI Settings',
          description: 'Configuring AI enhancement options',
          steps: [
            {
              id: 'ai_panel',
              title: 'AI Enhancement Panel',
              description: 'Access powerful AI tools to upscale, interpolate, and enhance your videos.',
              screenshot: captures[1]?.path,
              notes: [
                'Real-ESRGAN for upscaling',
                'RIFE for frame interpolation',
                'GFPGAN for face enhancement',
                'Various denoising options'
              ]
            }
          ]
        }
      ]
    };
  }

  private async generateSettingsDocs(): Promise<DocumentationPage> {
    console.log('📖 Generating Settings documentation...');

    const captures: CaptureResult[] = [];

    try {
      captures.push(await this.mcpService.clickAndCapture(
        '[data-testid="settings-button"]',
        'settings_main_panel'
      ));
    } catch (error) {
      console.log('Could not capture settings panel');
    }

    return {
      id: 'settings',
      title: 'Settings & Configuration',
      description: 'Customizing the application',
      sections: [
        {
          id: 'general_settings',
          title: 'General Settings',
          description: 'Basic application configuration',
          steps: [
            {
              id: 'settings_overview',
              title: 'Settings Panel',
              description: 'Configure the application to match your preferences and workflow.',
              screenshot: captures[0]?.path
            }
          ]
        }
      ]
    };
  }

  private async generateProcessingDocs(): Promise<DocumentationPage> {
    console.log('📖 Generating Processing documentation...');

    const captures: CaptureResult[] = [];

    try {
      captures.push(await this.mcpService.clickAndCapture(
        '[data-testid="processing-tab"], .processing-queue',
        'processing_queue_view'
      ));
    } catch (error) {
      console.log('Could not capture processing queue');
    }

    return {
      id: 'processing',
      title: 'Processing Queue',
      description: 'Managing video processing jobs',
      sections: [
        {
          id: 'queue_management',
          title: 'Queue Management',
          description: 'Understanding the processing queue',
          steps: [
            {
              id: 'processing_overview',
              title: 'Processing Queue',
              description: 'Monitor and control your video processing jobs with the queue interface.',
              screenshot: captures[0]?.path,
              notes: [
                'Batch processing support',
                'Pause and resume functionality',
                'Real-time progress tracking',
                'Error handling and retry options'
              ]
            }
          ]
        }
      ]
    };
  }

  private async generateDocumentationIndex(pages: DocumentationPage[]): Promise<void> {
    const indexHTML = this.generateIndexHTML(pages);
    console.log('📄 Generated documentation index');
    
    // In a real implementation, you would save this to a file
    // await fs.writeFile(path.join(this.outputDir, 'index.html'), indexHTML);
  }

  private generateIndexHTML(pages: DocumentationPage[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Multi Videos Converter - Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #f8f9fa;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 60px 20px; 
            text-align: center; 
            border-radius: 12px; 
            margin-bottom: 40px;
        }
        .header h1 { font-size: 3em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .page-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
            gap: 30px; 
        }
        .page-card { 
            background: white; 
            border-radius: 12px; 
            padding: 30px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .page-card:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 8px 30px rgba(0,0,0,0.15); 
        }
        .page-card h2 { 
            color: #667eea; 
            margin-bottom: 15px; 
            font-size: 1.5em; 
        }
        .page-card p { 
            color: #666; 
            margin-bottom: 20px; 
        }
        .sections-list { 
            list-style: none; 
        }
        .sections-list li { 
            padding: 8px 0; 
            border-bottom: 1px solid #eee; 
            color: #555;
        }
        .sections-list li:last-child { 
            border-bottom: none; 
        }
        .view-page-btn { 
            display: inline-block; 
            background: #667eea; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            transition: background 0.3s ease;
            margin-top: 15px;
        }
        .view-page-btn:hover { 
            background: #5a6fd8; 
        }
        .stats { 
            display: flex; 
            justify-content: center; 
            gap: 40px; 
            margin: 40px 0; 
            padding: 20px; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .stat { 
            text-align: center; 
        }
        .stat .number { 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #667eea; 
        }
        .stat .label { 
            color: #666; 
            font-size: 0.9em; 
        }
        .footer { 
            text-align: center; 
            margin-top: 60px; 
            padding: 30px; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Documentation</h1>
            <p>Complete guide to using the AI Multi Videos Converter</p>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="number">${pages.length}</div>
                <div class="label">Documentation Pages</div>
            </div>
            <div class="stat">
                <div class="number">${pages.reduce((sum, page) => sum + page.sections.length, 0)}</div>
                <div class="label">Sections</div>
            </div>
            <div class="stat">
                <div class="number">${pages.reduce((sum, page) => sum + page.sections.reduce((sSum, section) => sSum + section.steps.length, 0), 0)}</div>
                <div class="label">Step-by-Step Guides</div>
            </div>
        </div>

        <div class="page-grid">
            ${pages.map(page => `
                <div class="page-card">
                    <h2>${page.title}</h2>
                    <p>${page.description}</p>
                    <ul class="sections-list">
                        ${page.sections.map(section => `
                            <li>📄 ${section.title}</li>
                        `).join('')}
                    </ul>
                    <a href="${page.id}.html" class="view-page-btn">View Guide</a>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>Documentation generated automatically using MCP Puppeteer</p>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  async generatePageHTML(page: DocumentationPage): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} - AI Multi Videos Converter Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #f8f9fa;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 20px; 
            text-align: center; 
            border-radius: 12px; 
            margin-bottom: 40px;
        }
        .nav { 
            background: white; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 30px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .nav a { 
            text-decoration: none; 
            color: #667eea; 
            margin-right: 20px; 
        }
        .section { 
            background: white; 
            margin-bottom: 30px; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .section-header { 
            background: #f8f9fa; 
            padding: 20px; 
            border-bottom: 1px solid #dee2e6; 
        }
        .section-header h2 { 
            color: #667eea; 
            margin-bottom: 10px; 
        }
        .step { 
            padding: 30px; 
            border-bottom: 1px solid #eee; 
        }
        .step:last-child { 
            border-bottom: none; 
        }
        .step h3 { 
            color: #333; 
            margin-bottom: 15px; 
        }
        .step-screenshot { 
            margin: 20px 0; 
            text-align: center; 
        }
        .step-screenshot img { 
            max-width: 100%; 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .step-notes { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            margin-top: 15px; 
        }
        .step-notes h4 { 
            color: #495057; 
            margin-bottom: 10px; 
        }
        .step-notes ul { 
            padding-left: 20px; 
        }
        .step-notes li { 
            margin-bottom: 5px; 
        }
        .highlight { 
            background: #fff3cd; 
            padding: 2px 6px; 
            border-radius: 4px; 
            border: 1px solid #ffeaa7; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${page.title}</h1>
            <p>${page.description}</p>
        </div>

        <div class="nav">
            <a href="index.html">← Back to Documentation</a>
        </div>

        ${page.sections.map(section => `
            <div class="section">
                <div class="section-header">
                    <h2>${section.title}</h2>
                    <p>${section.description}</p>
                </div>
                ${section.steps.map(step => `
                    <div class="step">
                        <h3>${step.title}</h3>
                        <p>${step.description}</p>
                        
                        ${step.screenshot ? `
                            <div class="step-screenshot">
                                <img src="${step.screenshot}" alt="${step.title} Screenshot" />
                            </div>
                        ` : ''}
                        
                        ${step.notes && step.notes.length > 0 ? `
                            <div class="step-notes">
                                <h4>💡 Notes:</h4>
                                <ul>
                                    ${step.notes.map(note => `<li>${note}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${step.code ? `
                            <div class="step-code">
                                <pre><code>${step.code}</code></pre>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }
}

export const documentationGenerator = new DocumentationGenerator();