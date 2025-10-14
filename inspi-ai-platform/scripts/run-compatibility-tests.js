#!/usr/bin/env node

/**
 * CLI script for running cross-platform compatibility tests
 * This is a simplified version that demonstrates the functionality
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  command: 'npm test',
  quick: false,
  output: './reports/compatibility',
  format: 'all',
  parallel: true,
  nodeVersions: [],
  containers: [],
  verbose: false,
  help: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--help':
    case '-h':
      options.help = true;
      break;
    case '--quick':
    case '-q':
      options.quick = true;
      break;
    case '--command':
    case '-c':
      options.command = args[++i];
      break;
    case '--output':
    case '-o':
      options.output = args[++i];
      break;
    case '--format':
    case '-f':
      options.format = args[++i];
      break;
    case '--no-parallel':
      options.parallel = false;
      break;
    case '--node-versions':
      options.nodeVersions = args[++i].split(',');
      break;
    case '--containers':
      options.containers = args[++i].split(',');
      break;
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    default:
      if (!arg.startsWith('-')) {
        options.command = arg;
      }
      break;
  }
}

// Show help
if (options.help) {
  console.log(`
Cross-Platform Compatibility Test Runner

Usage: node run-compatibility-tests.js [options] [command]

Options:
  -h, --help              Show this help message
  -q, --quick             Run quick compatibility check only
  -c, --command <cmd>     Test command to run (default: "npm test")
  -o, --output <dir>      Output directory for reports (default: "./reports/compatibility")
  -f, --format <format>   Report format: html, json, markdown, all (default: "all")
  --no-parallel          Disable parallel test execution
  --node-versions <list>  Comma-separated list of Node.js versions to test
  --containers <list>     Comma-separated list of container images to test
  -v, --verbose           Enable verbose output

Examples:
  node run-compatibility-tests.js --quick
  node run-compatibility-tests.js "npm run test:unit"
  node run-compatibility-tests.js --node-versions "18.18.0,20.8.0"
  node run-compatibility-tests.js --format json --output ./my-reports
`);
  process.exit(0);
}

// Simple environment detection functions
function getEnvironmentInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpuCount: os.cpus().length,
    totalMemory: os.totalmem(),
    availableMemory: os.freemem()
  };
}

function isCI() {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.BUILD_NUMBER ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL ||
    process.env.TRAVIS ||
    process.env.CIRCLECI
  );
}

function isContainer() {
  try {
    if (process.env.DOCKER_CONTAINER) return true;
    const fs = require('fs');
    if (fs.existsSync('/.dockerenv')) return true;
    return false;
  } catch {
    return false;
  }
}

async function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = options.timeout || 30000;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code || 0,
        stdout,
        stderr
      });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function quickCompatibilityCheck(command) {
  console.log('⚡ Running quick compatibility check...');
  console.log(`   Command: ${command}\n`);

  const issues = [];
  const recommendations = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1, 10).split('.')[0]);
  
  if (majorVersion < 18) {
    issues.push(`Node.js version ${nodeVersion} is below recommended minimum (18.0.0)`);
  }

  // Check available memory
  const availableGB = os.freemem() / (1024 * 1024 * 1024);
  if (availableGB < 1) {
    recommendations.push('Low available memory may affect test performance');
  }

  // Try running the command
  try {
    const result = await runCommand(command, { timeout: 30000 });
    if (result.exitCode !== 0) {
      issues.push(`Test command failed with exit code ${result.exitCode}`);
    }
  } catch (error) {
    issues.push(`Failed to run test command: ${error.message}`);
  }

  const compatible = issues.length === 0;

  console.log('📊 Quick Check Results:');
  console.log(`   Compatible: ${compatible ? '✅ Yes' : '❌ No'}`);
  
  if (issues.length > 0) {
    console.log('\n❌ Issues Found:');
    issues.forEach(issue => console.log(`   • ${issue}`));
  }

  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach(rec => console.log(`   • ${rec}`));
  }

  return { compatible, issues, recommendations };
}

async function main() {
  try {
    console.log('🚀 Cross-Platform Compatibility Test Runner');
    console.log('===========================================\n');

    // Show current environment info
    console.log('📋 Current Environment:');
    const envInfo = getEnvironmentInfo();
    console.log(`   Platform: ${envInfo.platform} (${envInfo.arch})`);
    console.log(`   Node.js: ${envInfo.nodeVersion}`);
    console.log(`   CPUs: ${envInfo.cpuCount}`);
    console.log(`   Memory: ${Math.round(envInfo.totalMemory / 1024 / 1024 / 1024)}GB total, ${Math.round(envInfo.availableMemory / 1024 / 1024 / 1024)}GB available`);
    
    const ciEnv = isCI();
    const containerEnv = isContainer();
    
    console.log(`   CI Environment: ${ciEnv ? '✅ Yes' : '❌ No'}`);
    console.log(`   Container: ${containerEnv ? '✅ Yes' : '❌ No'}`);
    console.log();

    if (options.quick) {
      const result = await quickCompatibilityCheck(options.command);
      process.exit(result.compatible ? 0 : 1);
    }

    console.log('🔄 Running basic compatibility tests...');
    console.log(`   Command: ${options.command}`);
    console.log();

    const startTime = Date.now();
    
    // Run basic tests
    const testResults = [];
    
    // Test current environment
    try {
      const result = await runCommand(options.command, { timeout: 300000 });
      testResults.push({
        environment: 'current',
        passed: result.exitCode === 0,
        duration: Date.now() - startTime,
        output: result.stdout,
        errors: result.exitCode !== 0 ? [result.stderr] : []
      });
    } catch (error) {
      testResults.push({
        environment: 'current',
        passed: false,
        duration: Date.now() - startTime,
        output: '',
        errors: [error.message]
      });
    }

    const duration = Date.now() - startTime;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = testResults.filter(r => !r.passed).length;

    console.log('📊 Test Results Summary:');
    console.log(`   Total Environments: ${testResults.length}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ❌`);
    console.log(`   Duration: ${Math.round(duration / 1000)}s`);
    console.log();

    // Show failed environments
    if (failedTests > 0) {
      console.log('❌ Failed Environments:');
      const failedResults = testResults.filter(r => !r.passed);
      failedResults.forEach(result => {
        console.log(`   • ${result.environment}: ${result.errors.join(', ')}`);
      });
      console.log();
    }

    console.log('✅ Compatibility testing completed!');
    console.log('\n💡 Note: This is a simplified version. For full functionality,
      use the TypeScript modules directly.');

    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Compatibility testing failed:');
    console.error(error.message);
    
    if (options.verbose) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Compatibility testing interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Compatibility testing terminated');
  process.exit(143);
});

// Run the main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});