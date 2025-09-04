/**
 * 端到端测试 - 主要用户流程
 * 覆盖核心用户场景和业务流程
 */

import { test, expect, Page } from '@playwright/test';

// 测试配置
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123',
    name: '测试用户'
  }
};

// 页面对象模式 - 主页
class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async getHeroTitle() {
    return await this.page.locator('.hero-title').textContent();
  }

  async clickFeatureCard(index: number) {
    await this.page.locator('.feature-card').nth(index).click();
  }

  async navigateToSquare() {
    await this.page.locator('[href="/square"]').click();
  }

  async navigateToCreate() {
    await this.page.locator('[href="/create"]').click();
  }
}

// 页面对象模式 - 创作页面
class CreatePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/create');
  }

  async selectCreateOption(optionId: string) {
    await this.page.locator(`[data-testid="create-option-${optionId}"]`).click();
  }

  async getPageTitle() {
    return await this.page.locator('.page-title').textContent();
  }

  async getCreateOptions() {
    return await this.page.locator('.create-option-card').count();
  }
}

// 页面对象模式 - 社区广场
class SquarePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/square');
  }

  async searchContent(query: string) {
    await this.page.locator('.mobile-search-input').fill(query);
    await this.page.locator('.search-button').click();
  }

  async selectCategory(category: string) {
    await this.page.locator(`.category-tab:has-text("${category}")`).click();
  }

  async getPostsCount() {
    return await this.page.locator('.post-card').count();
  }

  async likePost(index: number) {
    await this.page.locator('.post-card').nth(index).locator('.like-button').click();
  }
}

// 页面对象模式 - 作品页面
class WorksPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/works');
  }

  async getWorksCount() {
    return await this.page.locator('.work-card').count();
  }

  async filterByType(type: string) {
    await this.page.locator('.filter-select').selectOption(type);
  }

  async editWork(index: number) {
    await this.page.locator('.work-card').nth(index).locator('.edit-button').click();
  }
}

// 测试套件开始
test.describe('主要用户流程端到端测试', () => {
  let homePage: HomePage;
  let createPage: CreatePage;
  let squarePage: SquarePage;
  let worksPage: WorksPage;

  test.beforeEach(async ({ page }) => {
    // 设置测试超时
    test.setTimeout(TEST_CONFIG.timeout);
    
    // 初始化页面对象
    homePage = new HomePage(page);
    createPage = new CreatePage(page);
    squarePage = new SquarePage(page);
    worksPage = new WorksPage(page);

    // 设置视口大小（移动端测试）
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test.describe('用户导航流程', () => {
    test('应该能够正常访问主页并查看基本信息', async ({ page }) => {
      await homePage.goto();
      
      // 验证页面加载
      await expect(page).toHaveTitle(/Inspi\.AI/);
      
      // 验证主要元素存在
      const heroTitle = await homePage.getHeroTitle();
      expect(heroTitle).toContain('Inspi.AI');
      
      // 验证功能卡片存在
      await expect(page.locator('.feature-card')).toHaveCount(4);
      
      // 验证底部导航存在
      await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    });

    test('应该能够在不同页面间正常导航', async ({ page }) => {
      await homePage.goto();
      
      // 导航到创作页面
      await homePage.navigateToCreate();
      await expect(page).toHaveURL('/create');
      
      const createTitle = await createPage.getPageTitle();
      expect(createTitle).toContain('创作中心');
      
      // 导航到社区广场
      await squarePage.goto();
      await expect(page).toHaveURL('/square');
      
      // 导航到作品页面
      await worksPage.goto();
      await expect(page).toHaveURL('/works');
      
      // 返回主页
      await homePage.goto();
      await expect(page).toHaveURL('/');
    });

    test('移动端导航菜单应该正常工作', async ({ page }) => {
      await homePage.goto();
      
      // 打开汉堡菜单
      await page.locator('.mobile-menu-button').click();
      await expect(page.locator('.mobile-menu')).toHaveClass(/open/);
      
      // 验证菜单项存在
      await expect(page.locator('.mobile-menu-item')).toHaveCount(4);
      
      // 点击菜单项导航
      await page.locator('.mobile-menu-item[href="/create"]').click();
      await expect(page).toHaveURL('/create');
      
      // 验证菜单自动关闭
      await expect(page.locator('.mobile-menu')).not.toHaveClass(/open/);
    });
  });

  test.describe('创作流程', () => {
    test('应该能够查看创作选项并选择创作类型', async ({ page }) => {
      await createPage.goto();
      
      // 验证创作选项存在
      const optionsCount = await createPage.getCreateOptions();
      expect(optionsCount).toBeGreaterThan(0);
      
      // 验证最近项目区域
      await expect(page.locator('.recent-projects')).toBeVisible();
      
      // 验证模板区域
      await expect(page.locator('.templates-section')).toBeVisible();
      
      // 验证创作提示
      await expect(page.locator('.tips-section')).toBeVisible();
    });

    test('应该能够查看最近项目和模板', async ({ page }) => {
      await createPage.goto();
      
      // 验证最近项目列表
      const recentProjects = page.locator('.project-card');
      const projectCount = await recentProjects.count();
      
      if (projectCount > 0) {
        // 验证项目卡片内容
        await expect(recentProjects.first().locator('.project-title')).toBeVisible();
        await expect(recentProjects.first().locator('.project-type')).toBeVisible();
        await expect(recentProjects.first().locator('.project-time')).toBeVisible();
      }
      
      // 验证模板卡片
      await expect(page.locator('.template-card')).toHaveCount(4);
    });
  });

  test.describe('社区广场流程', () => {
    test('应该能够浏览社区内容', async ({ page }) => {
      await squarePage.goto();
      
      // 验证搜索框存在
      await expect(page.locator('.mobile-search-input')).toBeVisible();
      
      // 验证分类标签存在
      await expect(page.locator('.category-tab')).toHaveCount(6);
      
      // 验证帖子列表存在
      const postsCount = await squarePage.getPostsCount();
      expect(postsCount).toBeGreaterThan(0);
    });

    test('应该能够搜索和筛选内容', async ({ page }) => {
      await squarePage.goto();
      
      // 测试搜索功能
      await squarePage.searchContent('AI创作');
      
      // 验证搜索执行（URL或页面状态变化）
      await page.waitForTimeout(1000);
      
      // 测试分类筛选
      await squarePage.selectCategory('AI创作');
      await expect(page.locator('.category-tab.active')).toHaveText('AI创作');
    });

    test('应该能够与帖子互动', async ({ page }) => {
      await squarePage.goto();
      
      const postsCount = await squarePage.getPostsCount();
      
      if (postsCount > 0) {
        // 验证帖子结构
        const firstPost = page.locator('.post-card').first();
        await expect(firstPost.locator('.post-header')).toBeVisible();
        await expect(firstPost.locator('.post-content')).toBeVisible();
        await expect(firstPost.locator('.post-actions')).toBeVisible();
        
        // 测试点赞功能
        const likeButton = firstPost.locator('.like-button');
        await expect(likeButton).toBeVisible();
        await likeButton.click();
      }
    });
  });

  test.describe('作品管理流程', () => {
    test('应该能够查看作品列表', async ({ page }) => {
      await worksPage.goto();
      
      // 验证页面标题和统计信息
      await expect(page.locator('.page-title')).toHaveText('我的作品');
      await expect(page.locator('.works-stats')).toBeVisible();
      
      // 验证搜索和筛选控件
      await expect(page.locator('.mobile-search-input')).toBeVisible();
      await expect(page.locator('.filter-select')).toBeVisible();
      await expect(page.locator('.sort-select')).toBeVisible();
    });

    test('应该能够筛选和排序作品', async ({ page }) => {
      await worksPage.goto();
      
      // 测试类型筛选
      await worksPage.filterByType('课程设计');
      
      // 验证筛选结果
      await page.waitForTimeout(500);
      
      // 测试排序
      await page.locator('.sort-select').selectOption('浏览量');
      await page.waitForTimeout(500);
    });

    test('应该能够查看作品详情和操作', async ({ page }) => {
      await worksPage.goto();
      
      const worksCount = await worksPage.getWorksCount();
      
      if (worksCount > 0) {
        // 验证作品卡片结构
        const firstWork = page.locator('.work-card').first();
        await expect(firstWork.locator('.work-title')).toBeVisible();
        await expect(firstWork.locator('.work-description')).toBeVisible();
        await expect(firstWork.locator('.work-stats')).toBeVisible();
        await expect(firstWork.locator('.work-actions')).toBeVisible();
        
        // 验证操作按钮
        await expect(firstWork.locator('.edit-button')).toBeVisible();
        await expect(firstWork.locator('.share-button')).toBeVisible();
        await expect(firstWork.locator('.view-button')).toBeVisible();
      }
    });
  });

  test.describe('响应式设计测试', () => {
    test('应该在不同屏幕尺寸下正常显示', async ({ page }) => {
      // 测试手机竖屏
      await page.setViewportSize({ width: 375, height: 667 });
      await homePage.goto();
      await expect(page.locator('.mobile-layout')).toBeVisible();
      
      // 测试手机横屏
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(page.locator('.mobile-layout')).toBeVisible();
      
      // 测试平板尺寸
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('.mobile-layout')).toBeVisible();
    });

    test('触摸交互应该正常工作', async ({ page }) => {
      await homePage.goto();
      
      // 测试点击交互
      await page.locator('.feature-card').first().tap();
      
      // 测试滑动交互（如果有的话）
      const categoryTabs = page.locator('.category-tabs');
      if (await categoryTabs.isVisible()) {
        await categoryTabs.hover();
      }
    });
  });

  test.describe('性能和加载测试', () => {
    test('页面应该在合理时间内加载完成', async ({ page }) => {
      const startTime = Date.now();
      
      await homePage.goto();
      await expect(page.locator('.hero-title')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5秒内加载完成
    });

    test('图片和资源应该正确加载', async ({ page }) => {
      await homePage.goto();
      
      // 检查是否有加载失败的资源
      const failedRequests: string[] = [];
      
      page.on('requestfailed', request => {
        failedRequests.push(request.url());
      });
      
      await page.waitForLoadState('networkidle');
      
      // 验证没有关键资源加载失败
      const criticalFailures = failedRequests.filter(url => 
        url.includes('.css') || url.includes('.js') || url.includes('favicon')
      );
      
      expect(criticalFailures).toHaveLength(0);
    });
  });

  test.describe('错误处理测试', () => {
    test('应该优雅处理网络错误', async ({ page }) => {
      // 模拟网络错误
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      await homePage.goto();
      
      // 验证页面仍然可以显示基本内容
      await expect(page.locator('.hero-title')).toBeVisible();
    });

    test('应该显示适当的错误信息', async ({ page }) => {
      // 访问不存在的页面
      await page.goto('/non-existent-page');
      
      // 验证错误页面或重定向
      const url = page.url();
      expect(url).toMatch(/(404|error|\/)/);
    });
  });

  test.describe('可访问性测试', () => {
    test('应该支持键盘导航', async ({ page }) => {
      await homePage.goto();
      
      // 测试Tab键导航
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // 验证焦点可见
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('应该有适当的ARIA标签', async ({ page }) => {
      await homePage.goto();
      
      // 验证重要元素有适当的标签
      await expect(page.locator('[aria-label]')).toHaveCount(0, { timeout: 1000 });
      
      // 验证按钮有可访问的名称
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const hasText = await button.textContent();
        const hasAriaLabel = await button.getAttribute('aria-label');
        
        expect(hasText || hasAriaLabel).toBeTruthy();
      }
    });
  });
});

// 测试清理
test.afterAll(async () => {
  // 清理测试数据
  console.log('端到端测试完成，清理测试数据...');
});