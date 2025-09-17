/**
 * 管理后台布局组件
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  HomeIcon,
  UsersIcon,
  GiftIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface AdminLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: '仪表盘', href: '/admin', icon: HomeIcon },
  { name: '邀请管理', href: '/admin/invites', icon: UsersIcon },
  { name: '用户管理', href: '/admin/users', icon: UsersIcon },
  { name: '奖励管理', href: '/admin/rewards', icon: GiftIcon },
  { name: '统计分析', href: '/admin/analytics', icon: ChartBarIcon },
  { name: '系统日志', href: '/admin/logs', icon: DocumentTextIcon },
  { name: '系统监控', href: '/admin/monitoring', icon: ExclamationTriangleIcon },
  { name: '系统设置', href: '/admin/settings', icon: CogIcon },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className=\"h-screen flex overflow-hidden bg-gray-100\">
      {/* 移动端侧边栏 */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className=\"fixed inset-0 bg-gray-600 bg-opacity-75\" onClick={() => setSidebarOpen(false)} />
        <div className=\"relative flex-1 flex flex-col max-w-xs w-full bg-white\">
          <div className=\"absolute top-0 right-0 -mr-12 pt-2\">
            <button
              type=\"button\"
              className=\"ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white\"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className=\"h-6 w-6 text-white\" />
            </button>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* 桌面端侧边栏 */}
      <div className=\"hidden md:flex md:flex-shrink-0\">
        <div className=\"flex flex-col w-64\">
          <SidebarContent />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className=\"flex flex-col w-0 flex-1 overflow-hidden\">
        {/* 顶部导航栏 */}
        <div className=\"relative z-10 flex-shrink-0 flex h-16 bg-white shadow\">
          <button
            type=\"button\"
            className=\"px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden\"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className=\"h-6 w-6\" />
          </button>
          <div className=\"flex-1 px-4 flex justify-between\">
            <div className=\"flex-1 flex\">
              <div className=\"w-full flex md:ml-0\">
                <div className=\"relative w-full text-gray-400 focus-within:text-gray-600\">
                  <div className=\"flex items-center h-16\">
                    <h1 className=\"text-xl font-semibold text-gray-900\">
                      管理后台
                    </h1>
                  </div>
                </div>
              </div>
            </div>
            <div className=\"ml-4 flex items-center md:ml-6\">
              <div className=\"flex items-center space-x-4\">
                <span className=\"text-sm text-gray-700\">
                  {session?.user?.name || session?.user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className=\"bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500\"
                >
                  <ArrowRightOnRectangleIcon className=\"h-6 w-6\" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容 */}
        <main className=\"flex-1 relative overflow-y-auto focus:outline-none\">
          <div className=\"py-6\">
            <div className=\"max-w-7xl mx-auto px-4 sm:px-6 md:px-8\">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )

  function SidebarContent() {
    return (
      <div className=\"flex flex-col h-0 flex-1 border-r border-gray-200 bg-white\">
        <div className=\"flex-1 flex flex-col pt-5 pb-4 overflow-y-auto\">
          <div className=\"flex items-center flex-shrink-0 px-4\">
            <h2 className=\"text-lg font-semibold text-gray-900\">
              Inspi AI 管理后台
            </h2>
          </div>
          <nav className=\"mt-5 flex-1 px-2 space-y-1\">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-6 w-6`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    )
  }
}