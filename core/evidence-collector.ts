/**
 * Evidence Collector - QA Kit's forensic investigator  
 * Captures comprehensive failure evidence for analysis and debugging
 * Ported from Ralph QA Agent
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FailureInfo {
  name: string;
  error: string;
  type?: string;
}

export interface EvidenceBundle {
  id: string;
  timestamp: string;
  testName: string;
  errorMessage: string;
  url: string;
  viewport: { width: number; height: number } | null;
  userAgent: string;
  screenshot?: ScreenshotEvidence;
  domSnapshot?: DOMSnapshotEvidence;
  consoleErrors?: ConsoleErrorsEvidence;
  networkFailures?: NetworkFailuresEvidence;
  performanceMetrics?: PerformanceMetricsEvidence;
  localStorage?: StorageStateEvidence;
  accessibility?: AccessibilityEvidence;
}

export interface ScreenshotEvidence {
  path: string;
  type: string;
  captured: boolean;
  error?: string;
}

export interface DOMSnapshotEvidence {
  path: string;
  size: number;
  captured: boolean;
  error?: string;
}

export interface ConsoleErrorsEvidence {
  count: number;
  errors: Array<{
    type: string;
    message: string;
    location?: string;
    timestamp: number;
    stack?: any;
  }>;
  captured?: boolean;
  error?: string;
}

export interface NetworkFailuresEvidence {
  count: number;
  failures: Array<{
    url: string;
    status: number;
    error?: string;
    timestamp: number;
  }>;
  captured?: boolean;
  error?: string;
}

export interface PerformanceMetricsEvidence {
  navigation?: {
    domContentLoaded: number;
    loadComplete: number;
    redirectTime: number;
    dnsTime: number;
    connectTime: number;
    responseTime: number;
  } | null;
  paint: Array<{
    name: string;
    startTime: number;
  }>;
  resources: {
    total: number;
    byType: Record<string, number>;
    slowRequests: Array<{
      name: string;
      duration: number;
    }>;
  };
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  timestamp: number;
  captured?: boolean;
  error?: string;
}

export interface StorageStateEvidence {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: string;
  captured?: boolean;
  error?: string;
}

export interface AccessibilityEvidence {
  interactiveElements: Array<{
    tagName: string;
    role: string;
    ariaLabel?: string | null;
    ariaLabelledBy?: string | null;
    ariaDescribedBy?: string | null;
    tabIndex: number;
    hasText: boolean;
  }>;
  headings: Array<{
    level: number;
    text: string;
    hasId: boolean;
  }>;
  title: string;
  lang: string;
  hasSkipLink: boolean;
  captured?: boolean;
  error?: string;
}

export interface ErrorEvidence {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  url: string;
  screenshot?: string;
}

export class EvidenceCollector {
  private evidenceDir: string;

  constructor() {
    this.evidenceDir = path.resolve(__dirname, '../artifacts/evidence');
  }

  async collect(page: Page, failure: FailureInfo): Promise<EvidenceBundle> {
    const evidenceId = this.generateEvidenceId(failure);
    const evidenceDir = path.join(this.evidenceDir, evidenceId);
    
    console.log(`🔍 QA Kit collecting evidence for: ${failure.name}`);
    
    await fs.mkdir(evidenceDir, { recursive: true });
    
    const evidence: EvidenceBundle = {
      id: evidenceId,
      timestamp: new Date().toISOString(),
      testName: failure.name,
      errorMessage: failure.error,
      url: page.url(),
      viewport: await page.viewportSize(),
      userAgent: await page.evaluate(() => navigator.userAgent)
    };

    // Collect all evidence types in parallel for speed
    const collections = await Promise.allSettled([
      this.captureScreenshot(page, evidenceDir),
      this.captureDOMSnapshot(page, evidenceDir),
      this.captureConsoleErrors(page, evidenceDir),
      this.captureNetworkFailures(page, evidenceDir),
      this.capturePerformanceMetrics(page, evidenceDir),
      this.captureLocalStorageState(page, evidenceDir),
      this.captureAccessibilityTree(page, evidenceDir)
    ]);

    // Process collection results
    collections.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const type = ['screenshot', 'domSnapshot', 'consoleErrors', 'networkFailures', 'performanceMetrics', 'localStorage', 'accessibility'][index] as keyof EvidenceBundle;
        (evidence as any)[type] = result.value;
      } else {
        console.log(`⚠️  Failed to collect evidence type ${index}:`, result.reason);
      }
    });

    // Save evidence manifest
    await fs.writeFile(
      path.join(evidenceDir, 'evidence.json'),
      JSON.stringify(evidence, null, 2)
    );

    console.log(`📁 Evidence collected: ${evidenceDir}`);
    return evidence;
  }

  private generateEvidenceId(failure: FailureInfo): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testName = failure.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${timestamp}-${testName}`;
  }

  private async captureScreenshot(page: Page, evidenceDir: string): Promise<ScreenshotEvidence> {
    try {
      const screenshotPath = path.join(evidenceDir, 'failure-screenshot.png');
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      
      return {
        path: screenshotPath,
        type: 'full-page',
        captured: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️  Screenshot capture failed:', errorMessage);
      return { path: '', type: '', captured: false, error: errorMessage };
    }
  }

  private async captureDOMSnapshot(page: Page, evidenceDir: string): Promise<DOMSnapshotEvidence> {
    try {
      const snapshotPath = path.join(evidenceDir, 'dom-snapshot.html');
      
      // Create a clean snapshot with inline styles for offline viewing
      const cleanHTML = await page.evaluate(() => {
        // Clone the document
        const clone = document.documentElement.cloneNode(true) as Element;
        
        // Remove script tags to prevent execution
        const scripts = clone.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Inline critical CSS
        const styles = Array.from(document.styleSheets);
        let inlineCSS = '';
        
        styles.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules);
            rules.forEach(rule => {
              inlineCSS += rule.cssText + '\\n';
            });
          } catch (e) {
            // Cross-origin stylesheets might not be accessible
          }
        });
        
        // Add styles to head
        const head = clone.querySelector('head');
        if (head) {
          const styleTag = document.createElement('style');
          styleTag.textContent = inlineCSS;
          head.appendChild(styleTag);
        }
        
        return clone.outerHTML;
      });
      
      await fs.writeFile(snapshotPath, cleanHTML);
      
      return {
        path: snapshotPath,
        size: cleanHTML.length,
        captured: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️  DOM snapshot failed:', errorMessage);
      return { path: '', size: 0, captured: false, error: errorMessage };
    }
  }

  private async captureConsoleErrors(page: Page, evidenceDir: string): Promise<ConsoleErrorsEvidence> {
    try {
      // This would be populated by browser observer - for now use empty array
      const errors: any[] = (page as any)._consoleErrors || [];
      
      const errorData: ConsoleErrorsEvidence = {
        count: errors.length,
        errors: errors.map(error => ({
          type: error.type || 'error',
          message: error.text || error.message,
          location: error.location,
          timestamp: error.timestamp || Date.now(),
          stack: error.stackTrace
        }))
      };
      
      await fs.writeFile(
        path.join(evidenceDir, 'console-errors.json'),
        JSON.stringify(errorData, null, 2)
      );
      
      return errorData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️  Console errors capture failed:', errorMessage);
      return { count: 0, errors: [], captured: false, error: errorMessage };
    }
  }

  private async captureNetworkFailures(page: Page, evidenceDir: string): Promise<NetworkFailuresEvidence> {
    try {
      // This would be populated by browser observer - for now use empty array
      const failures: any[] = (page as any)._networkFailures || [];
      
      const networkData: NetworkFailuresEvidence = {
        count: failures.length,
        failures: failures.map(failure => ({
          url: failure.url,
          status: failure.status,
          error: failure.failure,
          timestamp: failure.timestamp || Date.now()
        }))
      };
      
      await fs.writeFile(
        path.join(evidenceDir, 'network-failures.json'),
        JSON.stringify(networkData, null, 2)
      );
      
      return networkData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️  Network failures capture failed:', errorMessage);
      return { count: 0, failures: [], captured: false, error: errorMessage };
    }
  }

  private async capturePerformanceMetrics(page: Page, evidenceDir: string): Promise<PerformanceMetricsEvidence> {
    try {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        const resources = performance.getEntriesByType('resource');
        
        return {
          navigation: navigation ? {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            redirectTime: navigation.redirectEnd - navigation.redirectStart,
            dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
            connectTime: navigation.connectEnd - navigation.connectStart,
            responseTime: navigation.responseEnd - navigation.responseStart
          } : null,
          
          paint: paint.map(p => ({
            name: p.name,
            startTime: p.startTime
          })),
          
          resources: {
            total: resources.length,
            byType: resources.reduce((acc: Record<string, number>, resource) => {
              const type = (resource as any).initiatorType || 'unknown';
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {}),
            slowRequests: resources
              .filter(r => r.duration > 1000)
              .map(r => ({ name: r.name, duration: r.duration }))
              .slice(0, 10)
          },
          
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null,
          
          timestamp: Date.now()
        };
      });
      
      await fs.writeFile(
        path.join(evidenceDir, 'performance-metrics.json'),
        JSON.stringify(metrics, null, 2)
      );
      
      return metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️  Performance metrics capture failed:', errorMessage);
      return { 
        paint: [], 
        resources: { total: 0, byType: {}, slowRequests: [] }, 
        timestamp: Date.now(),
        captured: false, 
        error: errorMessage 
      };
    }
  }

  private async captureLocalStorageState(page: Page, evidenceDir: string): Promise<StorageStateEvidence> {
    try {
      const storageState = await page.evaluate(() => {
        const localStorage: Record<string, string> = {};
        const sessionStorage: Record<string, string> = {};
        
        // Capture localStorage
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            localStorage[key] = window.localStorage.getItem(key) || '';
          }
        }
        
        // Capture sessionStorage
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            sessionStorage[key] = window.sessionStorage.getItem(key) || '';
          }
        }
        
        return {
          localStorage,
          sessionStorage,
          cookies: document.cookie
        };
      });
      
      await fs.writeFile(
        path.join(evidenceDir, 'storage-state.json'),
        JSON.stringify(storageState, null, 2)
      );
      
      return storageState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️  Storage state capture failed:', errorMessage);
      return { 
        localStorage: {}, 
        sessionStorage: {}, 
        cookies: '', 
        captured: false, 
        error: errorMessage 
      };
    }
  }

  private async captureAccessibilityTree(page: Page, evidenceDir: string): Promise<AccessibilityEvidence> {
    try {
      // Basic accessibility snapshot
      const a11ySnapshot = await page.evaluate(() => {
        const getElementInfo = (element: Element) => {
          return {
            tagName: element.tagName,
            role: element.getAttribute('role') || element.tagName.toLowerCase(),
            ariaLabel: element.getAttribute('aria-label'),
            ariaLabelledBy: element.getAttribute('aria-labelledby'),
            ariaDescribedBy: element.getAttribute('aria-describedby'),
            tabIndex: (element as HTMLElement).tabIndex,
            hasText: (element.textContent?.trim().length || 0) > 0
          };
        };
        
        // Get interactive elements
        const interactiveElements = Array.from(document.querySelectorAll(
          'a, button, input, select, textarea, [role=button], [tabindex]'
        )).map(getElementInfo);
        
        // Get headings structure
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .map(h => ({
            level: parseInt(h.tagName[1]),
            text: h.textContent?.trim() || '',
            hasId: !!h.id
          }));
        
        return {
          interactiveElements: interactiveElements.slice(0, 50), // Limit size
          headings,
          title: document.title,
          lang: document.documentElement.lang,
          hasSkipLink: !!document.querySelector('a[href^="#"]:first-child')
        };
      });
      
      await fs.writeFile(
        path.join(evidenceDir, 'accessibility-tree.json'),
        JSON.stringify(a11ySnapshot, null, 2)
      );
      
      return a11ySnapshot;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️  Accessibility tree capture failed:', errorMessage);
      return {
        interactiveElements: [],
        headings: [],
        title: '',
        lang: '',
        hasSkipLink: false,
        captured: false,
        error: errorMessage
      };
    }
  }

  async captureError(page: Page, error: Error): Promise<ErrorEvidence> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const evidenceDir = path.join(this.evidenceDir, errorId);
    
    console.log(`💥 QA Kit capturing unexpected error evidence`);
    
    await fs.mkdir(evidenceDir, { recursive: true });
    
    const errorEvidence: ErrorEvidence = {
      id: errorId,
      timestamp: new Date().toISOString(),
      type: 'UnexpectedError',
      message: error.message,
      stack: error.stack,
      url: page.url()
    };
    
    // Quick evidence capture
    try {
      await page.screenshot({ path: path.join(evidenceDir, 'error-screenshot.png') });
      errorEvidence.screenshot = 'error-screenshot.png';
    } catch (e) {
      console.log('Could not capture error screenshot:', e instanceof Error ? e.message : String(e));
    }
    
    await fs.writeFile(
      path.join(evidenceDir, 'error-evidence.json'),
      JSON.stringify(errorEvidence, null, 2)
    );
    
    return errorEvidence;
  }
}