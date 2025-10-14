import fs from 'fs';
import path from 'path';

import type { Metadata } from 'next';
import { Inter as GoogleInter, Noto_Sans_SC as GoogleNotoSansSC } from 'next/font/google';
import localFont from 'next/font/local';
import '@/styles/desktop-modern.css';
import '@/styles/desktop.css';
import './globals.css';

const fontsDir = path.join(process.cwd(), 'public', 'fonts');
const hasInterLocal = fs.existsSync(path.join(fontsDir, 'Inter-Variable.woff2'));
const hasNotoRegularLocal = fs.existsSync(path.join(fontsDir, 'NotoSansSC-Regular.woff2'));

const inter = hasInterLocal
  ? localFont({
      src: [
        {
          path: '../public/fonts/Inter-Variable.woff2',
          style: 'normal',
          weight: '100 900',
        },
      ],
      variable: '--font-inter',
      display: 'swap',
    })
  : GoogleInter({
      subsets: ['latin'],
      variable: '--font-inter',
      display: 'swap',
    });

const notoSansSC = hasNotoRegularLocal
  ? localFont({
      src: [
        {
          path: '../public/fonts/NotoSansSC-Regular.woff2',
          style: 'normal',
          weight: '400',
        },
        {
          path: '../public/fonts/NotoSansSC-Medium.woff2',
          style: 'normal',
          weight: '500',
        },
      ],
      variable: '--font-noto-sans-sc',
      display: 'swap',
    })
  : GoogleNotoSansSC({
      subsets: ['latin'],
      weight: ['400', '500'],
      variable: '--font-noto-sans-sc',
      display: 'swap',
    });

export const metadata: Metadata = {
  title: 'Inspi.AI - AI驱动的教师智慧平台',
  description: '用AI激发教学创意，让每一次教学都充满魔法。智能生成教学卡片，构建个人知识图谱，与教师社区共同成长。',
  keywords: 'AI教学,教学卡片,教师工具,教育科技,智能教学,教学创意',
  authors: [{ name: 'Inspi.AI Team' }],
  creator: 'Inspi.AI',
  publisher: 'Inspi.AI',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${notoSansSC.variable}`}>
      <head>
        <meta name="viewport" content="width=1280, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" sizes="32x32" href="/icons/icon-32x32.svg" />
        <link rel="icon" type="image/svg+xml" sizes="16x16" href="/icons/icon-16x16.svg" />
      </head>
      <body className={`${inter.className} ${notoSansSC.className}`} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
