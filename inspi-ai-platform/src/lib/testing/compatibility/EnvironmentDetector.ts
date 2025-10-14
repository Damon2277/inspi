/**
 * Environment Detection System
 * Detects and analyzes the current testing environment
 */

import { execSync } from 'child_process';
import os from 'os';
import process from 'process';

import { EnvironmentInfo, NodeVersionInfo } from './types';

export class EnvironmentDetector {
  /**
   * Get comprehensive environment information
   */
  static async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    const platform = process.platform;
    const arch = process.arch;
    const nodeVersion = process.version;
    const npmVersion = await this.getNpmVersion();
    const osVersion = await this.getOSVersion();
    const cpuCount = os.cpus().length;
    const totalMemory = os.totalmem();
    const availableMemory = os.freemem();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;

    return {
      platform,
      arch,
      nodeVersion,
      npmVersion,
      osVersion,
      cpuCount,
      totalMemory,
      availableMemory,
      timezone,
      locale,
    };
  }

  /**
   * Get detailed Node.js version information
   */
  static getNodeVersionInfo(): NodeVersionInfo {
    const version = process.version;
    const versionMatch = version.match(/^v(\d+)\.(\d+)\.(\d+)/);

    if (!versionMatch) {
      throw new Error(`Invalid Node.js version format: ${version}`);
    }

    const [, majorStr, minorStr, patchStr] = versionMatch;
    const major = parseInt(majorStr, 10);
    const minor = parseInt(minorStr, 10);
    const patch = parseInt(patchStr, 10);

    // Check if it's an LTS version (simplified check)
    const lts = this.isLTSVersion(major);
    const supported = this.isSupportedVersion(major, minor);
    const features = this.getNodeFeatures(major, minor);

    return {
      version,
      major,
      minor,
      patch,
      lts,
      supported,
      features,
    };
  }

  /**
   * Check if the current environment is CI/CD
   */
  static isCI(): boolean {
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

  /**
   * Check if running in a container
   */
  static isContainer(): boolean {
    try {
      // Check for Docker
      if (process.env.DOCKER_CONTAINER) return true;

      // Check for container-specific files
      const fs = require('fs');
      if (fs.existsSync('/.dockerenv')) return true;

      // Check cgroup for container indicators
      if (fs.existsSync('/proc/1/cgroup')) {
        const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
        return cgroup.includes('docker') || cgroup.includes('containerd');
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get container runtime information
   */
  static getContainerInfo(): { runtime: string; version?: string } | null {
    if (!this.isContainer()) return null;

    try {
      // Try to detect Docker
      if (process.env.DOCKER_CONTAINER) {
        return { runtime: 'docker' };
      }

      // Check for runtime binaries
      const runtimes = ['docker', 'podman', 'containerd'];
      for (const runtime of runtimes) {
        try {
          const version = execSync(`${runtime} --version`, {
            encoding: 'utf8',
            timeout: 5000,
            stdio: 'pipe',
          }).trim();
          return { runtime, version };
        } catch {
          continue;
        }
      }

      return { runtime: 'unknown' };
    } catch {
      return { runtime: 'unknown' };
    }
  }

  /**
   * Check environment compatibility
   */
  static checkCompatibility(): {
    compatible: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    const nodeInfo = this.getNodeVersionInfo();

    // Check Node.js version
    if (!nodeInfo.supported) {
      issues.push(`Unsupported Node.js version: ${nodeInfo.version}`);
    }

    if (nodeInfo.major < 18) {
      warnings.push('Node.js version below 18 may have limited feature support');
    }

    // Check platform-specific issues
    const platform = process.platform;
    if (platform === 'win32') {
      warnings.push('Windows platform may have path separator issues');
    }

    // Check memory availability
    const availableGB = os.freemem() / (1024 * 1024 * 1024);
    if (availableGB < 1) {
      warnings.push('Low available memory may affect test performance');
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Get npm version
   */
  private static async getNpmVersion(): Promise<string> {
    try {
      return execSync('npm --version', {
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe',
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get OS version information
   */
  private static async getOSVersion(): Promise<string> {
    try {
      const platform = process.platform;

      switch (platform) {
        case 'darwin':
          return execSync('sw_vers -productVersion', {
            encoding: 'utf8',
            timeout: 5000,
            stdio: 'pipe',
          }).trim();
        case 'linux':
          try {
            return execSync('lsb_release -d -s', {
              encoding: 'utf8',
              timeout: 5000,
              stdio: 'pipe',
            }).trim().replace(/"/g, '');
          } catch {
            return execSync('cat /etc/os-release | grep PRETTY_NAME', {
              encoding: 'utf8',
              timeout: 5000,
              stdio: 'pipe',
            }).split('=')[1]?.replace(/"/g, '') || 'Linux';
          }
        case 'win32':
          return execSync('ver', {
            encoding: 'utf8',
            timeout: 5000,
            stdio: 'pipe',
          }).trim();
        default:
          return `${platform} ${os.release()}`;
      }
    } catch {
      return `${process.platform} ${os.release()}`;
    }
  }

  /**
   * Check if Node.js version is LTS
   */
  private static isLTSVersion(major: number): boolean {
    // LTS versions are even-numbered major versions
    return major % 2 === 0 && major >= 18;
  }

  /**
   * Check if Node.js version is supported
   */
  private static isSupportedVersion(major: number, minor: number): boolean {
    // Support Node.js 18+ (adjust based on project requirements)
    return major >= 18;
  }

  /**
   * Get available Node.js features for version
   */
  private static getNodeFeatures(major: number, minor: number): string[] {
    const features: string[] = [];

    if (major >= 18) {
      features.push('fetch', 'test-runner', 'watch-mode');
    }

    if (major >= 19) {
      features.push('stable-test-runner');
    }

    if (major >= 20) {
      features.push('permission-model', 'single-executable-apps');
    }

    return features;
  }
}
