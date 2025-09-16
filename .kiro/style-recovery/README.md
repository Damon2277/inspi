# Style Recovery System

A comprehensive style version control and recovery system for web applications.

## Features

### ✅ Completed Features

#### 1. Style Snapshot Storage Mechanism
- **Automatic file monitoring** - Watches CSS, SCSS, TSX, and JSX files
- **Snapshot creation** - Creates timestamped snapshots with file hashes
- **Metadata management** - Tracks snapshot information, tags, and stability
- **File hash calculation** - SHA256 hashing for change detection
- **Storage optimization** - Efficient file storage and indexing
- **Cleanup functionality** - Automatic cleanup of old snapshots

### 🚧 In Development

#### 2. Visual Regression Detection (Placeholder)
- Page screenshot functionality
- Image comparison algorithms
- Visual difference reporting

#### 3. Style Rollback Mechanism (Placeholder)
- One-click style rollback
- Rollback impact analysis
- Rollback operation audit logs

## Installation

```bash
cd .kiro/style-recovery
npm install
```

## Usage

### Command Line Interface

```bash
# Initialize the system
node cli.js init

# Create a snapshot
node cli.js snapshot --name "stable-v1" --description "Stable version before changes" --stable

# List snapshots
node cli.js list

# Check system status
node cli.js status

# Start monitoring (runs continuously)
node cli.js monitor

# Delete a snapshot
node cli.js delete <snapshot-id>

# Cleanup old snapshots
node cli.js cleanup --days 30
```

### From Project Root

Use the integration script:

```bash
# From project root
node scripts/style-recovery.js status
node scripts/style-recovery.js snapshot --name "my-snapshot"
node scripts/style-recovery.js list
```

### Programmatic API

```javascript
const StyleRecoverySystem = require('./.kiro/style-recovery');

const system = new StyleRecoverySystem({
  projectRoot: process.cwd(),
  watchPatterns: [
    'src/**/*.css',
    'src/**/*.scss',
    'src/**/*.tsx',
    'src/**/*.jsx'
  ]
});

// Initialize
await system.initialize();

// Create snapshot
const snapshot = await system.createSnapshot({
  name: 'my-snapshot',
  description: 'Description here',
  isStable: true,
  tags: ['stable', 'release']
});

// Start monitoring
system.startMonitoring();

// Get status
const status = await system.getStatus();
console.log(status);
```

## Configuration

The system automatically creates configuration files:

- `.kiro/style-recovery/snapshots/` - Snapshot storage directory
- `.kiro/style-recovery/monitor-config.json` - Monitor configuration
- `.kiro/style-recovery/change-log.json` - Change history log

### Default Watch Patterns

```javascript
[
  'src/**/*.css',
  'src/**/*.scss', 
  'src/**/*.tsx',
  'src/**/*.jsx',
  'src/app/globals.css',
  'src/styles/**/*'
]
```

## Snapshot Structure

Each snapshot contains:

```javascript
{
  id: "2025-09-05T01-40-03-065Z-2d48f904",
  name: "user-defined-name",
  description: "User description",
  timestamp: "2025-09-05T01:40:03.065Z",
  isStable: true,
  tags: ["stable", "release"],
  files: {
    "src/app/globals.css": {
      hash: "abc123...",
      size: 2048,
      lastModified: "2025-09-05T01:40:03.000Z"
    }
  },
  metadata: {
    totalFiles: 104,
    totalSize: 766000,
    createdBy: "system",
    reason: "manual"
  }
}
```

## Monitoring

The system provides intelligent monitoring:

- **Debounced changes** - Groups rapid changes to avoid spam
- **Impact analysis** - Categorizes changes by risk level
- **Auto-snapshots** - Creates snapshots for high-impact changes
- **Change logging** - Detailed history of all file changes

### Impact Levels

- **High**: Critical files changed (globals.css, layout files)
- **Medium**: Multiple files affected
- **Low**: Single file changes

## Testing

```bash
cd .kiro/style-recovery
npm test
```

Test coverage includes:
- Snapshot creation and management
- File hash calculation
- Metadata handling
- Cleanup functionality
- Error handling

## Architecture

```
StyleRecoverySystem
├── StyleSnapshotManager    # Core snapshot functionality
├── StyleMonitor           # File watching and change detection
├── VisualRegressionDetector # Screenshot comparison (placeholder)
└── StyleRollback          # Rollback functionality (placeholder)
```

## File Structure

```
.kiro/style-recovery/
├── index.js                    # Main entry point
├── snapshot-manager.js         # Snapshot management
├── style-monitor.js           # File monitoring
├── visual-regression.js       # Visual regression (placeholder)
├── rollback-manager.js        # Rollback functionality (placeholder)
├── cli.js                     # Command line interface
├── package.json               # Dependencies
├── jest.config.js             # Test configuration
├── __tests__/                 # Test files
│   └── snapshot-manager.test.js
└── snapshots/                 # Snapshot storage
    ├── metadata.json          # Snapshot index
    └── [snapshot-id]/         # Individual snapshots
```

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

### Requirement 2.1 ✅
- **WHEN** 样式文件被修改时 **THEN** 系统 **SHALL** 自动创建样式快照并标记版本
- ✅ Implemented: Automatic snapshot creation on file changes

### Requirement 2.2 ✅  
- **WHEN** UI组件发生重大变更时 **THEN** 系统 **SHALL** 要求开发者确认变更影响范围
- ✅ Implemented: Impact analysis and change categorization

## Next Steps

1. **Visual Regression Detection** - Implement screenshot comparison
2. **Style Rollback Mechanism** - Complete rollback functionality
3. **Integration Testing** - End-to-end workflow testing
4. **Performance Optimization** - Large project handling
5. **UI Dashboard** - Web interface for management

## Troubleshooting

### Common Issues

1. **Permission errors**: Ensure write access to `.kiro/style-recovery/`
2. **Large snapshots**: Use cleanup command to remove old snapshots
3. **Monitor not starting**: Check file patterns and permissions

### Debug Mode

Set environment variable for verbose logging:
```bash
DEBUG=style-recovery node cli.js status
```

## Contributing

1. Run tests: `npm test`
2. Check code style: `npm run lint` (when available)
3. Update documentation for new features
4. Add tests for new functionality