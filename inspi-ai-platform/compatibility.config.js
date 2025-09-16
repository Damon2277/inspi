/**
 * Cross-Platform Compatibility Testing Configuration
 */

module.exports = {
  // Test execution settings
  execution: {
    parallel: true,
    timeout: 600000, // 10 minutes
    retries: 2,
    bail: false // Continue testing even if some environments fail
  },

  // Node.js versions to test
  nodeVersions: [
    '18.17.0',
    '18.18.0',
    '20.5.0',
    '20.8.0',
    '21.0.0'
  ],

  // Browser configurations for frontend testing
  browsers: [
    {
      name: 'chrome',
      versions: ['latest', '119', '118'],
      headless: true,
      viewport: { width: 1920, height: 1080 }
    },
    {
      name: 'firefox',
      versions: ['latest', '118'],
      headless: true,
      viewport: { width: 1920, height: 1080 }
    },
    {
      name: 'safari',
      versions: ['latest'],
      headless: false, // Safari doesn't support headless mode well
      viewport: { width: 1920, height: 1080 }
    }
  ],

  // Container configurations
  containers: [
    {
      runtime: 'docker',
      image: 'node:18-alpine',
      nodeVersion: '18.18.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true',
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    },
    {
      runtime: 'docker',
      image: 'node:20-alpine',
      nodeVersion: '20.8.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true',
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    },
    {
      runtime: 'docker',
      image: 'node:18-slim',
      nodeVersion: '18.18.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true',
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    },
    {
      runtime: 'docker',
      image: 'node:20-slim',
      nodeVersion: '20.8.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true',
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    }
  ],

  // Platform-specific settings
  platforms: {
    darwin: {
      supported: true,
      minNodeVersion: '18.0.0',
      recommendations: [
        'Use latest macOS for best compatibility',
        'Install Xcode command line tools for native modules'
      ]
    },
    linux: {
      supported: true,
      minNodeVersion: '18.0.0',
      recommendations: [
        'Ubuntu 20.04+ or equivalent recommended',
        'Ensure build-essential is installed for native modules'
      ]
    },
    win32: {
      supported: true,
      minNodeVersion: '18.0.0',
      limitations: [
        'Path separator differences may cause issues',
        'Some shell commands may not work'
      ],
      recommendations: [
        'Use WSL2 for better compatibility',
        'Install Windows Build Tools for native modules'
      ]
    }
  },

  // Test commands for different scenarios
  testCommands: {
    unit: 'npm run test:unit',
    integration: 'npm run test:integration',
    e2e: 'npm run test:e2e',
    all: 'npm test',
    lint: 'npm run lint',
    build: 'npm run build',
    typecheck: 'npm run type-check'
  },

  // Reporting configuration
  reporting: {
    outputDir: './reports/compatibility',
    formats: ['html', 'json', 'markdown'],
    includeEnvironmentDetails: true,
    includePerformanceMetrics: true,
    includeSupportMatrix: true,
    generateCISummary: true
  },

  // Quality gates
  qualityGates: {
    minPassRate: 0.8, // 80% of environments must pass
    maxFailedCritical: 0, // No critical failures allowed
    maxWarnings: 10,
    performanceThresholds: {
      maxExecutionTime: 300000, // 5 minutes
      maxMemoryUsage: 2147483648 // 2GB
    }
  },

  // Environment-specific overrides
  environments: {
    ci: {
      parallel: true,
      timeout: 900000, // 15 minutes in CI
      retries: 3,
      nodeVersions: ['18.18.0', '20.8.0'], // Limited set for CI
      containers: [
        {
          runtime: 'docker',
          image: 'node:18-alpine',
          nodeVersion: '18.18.0'
        },
        {
          runtime: 'docker',
          image: 'node:20-alpine',
          nodeVersion: '20.8.0'
        }
      ]
    },
    local: {
      parallel: false, // Easier debugging locally
      timeout: 300000, // 5 minutes locally
      retries: 1,
      nodeVersions: [process.version.slice(1)], // Just current version
      containers: [] // Skip containers locally by default
    },
    development: {
      parallel: true,
      timeout: 180000, // 3 minutes for quick feedback
      retries: 1,
      nodeVersions: [process.version.slice(1)],
      containers: [],
      browsers: [] // Skip browser tests in development
    }
  },

  // Feature flags
  features: {
    enableBrowserTesting: true,
    enableContainerTesting: true,
    enablePerformanceMonitoring: true,
    enableSecurityScanning: false, // Disabled by default
    enableCrossNodeVersionTesting: true
  },

  // Hooks for custom behavior
  hooks: {
    beforeAll: null,
    afterAll: null,
    beforeEach: null,
    afterEach: null,
    onFailure: null,
    onSuccess: null
  },

  // Advanced settings
  advanced: {
    // Custom environment detection
    customEnvironmentDetection: false,
    
    // Custom test runners
    customRunners: {},
    
    // Plugin system
    plugins: [],
    
    // Debug settings
    debug: {
      enabled: false,
      logLevel: 'info',
      saveDebugLogs: false
    }
  }
};