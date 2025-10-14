/**
 * 用户旅程端到端测试
 * 测试关键用户流程的完整体验
 */
import { test, expect, Page } from '@playwright/test';

// 测试数据
const testUser = {
  email: 'e2e-test@example.com',
  password: 'password123',
  name: 'E2E Test User',
};

const testWork = {
  title: '二次函数的图像与性质',
  knowledgePoint: '二次函数',
  subject: '数学',
  gradeLevel: '高中一年级',
  category: '概念解释',
  description: '详细介绍二次函数的图像特征和基本性质',
};

test.describe('用户完整旅程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前清理状态
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('新用户注册到创建作品的完整流程', async ({ page }) => {
    // 1. 访问首页
    await page.goto('/');
    await expect(page).toHaveTitle(/Inspi/);

    // 2. 点击注册按钮
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/.*\/auth\/register/);

    // 3. 填写注册表单
    await page.fill('[data-testid="name-input"]', testUser.name);
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.fill('[data-testid="confirm-password-input"]', testUser.password);

    // 4. 提交注册
    await page.click('[data-testid="register-submit"]');

    // 5. 验证注册成功并跳转到仪表板
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(testUser.name);

    // 6. 检查免费用户的配额显示
    await expect(page.locator('[data-testid="quota-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-quota"]')).toContainText('3'); // 免费用户每日3次

    // 7. 点击创建作品
    await page.click('[data-testid="create-work-button"]');
    await expect(page).toHaveURL(/.*\/works\/create/);

    // 8. 填写作品信息
    await page.fill('[data-testid="work-title"]', testWork.title);
    await page.fill('[data-testid="work-knowledge-point"]', testWork.knowledgePoint);
    await page.selectOption('[data-testid="work-subject"]', testWork.subject);
    await page.selectOption('[data-testid="work-grade-level"]', testWork.gradeLevel);
    await page.selectOption('[data-testid="work-category"]', testWork.category);
    await page.fill('[data-testid="work-description"]', testWork.description);

    // 9. 添加教学卡片
    await page.click('[data-testid="add-card-button"]');
    await page.fill('[data-testid="card-title-0"]', '概念介绍');
    await page.fill('[data-testid="card-content-0"]', '二次函数是形如 f(x) = ax² + bx + c 的函数');

    await page.click('[data-testid="add-card-button"]');
    await page.fill('[data-testid="card-title-1"]', '图像特征');
    await page.fill('[data-testid="card-content-1"]', '二次函数的图像是一条抛物线');

    // 10. 添加标签
    await page.fill('[data-testid="work-tags"]', '数学,函数,图像');

    // 11. 保存草稿
    await page.click('[data-testid="save-draft-button"]');
    await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible();

    // 12. 预览作品
    await page.click('[data-testid="preview-button"]');
    await expect(page.locator('[data-testid="work-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-title"]')).toContainText(testWork.title);

    // 13. 发布作品
    await page.click('[data-testid="publish-button"]');
    await page.click('[data-testid="confirm-publish"]');
    await expect(page.locator('[data-testid="publish-success-message"]')).toBeVisible();

    // 14. 验证作品出现在用户的作品列表中
    await page.goto('/dashboard/my-works');
    await expect(page.locator(`[data-testid="work-item"][data-title="${testWork.title}"]`)).toBeVisible();

    // 15. 验证配额已消费
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="create-quota"]')).toContainText('2'); // 剩余2次
  });

  test('用户登录到升级订阅的流程', async ({ page }) => {
    // 1. 访问登录页面
    await page.goto('/auth/login');

    // 2. 使用测试用户登录
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // 3. 验证登录成功
    await expect(page).toHaveURL(/.*\/dashboard/);

    // 4. 模拟配额用完的情况
    await page.evaluate(() => {
      // 模拟配额用完
      localStorage.setItem('mock-quota-exhausted', 'true');
    });

    // 5. 尝试创建作品触发升级提示
    await page.click('[data-testid="create-work-button"]');

    // 6. 验证升级提示出现
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-message"]')).toContainText('配额已用完');

    // 7. 点击查看套餐
    await page.click('[data-testid="view-plans-button"]');
    await expect(page).toHaveURL(/.*\/subscription\/plans/);

    // 8. 验证套餐页面显示
    await expect(page.locator('[data-testid="plan-free"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-basic"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-pro"]')).toBeVisible();

    // 9. 选择基础版套餐
    await page.click('[data-testid="select-plan-basic"]');

    // 10. 确认订阅信息
    await expect(page.locator('[data-testid="subscription-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-name"]')).toContainText('基础版');
    await expect(page.locator('[data-testid="plan-price"]')).toContainText('69');

    // 11. 选择支付方式
    await page.click('[data-testid="payment-method-wechat"]');

    // 12. 确认订阅
    await page.click('[data-testid="confirm-subscription"]');

    // 13. 验证支付页面
    await expect(page.locator('[data-testid="payment-qr-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('69');

    // 14. 模拟支付成功
    await page.evaluate(() => {
      // 模拟支付成功回调
      window.dispatchEvent(new CustomEvent('payment-success', {
        detail: { subscriptionId: 'test-subscription' },
      }));
    });

    // 15. 验证订阅激活
    await expect(page.locator('[data-testid="payment-success-message"]')).toBeVisible();
    await page.click('[data-testid="go-to-dashboard"]');

    // 16. 验证用户等级已升级
    await expect(page.locator('[data-testid="user-tier"]')).toContainText('基础版');
    await expect(page.locator('[data-testid="create-quota"]')).toContainText('20'); // 基础版配额
  });

  test('作品浏览和社交互动流程', async ({ page }) => {
    // 1. 访问智慧广场
    await page.goto('/community');

    // 2. 验证作品列表显示
    await expect(page.locator('[data-testid="work-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-item"]').first()).toBeVisible();

    // 3. 使用搜索功能
    await page.fill('[data-testid="search-input"]', '数学');
    await page.press('[data-testid="search-input"]', 'Enter');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // 4. 筛选作品
    await page.selectOption('[data-testid="subject-filter"]', '数学');
    await page.selectOption('[data-testid="grade-filter"]', '高中一年级');
    await page.click('[data-testid="apply-filters"]');

    // 5. 点击查看作品详情
    await page.click('[data-testid="work-item"]', { first: true });
    await expect(page).toHaveURL(/.*\/works\/.*/);

    // 6. 验证作品详情页面
    await expect(page.locator('[data-testid="work-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-author"]')).toBeVisible();

    // 7. 点赞作品
    await page.click('[data-testid="like-button"]');
    await expect(page.locator('[data-testid="like-count"]')).toContainText('1');

    // 8. 收藏作品
    await page.click('[data-testid="bookmark-button"]');
    await expect(page.locator('[data-testid="bookmark-success"]')).toBeVisible();

    // 9. 发表评论
    await page.fill('[data-testid="comment-input"]', '这个作品很有帮助，讲解清晰！');
    await page.click('[data-testid="submit-comment"]');
    await expect(page.locator('[data-testid="comment-item"]').last()).toContainText('这个作品很有帮助');

    // 10. 回复评论
    await page.click('[data-testid="reply-button"]', { first: true });
    await page.fill('[data-testid="reply-input"]', '谢谢你的反馈！');
    await page.click('[data-testid="submit-reply"]');
    await expect(page.locator('[data-testid="reply-item"]').last()).toContainText('谢谢你的反馈');

    // 11. 关注作者
    await page.click('[data-testid="follow-author-button"]');
    await expect(page.locator('[data-testid="follow-success"]')).toBeVisible();

    // 12. 复用作品
    await page.click('[data-testid="reuse-button"]');
    await expect(page).toHaveURL(/.*\/works\/create.*/);
    await expect(page.locator('[data-testid="work-title"]')).toHaveValue(/.*基于.*/);
  });

  test('知识图谱创建和编辑流程', async ({ page }) => {
    // 1. 登录用户
    await loginUser(page, 'test@example.com', 'password123');

    // 2. 访问知识图谱页面
    await page.goto('/knowledge-graph');

    // 3. 创建新的知识图谱
    await page.click('[data-testid="create-graph-button"]');
    await page.fill('[data-testid="graph-title"]', '数学知识体系');
    await page.fill('[data-testid="graph-description"]', '高中数学知识点关系图');
    await page.click('[data-testid="create-graph-confirm"]');

    // 4. 验证图谱编辑器加载
    await expect(page.locator('[data-testid="graph-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="node-toolbar"]')).toBeVisible();

    // 5. 添加知识点节点
    await page.click('[data-testid="add-node-button"]');
    await page.click('[data-testid="graph-canvas"]', { position: { x: 200, y: 200 } });
    await page.fill('[data-testid="node-title-input"]', '二次函数');
    await page.press('[data-testid="node-title-input"]', 'Enter');

    // 6. 添加第二个节点
    await page.click('[data-testid="add-node-button"]');
    await page.click('[data-testid="graph-canvas"]', { position: { x: 400, y: 200 } });
    await page.fill('[data-testid="node-title-input"]', '函数图像');
    await page.press('[data-testid="node-title-input"]', 'Enter');

    // 7. 连接节点
    await page.click('[data-testid="connect-mode-button"]');
    await page.click('[data-testid="node-二次函数"]');
    await page.click('[data-testid="node-函数图像"]');

    // 8. 验证连线创建
    await expect(page.locator('[data-testid="edge-connection"]')).toBeVisible();

    // 9. 编辑节点属性
    await page.dblclick('[data-testid="node-二次函数"]');
    await expect(page.locator('[data-testid="node-properties-panel"]')).toBeVisible();
    await page.fill('[data-testid="node-description"]', '形如 f(x) = ax² + bx + c 的函数');
    await page.selectOption('[data-testid="node-difficulty"]', 'intermediate');
    await page.click('[data-testid="save-node-properties"]');

    // 10. 保存图谱
    await page.click('[data-testid="save-graph-button"]');
    await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible();

    // 11. 分享图谱
    await page.click('[data-testid="share-graph-button"]');
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
    await page.click('[data-testid="copy-share-link"]');
    await expect(page.locator('[data-testid="link-copied-message"]')).toBeVisible();

    // 12. 导出图谱
    await page.click('[data-testid="export-graph-button"]');
    await page.selectOption('[data-testid="export-format"]', 'png');
    await page.click('[data-testid="confirm-export"]');

    // 验证下载开始
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*\.png$/);
  });

  test('移动端响应式体验测试', async ({ page }) => {
    // 1. 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. 访问首页
    await page.goto('/');

    // 3. 验证移动端导航
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // 4. 测试移动端登录
    await page.click('[data-testid="mobile-login-link"]');
    await expect(page).toHaveURL(/.*\/auth\/login/);

    // 5. 验证移动端表单
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();

    // 6. 登录
    await loginUser(page, 'test@example.com', 'password123');

    // 7. 验证移动端仪表板
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-stats-cards"]')).toBeVisible();

    // 8. 测试移动端作品浏览
    await page.goto('/community');
    await expect(page.locator('[data-testid="mobile-work-list"]')).toBeVisible();

    // 9. 测试移动端搜索
    await page.click('[data-testid="mobile-search-button"]');
    await expect(page.locator('[data-testid="mobile-search-overlay"]')).toBeVisible();
    await page.fill('[data-testid="mobile-search-input"]', '数学');
    await page.press('[data-testid="mobile-search-input"]', 'Enter');

    // 10. 验证搜索结果在移动端的显示
    await expect(page.locator('[data-testid="mobile-search-results"]')).toBeVisible();
  });
});

/**
 * 辅助函数：用户登录
 */
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(/.*\/dashboard/);
}
