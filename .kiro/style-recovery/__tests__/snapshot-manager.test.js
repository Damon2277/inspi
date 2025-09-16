/**
 * Tests for Style Snapshot Manager
 */

const StyleSnapshotManager = require('../snapshot-manager');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('StyleSnapshotManager', () => {
  let manager;
  let tempDir;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'style-recovery-test-'));
    
    const config = {
      projectRoot: tempDir,
      snapshotDir: '.kiro/style-recovery/snapshots',
      watchPatterns: ['**/*.css', '**/*.tsx']
    };
    
    manager = new StyleSnapshotManager(config);
    
    // Create some test files
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src/test.css'), 'body { color: red; }');
    await fs.writeFile(path.join(tempDir, 'src/component.tsx'), 'export const Test = () => <div>Test</div>');
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should initialize successfully', async () => {
    await expect(manager.initialize()).resolves.not.toThrow();
    
    const snapshotDir = path.join(tempDir, '.kiro/style-recovery/snapshots');
    const metadataFile = path.join(snapshotDir, 'metadata.json');
    
    // Check if directories and files were created
    await expect(fs.access(snapshotDir)).resolves.not.toThrow();
    await expect(fs.access(metadataFile)).resolves.not.toThrow();
  });

  test('should create snapshot successfully', async () => {
    await manager.initialize();
    
    const snapshot = await manager.createSnapshot({
      name: 'test-snapshot',
      description: 'Test snapshot',
      isStable: true,
      tags: ['test']
    });
    
    expect(snapshot).toHaveProperty('id');
    expect(snapshot).toHaveProperty('name', 'test-snapshot');
    expect(snapshot).toHaveProperty('description', 'Test snapshot');
    expect(snapshot).toHaveProperty('isStable', true);
    expect(snapshot).toHaveProperty('tags', ['test']);
    expect(snapshot).toHaveProperty('files');
    expect(snapshot).toHaveProperty('metadata');
    
    // Check if files were captured
    expect(Object.keys(snapshot.files).length).toBeGreaterThan(0);
  });

  test('should list snapshots correctly', async () => {
    await manager.initialize();
    
    // Create a snapshot
    await manager.createSnapshot({
      name: 'test-snapshot-1',
      description: 'First test snapshot'
    });
    
    const snapshots = await manager.listSnapshots();
    
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toHaveProperty('name', 'test-snapshot-1');
  });

  test('should get specific snapshot', async () => {
    await manager.initialize();
    
    const created = await manager.createSnapshot({
      name: 'test-snapshot-get',
      description: 'Snapshot for get test'
    });
    
    const retrieved = await manager.getSnapshot(created.id);
    
    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.name).toBe('test-snapshot-get');
  });

  test('should delete snapshot successfully', async () => {
    await manager.initialize();
    
    const snapshot = await manager.createSnapshot({
      name: 'test-snapshot-delete',
      description: 'Snapshot for delete test'
    });
    
    await manager.deleteSnapshot(snapshot.id);
    
    const retrieved = await manager.getSnapshot(snapshot.id);
    expect(retrieved).toBeUndefined();
  });

  test('should cleanup old snapshots', async () => {
    await manager.initialize();
    
    // Create an old snapshot by manipulating the timestamp
    const snapshot = await manager.createSnapshot({
      name: 'old-snapshot',
      description: 'Old snapshot for cleanup test',
      isStable: false // Make sure it's not stable so it can be cleaned up
    });
    
    // Manually update the timestamp to make it old
    const metadata = await manager.loadMetadata();
    const oldTimestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(); // 31 days ago
    metadata.snapshots[0].timestamp = oldTimestamp;
    await manager.saveMetadata(metadata);
    
    const deletedCount = await manager.cleanupOldSnapshots(30 * 24 * 60 * 60 * 1000); // 30 days
    
    expect(deletedCount).toBe(1);
    
    const remainingSnapshots = await manager.listSnapshots();
    expect(remainingSnapshots).toHaveLength(0);
  });

  test('should calculate file hashes correctly', async () => {
    const files = [
      {
        path: 'test.css',
        content: 'body { color: red; }',
        size: 20,
        lastModified: new Date().toISOString()
      }
    ];
    
    const hashes = await manager.calculateFileHashes(files);
    
    expect(Object.keys(hashes)).toContain('test.css');
    expect(hashes['test.css']).toHaveProperty('hash');
    expect(hashes['test.css']).toHaveProperty('size', 20);
    expect(typeof hashes['test.css'].hash).toBe('string');
    expect(hashes['test.css'].hash).toHaveLength(64); // SHA256 hash length
  });
});