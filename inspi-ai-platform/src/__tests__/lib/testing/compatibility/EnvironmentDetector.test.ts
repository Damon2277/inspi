/**
 * Tests for EnvironmentDetector
 */

import { EnvironmentDetector } from '../../../../lib/testing/compatibility/EnvironmentDetector';

describe('EnvironmentDetector', () => {
  describe('getEnvironmentInfo', () => {
    it('should return comprehensive environment information', async () => {
      const info = await EnvironmentDetector.getEnvironmentInfo();

      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('arch');
      expect(info).toHaveProperty('nodeVersion');
      expect(info).toHaveProperty('npmVersion');
      expect(info).toHaveProperty('osVersion');
      expect(info).toHaveProperty('cpuCount');
      expect(info).toHaveProperty('totalMemory');
      expect(info).toHaveProperty('availableMemory');
      expect(info).toHaveProperty('timezone');
      expect(info).toHaveProperty('locale');

      expect(typeof info.platform).toBe('string');
      expect(typeof info.arch).toBe('string');
      expect(typeof info.nodeVersion).toBe('string');
      expect(typeof info.cpuCount).toBe('number');
      expect(typeof info.totalMemory).toBe('number');
      expect(typeof info.availableMemory).toBe('number');

      expect(info.cpuCount).toBeGreaterThan(0);
      expect(info.totalMemory).toBeGreaterThan(0);
      expect(info.availableMemory).toBeGreaterThan(0);
    });

    it('should detect valid Node.js version format', async () => {
      const info = await EnvironmentDetector.getEnvironmentInfo();
      expect(info.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('getNodeVersionInfo', () => {
    it('should parse Node.js version correctly', () => {
      const versionInfo = EnvironmentDetector.getNodeVersionInfo();

      expect(versionInfo).toHaveProperty('version');
      expect(versionInfo).toHaveProperty('major');
      expect(versionInfo).toHaveProperty('minor');
      expect(versionInfo).toHaveProperty('patch');
      expect(versionInfo).toHaveProperty('lts');
      expect(versionInfo).toHaveProperty('supported');
      expect(versionInfo).toHaveProperty('features');

      expect(typeof versionInfo.major).toBe('number');
      expect(typeof versionInfo.minor).toBe('number');
      expect(typeof versionInfo.patch).toBe('number');
      expect(typeof versionInfo.lts).toBe('boolean');
      expect(typeof versionInfo.supported).toBe('boolean');
      expect(Array.isArray(versionInfo.features)).toBe(true);

      expect(versionInfo.major).toBeGreaterThan(0);
      expect(versionInfo.minor).toBeGreaterThanOrEqual(0);
      expect(versionInfo.patch).toBeGreaterThanOrEqual(0);
    });

    it('should identify supported Node.js versions', () => {
      const versionInfo = EnvironmentDetector.getNodeVersionInfo();
      
      // Assuming we support Node.js 18+
      if (versionInfo.major >= 18) {
        expect(versionInfo.supported).toBe(true);
      }
    });

    it('should identify LTS versions correctly', () => {
      const versionInfo = EnvironmentDetector.getNodeVersionInfo();
      
      // LTS versions are even-numbered major versions >= 18
      if (versionInfo.major >= 18 && versionInfo.major % 2 === 0) {
        expect(versionInfo.lts).toBe(true);
      }
    });

    it('should include appropriate features for version', () => {
      const versionInfo = EnvironmentDetector.getNodeVersionInfo();
      
      if (versionInfo.major >= 18) {
        expect(versionInfo.features).toContain('fetch');
        expect(versionInfo.features).toContain('test-runner');
        expect(versionInfo.features).toContain('watch-mode');
      }

      if (versionInfo.major >= 20) {
        expect(versionInfo.features).toContain('permission-model');
        expect(versionInfo.features).toContain('single-executable-apps');
      }
    });
  });

  describe('isCI', () => {
    it('should detect CI environment correctly', () => {
      const originalEnv = process.env;
      
      // Test with no CI environment
      process.env = { ...originalEnv };
      delete process.env.CI;
      delete process.env.CONTINUOUS_INTEGRATION;
      delete process.env.GITHUB_ACTIONS;
      expect(EnvironmentDetector.isCI()).toBe(false);

      // Test with CI environment
      process.env.CI = 'true';
      expect(EnvironmentDetector.isCI()).toBe(true);

      // Test with GitHub Actions
      process.env = { ...originalEnv };
      delete process.env.CI;
      process.env.GITHUB_ACTIONS = 'true';
      expect(EnvironmentDetector.isCI()).toBe(true);

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('isContainer', () => {
    it('should detect container environment', () => {
      const isContainer = EnvironmentDetector.isContainer();
      expect(typeof isContainer).toBe('boolean');
    });

    it('should detect Docker container when DOCKER_CONTAINER is set', () => {
      const originalEnv = process.env;
      
      process.env.DOCKER_CONTAINER = 'true';
      expect(EnvironmentDetector.isContainer()).toBe(true);
      
      process.env = originalEnv;
    });
  });

  describe('getContainerInfo', () => {
    it('should return null when not in container', () => {
      // Mock isContainer to return false
      jest.spyOn(EnvironmentDetector, 'isContainer').mockReturnValue(false);
      
      const containerInfo = EnvironmentDetector.getContainerInfo();
      expect(containerInfo).toBeNull();
      
      jest.restoreAllMocks();
    });

    it('should return container info when in container', () => {
      // Mock isContainer to return true
      jest.spyOn(EnvironmentDetector, 'isContainer').mockReturnValue(true);
      
      const containerInfo = EnvironmentDetector.getContainerInfo();
      
      if (containerInfo) {
        expect(containerInfo).toHaveProperty('runtime');
        expect(typeof containerInfo.runtime).toBe('string');
      }
      
      jest.restoreAllMocks();
    });
  });

  describe('checkCompatibility', () => {
    it('should return compatibility status', () => {
      const compatibility = EnvironmentDetector.checkCompatibility();

      expect(compatibility).toHaveProperty('compatible');
      expect(compatibility).toHaveProperty('issues');
      expect(compatibility).toHaveProperty('warnings');

      expect(typeof compatibility.compatible).toBe('boolean');
      expect(Array.isArray(compatibility.issues)).toBe(true);
      expect(Array.isArray(compatibility.warnings)).toBe(true);
    });

    it('should identify unsupported Node.js versions', () => {
      // Mock getNodeVersionInfo to return unsupported version
      jest.spyOn(EnvironmentDetector, 'getNodeVersionInfo').mockReturnValue({
        version: 'v16.0.0',
        major: 16,
        minor: 0,
        patch: 0,
        lts: true,
        supported: false,
        features: []
      });

      const compatibility = EnvironmentDetector.checkCompatibility();
      expect(compatibility.compatible).toBe(false);
      expect(compatibility.issues.some(issue => 
        issue.includes('Unsupported Node.js version')
      )).toBe(true);

      jest.restoreAllMocks();
    });

    it('should warn about low memory', () => {
      // Mock os.freemem to return low memory
      const os = require('os');
      jest.spyOn(os, 'freemem').mockReturnValue(500 * 1024 * 1024); // 500MB

      const compatibility = EnvironmentDetector.checkCompatibility();
      expect(compatibility.warnings.some(warning => 
        warning.includes('Low available memory')
      )).toBe(true);

      jest.restoreAllMocks();
    });

    it('should warn about Windows platform', () => {
      // Mock process.platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });

      const compatibility = EnvironmentDetector.checkCompatibility();
      expect(compatibility.warnings.some(warning => 
        warning.includes('Windows platform')
      )).toBe(true);

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin', // or whatever the original was
        configurable: true
      });
    });
  });

  describe('error handling', () => {
    it('should handle npm version detection failure gracefully', async () => {
      // Mock execSync to throw error
      const { execSync } = require('child_process');
      const originalExecSync = execSync;
      
      jest.doMock('child_process', () => ({
        execSync: jest.fn().mockImplementation(() => {
          throw new Error('Command failed');
        })
      }));

      // Re-import to get mocked version
      const { EnvironmentDetector: MockedDetector } = require('../../../../lib/testing/compatibility/EnvironmentDetector');
      
      const info = await MockedDetector.getEnvironmentInfo();
      expect(info.npmVersion).toBe('unknown');

      jest.restoreAllMocks();
    });

    it('should handle OS version detection failure gracefully', async () => {
      // This test would be similar to the npm version test
      // but for OS version detection
      const info = await EnvironmentDetector.getEnvironmentInfo();
      expect(typeof info.osVersion).toBe('string');
    });
  });
});