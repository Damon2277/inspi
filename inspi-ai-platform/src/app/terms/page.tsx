import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  title: '服务条款 | Inspi.AI',
  description: 'Inspi.AI 的服务条款，面向各类学习与内容创作场景的用户，说明使用规范与责任。',
};

const SECTIONS: Array<{ title: string; paragraphs: string[] }> = [
  {
    title: '一、条款适用',
    paragraphs: [
      '本条款适用于访问或使用 Inspi.AI（以下简称“平台”）的所有个人学习者、团队及其他学习内容创作主体。无论您用于自我提升、社群分享还是组织培训，注册并使用平台即视为已阅读并同意全部条款。',
      '平台围绕知识学习与内容创作场景设计，遵守《中华人民共和国网络安全法》《中华人民共和国个人信息保护法》等相关法规。',
    ],
  },
  {
    title: '二、账户注册与安全',
    paragraphs: [
      '注册时需提供真实、准确、完整的身份信息与可接收通知的邮箱或手机号；如信息变更，应及时更新。',
      '您需妥善保管账户与密码，不得出借、转让或与他人共享。因保管不善或第三方行为导致的损失由您自行承担。',
    ],
  },
  {
    title: '三、订阅与费用',
    paragraphs: [
      '平台部分功能需购买“教学专业版”等订阅。不同订阅计划的权益、金额、有效期以官网公布或订单信息为准。',
      '付费服务开通后即视为消费教育类数字内容，不适用七日无理由退款。若因平台原因导致服务无法提供，我们将依据实际使用情况酌情退款或延长服务期。',
    ],
  },
  {
    title: '四、内容与知识产权',
    paragraphs: [
      '您在平台生成或上传的学习资料、分享稿、音视频等均由您或所属组织享有合法权利。使用平台即授权我们在为您提供服务的必要范围内对内容进行存储、备份、结构化处理及模型优化。',
      '平台提供的 AI 模型、界面设计、交互框架、算法能力及训练数据等知识产权归 Inspi.AI 或相应权利人所有，未经书面授权不得复制、租赁、改编或对外输出。',
    ],
  },
  {
    title: '五、数据与隐私保护',
    paragraphs: [
      '平台按照《隐私政策》说明的范围收集、使用、存储个人信息，对涉及敏感学习数据采取分级加密、访问审计与最小化存储。',
      '遇到监管部门检查或执法机关合法要求时，我们可能在完成合法审查后提供必要数据，并在法律允许范围内告知您。',
    ],
  },
  {
    title: '六、用户行为规范',
    paragraphs: [
      '不得利用平台制作、传播违反中国法律法规、涉黄涉恐、歧视或侵害他人隐私的内容。',
      '不得对平台实施逆向工程、未经授权的抓取、恶意攻击、批量注册、虚假交易等行为。若发现违规，平台有权限制功能、删除内容或暂停账户。',
    ],
  },
  {
    title: '七、不可抗力与责任限制',
    paragraphs: [
      '因自然灾害、电力故障、政策调整、ISP 不稳定、第三方服务中断等不可抗力导致的服务中断或数据丢失，平台不承担赔偿责任，但会协助恢复。',
      '平台提供的 AI 生成内容仅供参考，您应依据实际需求进行审核与修订。若因未充分审查导致的纠纷，由您承担相应责任。',
    ],
  },
  {
    title: '八、条款更新与通知',
    paragraphs: [
      '我们可能因业务、法规或政策变化随时更新条款。重大调整将通过站内通知、弹窗或邮件告知。若您不同意修改，可停止使用并注销账号；继续使用即视为接受新的条款。',
    ],
  },
  {
    title: '九、争议解决',
    paragraphs: [
      '条款之解释与争议解决适用中华人民共和国法律。双方因本服务发生争议，应优先友好协商；协商不成时，可向平台运营方所在地有管辖权的人民法院提起诉讼。',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-white">
      <div className="fixed inset-0 bg-white/90 backdrop-blur" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl rounded-2xl bg-white/95 p-8 shadow-2xl border border-slate-100">
          <header className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-600 font-semibold tracking-wide">服务条款</p>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">Inspi.AI 使用条款</h1>
              <p className="mt-3 text-base text-gray-600">
                最近更新：2025 年 3 月 18 日。若您对条款有疑问，可通过{' '}
                <Link href="mailto:76111678@qq.com" className="text-blue-600 underline">
                  76111678@qq.com
                </Link>{' '}
                与我们联系。
              </p>
            </div>
            <Link href="/auth/register" aria-label="关闭条款" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
              ×
            </Link>
          </header>

          <div className="mt-10 space-y-8 text-gray-700 leading-7 max-h-[70vh] overflow-y-auto pr-3">
            {SECTIONS.map(section => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
                {section.paragraphs.map(paragraph => (
                  <p key={paragraph} className="text-base text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <footer className="mt-8 border-t border-gray-200 pt-4 text-sm text-gray-500">
            <p>本条款与《隐私政策》共同构成您使用 Inspi.AI 服务的完整协议。</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
