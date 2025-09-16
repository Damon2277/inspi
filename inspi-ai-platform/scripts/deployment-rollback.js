#!/usr/bin/env node

/**
 * 部署回滚脚本
 * 用于在部署失败时自动回滚到上一个稳定版本
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentRollback {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.backupDir = options.backupDir || './.deployment-backups';
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  error(message) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
  }

  exec(command, options = {}) {
    if (this.verbose) {
      this.log(`Executing: ${command}`);
    }

    if (this.dryRun) {
      this.log(`DRY RUN: Would execute: ${command}`);
      return '';
    }

    try {
      return execSync(command, {
        encoding: 'utf8',
        stdio: this.verbose ? 'inherit' : 'pipe',
        ...options
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  async createBackup(version) {
    this.log(`Creating backup for version ${version}...`);
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const backupPath = path.join(this.backupDir, `backup-${version}-${Date.now()}.json`);
    
    const backupData = {
      version,
      timestamp: new Date().toISOString(),
      packageJson: JSON.parse(fs.readFileSync('package.json', 'utf8')),
      gitCommit: this.exec('git rev-parse HEAD').trim(),
      gitBranch: this.exec('git rev-parse --abbrev-ref HEAD').trim(),
      environment: process.env.NODE_ENV || 'development'
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    this.log(`✅ Backup created: ${backupPath}`);
    
    return backupPath;
  }

  getPreviousStableVersion(currentVersion) {
    this.log('Finding previous stable version...');
    
    try {
      // Get all version tags, sorted by version
      const tags = this.exec('git tag --sort=-version:refname')
        .split('\n')
        .filter(tag => tag.match(/^v\d+\.\d+\.\d+$/))
        .map(tag => tag.replace(/^v/, ''));

      this.log(`Available stable versions: ${tags.join(', ')}`);

      // Find the previous version (not the current one)
      const currentIndex = tags.indexOf(currentVersion);
      if (currentIndex === -1) {
        throw new Error(`Current version ${currentVersion} not found in git tags`);
      }

      if (currentIndex === tags.length - 1) {
        throw new Error('No previous stable version found');
      }

      const previousVersion = tags[currentIndex + 1];
      this.log(`Previous stable version: ${previousVersion}`);
      
      return previousVersion;
    } catch (error) {
      throw new Error(`Failed to find previous stable version: ${error.message}`);
    }
  }

  async rollbackToVersion(targetVersion) {
    this.log(`Starting rollback to version ${targetVersion}...`);

    try {
      // Create backup of current state
      const currentVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
      await this.createBackup(currentVersion);

      // Checkout the target version tag
      this.log(`Checking out version ${targetVersion}...`);
      this.exec(`git checkout v${targetVersion}`);

      // Update package.json version
      this.log('Updating package.json...');
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      packageJson.version = targetVersion;
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

      // Install dependencies
      this.log('Installing dependencies...');
      this.exec('pnpm install --frozen-lockfile');

      // Build the application
      this.log('Building application...');
      this.exec('pnpm build');

      // Run basic tests
      this.log('Running basic tests...');
      this.exec('pnpm test:unit');

      this.log(`✅ Successfully rolled back to version ${targetVersion}`);
      return targetVersion;

    } catch (error) {
      this.error(`Rollback failed: ${error.message}`);
      
      // Attempt to restore from backup
      try {
        this.log('Attempting to restore from backup...');
        this.exec('git checkout main');
        this.log('Restored to main branch');
      } catch (restoreError) {
        this.error(`Failed to restore from backup: ${restoreError.message}`);
      }
      
      throw error;
    }
  }

  async verifyRollback(targetVersion, baseUrl) {
    this.log('Verifying rollback...');

    try {
      // Wait for deployment to stabilize
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Check if deployment verification script exists
      const verificationScript = path.join(__dirname, 'deployment-verification.js');
      if (fs.existsSync(verificationScript)) {
        this.log('Running deployment verification...');
        this.exec(`node ${verificationScript} ${baseUrl} ${targetVersion}`);
      } else {
        // Basic verification
        this.log('Running basic verification...');
        const https = require('https');
        const http = require('http');
        
        const client = baseUrl.startsWith('https:') ? https : http;
        
        await new Promise((resolve, reject) => {
          const req = client.request(`${baseUrl}/api/health`, (res) => {
            if (res.statusCode === 200) {
              this.log('✅ Health check passed');
              resolve();
            } else {
              reject(new Error(`Health check failed: ${res.statusCode}`));
            }
          });
          
          req.on('error', reject);
          req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Health check timeout'));
          });
          
          req.end();
        });
      }

      this.log('✅ Rollback verification successful');
      return true;

    } catch (error) {
      this.error(`Rollback verification failed: ${error.message}`);
      throw error;
    }
  }

  async performEmergencyRollback(currentVersion, baseUrl) {
    this.log('🚨 Performing emergency rollback...');

    try {
      // Find previous stable version
      const previousVersion = this.getPreviousStableVersion(currentVersion);
      
      // Perform rollback
      await this.rollbackToVersion(previousVersion);
      
      // Verify rollback if URL provided
      if (baseUrl) {
        await this.verifyRollback(previousVersion, baseUrl);
      }

      this.log(`🎉 Emergency rollback completed successfully to version ${previousVersion}`);
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: previousVersion,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.error(`Emergency rollback failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        fromVersion: currentVersion,
        timestamp: new Date().toISOString()
      };
    }
  }

  listBackups() {
    this.log('Available backups:');
    
    if (!fs.existsSync(this.backupDir)) {
      this.log('No backups found');
      return [];
    }

    const backups = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => {
        const backupPath = path.join(this.backupDir, file);
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        return {
          file,
          version: backup.version,
          timestamp: backup.timestamp,
          path: backupPath
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    backups.forEach(backup => {
      this.log(`  ${backup.version} - ${backup.timestamp} (${backup.file})`);
    });

    return backups;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const rollback = new DeploymentRollback({
    verbose: args.includes('--verbose') || process.env.VERBOSE === 'true',
    dryRun: args.includes('--dry-run')
  });

  switch (command) {
    case 'emergency':
      const currentVersion = args[1];
      const baseUrl = args[2];
      
      if (!currentVersion) {
        console.error('Usage: node deployment-rollback.js emergency <current-version> [base-url]');
        process.exit(1);
      }

      rollback.performEmergencyRollback(currentVersion, baseUrl)
        .then(result => {
          if (result.success) {
            console.log('Emergency rollback completed successfully');
            process.exit(0);
          } else {
            console.error('Emergency rollback failed');
            process.exit(1);
          }
        })
        .catch(error => {
          console.error('Emergency rollback failed:', error.message);
          process.exit(1);
        });
      break;

    case 'to-version':
      const targetVersion = args[1];
      
      if (!targetVersion) {
        console.error('Usage: node deployment-rollback.js to-version <target-version>');
        process.exit(1);
      }

      rollback.rollbackToVersion(targetVersion)
        .then(() => {
          console.log(`Rollback to version ${targetVersion} completed successfully`);
          process.exit(0);
        })
        .catch(error => {
          console.error('Rollback failed:', error.message);
          process.exit(1);
        });
      break;

    case 'list-backups':
      rollback.listBackups();
      break;

    case 'verify':
      const verifyVersion = args[1];
      const verifyUrl = args[2];
      
      if (!verifyVersion || !verifyUrl) {
        console.error('Usage: node deployment-rollback.js verify <version> <base-url>');
        process.exit(1);
      }

      rollback.verifyRollback(verifyVersion, verifyUrl)
        .then(() => {
          console.log('Rollback verification successful');
          process.exit(0);
        })
        .catch(error => {
          console.error('Rollback verification failed:', error.message);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage: node deployment-rollback.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  emergency <current-version> [base-url]  - Perform emergency rollback');
      console.log('  to-version <target-version>             - Rollback to specific version');
      console.log('  list-backups                            - List available backups');
      console.log('  verify <version> <base-url>             - Verify rollback');
      console.log('');
      console.log('Options:');
      console.log('  --verbose    - Enable verbose logging');
      console.log('  --dry-run    - Show what would be done without executing');
      process.exit(1);
  }
}

module.exports = DeploymentRollback;