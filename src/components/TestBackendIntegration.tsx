import React, { useState, useEffect } from 'react';
import { AIService } from '../services/aiService';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  details?: any;
}

export const TestBackendIntegration: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { test: 'Backend Health Check', status: 'pending' },
    { test: 'System Info', status: 'pending' },
    { test: 'Available Models', status: 'pending' },
    { test: 'AI Service Connection', status: 'pending' }
  ]);

  const aiService = new AIService();

  const updateTest = (testName: string, status: TestResult['status'], message?: string, details?: any) => {
    setTests(prev => prev.map(test => 
      test.test === testName 
        ? { ...test, status, message, details }
        : test
    ));
  };

  const runTests = async () => {
    console.log('🧪 Starting Backend Integration Tests...');

    // Test 1: Backend Health Check
    try {
      updateTest('Backend Health Check', 'pending', 'Checking...');
      const isHealthy = await aiService.checkBackendStatus();
      if (isHealthy) {
        updateTest('Backend Health Check', 'success', 'Backend is responding');
      } else {
        updateTest('Backend Health Check', 'error', 'Backend not responding');
      }
    } catch (error) {
      updateTest('Backend Health Check', 'error', error.message);
    }

    // Test 2: System Info
    try {
      updateTest('System Info', 'pending', 'Getting system info...');
      const systemInfo = await aiService.getSystemInfo();
      updateTest('System Info', 'success', 'System info retrieved', systemInfo);
    } catch (error) {
      updateTest('System Info', 'error', error.message);
    }

    // Test 3: Available Models
    try {
      updateTest('Available Models', 'pending', 'Getting models...');
      const models = await aiService.getAvailableModels();
      updateTest('Available Models', 'success', `Found ${models.length} models`, models);
    } catch (error) {
      updateTest('Available Models', 'error', error.message);
    }

    // Test 4: AI Service Connection
    try {
      updateTest('AI Service Connection', 'pending', 'Testing service...');
      // Test a simple operation
      const jobStatus = await fetch('http://127.0.0.1:8001/jobs');
      const jobs = await jobStatus.json();
      updateTest('AI Service Connection', 'success', 'Service is working', jobs);
    } catch (error) {
      updateTest('AI Service Connection', 'error', error.message);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'var(--surface-primary)',
      borderRadius: '12px',
      border: '1px solid var(--border)'
    }}>
      <h2 style={{ 
        color: 'var(--text-primary)', 
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        🔧 Backend Integration Test Suite
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tests.map((test, index) => (
          <div key={index} style={{
            padding: '16px',
            backgroundColor: 'var(--surface-secondary)',
            borderRadius: '8px',
            border: `1px solid ${getStatusColor(test.status)}20`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{ 
              fontSize: '24px',
              lineHeight: '1'
            }}>
              {getStatusIcon(test.status)}
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{
                color: 'var(--text-primary)',
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {test.test}
              </h3>
              
              {test.message && (
                <p style={{
                  color: 'var(--text-secondary)',
                  margin: '0 0 8px 0',
                  fontSize: '14px'
                }}>
                  {test.message}
                </p>
              )}
              
              {test.details && (
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
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '24px', 
        textAlign: 'center' 
      }}>
        <button
          onClick={runTests}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--text-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🔄 Run Tests Again
        </button>
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'var(--info-bg)',
        borderRadius: '8px',
        border: '1px solid var(--info)',
        color: 'var(--text-primary)',
        fontSize: '14px'
      }}>
        <strong>Phase 1A Progress:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>✅ AI Backend Started (Port 8001)</li>
          <li>✅ Frontend Configuration Updated</li>
          <li>✅ Real API Integration (No Simulation)</li>
          <li>⏳ Model Downloads (In Progress)</li>
          <li>✅ FFmpeg Processing Implementation</li>
          <li>⏳ Full Video Processing Test (Next)</li>
        </ul>
      </div>
    </div>
  );
};