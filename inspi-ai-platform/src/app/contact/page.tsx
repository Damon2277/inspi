import { Metadata } from 'next';
import ContactForm from '@/components/support/ContactForm';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/utils';

// SEO元数据
export const metadata: Metadata = generateSEOMetadata({
  title: '联系我们 - Inspi.AI',
  description: '有问题或建议？联系Inspi.AI团队，我们会在24小时内回复您。支持邮件、反馈、Bug报告和功能建议。',
  keywords: ['联系我们', '客服支持', '用户反馈', 'Bug报告', '功能建议', 'Inspi.AI支持'],
  path: '/contact'
});

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            联系我们
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            有任何问题、建议或反馈？我们很乐意听到您的声音。
            <br />
            我们的团队会在 <span className="font-semibold text-blue-600">24小时内</span> 回复您。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* 联系表单 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                发送消息
              </h2>
              <ContactForm />
            </div>
          </div>

          {/* 侧边栏信息 */}
          <div className="space-y-8">
            {/* 联系方式 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📞 联系方式
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-gray-900">邮箱支持</div>
                  <div className="text-gray-600">sundp1980@gmail.com</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">响应时间</div>
                  <div className="text-gray-600">24小时内回复</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">工作时间</div>
                  <div className="text-gray-600">周一至周五 9:00-18:00</div>
                </div>
              </div>
            </div>

            {/* 常见问题类型 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 常见问题类型
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">🔧</span>
                  <div>
                    <div className="font-medium text-gray-900">技术支持</div>
                    <div className="text-sm text-gray-600">功能使用、Bug报告</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">💬</span>
                  <div>
                    <div className="font-medium text-gray-900">用户反馈</div>
                    <div className="text-sm text-gray-600">产品建议、用户体验</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-500 mr-2">✨</span>
                  <div>
                    <div className="font-medium text-gray-900">功能建议</div>
                    <div className="text-sm text-gray-600">新功能需求、改进建议</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-500 mr-2">❓</span>
                  <div>
                    <div className="font-medium text-gray-900">一般咨询</div>
                    <div className="text-sm text-gray-600">使用指导、账户问题</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速链接 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🔗 快速链接
              </h3>
              <div className="space-y-3">
                <a 
                  href="/help" 
                  className="block text-blue-600 hover:text-blue-800 transition-colors"
                >
                  📚 帮助中心
                </a>
                <a 
                  href="/help#faq" 
                  className="block text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ❓ 常见问题
                </a>
                <a 
                  href="/" 
                  className="block text-blue-600 hover:text-blue-800 transition-colors"
                >
                  🎯 AI教学魔法师
                </a>
                <a 
                  href="/square" 
                  className="block text-blue-600 hover:text-blue-800 transition-colors"
                >
                  🌟 智慧广场
                </a>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                💡 提交前请注意
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• 请详细描述您遇到的问题</li>
                <li>• 如果是Bug，请提供复现步骤</li>
                <li>• 包含您的浏览器和设备信息</li>
                <li>• 紧急问题请选择高优先级</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              我们重视您的每一条反馈
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Inspi.AI 致力于为教师提供最好的AI教学工具。您的意见和建议是我们不断改进的动力。
              无论是功能建议、使用问题还是简单的想法分享，我们都非常欢迎。
            </p>
            <div className="mt-6 flex justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="text-green-500 mr-1">✓</span>
                24小时内回复
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-1">✓</span>
                专业技术支持
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-1">✓</span>
                持续产品改进
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}