'use client';

import { useState } from 'react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
  className?: string;
}

/**
 * FAQ部分组件
 */
export default function FAQSection({ faqs, className = '' }: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 获取所有分类
  const categories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  const categoryLabels: { [key: string]: string } = {
    'all': '全部',
    'getting-started': '入门指南',
    'features': '功能使用',
    'subscription': '订阅相关',
    'technical': '技术问题',
    'account': '账户管理',
  };

  // 过滤FAQ
  const filteredFAQs = selectedCategory === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === selectedCategory);

  /**
   * 切换FAQ项目的展开状态
   */
  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className={className}>
      {/* 分类筛选 */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {categoryLabels[category] || category}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ列表 */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            该分类下暂无常见问题
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleItem(faq.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900 pr-4">
                  {faq.question}
                </h3>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openItems.has(faq.id) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {openItems.has(faq.id) && (
                <div className="px-6 pb-4">
                  <div className="prose prose-sm max-w-none text-gray-600">
                    <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 底部提示 */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-lg font-medium text-blue-900 mb-2">
              没有找到您要的答案？
            </h4>
            <p className="text-blue-800 mb-4">
              如果以上常见问题没有解决您的疑问，请随时联系我们的支持团队。
            </p>
            <a
              href="/contact"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              联系我们
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
