import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inspi.AI - AI驱动的教师智慧平台",
  description: "用AI激发教学创意，让每一次教学都充满魔法。智能生成教学卡片，构建个人知识图谱，与教师社区共同成长。",
  icons: {
    icon: '/api/favicon',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="dot-grid-background circuit-lines" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
