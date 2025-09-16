/**
 * Test script for style snapshot functionality
 */

const StyleRecoverySystem = require('./index');
const path = require('path');

async function testSnapshotSystem() {
  console.log('🧪 Testing Style Recovery System...\n');
  
  try {
    // Initialize system
    const system = new StyleRecoverySystem({
      projectRoot: path.resolve('../../'),
      watchPatterns: [
        'inspi-ai-platform/src/**/*.css',
        'inspi-ai-platform/src/**/*.tsx',
        'inspi-ai-platform/src/app/globals.css'
      ]
    });
    
    console.log('1. Initializing system...');
    await system.initialize();
    console.log('✅ System initialized\n');
    
    // Create a test snapshot
    console.log('2. Creating test snapshot...');
    const snapshot = await system.createSnapshot({
      name: 'test-snapshot',
      description: 'Test snapshot for verification',
      isStable: true,
      tags: ['test', 'verification']
    });
    console.log('✅ Snapshot created:', snapshot.id);
    console.log(`   Files captured: ${Object.keys(snapshot.files).length}`);
    console.log(`   Total size: ${Math.round(snapshot.metadata.totalSize / 1024)}KB\n`);
    
    // List snapshots
    console.log('3. Listing snapshots...');
    const snapshots = await system.listSnapshots();
    console.log(`✅ Found ${snapshots.length} snapshots`);
    
    if (snapshots.length > 0) {
      const latest = snapshots[0];
      console.log(`   Latest: ${latest.name} (${latest.id})`);
      console.log(`   Created: ${new Date(latest.timestamp).toLocaleString()}`);
    }
    console.log('');
    
    // Get system status
    console.log('4. Checking system status...');
    const status = await system.getStatus();
    console.log('✅ System status:');
    console.log(`   Monitoring: ${status.isMonitoring ? 'Active' : 'Inactive'}`);
    console.log(`   Total snapshots: ${status.totalSnapshots}`);
    console.log(`   System health: ${status.systemHealth}\n`);
    
    console.log('🎉 All tests passed! Style snapshot system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testSnapshotSystem();