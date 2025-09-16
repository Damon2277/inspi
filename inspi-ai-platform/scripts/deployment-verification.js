#!/usr/bin/env node

/**
 * 部署验证脚本
 * 用于验证部署后的应用程序是否正常工作
 */

const https = require('https');
const http = require('http');

class DeploymentVerifier {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.verbose = options.verbose || false;
  }

  log(message) {
    if (this.verbose) {
      console.log(`[${new Date().toISOString()}] ${message}`);
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      const req = client.request(url, {
        method: 'GET',
        timeout: this.timeout,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.end();
    });
  }

  async retryRequest(url, options = {}) {
    let lastError;
    
    for (let i = 0; i < this.retries; i++) {
      try {
        this.log(`Attempting request to ${url} (attempt ${i + 1}/${this.retries})`);
        const response = await this.makeRequest(url, options);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return response;
        }
        
        throw new Error(`HTTP ${response.statusCode}: ${response.data}`);
      } catch (error) {
        lastError = error;
        this.log(`Request failed: ${error.message}`);
        
        if (i < this.retries - 1) {
          this.log(`Waiting ${this.retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    throw lastError;
  }

  async verifyHealthCheck() {
    this.log('Verifying health check endpoint...');
    const response = await this.retryRequest(`${this.baseUrl}/api/health`);
    
    try {
      const health = JSON.parse(response.data);
      if (health.status !== 'ok') {
        throw new Error(`Health check failed: ${health.status}`);
      }
      this.log('✅ Health check passed');
      return true;
    } catch (error) {
      throw new Error(`Health check endpoint returned invalid response: ${error.message}`);
    }
  }

  async verifyVersion(expectedVersion) {
    this.log(`Verifying version endpoint (expected: ${expectedVersion})...`);
    const response = await this.retryRequest(`${this.baseUrl}/api/version`);
    
    try {
      const version = JSON.parse(response.data);
      if (expectedVersion && version.version !== expectedVersion) {
        throw new Error(`Version mismatch: expected ${expectedVersion}, got ${version.version}`);
      }
      this.log(`✅ Version verified: ${version.version}`);
      return version;
    } catch (error) {
      throw new Error(`Version endpoint returned invalid response: ${error.message}`);
    }
  }

  async verifyMainPages() {
    this.log('Verifying main pages...');
    const pages = ['/', '/create', '/square', '/works'];
    
    for (const page of pages) {
      try {
        this.log(`Checking page: ${page}`);
        const response = await this.retryRequest(`${this.baseUrl}${page}`);
        
        if (response.statusCode !== 200) {
          throw new Error(`Page ${page} returned status ${response.statusCode}`);
        }
        
        // Basic HTML validation
        if (!response.data.includes('<html') || !response.data.includes('</html>')) {
          throw new Error(`Page ${page} does not contain valid HTML`);
        }
        
        this.log(`✅ Page ${page} is accessible`);
      } catch (error) {
        throw new Error(`Page verification failed for ${page}: ${error.message}`);
      }
    }
  }

  async verifyApiEndpoints() {
    this.log('Verifying API endpoints...');
    const endpoints = [
      { path: '/api/health', expectedStatus: 200 },
      { path: '/api/version', expectedStatus: 200 }
    ];
    
    for (const endpoint of endpoints) {
      try {
        this.log(`Checking API endpoint: ${endpoint.path}`);
        const response = await this.retryRequest(`${this.baseUrl}${endpoint.path}`);
        
        if (response.statusCode !== endpoint.expectedStatus) {
          throw new Error(`API ${endpoint.path} returned status ${response.statusCode}, expected ${endpoint.expectedStatus}`);
        }
        
        this.log(`✅ API endpoint ${endpoint.path} is working`);
      } catch (error) {
        throw new Error(`API endpoint verification failed for ${endpoint.path}: ${error.message}`);
      }
    }
  }

  async verifyPerformance() {
    this.log('Verifying basic performance...');
    const startTime = Date.now();
    
    try {
      await this.retryRequest(`${this.baseUrl}/`);
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 10000) { // 10 seconds threshold
        console.warn(`⚠️  Slow response time: ${responseTime}ms`);
      } else {
        this.log(`✅ Response time acceptable: ${responseTime}ms`);
      }
      
      return responseTime;
    } catch (error) {
      throw new Error(`Performance verification failed: ${error.message}`);
    }
  }

  async runFullVerification(expectedVersion = null) {
    console.log(`🚀 Starting deployment verification for ${this.baseUrl}`);
    console.log(`Expected version: ${expectedVersion || 'any'}`);
    console.log('');

    const results = {
      success: true,
      checks: {},
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null
    };

    const startTime = Date.now();

    try {
      // Health check
      await this.verifyHealthCheck();
      results.checks.health = { status: 'passed' };

      // Version check
      const version = await this.verifyVersion(expectedVersion);
      results.checks.version = { status: 'passed', version: version.version };

      // Main pages
      await this.verifyMainPages();
      results.checks.pages = { status: 'passed' };

      // API endpoints
      await this.verifyApiEndpoints();
      results.checks.api = { status: 'passed' };

      // Performance
      const responseTime = await this.verifyPerformance();
      results.checks.performance = { status: 'passed', responseTime };

      console.log('');
      console.log('✅ All verification checks passed!');
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      
      console.log('');
      console.error('❌ Deployment verification failed:', error.message);
      process.exit(1);
    } finally {
      const endTime = Date.now();
      results.endTime = new Date().toISOString();
      results.duration = endTime - startTime;
      
      console.log('');
      console.log(`📊 Verification completed in ${results.duration}ms`);
      
      if (process.env.GITHUB_ACTIONS) {
        console.log('::set-output name=verification-results::', JSON.stringify(results));
      }
    }

    return results;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node deployment-verification.js <base-url> [expected-version]');
    console.error('Example: node deployment-verification.js https://myapp.vercel.app 1.2.3');
    process.exit(1);
  }

  const baseUrl = args[0];
  const expectedVersion = args[1];
  const verbose = process.env.VERBOSE === 'true' || args.includes('--verbose');

  const verifier = new DeploymentVerifier(baseUrl, {
    verbose,
    timeout: 30000,
    retries: 3,
    retryDelay: 5000
  });

  verifier.runFullVerification(expectedVersion)
    .then(() => {
      console.log('Deployment verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Deployment verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = DeploymentVerifier;