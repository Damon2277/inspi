# Test Report Generator

A comprehensive test report generation system that supports multiple output formats, visual charts, historical trend analysis, and custom templates.

## Features

- **Multi-Format Support**: HTML, JSON, XML (JUnit), Markdown, CSV, and PDF
- **Visual Charts**: Coverage charts, test result visualizations, and trend analysis
- **Custom Templates**: Flexible template system for customized reports
- **Historical Trends**: Track coverage, performance, and quality metrics over time
- **Branding Support**: Custom colors, logos, and styling
- **Error Handling**: Robust error recovery and graceful degradation

## Quick Start

```typescript
import { TestReportGenerator, TestReportData } from './TestReportGenerator';

// Create generator with configuration
const generator = new TestReportGenerator({
  outputDir: 'reports',
  formats: ['html', 'json', 'xml'],
  includeCharts: true,
  includeTrends: true,
  branding: {
    title: 'My Project Test Report',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    }
  }
});

// Prepare test data
const reportData: TestReportData = {
  summary: {
    timestamp: new Date(),
    duration: 5000,
    totalTests: 100,
    passedTests: 95,
    failedTests: 3,
    skippedTests: 2,
    passRate: 95
  },
  coverage: {
    statements: 92.5,
    branches: 88.3,
    functions: 94.1,
    lines: 91.7,
    files: [
      {
        path: 'src/service.ts',
        statements: 95,
        branches: 90,
        functions: 100,
        lines: 94,
        uncoveredLines: [15, 23, 45]
      }
    ]
  },
  performance: {
    totalExecutionTime: 5000,
    averageTestTime: 50,
    slowestTests: [
      { name: 'slow test', duration: 500, file: 'test.spec.ts' }
    ],
    memoryUsage: {
      peak: 128,
      average: 64
    }
  },
  testResults: [
    {
      testFile: 'test1.spec.ts',
      testSuite: 'Service Tests',
      testName: 'should work correctly',
      status: 'passed',
      duration: 45
    }
  ],
  quality: {
    qualityScore: 85,
    securityIssues: 2,
    codeSmells: 5,
    technicalDebt: '2h 30m'
  },
  trends: {
    coverageTrend: [
      { date: new Date('2024-01-01'), coverage: 90 },
      { date: new Date('2024-01-02'), coverage: 92.5 }
    ],
    performanceTrend: [
      { date: new Date('2024-01-01'), duration: 5200 },
      { date: new Date('2024-01-02'), duration: 5000 }
    ],
    qualityTrend: [
      { date: new Date('2024-01-01'), score: 82 },
      { date: new Date('2024-01-02'), score: 85 }
    ]
  }
};

// Generate reports
const result = await generator.generateReport(reportData);

console.log(`Generated ${result.files.length} report files:`);
result.files.forEach(file => console.log(`- ${file}`));
```

## Configuration Options

### ReportConfig

```typescript
interface ReportConfig {
  outputDir: string;                    // Output directory for reports
  formats: ReportFormat[];              // Report formats to generate
  includeCharts: boolean;               // Include visual charts
  includeTrends: boolean;               // Include historical trends
  customTemplate?: string;              // Custom template name
  branding?: {
    title: string;                      // Report title
    logo?: string;                      // Logo URL or path
    colors: {
      primary: string;                  // Primary color
      secondary: string;                // Secondary color
      success: string;                  // Success color
      warning: string;                  // Warning color
      error: string;                    // Error color
    };
  };
}
```

### Supported Formats

- `html` - Interactive HTML report with charts
- `json` - Machine-readable JSON data
- `xml` - JUnit-compatible XML format
- `markdown` - Human-readable Markdown
- `csv` - Spreadsheet-compatible CSV
- `pdf` - Print-ready PDF (via HTML conversion)

## Custom Templates

Create custom templates for personalized reports:

```typescript
import { ReportTemplate } from './TestReportGenerator';

const customTemplate: ReportTemplate = {
  name: 'minimal',
  description: 'Minimal HTML template',
  format: 'html',
  template: `
    <html>
      <head><title>{{title}}</title></head>
      <body>
        <h1>{{title}}</h1>
        <p>Total Tests: {{summary.totalTests}}</p>
        <p>Pass Rate: {{summary.passRate}}%</p>
        <p>Coverage: {{coverage.statements}}%</p>
      </body>
    </html>
  `,
  variables: ['title', 'summary', 'coverage']
};

// Add custom template
generator.addTemplate(customTemplate);
```

## Chart Generation

The system automatically generates interactive charts:

- **Coverage Chart**: Doughnut chart showing statement, branch, function, and line coverage
- **Test Results Chart**: Pie chart showing passed, failed, and skipped tests
- **Trend Charts**: Line charts showing historical coverage, performance, and quality trends

Charts are generated as JSON configuration files compatible with Chart.js.

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Reports
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests with coverage
        run: npm test -- --coverage --coverageReporters=json
      
      - name: Generate test reports
        run: node scripts/generate-reports.js
      
      - name: Upload reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: reports/
```

### Jest Integration

```javascript
// jest.config.js
module.exports = {
  // ... other config
  testResultsProcessor: './scripts/test-results-processor.js'
};

// scripts/test-results-processor.js
const { TestReportGenerator } = require('../src/lib/testing/reporting');

module.exports = async (results) => {
  const generator = new TestReportGenerator({
    outputDir: 'reports',
    formats: ['html', 'json', 'xml']
  });

  const reportData = transformJestResults(results);
  await generator.generateReport(reportData);
  
  return results;
};
```

## Error Handling

The system includes comprehensive error handling:

- **File System Errors**: Graceful handling of permission and disk space issues
- **Template Errors**: Fallback to default templates when custom templates fail
- **Format Errors**: Individual format failures don't affect other formats
- **Chart Generation**: Chart failures don't prevent report generation

## Performance Considerations

- **Large Datasets**: Optimized for handling thousands of test results
- **Concurrent Generation**: Supports multiple simultaneous report generation
- **Memory Usage**: Efficient memory management for large reports
- **File I/O**: Optimized file operations with error recovery

## API Reference

### TestReportGenerator

#### Constructor
```typescript
constructor(config?: Partial<ReportConfig>)
```

#### Methods

##### generateReport(data: TestReportData)
Generates reports in all configured formats.

**Returns**: `Promise<{ files: string[], summary: { totalFiles: number, formats: ReportFormat[], outputDir: string } }>`

##### addTemplate(template: ReportTemplate)
Adds a custom template to the generator.

##### getTemplates()
Returns all available templates.

**Returns**: `ReportTemplate[]`

##### updateConfig(config: Partial<ReportConfig>)
Updates the generator configuration.

## Examples

### Basic Usage
```typescript
const generator = new TestReportGenerator();
const result = await generator.generateReport(testData);
```

### Custom Configuration
```typescript
const generator = new TestReportGenerator({
  outputDir: 'custom-reports',
  formats: ['html', 'pdf'],
  branding: {
    title: 'Custom Report',
    colors: { primary: '#ff6b6b' }
  }
});
```

### Multiple Report Types
```typescript
// Generate different reports for different audiences
const devGenerator = new TestReportGenerator({
  formats: ['html', 'json'],
  includeCharts: true
});

const ciGenerator = new TestReportGenerator({
  formats: ['xml', 'json'],
  includeCharts: false
});
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure write permissions to output directory
2. **Template Not Found**: Verify custom template names match registered templates
3. **Large File Sizes**: Consider reducing chart complexity for very large datasets
4. **Memory Issues**: Process reports in batches for extremely large test suites

### Debug Mode

Enable debug logging:

```typescript
const generator = new TestReportGenerator({
  // ... config
});

// Monitor generation process
generator.on('progress', (event) => {
  console.log(`Generating ${event.format}: ${event.progress}%`);
});
```

## Contributing

When contributing to the test report generator:

1. Add tests for new features
2. Update documentation for API changes
3. Ensure backward compatibility
4. Test with various data sizes
5. Validate all output formats

## License

This test report generator is part of the comprehensive testing framework and follows the same license terms as the main project.