'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useResponsive } from '@/hooks/useResponsive';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';
import MobileMenu from './MobileMenu';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isMobile } = useResponsive();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">I</span>
                </div>
                <span className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                  Inspi.AI
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <nav className="flex items-center space-x-8">
                <Link 
                  href="/" 
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  AI教学魔法师
                </Link>
                <Link 
                  href="/square" 
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  智慧广场
                </Link>
                {isAuthenticated && (
                  <Link 
                    href={`/profile/${user?.id}`} 
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    个人中心
                  </Link>
                )}
              </nav>
            )}

            {/* Desktop User Actions */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Image
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random&color=fff&size=32`}
                        alt={user?.name || 'User avatar'}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm text-gray-700">{user?.name}</span>
                    </div>
                    <a
                      href="/subscription"
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      订阅管理
                    </a>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      退出
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    登录
                  </button>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <div className="flex items-center space-x-2">
                {isAuthenticated && (
                  <Image
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random&color=fff&size=32`}
                    alt={user?.name || 'User avatar'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="touch-target p-2 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="打开菜单"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobile && (
        <MobileMenu
          isOpen={showMobileMenu}
          onClose={() => setShowMobileMenu(false)}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogin={() => {
            setShowMobileMenu(false);
            setShowLoginModal(true);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Auth Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
}