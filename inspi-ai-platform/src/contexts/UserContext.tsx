'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserData {
  name: string;
  email: string;
  bio: string;
  avatar: string;
  level: string;
  joinDate: string;
  stats: {
    works: number;
    reuses: number;
    likes: number;
  };
}

interface UserContextType {
  user: UserData;
  updateUser: (updates: Partial<UserData>) => void;
}

const defaultUser: UserData = {
  name: '张老师',
  email: 'zhang@example.com',
  bio: '高中数学教学实践者，专注于函数与几何教学，致力于用创新方法让数学变得有趣。',
  avatar: '👩‍🏫',
  level: 'Pro',
  joinDate: '2024-01-01',
  stats: {
    works: 12,
    reuses: 39,
    likes: 156,
  },
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// localStorage key for user data
const USER_STORAGE_KEY = 'inspi_user_data';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData>(() => {
    // 从 localStorage 初始化用户数据
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (e) {
          console.error('Failed to parse user data from localStorage:', e);
        }
      }
    }
    return defaultUser;
  });

  // 监听 localStorage 变化以同步多个标签页/组件
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_STORAGE_KEY && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          setUser(updatedUser);
        } catch (error) {
          console.error('Failed to parse updated user data:', error);
        }
      }
    };

    // 监听其他标签页的 localStorage 变化
    window.addEventListener('storage', handleStorageChange);

    // 也监听同一标签页内的自定义事件
    const handleLocalUpdate = (e: CustomEvent) => {
      setUser(e.detail);
    };
    window.addEventListener('userDataUpdated' as any, handleLocalUpdate as any);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated' as any, handleLocalUpdate as any);
    };
  }, []);

  const updateUser = (updates: Partial<UserData>) => {
    setUser(prev => {
      const newUser = { ...prev, ...updates };

      // 保存到 localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));

        // 触发自定义事件以同步同一标签页内的其他组件
        const event = new CustomEvent('userDataUpdated', { detail: newUser });
        window.dispatchEvent(event);
      }

      return newUser;
    });
  };

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
