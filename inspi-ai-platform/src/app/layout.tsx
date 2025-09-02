import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inspi.AI - AI驱动的教师智慧平台",
  description: "用AI激发教学创意，让每一次教学都充满魔法。智能生成教学卡片，构建个人知识图谱，与教师社区共同成长。",
  icons: {
    icon: '/api/favicon',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning={true}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <h1 className="text-xl font-bold text-blue-600">Inspi.AI</h1>
                  </div>
                  <nav className="hidden md:flex space-x-8">
                    <a href="/" className="text-gray-700 hover:text-blue-600">首页</a>
                    <a href="/create" className="text-gray-700 hover:text-blue-600">创作</a>
                    <a href="/square" className="text-gray-700 hover:text-blue-600">广场</a>
                    <a href="/subscription" className="text-gray-700 hover:text-blue-600">订阅</a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="flex-1 pb-16 md:pb-0">
              {children}
            </main>
            <footer className="bg-gray-50 border-t">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center text-gray-600">
                  <p>&copy; 2024 Inspi.AI. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
