import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parentPort, workerData } from 'worker_threads';

interface WorkerMessage {
  type: 'task:execute' | 'shutdown';
  data?: any;
}

interface TaskData {
  taskId: string;
  suite: TestSuite;
}

interface TestSuite {
  id: string;
  name: string;
  files: string[];
  config: TestConfig;
  priority: 'P0' | 'P1' | 'P2';
  estimatedDuration?: number;
}

interface TestConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  maxWorkers?: number;
}

interface TestResult {
  suiteId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  tests: TestCaseResult[];
  coverage?: Coverage;
  error?: TestError;
  workerId?: number;
}

interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface Coverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface TestError {
  message: string;
  stack?: string;
  type: 'timeout' | 'assertion' | 'setup' | 'runtime';
}

/**
 * 测试工作进程
 * 在独立进程中执行测试任务，提供错误隔离
 */
class TestWorker {
  private workerId: number;
  private options: any;
  private isShuttingDown = false;

  constructor() {
    this.workerId = workerData.workerId;
    this.options = workerData.options;

    this.setupMessageHandlers();
    this.notifyReady();
  }

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(): void {
    if (!parentPort) {
      throw new Error('Worker must be run in worker thread');
    }

    parentPort.on('message', async (message: WorkerMessage) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        this.sendError('Message handling failed', error);
      }
    });

    // 处理进程退出
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * 处理消息
   */
  private async handleMessage(message: WorkerMessage): Promise<void> {
    if (this.isShuttingDown) return;

    switch (message.type) {
      case 'task:execute':
        await this.executeTask(message.data as TaskData);
        break;

      case 'shutdown':
        this.shutdown();
        break;

      default:
        this.sendError('Unknown message type', new Error(`Unknown message type: ${message.type}`));
    }
  }

  /**
   * 执行测试任务
   */
  private async executeTask(taskData: TaskData): Promise<void> {
    const { taskId, suite } = taskData;
    const startTime = Date.now();

    try {
      this.sendProgress(taskId, 'starting', 0);

      // 验证测试文件存在
      this.validateTestFiles(suite.files);

      // 执行测试
      const result = await this.runTestSuite(suite);

      const duration = Date.now() - startTime;
      result.workerId = this.workerId;

      this.sendTaskComplete(taskId, result, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      const testError = this.createTestError(error);

      this.sendTaskError(taskId, testError);
    }
  }

  /**
   * 验证测试文件
   */
  private validateTestFiles(files: string[]): void {
    for (const file of files) {
      if (!fs.existsSync(file)) {
        throw new Error(`Test file not found: ${file}`);
      }
    }
  }

  /**
   * 运行测试套件
   */
  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const testFiles = suite.files.join(' ');
    const jestConfig = this.createJestConfig(suite);

    try {
      // 创建临时配置文件
      const configPath = await this.createTempConfig(jestConfig);

      // 构建Jest命令
      const jestCommand = this.buildJestCommand(testFiles, configPath, suite.config);

      this.sendProgress(suite.id, 'running', 50);

      // 执行Jest
      const output = execSync(jestCommand, {
        encoding: 'utf8',
        timeout: suite.config.timeout,
        cwd: process.cwd(),
      });

      // 解析Jest输出
      const result = this.parseJestOutput(output, suite);

      // 清理临时文件
      this.cleanupTempConfig(configPath);

      return result;

    } catch (error) {
      throw this.createTestError(error);
    }
  }

  /**
   * 创建Jest配置
   */
  private createJestConfig(suite: TestSuite): any {
    return {
      testMatch: suite.files,
      testTimeout: suite.config.timeout,
      maxWorkers: 1, // 工作进程内部不再并行
      collectCoverage: true,
      coverageReporters: ['json'],
      coverageDirectory: `coverage/worker-${this.workerId}`,
      silent: true,
      verbose: false,
      bail: true,
      forceExit: true,
      detectOpenHandles: true,
      setupFilesAfterEnv: [
        path.join(__dirname, '../setup/jest-setup-tools.ts'),
      ],
    };
  }

  /**
   * 创建临时配置文件
   */
  private async createTempConfig(config: any): Promise<string> {
    const configPath = path.join(process.cwd(), `jest.worker.${this.workerId}.${Date.now()}.js`);
    const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;

    fs.writeFileSync(configPath, configContent);
    return configPath;
  }

  /**
   * 构建Jest命令
   */
  private buildJestCommand(testFiles: string, configPath: string, config: TestConfig): string {
    const jestPath = path.join(process.cwd(), 'node_modules/.bin/jest');

    let command = `${jestPath} --config="${configPath}" --json --coverage`;

    if (config.timeout) {
      command += ` --testTimeout=${config.timeout}`;
    }

    command += ` ${testFiles}`;

    return command;
  }

  /**
   * 解析Jest输出
   */
  private parseJestOutput(output: string, suite: TestSuite): TestResult {
    try {
      const jestResult = JSON.parse(output);

      const tests: TestCaseResult[] = [];
      let totalDuration = 0;

      // 解析测试结果
      if (jestResult.testResults) {
        for (const fileResult of jestResult.testResults) {
          totalDuration += fileResult.perfStats?.end - fileResult.perfStats?.start || 0;

          if (fileResult.assertionResults) {
            for (const assertion of fileResult.assertionResults) {
              tests.push({
                name: assertion.fullName || assertion.title,
                status: assertion.status === 'passed' ? 'passed' :
                       assertion.status === 'failed' ? 'failed' : 'skipped',
                duration: assertion.duration || 0,
                error: assertion.failureMessages?.join('\n'),
              });
            }
          }
        }
      }

      // 解析覆盖率
      const coverage = this.parseCoverage(jestResult.coverageMap);

      return {
        suiteId: suite.id,
        status: jestResult.success ? 'passed' : 'failed',
        duration: totalDuration,
        tests,
        coverage,
        error: jestResult.success ? undefined : {
          message: 'Test suite failed',
          type: 'assertion',
        },
      };

    } catch (error) {
      throw new Error(`Failed to parse Jest output: ${error.message}`);
    }
  }

  /**
   * 解析覆盖率信息
   */
  private parseCoverage(coverageMap: any): Coverage | undefined {
    if (!coverageMap) return undefined;

    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    const totalLines = 0;
    const coveredLines = 0;

    for (const filePath in coverageMap) {
      const fileCoverage = coverageMap[filePath];

      if (fileCoverage.s) {
        totalStatements += Object.keys(fileCoverage.s).length;
        coveredStatements += Object.values(fileCoverage.s).filter((count: any) => count > 0).length;
      }

      if (fileCoverage.b) {
        for (const branchData of Object.values(fileCoverage.b) as any[]) {
          totalBranches += branchData.length;
          coveredBranches += branchData.filter((count: number) => count > 0).length;
        }
      }

      if (fileCoverage.f) {
        totalFunctions += Object.keys(fileCoverage.f).length;
        coveredFunctions += Object.values(fileCoverage.f).filter((count: any) => count > 0).length;
      }
    }

    return {
      statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
    };
  }

  /**
   * 创建测试错误
   */
  private createTestError(error: any): TestError {
    if (error.signal === 'SIGTERM' || error.killed) {
      return {
        message: 'Test execution timeout',
        type: 'timeout',
        stack: error.stack,
      };
    }

    if (error.status !== 0) {
      return {
        message: error.stderr || error.stdout || 'Test execution failed',
        type: 'assertion',
        stack: error.stack,
      };
    }

    return {
      message: error.message || 'Unknown test error',
      type: 'runtime',
      stack: error.stack,
    };
  }

  /**
   * 清理临时配置文件
   */
  private cleanupTempConfig(configPath: string): void {
    try {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    } catch (error) {
      // 忽略清理错误
    }
  }

  /**
   * 发送就绪通知
   */
  private notifyReady(): void {
    this.sendMessage({
      type: 'ready',
      data: { workerId: this.workerId },
    });
  }

  /**
   * 发送进度更新
   */
  private sendProgress(taskId: string, stage: string, progress: number): void {
    this.sendMessage({
      type: 'task:progress',
      data: { taskId, stage, progress },
    });
  }

  /**
   * 发送任务完成
   */
  private sendTaskComplete(taskId: string, result: TestResult, duration: number): void {
    this.sendMessage({
      type: 'task:complete',
      data: { taskId, workerId: this.workerId, result, duration },
    });
  }

  /**
   * 发送任务错误
   */
  private sendTaskError(taskId: string, error: TestError): void {
    this.sendMessage({
      type: 'task:error',
      data: { taskId, error },
    });
  }

  /**
   * 发送错误消息
   */
  private sendError(message: string, error: any): void {
    this.sendMessage({
      type: 'error',
      data: {
        message,
        error: {
          message: error.message,
          stack: error.stack,
          type: 'runtime',
        },
      },
    });
  }

  /**
   * 发送消息到主进程
   */
  private sendMessage(message: any): void {
    if (parentPort && !this.isShuttingDown) {
      parentPort.postMessage(message);
    }
  }

  /**
   * 关闭工作进程
   */
  private shutdown(): void {
    this.isShuttingDown = true;
    process.exit(0);
  }
}

// 启动工作进程
new TestWorker();
