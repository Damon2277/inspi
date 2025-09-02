import { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/utils';

// SEO元数据
export const metadata: Metadata = generateSEOMetadata({
  title: '帮助中心 - Inspi.AI',
  description: 'Inspi.AI帮助中心，包含使用指南、常见问题、功能介绍等。快速找到您需要的帮助信息。',
  keywords: ['帮助中心', '使用指南', '常见问题', 'FAQ', '教程', 'Inspi.AI帮助'],
  path: '/help'
});

// FAQ数据
const faqData = [
  {
    id: 'getting-started',
    question: '如何开始使用Inspi.AI？',
    answer: '首先注册账号，然后在主页输入一个知识点，AI会为您生成四种类型的教学创意卡片：可视化卡、类比延展卡、启发思考卡和互动氛围卡。您可以编辑这些卡片，然后发布到智慧广场与其他教师分享。'
  },
  {
    id: 'card-types',
    question: '四种教学卡片分别是什么？',
    answer: '• 可视化卡：帮助学生"看见"抽象概念的场景或比喻\n• 类比延展卡：将知识点与生活经验或其他学科连接\n• 启发思考卡：激发学生深度思考的开放性问题\n• 互动氛围卡：简单有趣的课堂活动或游戏'
  },
  {
    id: 'subscription',
    question: '订阅计划有什么区别？',
    answer: '• 免费版：每天5次生成，2次复用\n• Pro版（199元/月）：每天20次生成，10次复用\n• Super版（399元/月）：每天100次生成，30次复用\n所有版本都可以无限浏览智慧广场的内容。'
  },
  {
    id: 'reuse-system',
    question: '什么是复用系统？',
    answer: '复用系统允许您使用其他教师的创意作品作为灵感来源。当您复用一个作品时，所有卡片会被复制到您的编辑区，您可以修改后发布。系统会自动添加归属链接，原作者也会获得复用积分。'
  },
  {
    id: 'contribution-score',
    question: '贡献度是如何计算的？',
    answer: '贡献度 = 创作分 + 复用分\n• 发布原创作品：+10分\n• 作品被他人复用：每次+50分\n贡献度用于排行榜排名，展示您对教学社区的贡献。'
  },
  {
    id: 'knowledge-graph',
    question: '个人知识图谱有什么用？',
    answer: '知识图谱是您教学理念和专业知识的可视化展示。您可以将创作的作品挂载到相关知识节点上，构建个人的教学IP。平台提供基于教学大纲的预设框架，您也可以创建自定义图谱。'
  },
  {
    id: 'privacy',
    question: '我的数据安全吗？',
    answer: '我们非常重视数据安全。所有用户数据都经过加密存储，我们不会将您的教学内容用于其他目的。您可以随时删除自己的作品，我们也提供数据导出功能。'
  },
  {
    id: 'mobile',
    question: '支持移动设备吗？',
    answer: '是的，Inspi.AI采用响应式设计，完全支持手机和平板设备。您可以在任何设备上创作、浏览和管理您的教学内容。'
  }
];

// 使用指南数据
const guideData = [
  {
    id: 'create-first-work',
    title: '创建您的第一个教学作品',
    description: '学习如何使用AI教学魔法师生成创意卡片',
    steps: [
      '在主页输入一个知识点，如"光合作用"',
      '选择学科和学段（可选）',
      '点击"生成教学魔法"按钮',
      '查看生成的四种卡片类型',
      '编辑或重新生成不满意的卡片',
      '添加作品标题和标签',
      '点击"发布到智慧广场"'
    ]
  },
  {
    id: 'browse-square',
    title: '浏览智慧广场',
    description: '发现和复用其他教师的优秀创意',
    steps: [
      '访问智慧广场页面',
      '使用筛选器按学科、学段筛选',
      '使用搜索功能查找特定内容',
      '点击作品卡片查看详情',
      '点击"复用"按钮获取创意灵感',
      '在编辑器中修改复用的内容',
      '发布时会自动添加归属链接'
    ]
  },
  {
    id: 'build-knowledge-graph',
    title: '构建知识图谱',
    description: '创建个人教学理念的可视化展示',
    steps: [
      '访问个人中心页面',
      '选择预设的学科图谱模板',
      '或创建自定义知识图谱',
      '将您的作品挂载到相关节点',
      '调整节点位置和连接关系',
      '设置图谱的可见性',
      '分享您的知识图谱链接'
    ]
  }
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            帮助中心
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            欢迎来到Inspi.AI帮助中心！这里有您需要的所有使用指南和常见问题解答。
          </p>
        </div>

        {/* 快速导航 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="#guides" className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">使用指南</h3>
            <p className="text-gray-600">详细的功能使用教程</p>
          </Link>
          
          <Link href="#faq" className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">❓</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">常见问题</h3>
            <p className="text-gray-600">快速找到问题答案</p>
          </Link>
          
          <Link href="/contact" className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">联系支持</h3>
            <p className="text-gray-600">获得人工客服帮助</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 侧边栏导航 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">快速导航</h3>
              <nav className="space-y-2">
                <a href="#guides" className="block text-blue-600 hover:text-blue-800 transition-colors">
                  使用指南
                </a>
                <a href="#faq" className="block text-blue-600 hover:text-blue-800 transition-colors">
                  常见问题
                </a>
                <a href="#features" className="block text-blue-600 hover:text-blue-800 transition-colors">
                  功能介绍
                </a>
                <a href="#troubleshooting" className="block text-blue-600 hover:text-blue-800 transition-colors">
                  故障排除
                </a>
              </nav>
            </div>
          </div>

          {/* 主要内容 */}
          <div className="lg:col-span-3 space-y-12">
            {/* 使用指南 */}
            <section id="guides">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">📚 使用指南</h2>
              <div className="space-y-8">
                {guideData.map((guide) => (
                  <div key={guide.id} className="bg-white rounded-xl shadow-sm border p-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {guide.title}
                    </h3>
                    <p className="text-gray-600 mb-6">{guide.description}</p>
                    <div className="space-y-3">
                      {guide.steps.map((step, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-gray-700">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 常见问题 */}
            <section id="faq">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">❓ 常见问题</h2>
              <div className="space-y-4">
                {faqData.map((faq) => (
                  <details key={faq.id} className="bg-white rounded-xl shadow-sm border">
                    <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                      <h3 className="text-lg font-semibold text-gray-900 inline">
                        {faq.question}
                      </h3>
                    </summary>
                    <div className="px-6 pb-6">
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-gray-700 whitespace-pre-line">{faq.answer}</p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* 功能介绍 */}
            <section id="features">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">✨ 功能介绍</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="text-2xl mb-3">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI教学魔法师</h3>
                  <p className="text-gray-600">输入知识点，AI生成四种类型的教学创意卡片，帮助您快速创建创新的教学方法。</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="text-2xl mb-3">🌟</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">智慧广场</h3>
                  <p className="text-gray-600">浏览和复用全球教师的优秀创意，通过致敬系统促进知识共享。</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="text-2xl mb-3">🕸️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">知识图谱</h3>
                  <p className="text-gray-600">构建可视化的个人知识体系，展示您的教学理念和专业发展。</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="text-2xl mb-3">🏆</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">贡献度系统</h3>
                  <p className="text-gray-600">通过创作和分享获得贡献度积分，在排行榜中展示您的影响力。</p>
                </div>
              </div>
            </section>

            {/* 故障排除 */}
            <section id="troubleshooting">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">🔧 故障排除</h2>
              <div className="bg-white rounded-xl shadow-sm border p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI生成失败怎么办？</h3>
                    <p className="text-gray-700">请检查网络连接，确保知识点描述清晰。如果问题持续，请尝试刷新页面或联系客服。</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">无法登录账号？</h3>
                    <p className="text-gray-700">请检查邮箱和密码是否正确。如果忘记密码，可以使用"忘记密码"功能重置。</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">页面加载缓慢？</h3>
                    <p className="text-gray-700">请检查网络连接，清除浏览器缓存，或尝试使用其他浏览器。</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">移动端显示异常？</h3>
                    <p className="text-gray-700">请确保使用最新版本的浏览器，并检查是否启用了JavaScript。</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 联系支持 */}
            <section className="bg-blue-50 rounded-xl border border-blue-200 p-8 text-center">
              <h2 className="text-2xl font-bold text-blue-900 mb-4">还有其他问题？</h2>
              <p className="text-blue-800 mb-6">
                如果您在帮助中心没有找到答案，我们的支持团队随时为您提供帮助。
              </p>
              <Link 
                href="/contact"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                联系客服支持
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}