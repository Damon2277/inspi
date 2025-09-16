import { DependencyAnalyzer, FileDependency, ImpactAnalysis } from '../../../../lib/testing/incremental/DependencyAnalyzer';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');
jest.mock('glob');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;
  const mockProjectRoot = '/mock/project';

  beforeEach(() => {
    // Mock path operations
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.relative.mockImplementation((from, to) => to.replace(from + '/', ''));
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    mockPath.basename.mockImplementation((p, ext) => {
      const name = p.split('/').pop() || '';
      return ext ? name.replace(ext, '') : name;
    });
    mockPath.extname.mockImplementation((p) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    });

    // Mock fs operations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({
      mtime: new Date('2023-01-01'),
      isDirectory: () => false
    } as any);
    mockFs.readFileSync.mockReturnValue('// mock file content');

    // Mock glob
    const glob = require('glob');
    glob.sync = jest.fn().mockReturnValue([
      '/mock/project/src/component.tsx',
      '/mock/project/src/utils.ts',
      '/mock/project/src/__tests__/component.test.tsx'
    ]);

    analyzer = new DependencyAnalyzer(mockProjectRoot);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with project root', () => {
      expect(analyzer).toBeInstanceOf(DependencyAnalyzer);
    });

    it('should load TypeScript config if available', () => {
      mockFs.existsSync.mockImplementation((path) => 
        path.toString().includes('tsconfig.json')
      );
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        compilerOptions: {
          target: 'es2020',
          module: 'commonjs'
        }
      }));

      const analyzerWithConfig = new DependencyAnalyzer(mockProjectRoot, '/mock/project/tsconfig.json');
      expect(analyzerWithConfig).toBeInstanceOf(DependencyAnalyzer);
    });
  });

  describe('file type detection', () => {
    it('should identify test files correctly', () => {
      const testFiles = [
        'component.test.ts',
        'utils.spec.tsx',
        '__tests__/component.test.js',
        'test/utils.test.jsx'
      ];

      testFiles.forEach(file => {
        expect(analyzer['isTestFile'](file)).toBe(true);
      });
    });

    it('should identify config files correctly', () => {
      const configFiles = [
        'jest.config.js',
        'webpack.config.ts',
        'tsconfig.json',
        'package.json',
        '.env.local',
        '.eslintrc.js'
      ];

      configFiles.forEach(file => {
        expect(analyzer['isConfigFile'](file)).toBe(true);
      });
    });

    it('should identify asset files correctly', () => {
      const assetFiles = [
        'styles.css',
        'image.png',
        'icon.svg',
        'data.json'
      ];

      assetFiles.forEach(file => {
        expect(analyzer['isAssetFile'](file)).toBe(true);
      });
    });

    it('should identify source files correctly', () => {
      const sourceFile = 'component.tsx';
      expect(analyzer['determineFileType'](sourceFile)).toBe('source');
    });
  });

  describe('dependency extraction', () => {
    it('should extract TypeScript dependencies', () => {
      const tsContent = `
        import React from 'react';
        import { Component } from './component';
        import utils from '../utils';
        export { default } from './default';
      `;

      mockFs.readFileSync.mockReturnValue(tsContent);
      
      const dependencies = analyzer['extractTypeScriptDependencies'](tsContent, 'src/index.ts');
      
      expect(dependencies).toContain('./component');
      expect(dependencies).toContain('../utils');
      expect(dependencies).toContain('./default');
      expect(dependencies).not.toContain('react'); // External dependency
    });

    it('should extract dependencies with regex fallback', () => {
      const jsContent = `
        const React = require('react');
        const utils = require('./utils');
        import('./dynamic-import');
      `;

      const dependencies = analyzer['extractDependenciesWithRegex'](jsContent, 'src/index.js');
      
      expect(dependencies).toContain('./utils');
      expect(dependencies).toContain('./dynamic-import');
      expect(dependencies).not.toContain('react');
    });

    it('should resolve relative dependencies', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('component.tsx');
      });

      const dependencies = ['./component', '../utils'];
      const resolved = analyzer['resolveDependencies'](dependencies, 'src/pages/index.ts');
      
      expect(resolved).toContain('src/pages/component.tsx');
    });

    it('should handle missing files in dependency resolution', () => {
      mockFs.existsSync.mockReturnValue(false);

      const dependencies = ['./nonexistent'];
      const resolved = analyzer['resolveDependencies'](dependencies, 'src/index.ts');
      
      expect(resolved).toHaveLength(0);
    });
  });

  describe('dependency graph building', () => {
    it('should build dependency graph successfully', async () => {
      const mockFiles = [
        '/mock/project/src/component.tsx',
        '/mock/project/src/utils.ts',
        '/mock/project/src/__tests__/component.test.tsx'
      ];

      const glob = require('glob');
      glob.sync.mockReturnValue(mockFiles);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('component.tsx')) {
          return `import { helper } from './utils';`;
        }
        if (path.toString().includes('component.test.tsx')) {
          return `import { Component } from '../component';`;
        }
        return '';
      });

      await analyzer.buildDependencyGraph();

      const stats = analyzer.getGraphStats();
      expect(stats.totalFiles).toBe(3);
      expect(stats.sourceFiles).toBe(2);
      expect(stats.testFiles).toBe(1);
    });

    it('should handle file analysis errors gracefully', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // Should not throw
      await expect(analyzer.buildDependencyGraph()).resolves.not.toThrow();
    });
  });

  describe('impact analysis', () => {
    beforeEach(async () => {
      // Set up a mock dependency graph
      const mockFiles = [
        '/mock/project/src/component.tsx',
        '/mock/project/src/utils.ts',
        '/mock/project/src/__tests__/component.test.tsx'
      ];

      const glob = require('glob');
      glob.sync.mockReturnValue(mockFiles);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('component.tsx')) {
          return `import { helper } from './utils';`;
        }
        if (path.toString().includes('component.test.tsx')) {
          return `import { Component } from '../component';`;
        }
        return '';
      });

      await analyzer.buildDependencyGraph();
    });

    it('should analyze impact of changed files', () => {
      const changedFiles = ['src/utils.ts'];
      const impact = analyzer.analyzeImpact(changedFiles);

      expect(impact.changedFiles).toContain('src/utils.ts');
      expect(impact.directlyAffectedFiles).toContain('src/component.tsx');
      expect(impact.affectedTestFiles).toContain('src/__tests__/component.test.tsx');
    });

    it('should handle test file changes', () => {
      const changedFiles = ['src/__tests__/component.test.tsx'];
      const impact = analyzer.analyzeImpact(changedFiles);

      expect(impact.changedFiles).toContain('src/__tests__/component.test.tsx');
      expect(impact.affectedTestFiles).toContain('src/__tests__/component.test.tsx');
    });

    it('should find transitive dependencies', () => {
      // Mock a chain: A -> B -> C
      analyzer['dependencyGraph'].edges.set('src/a.ts', new Set(['src/b.ts']));
      analyzer['dependencyGraph'].edges.set('src/b.ts', new Set(['src/c.ts']));
      analyzer['dependencyGraph'].reverseEdges.set('src/b.ts', new Set(['src/a.ts']));
      analyzer['dependencyGraph'].reverseEdges.set('src/c.ts', new Set(['src/b.ts']));

      const impact = analyzer.analyzeImpact(['src/c.ts']);

      expect(impact.directlyAffectedFiles).toContain('src/b.ts');
      expect(impact.transitivelyAffectedFiles).toContain('src/a.ts');
    });
  });

  describe('test coverage analysis', () => {
    it('should identify tests for source files', () => {
      const sourceFile = 'src/component.tsx';
      const tests = analyzer['findTestsForSourceFile'](sourceFile);

      // Should find conventional test file names
      expect(tests).toEqual(expect.arrayContaining([
        expect.stringMatching(/component\.test\.(ts|tsx)$/),
        expect.stringMatching(/component\.spec\.(ts|tsx)$/),
        expect.stringMatching(/__tests__.*component\.test\.(ts|tsx)$/)
      ]));
    });

    it('should get test coverage for test files', () => {
      // Mock a test file with source dependencies
      analyzer['dependencyGraph'].nodes.set('src/test.spec.ts', {
        filePath: 'src/test.spec.ts',
        dependencies: ['src/component.ts', 'src/utils.ts'],
        dependents: [],
        type: 'test',
        lastModified: new Date()
      });

      analyzer['dependencyGraph'].nodes.set('src/component.ts', {
        filePath: 'src/component.ts',
        dependencies: [],
        dependents: [],
        type: 'source',
        lastModified: new Date()
      });

      const coverage = analyzer['getTestCoverage']('src/test.spec.ts');
      expect(coverage).toContain('src/component.ts');
    });
  });

  describe('graph statistics', () => {
    it('should provide accurate graph statistics', () => {
      // Mock some nodes
      analyzer['dependencyGraph'].nodes.set('src/component.ts', {
        filePath: 'src/component.ts',
        dependencies: ['src/utils.ts'],
        dependents: [],
        type: 'source',
        lastModified: new Date()
      });

      analyzer['dependencyGraph'].nodes.set('src/test.spec.ts', {
        filePath: 'src/test.spec.ts',
        dependencies: ['src/component.ts'],
        dependents: [],
        type: 'test',
        lastModified: new Date()
      });

      const stats = analyzer.getGraphStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.sourceFiles).toBe(1);
      expect(stats.testFiles).toBe(1);
      expect(stats.totalDependencies).toBe(2);
      expect(stats.averageDependencies).toBe(1);
    });
  });

  describe('graph export/import', () => {
    it('should export dependency graph', () => {
      analyzer['dependencyGraph'].nodes.set('src/file.ts', {
        filePath: 'src/file.ts',
        dependencies: [],
        dependents: [],
        type: 'source',
        lastModified: new Date('2023-01-01')
      });

      const exported = analyzer.exportGraph();

      expect(exported.nodes).toHaveLength(1);
      expect(exported.nodes[0].path).toBe('src/file.ts');
      expect(exported.stats).toBeDefined();
    });

    it('should import dependency graph', () => {
      const graphData = {
        nodes: [{
          path: 'src/imported.ts',
          filePath: 'src/imported.ts',
          dependencies: [],
          dependents: [],
          type: 'source',
          lastModified: '2023-01-01T00:00:00.000Z'
        }],
        edges: [{
          from: 'src/imported.ts',
          to: []
        }]
      };

      analyzer.importGraph(graphData);

      const node = analyzer['dependencyGraph'].nodes.get('src/imported.ts');
      expect(node).toBeDefined();
      expect(node?.type).toBe('source');
    });
  });

  describe('error handling', () => {
    it('should handle TypeScript parsing errors', () => {
      const invalidTs = 'invalid typescript syntax {{{';
      
      // Should not throw
      const dependencies = analyzer['extractTypeScriptDependencies'](invalidTs, 'src/invalid.ts');
      expect(dependencies).toEqual([]);
    });

    it('should handle file system errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      await expect(analyzer.buildDependencyGraph()).resolves.not.toThrow();
    });
  });
});