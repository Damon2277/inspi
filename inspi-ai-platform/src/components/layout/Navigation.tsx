'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '首页', icon: '🏠' },
    { href: '/create', label: 'AI魔法师', icon: '✨' },
    { href: '/square', label: '智慧广场', icon: '🌟' },
    { href: '/works', label: '我的作品', icon: '📚' },
    { href: '/profile', label: '个人中心', icon: '👤' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="text-2xl font-bold gradient-text">Inspi.AI</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Mobile Logo Only */}
            <div className="md:hidden">
              <span className="text-xl font-bold gradient-text">Inspi.AI</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 z-50 safe-area-pb">
        <div className="grid grid-cols-5 gap-1 py-2 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-1 text-xs font-medium transition-all duration-200 rounded-lg ${
                pathname === item.href
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              <span className={`text-lg mb-1 transition-transform duration-200 ${
                pathname === item.href ? 'transform scale-110' : ''
              }`}>
                {item.icon}
              </span>
              <span className="truncate leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navigation;