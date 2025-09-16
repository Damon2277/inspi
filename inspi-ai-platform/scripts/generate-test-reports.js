#!/usr/bin/env node

/**
 * Test Report Generation Script
 * 
 * Generates comprehensive test reports from Jest test results and coverage data.
 * This script can be used in CI/CD pipelines or run manually after tests.
 */

const fs = require('fs');
const path = require('path');
const { TestReportGenerator } = require('../src/lib/testing/reporting/TestReportGenerator');

/**
 * Transform Jest test results into TestReportData format
 */
function transformJestResults(jestResults, coverageData) {
  const summary = {
    timestamp: new Date(),
    duration: jestResults.testResults.reduce((sum, result) => sum + (result.perfStats?.end - result.perfStats?.start || 0), 0),
    totalTests: jestResults.numTotalTests,
    passedTests: jestResults.numPassedTests,
    failedTests: jestResults.numFailedTests,
    skippedTests: jestResults.numPendingTests,
    passRate: Math.round((jestResults.numPassedTests / jestResults.numTotalTests) * 100)
  };

  const coverage = coverageData ? {
    statements: coverageData.total.statements.pct,
    branches: coverageData.total.branches.pct,
    functions: coverageData.total.functions.pct,
    lines: coverageData.total.lines.pct,
    files: Object.entries(coverageData).filter(([key]) => key !== 'total').map(([filePath, data]) => ({
      path: filePath,
      statements: data.statements.pct,
      branches: data.branches.pct,
      functions: data.functions.pct,
      lines: data.lines.pct,
      uncoveredLines: data.lines.uncoveredLines || []
    }))
  } : {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0,
    files: []
  };

  const testResults = [];
  jestResults.testResults.forEach(testFile => {
    testFile.assertionResults.forEach(test => {
      testResults.push({
        testFile: path.relative(process.cwd(), testFile.testFilePath),
        testSuite: test.ancestorTitles.join(' > ') || 'Root',
        testName: test.title,
        status: test.status === 'passed' ? 'passed' : test.status === 'failed' ? 'failed' : 'skipped',
        duration: test.duration || 0,
        ...(test.failureMessages?.length > 0 && {
          error: {
            message: test.failureMessages[0],
            stack: test.failureMessages.join('\n')
          }
        })
      });
    });
  });

  const performance = {
    totalExecutionTime: summary.duration,
    averageTestTime: summary.totalTests > 0 ? Math.round(summary.duration / summary.totalTests) : 0,
    slowestTests: testResults
      .filter(test => test.duration > 0)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(test => ({
        name: test.testName,
        duration: test.duration,
        file: test.testFile
      })),
    memoryUsage: {
      peak: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      average: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
  };

  const quality = {
    qualityScore: Math.round((coverage.statements + coverage.branches + coverage.functions + coverage.lines) / 4),
    securityIssues: 0, // Would be populated by security scanners
    codeSmells: 0, // Would be populated by code quality tools
    technicalDebt: '0h 0m' // Would be calculated from code analysis
  };

  // Load historical trends if available
  const trendsFile = path.join(process.cwd(), 'reports', 'trends.json');
  let trends = {
    coverageTrend: [],
    performanceTrend: [],
    qualityTrend: []
  };

  if (fs.existsSync(trendsFile)) {
    try {
      const existingTrends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
      trends = existingTrends;
    } catch (error) {
      console.warn('Failed to load existing trends:', error.message);
    }
  }

  // Add current data to trends
  const today = new Date();
  trends.coverageTrend.push({
    date: today,
    coverage: coverage.statements
  });
  trends.performanceTrend.push({
    date: today,
    duration: summary.duration
  });
  trends.qualityTrend.push({
    date: today,
    score: quality.qualityScore
  });

  // Keep only last 30 days of trends
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  trends.coverageTrend = trends.coverageTrend.filter(t => new Date(t.date) > thirtyDaysAgo);
  trends.performanceTrend = trends.performanceTrend.filter(t => new Date(t.date) > thirtyDaysAgo);
  trends.qualityTrend = trends.qualityTrend.filter(t => new Date(t.date) > thirtyDaysAgo);

  // Save updated trends
  try {
    fs.mkdirSync(path.dirname(trendsFile), { recursive: true });
    fs.writeFileSync(trendsFile, JSON.stringify(trends, null, 2));
  } catch (error) {
    console.warn('Failed to save trends:', error.message);
  }

  return {
    summary,
    coverage,
    performance,
    testResults,
    quality,
    trends
  };
}

/**
 * Load Jest test results
 */
function loadJestResults() {
  const resultsFile = path.join(process.cwd(), 'jest-results.json');
  if (!fs.existsSync(resultsFile)) {
    console.error('Jest results file not found. Run tests with --outputFile=jest-results.json');
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  } catch (error) {
    console.error('Failed to parse Jest results:', error.message);
    process.exit(1);
  }
}

/**
 * Load coverage data
 */
function loadCoverageData() {
  const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(coverageFile)) {
    console.warn('Coverage file not found. Coverage data will not be included.');
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  } catch (error) {
    console.warn('Failed to parse coverage data:', error.message);
    return null;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Generating test reports...');

  try {
    // Load test data
    const jestResults = loadJestResults();
    const coverageData = loadCoverageData();

    // Transform data
    const reportData = transformJestResults(jestResults, coverageData);

    // Configure report generator
    const generator = new TestReportGenerator({
      outputDir: 'reports',
      formats: ['html', 'json', 'xml', 'markdown'],
      includeCharts: true,
      includeTrends: true,
      branding: {
        title: 'Inspi AI Platform - Test Report',
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          warning: '#ffc107',
          error: '#dc3545'
        }
      }
    });

    // Generate reports
    const result = await generator.generateReport(reportData);

    console.log('✅ Test reports generated successfully!');
    console.log(`📁 Output directory: ${result.summary.outputDir}`);
    console.log(`📊 Generated ${result.summary.totalFiles} files:`);
    
    result.files.forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`   - ${relativePath}`);
    });

    // Print summary
    console.log('\n📈 Test Summary:');
    console.log(`   Total Tests: ${reportData.summary.totalTests}`);
    console.log(`   Passed: ${reportData.summary.passedTests}`);
    console.log(`   Failed: ${reportData.summary.failedTests}`);
    console.log(`   Skipped: ${reportData.summary.skippedTests}`);
    console.log(`   Pass Rate: ${reportData.summary.passRate}%`);
    
    if (coverageData) {
      console.log('\n🎯 Coverage Summary:');
      console.log(`   Statements: ${reportData.coverage.statements}%`);
      console.log(`   Branches: ${reportData.coverage.branches}%`);
      console.log(`   Functions: ${reportData.coverage.functions}%`);
      console.log(`   Lines: ${reportData.coverage.lines}%`);
    }

    console.log(`\n⏱️  Total Duration: ${reportData.summary.duration}ms`);
    console.log(`📊 Quality Score: ${reportData.quality.qualityScore}/100`);

    // Open HTML report if available
    const htmlReport = result.files.find(file => file.endsWith('.html'));
    if (htmlReport && process.env.OPEN_REPORT !== 'false') {
      console.log(`\n🌐 Opening HTML report: ${htmlReport}`);
      const open = require('open');
      await open(htmlReport).catch(() => {
        console.log('   (Could not open automatically - please open manually)');
      });
    }

  } catch (error) {
    console.error('❌ Failed to generate test reports:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  transformJestResults,
  loadJestResults,
  loadCoverageData,
  main
};