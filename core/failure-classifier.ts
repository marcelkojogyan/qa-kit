/**
 * Failure Classifier - QA Kit's diagnostic mind
 * Analyzes failures and classifies them with confidence scores
 * Ported from Ralph QA Agent
 */

export interface NetworkFailure {
  url: string;
  status: number;
  statusText: string;
  failure?: string;
}

export interface ConsoleError {
  type: string;
  text: string;
  location?: string;
  timestamp: number;
}

export interface PerformanceMetrics {
  navigation?: {
    loadEventEnd: number;
    domContentLoaded: number;
  };
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
  timing?: {
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  };
}

export interface Evidence {
  errorMessage?: string;
  networkFailures?: NetworkFailure[];
  consoleErrors?: ConsoleError[];
  performanceMetrics?: PerformanceMetrics;
  screenshot?: string;
  domSnapshot?: string;
  url: string;
  timestamp: string;
}

export type ClassificationType = 'TestFlake' | 'AppRegression' | 'EnvironmentIssue' | 'DataProblem';

export interface Classification {
  type: ClassificationType;
  confidence: number;
  reasons: string[];
  recommendation: string[];
  fixable: boolean;
}

export interface FullClassification extends Classification {
  allClassifications: Classification[];
  analysisTimestamp: string;
}

export interface KnownPattern {
  pattern: RegExp;
  type: ClassificationType;
  confidence: number;
}

export interface KnownPatterns {
  commonFlakes: KnownPattern[];
  commonRegressions: KnownPattern[];
}

export class FailureClassifier {
  private patterns: KnownPatterns;

  constructor() {
    this.patterns = this.loadKnownPatterns();
  }

  async classify(evidence: Evidence): Promise<FullClassification> {
    console.log('🧠 QA Kit analyzing failure patterns...');
    
    const classifications: Classification[] = [
      this.classifyAsTestFlake(evidence),
      this.classifyAsAppRegression(evidence),
      this.classifyAsEnvironmentIssue(evidence),
      this.classifyAsDataProblem(evidence)
    ];
    
    // Return the classification with highest confidence
    const bestMatch = classifications.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    console.log(`🎯 Classification: ${bestMatch.type} (${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
    
    return {
      ...bestMatch,
      allClassifications: classifications,
      analysisTimestamp: new Date().toISOString()
    };
  }

  private classifyAsTestFlake(evidence: Evidence): Classification {
    let confidence = 0;
    const reasons: string[] = [];

    // Timing-related failures
    if (evidence.errorMessage?.includes('timeout')) {
      confidence += 0.6;
      reasons.push('Contains timeout error');
    }

    if (evidence.errorMessage?.includes('Element not found')) {
      confidence += 0.4;
      reasons.push('Element not found - possibly race condition');
    }

    // Network timing issues
    if (evidence.networkFailures?.some(f => f.failure?.includes('timeout'))) {
      confidence += 0.3;
      reasons.push('Network timeout detected');
    }

    // Sporadic element visibility issues
    if (evidence.errorMessage?.includes('not visible') || evidence.errorMessage?.includes('not attached')) {
      confidence += 0.5;
      reasons.push('Element visibility/attachment issue');
    }

    // Animation or transition interference
    if (evidence.consoleErrors?.some(e => e.text.includes('animation') || e.text.includes('transition'))) {
      confidence += 0.2;
      reasons.push('Animation/transition interference detected');
    }

    return {
      type: 'TestFlake',
      confidence: Math.min(confidence, 0.95),
      reasons,
      recommendation: this.getFlakeRecommendation(reasons),
      fixable: true
    };
  }

  private classifyAsAppRegression(evidence: Evidence): Classification {
    let confidence = 0;
    const reasons: string[] = [];

    // Console errors indicating app issues
    if (evidence.consoleErrors?.length > 0) {
      const appErrors = evidence.consoleErrors.filter(e => 
        e.text.includes('TypeError') || 
        e.text.includes('ReferenceError') ||
        e.text.includes('Cannot read property')
      );
      
      if (appErrors.length > 0) {
        confidence += 0.7;
        reasons.push(`${appErrors.length} JavaScript errors detected`);
      }
    }

    // API failures
    const serverErrors = evidence.networkFailures?.filter(f => f.status >= 500) || [];
    if (serverErrors.length > 0) {
      confidence += 0.8;
      reasons.push(`${serverErrors.length} server errors (5xx)`);
    }

    // Client-side API errors  
    const clientErrors = evidence.networkFailures?.filter(f => f.status >= 400 && f.status < 500) || [];
    if (clientErrors.length > 0) {
      confidence += 0.6;
      reasons.push(`${clientErrors.length} client errors (4xx)`);
    }

    // React/Vue specific errors
    if (evidence.consoleErrors?.some(e => 
      e.text.includes('React') || 
      e.text.includes('Vue') || 
      e.text.includes('component')
    )) {
      confidence += 0.5;
      reasons.push('Frontend framework error detected');
    }

    return {
      type: 'AppRegression',
      confidence: Math.min(confidence, 0.95),
      reasons,
      recommendation: this.getAppRegressionRecommendation(evidence),
      fixable: confidence > 0.8 && this.isObviousAppFix(evidence)
    };
  }

  private classifyAsEnvironmentIssue(evidence: Evidence): Classification {
    let confidence = 0;
    const reasons: string[] = [];

    // Connection issues
    if (evidence.networkFailures?.some(f => f.failure?.includes('ECONNREFUSED'))) {
      confidence += 0.9;
      reasons.push('Connection refused - service may be down');
    }

    if (evidence.networkFailures?.some(f => f.failure?.includes('net::ERR_CONNECTION_RESET'))) {
      confidence += 0.8;
      reasons.push('Connection reset - network instability');
    }

    // DNS issues
    if (evidence.networkFailures?.some(f => f.failure?.includes('ENOTFOUND'))) {
      confidence += 0.9;
      reasons.push('DNS resolution failed');
    }

    // Browser/driver issues
    if (evidence.errorMessage?.includes('Session closed') || evidence.errorMessage?.includes('browser has been closed')) {
      confidence += 0.8;
      reasons.push('Browser session terminated unexpectedly');
    }

    // Memory issues
    if (evidence.performanceMetrics?.memory?.usedJSHeapSize && evidence.performanceMetrics.memory.usedJSHeapSize > 100000000) { // >100MB
      confidence += 0.3;
      reasons.push('High memory usage detected');
    }

    return {
      type: 'EnvironmentIssue',
      confidence: Math.min(confidence, 0.95),
      reasons,
      recommendation: this.getEnvironmentRecommendation(reasons),
      fixable: false // Environment issues require manual intervention
    };
  }

  private classifyAsDataProblem(evidence: Evidence): Classification {
    let confidence = 0;
    const reasons: string[] = [];

    // Authentication failures
    if (evidence.networkFailures?.some(f => f.status === 401)) {
      confidence += 0.7;
      reasons.push('Authentication failure detected');
    }

    // Missing test data
    if (evidence.errorMessage?.includes('not found') && evidence.networkFailures?.some(f => f.status === 404)) {
      confidence += 0.6;
      reasons.push('Test data not found (404)');
    }

    // Database connection issues
    if (evidence.networkFailures?.some(f => f.status === 503)) {
      confidence += 0.5;
      reasons.push('Service unavailable - possible database issue');
    }

    // Validation errors
    if (evidence.networkFailures?.some(f => f.status === 422)) {
      confidence += 0.4;
      reasons.push('Validation error - data format issue');
    }

    return {
      type: 'DataProblem',
      confidence: Math.min(confidence, 0.95),
      reasons,
      recommendation: this.getDataRecommendation(reasons),
      fixable: false // Data issues require setup changes
    };
  }

  private getFlakeRecommendation(reasons: string[]): string[] {
    const recommendations: string[] = [];

    if (reasons.some(r => r.includes('timeout'))) {
      recommendations.push('Increase timeout values for slow operations');
      recommendations.push('Add explicit waits for element visibility');
    }

    if (reasons.some(r => r.includes('Element not found'))) {
      recommendations.push('Use more reliable selectors (data-test attributes)');
      recommendations.push('Wait for element to be both visible and stable');
    }

    if (reasons.some(r => r.includes('Network timeout'))) {
      recommendations.push('Add network request retries');
      recommendations.push('Check API response time expectations');
    }

    return recommendations.length > 0 ? recommendations : ['Add explicit waits and improve selector stability'];
  }

  private getAppRegressionRecommendation(evidence: Evidence): string[] {
    const recommendations: string[] = [];

    if (evidence.consoleErrors?.some(e => e.text.includes('TypeError'))) {
      recommendations.push('Check for undefined variables or null references');
      recommendations.push('Verify object properties exist before accessing');
    }

    if (evidence.networkFailures?.some(f => f.status >= 500)) {
      recommendations.push('Check server logs for backend errors');
      recommendations.push('Verify API endpoint functionality');
    }

    if (evidence.networkFailures?.some(f => f.status === 404)) {
      recommendations.push('Verify API route exists and is properly defined');
      recommendations.push('Check for route parameter formatting');
    }

    return recommendations.length > 0 ? recommendations : ['Review application logs and recent code changes'];
  }

  private getEnvironmentRecommendation(reasons: string[]): string[] {
    const recommendations: string[] = [];

    if (reasons.some(r => r.includes('Connection refused'))) {
      recommendations.push('Verify the application server is running');
      recommendations.push('Check if the correct port is being used');
    }

    if (reasons.some(r => r.includes('DNS resolution'))) {
      recommendations.push('Check network connectivity');
      recommendations.push('Verify hostname/URL configuration');
    }

    if (reasons.some(r => r.includes('Browser session'))) {
      recommendations.push('Check browser driver compatibility');
      recommendations.push('Verify sufficient system resources');
    }

    return recommendations.length > 0 ? recommendations : ['Check system resources and network connectivity'];
  }

  private getDataRecommendation(reasons: string[]): string[] {
    const recommendations: string[] = [];

    if (reasons.some(r => r.includes('Authentication failure'))) {
      recommendations.push('Verify test credentials are correct');
      recommendations.push('Check if authentication tokens are expired');
    }

    if (reasons.some(r => r.includes('not found'))) {
      recommendations.push('Ensure test data is properly seeded');
      recommendations.push('Verify database is in correct state');
    }

    return recommendations.length > 0 ? recommendations : ['Check test data setup and database state'];
  }

  private isObviousAppFix(evidence: Evidence): boolean {
    // Simple fixes QA Kit might attempt
    return (
      evidence.consoleErrors?.some(e => e.text.includes('Cannot read property')) ||
      evidence.networkFailures?.some(f => f.status === 404 && f.url.includes('/api/'))
    ) ?? false;
  }

  private loadKnownPatterns(): KnownPatterns {
    // In the future, this could load from a file or database
    return {
      commonFlakes: [
        { pattern: /timeout.*waiting.*element/i, type: 'TestFlake', confidence: 0.8 },
        { pattern: /element.*not.*visible/i, type: 'TestFlake', confidence: 0.7 },
        { pattern: /navigation.*timeout/i, type: 'TestFlake', confidence: 0.6 }
      ],
      commonRegressions: [
        { pattern: /TypeError.*Cannot read property/i, type: 'AppRegression', confidence: 0.9 },
        { pattern: /ReferenceError.*not defined/i, type: 'AppRegression', confidence: 0.8 },
        { pattern: /500 Internal Server Error/i, type: 'AppRegression', confidence: 0.8 }
      ]
    };
  }
}