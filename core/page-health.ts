/**
 * Page Health Scorer - QA Kit's page quality assessment
 * Scores each page 0-100 based on performance, errors, and accessibility
 * Based on Ralph QA Agent's BrowserObserver.assessPageHealth
 */

import type { Page } from '@playwright/test';

export interface PageHealthMetrics {
  consoleErrors: number;
  networkFailures: number;
  firstContentfulPaint?: number;
  accessibilityIssues: number;
  performanceScore: number;
  errorScore: number;
  accessibilityScore: number;
}

export interface PageHealthReport {
  score: number;
  issues: string[];
  recommendations: string[];
  metrics: PageHealthMetrics;
  url: string;
  timestamp: string;
}

export interface AccessibilityIssue {
  type: string;
  count: number;
  elements?: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface PerformanceMetrics {
  domContentLoaded?: number;
  loadComplete?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  resourceCount: number;
  timestamp: number;
}

export class PageHealthScorer {
  private consoleErrors: Array<{ type: string; text: string; timestamp: number }> = [];
  private networkFailures: Array<{ url: string; status?: number; failure?: string; timestamp: number }> = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.reset();
  }

  // Attach listeners to page for error collection
  async attachToPage(page: Page): Promise<void> {
    // Console error monitoring
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error' || type === 'warning') {
        this.consoleErrors.push({
          type,
          text,
          timestamp: Date.now()
        });
      }
    });

    // Page error monitoring (uncaught exceptions)
    page.on('pageerror', error => {
      this.consoleErrors.push({
        type: 'error',
        text: error.message,
        timestamp: Date.now()
      });
    });

    // Network monitoring
    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      
      // Track failed requests
      if (status >= 400) {
        this.networkFailures.push({
          url,
          status,
          timestamp: Date.now()
        });
      }
    });

    // Request failures (blocked, timeout, etc.)
    page.on('requestfailed', request => {
      this.networkFailures.push({
        url: request.url(),
        failure: request.failure()?.errorText || 'Unknown failure',
        timestamp: Date.now()
      });
    });
  }

  async assessPageHealth(page: Page): Promise<PageHealthReport> {
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Capture performance metrics
    const performanceMetrics = await this.capturePerformanceMetrics(page);
    
    // Check console errors (recent ones within last 5 seconds)
    const recentErrors = this.consoleErrors.filter(
      error => (Date.now() - error.timestamp) < 5000
    );

    let errorScore = 100;
    if (recentErrors.length > 0) {
      const penalty = recentErrors.length * 10;
      errorScore = Math.max(0, 100 - penalty);
      score -= penalty;
      issues.push(`${recentErrors.length} console errors detected`);
      recommendations.push('Check console for JavaScript errors and warnings');
    }

    // Check network failures (recent ones within last 5 seconds)
    const recentFailures = this.networkFailures.filter(
      failure => (Date.now() - failure.timestamp) < 5000
    );

    if (recentFailures.length > 0) {
      const penalty = recentFailures.length * 15;
      score -= penalty;
      issues.push(`${recentFailures.length} network failures detected`);
      recommendations.push('Review failed network requests and API endpoints');
    }

    // Performance scoring
    let performanceScore = 100;
    if (performanceMetrics?.firstContentfulPaint && performanceMetrics.firstContentfulPaint > 3000) {
      performanceScore -= 20;
      score -= 20;
      issues.push('Slow first contentful paint (>3s)');
      recommendations.push('Optimize page loading performance and resource sizes');
    }

    // Check accessibility issues
    const accessibilityIssues = await this.checkAccessibilityIssues(page);
    let accessibilityScore = 100;
    
    if (accessibilityIssues.length > 0) {
      const totalPenalty = accessibilityIssues.reduce((penalty, issue) => {
        switch (issue.severity) {
          case 'high': return penalty + (issue.count * 10);
          case 'medium': return penalty + (issue.count * 5);
          case 'low': return penalty + (issue.count * 2);
          default: return penalty + (issue.count * 5);
        }
      }, 0);
      
      accessibilityScore = Math.max(0, 100 - totalPenalty);
      score -= totalPenalty;
      
      accessibilityIssues.forEach(issue => {
        issues.push(`${issue.count} ${issue.type.replace('-', ' ')} issues`);
      });
      recommendations.push('Improve accessibility by adding missing labels and alt text');
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    const healthReport: PageHealthReport = {
      score: Math.round(score),
      issues,
      recommendations,
      metrics: {
        consoleErrors: recentErrors.length,
        networkFailures: recentFailures.length,
        firstContentfulPaint: performanceMetrics?.firstContentfulPaint,
        accessibilityIssues: accessibilityIssues.reduce((total, issue) => total + issue.count, 0),
        performanceScore: Math.round(performanceScore),
        errorScore: Math.round(errorScore),
        accessibilityScore: Math.round(accessibilityScore)
      },
      url: page.url(),
      timestamp: new Date().toISOString()
    };

    if (score < 80) {
      console.log(`⚠️  Page health score: ${score}/100 for ${page.url()}`);
      issues.forEach(issue => console.log(`   • ${issue}`));
    } else {
      console.log(`✅ Page health score: ${score}/100 for ${page.url()}`);
    }

    return healthReport;
  }

  private async capturePerformanceMetrics(page: Page): Promise<PerformanceMetrics | null> {
    try {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          // Core Web Vitals
          domContentLoaded: navigation?.domContentLoadedEventEnd ? 
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : undefined,
          loadComplete: navigation?.loadEventEnd ? 
            navigation.loadEventEnd - navigation.loadEventStart : undefined,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
          
          // Memory (if available)
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null,
          
          // Resource counts
          resourceCount: performance.getEntriesByType('resource').length,
          timestamp: Date.now()
        };
      });
      
      return metrics;
    } catch (error) {
      console.log('⚠️  Could not capture performance metrics:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async checkAccessibilityIssues(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const issues = await page.evaluate(() => {
        const foundIssues: Array<{ type: string; count: number; elements?: string[]; severity: 'low' | 'medium' | 'high' }> = [];
        
        // Check for missing alt text on images
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]');
        if (imagesWithoutAlt.length > 0) {
          foundIssues.push({
            type: 'missing-alt-text',
            count: imagesWithoutAlt.length,
            elements: Array.from(imagesWithoutAlt).slice(0, 5).map(img => (img as HTMLImageElement).src),
            severity: 'medium'
          });
        }
        
        // Check for missing form labels
        const inputsWithoutLabels = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'))
          .filter(input => {
            const element = input as HTMLInputElement;
            // Check for aria-label, aria-labelledby, or associated label
            if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) {
              return false;
            }
            
            // Check for label element
            if (element.id) {
              const label = document.querySelector(`label[for="${element.id}"]`);
              if (label) return false;
            }
            
            // Check if input is inside a label
            const parentLabel = element.closest('label');
            return !parentLabel;
          });
        
        if (inputsWithoutLabels.length > 0) {
          foundIssues.push({
            type: 'missing-form-labels',
            count: inputsWithoutLabels.length,
            severity: 'high'
          });
        }
        
        // Check for buttons without text or aria-label
        const buttonsWithoutText = Array.from(document.querySelectorAll('button, [role="button"]'))
          .filter(button => {
            const element = button as HTMLElement;
            const hasText = element.textContent?.trim().length > 0;
            const hasAriaLabel = element.getAttribute('aria-label');
            const hasAriaLabelledBy = element.getAttribute('aria-labelledby');
            
            return !hasText && !hasAriaLabel && !hasAriaLabelledBy;
          });
        
        if (buttonsWithoutText.length > 0) {
          foundIssues.push({
            type: 'unlabeled-buttons',
            count: buttonsWithoutText.length,
            severity: 'high'
          });
        }
        
        // Check for missing heading hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        if (headings.length === 0) {
          foundIssues.push({
            type: 'missing-headings',
            count: 1,
            severity: 'low'
          });
        } else {
          // Check if h1 exists
          const h1Count = document.querySelectorAll('h1').length;
          if (h1Count === 0) {
            foundIssues.push({
              type: 'missing-h1',
              count: 1,
              severity: 'medium'
            });
          } else if (h1Count > 1) {
            foundIssues.push({
              type: 'multiple-h1',
              count: h1Count,
              severity: 'low'
            });
          }
        }
        
        return foundIssues;
      });
      
      return issues;
    } catch (error) {
      console.log('⚠️  Could not check accessibility:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  // Get summary of all observations
  getObservationSummary() {
    return {
      totalConsoleErrors: this.consoleErrors.length,
      totalNetworkFailures: this.networkFailures.length,
      observationDuration: Date.now() - this.startTime,
      errorsByType: this.consoleErrors.reduce((acc: Record<string, number>, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {}),
      failuresByStatus: this.networkFailures.reduce((acc: Record<string, number>, failure) => {
        const key = failure.status ? failure.status.toString() : 'failed';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // Reset observations for new page
  reset(): void {
    this.consoleErrors = [];
    this.networkFailures = [];
    this.startTime = Date.now();
  }

  // Get current error counts (for use during testing)
  getCurrentErrors() {
    return {
      consoleErrors: this.consoleErrors.length,
      networkFailures: this.networkFailures.length,
      recentConsoleErrors: this.consoleErrors.filter(error => (Date.now() - error.timestamp) < 5000).length,
      recentNetworkFailures: this.networkFailures.filter(failure => (Date.now() - failure.timestamp) < 5000).length
    };
  }
}