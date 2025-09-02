'use client';

import Link from 'next/link';

export default function Home() {
  const handleCreateClick = () => {
    // 简化处理，直接跳转到创建页面
    window.location.href = '/create';
  };

  // 简化的功能卡片数据
  const featureCards = [
    {
      icon: '🎯',
      title: 'AI教学魔法师',
      description: '智能生成四种类型的教学创意卡片，激发无限教学灵感'
    },
    {
      icon: '🌟',
      title: '智慧广场',
      description: '教师社区平台，分享和复用优秀教学资源'
    },
    {
      icon: '🧠',
      title: '知识图谱',
      description: '可视化展示个人教学体系和专业发展路径'
    },
    {
      icon: '🏆',
      title: '贡献度系统',
      description: '激励教师创作和分享优质教学内容'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Hero Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            AI驱动的教师智慧平台
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              点燃您教学的热情
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            用AI激发教学创意，让每一次教学都充满魔法。智能生成教学卡片，构建个人知识图谱，与教师社区共同成长。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button 
                onClick={handleCreateClick}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                aria-label="开始创作教学魔法 - 使用AI生成教学创意卡片"
              >
                开始创作教学魔法
              </button>
              <Link 
                href="/square"
                className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors inline-block"
                aria-label="浏览智慧广场 - 发现优秀教学创意"
              >
                浏览智慧广场
              </Link>
            </div>
          </div>

        {/* Feature Cards */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {featureCards.map((card, index) => (
            <div 
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">
                  {card.icon}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.title}
              </h3>
              <p className="text-gray-600">
                {card.description}
              </p>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            您的每一次奇思妙想，都值得被精彩呈现
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            立即开始，让AI成为您教学创意的放大器
          </p>
          <button 
            onClick={handleCreateClick}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            免费开始使用
          </button>
        </div>
      </section>
    </div>
  );
}