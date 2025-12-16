import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  title: '隐私政策 | Inspi.AI',
  description: 'Inspi.AI 在学习与内容创作场景中如何收集、使用与保护个人信息的说明。',
};

const SECTIONS: Array<{ title: string; content: string[] }> = [
  {
    title: '一、我们收集的信息',
    content: [
      '账户信息：姓名、组织或社群名称、联系方式、头像等，用于创建账户与区分不同学习主体。',
      '学习内容：您上传或生成的学习资料、分享稿、音视频、互动数据，仅在提供 AI 生成、知识图谱与协作等功能时使用。',
      '设备与日志：设备型号、浏览器、操作系统、IP 地址、日志记录，用于排查故障与安全审计。',
      '运营与客服信息：订阅记录、支付状态、反馈工单，以满足财务合规与客户支持需求。',
    ],
  },
  {
    title: '二、信息的使用目的',
    content: [
      '提供核心功能：包括内容生成、复用、订阅管理、学习分析等。',
      '安全风控：检测异常登录、批量操作或潜在侵权行为，保障账户与数据安全。',
      '产品迭代：在脱敏聚合后，用于算法优化、版本分析与用户研究。',
      '合规要求：依据监管部门或法院合法命令进行披露，并在法律允许范围内告知您。',
    ],
  },
  {
    title: '三、信息共享与委托',
    content: [
      '我们不会向任何第三方出售个人信息，仅在必要时与以下类型伙伴共享：',
      '• 云基础设施与短信/邮件服务商：用于计算、存储、通知。',
      '• 支付与发票合作方：处理订阅费用、开票、对账。',
      '• 经您授权的合作组织：用于项目落地或评估。',
      '全部合作伙伴须签署数据保护协议，明确安全措施与责任。',
    ],
  },
  {
    title: '四、信息的保存与跨境传输',
    content: [
      '数据默认存储在部署所在地的加密服务器，最长期限不超过实现目的所需及法规要求。',
      '如需跨境传输（例如调用国际模型或备份），我们会进行安全评估，获取必要监管审批，确保接收方具备等同的数据保护能力。',
    ],
  },
  {
    title: '五、您的权利',
    content: [
      '访问与复制：可在账户设置中查询个人资料，并按《个人信息保护法》提出导出需求。',
      '更正与删除：如信息有误或超出必要范围，可申请更正/删除；涉及学习记录的删除可能影响体验。',
      '撤回授权：可通过设置或客服渠道撤回非必要授权，但部分功能可能受限。',
      '注销账户：通过 76111678@qq.com 申请，平台将在 15 个工作日内完成并清理账户数据（法律另有规定除外）。',
    ],
  },
  {
    title: '六、未成年人保护',
    content: [
      '平台面向 18 岁及以上的学习者。若在协作中涉及未成年人的信息，您应确保已取得监护人授权，并遵守所在地关于数据管理的要求。',
    ],
  },
  {
    title: '七、联系我们',
    content: [
      '若您对本政策或个人信息保护有疑问、投诉或建议，可通过以下方式联系：',
      '• 邮箱：76111678@qq.com',
      '• 客服微信：在个人中心“反馈”页添加管理员',
      '我们将在 15 个工作日内（复杂情况不超过 30 个工作日）给予回复。',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-white">
      <div className="fixed inset-0 bg-white/90 backdrop-blur" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl rounded-2xl bg-white/95 p-8 shadow-2xl border border-slate-100">
          <header className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-600">隐私政策</p>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">Inspi.AI 个人信息保护声明</h1>
              <p className="mt-3 text-base text-gray-600">
                最近更新：2025 年 3 月 18 日。本政策适用于所有在学习与内容创作场景中使用平台的个人或团队。
              </p>
            </div>
            <Link href="/auth/register" aria-label="关闭隐私政策" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
              ×
            </Link>
          </header>

          <div className="mt-10 space-y-8 text-gray-700 leading-7 max-h-[70vh] overflow-y-auto pr-3">
            {SECTIONS.map(section => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
                <ul className="list-disc space-y-2 pl-5 text-base text-gray-700">
                  {section.content.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <footer className="mt-8 border-t border-gray-200 pt-4 text-sm text-gray-500">
            <p>若本政策与《服务条款》存在不一致，以较严格的条款为准。继续使用平台即视为同意我们按照本政策处理您的信息。</p>
            <p className="mt-2">
              如果您不同意本政策的任何内容，请立即停止使用平台并通过{' '}
              <Link href="mailto:76111678@qq.com" className="text-emerald-600 underline">76111678@qq.com</Link>{' '}
              与我们联系。
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
