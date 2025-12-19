'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { useAuth, AuthUser as AuthContextUser } from '@/shared/hooks/useAuth';

interface UserData {
  name: string;
  email: string;
  bio: string;
  avatar: string;
  level: string;
  joinDate: string;
  securityEmail?: string;
  shareEmail?: string;
  quotaEmail?: string;
  quotaReminderThreshold?: number;
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
  securityEmail: '',
  shareEmail: '',
  quotaEmail: '',
  quotaReminderThreshold: 30,
  stats: {
    works: 12,
    reuses: 39,
    likes: 156,
  },
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_PREFIX = 'inspi_user_data';

type UserDataEventDetail = {
  key: string;
  user: UserData;
};

const deriveUserDataFromAuth = (authUser?: AuthContextUser | null): UserData => {
  if (!authUser) {
    return { ...defaultUser };
  }

  const plan = authUser.subscription?.plan || 'free';
  const planLabel = plan === 'super' ? 'Super' : plan === 'pro' ? 'Pro' : 'Free';
  const joinDate = authUser.createdAt
    ? new Date(authUser.createdAt).toISOString()
    : defaultUser.joinDate;

  return {
    ...defaultUser,
    name: authUser.name?.trim() || authUser.email || defaultUser.name,
    email: authUser.email || defaultUser.email,
    avatar: authUser.avatar || defaultUser.avatar,
    bio: authUser.name
      ? `${authUser.name} 的教学档案，欢迎完善个人简介。`
      : defaultUser.bio,
    level: planLabel,
    joinDate,
    stats: {
      works: typeof authUser.usage?.dailyGenerations === 'number'
        ? authUser.usage.dailyGenerations
        : 0,
      reuses: typeof authUser.usage?.dailyReuses === 'number'
        ? authUser.usage.dailyReuses
        : 0,
      likes: 0,
    },
    securityEmail: '',
    shareEmail: '',
    quotaEmail: '',
    quotaReminderThreshold: defaultUser.quotaReminderThreshold,
  };
};

const getStorageKey = (authUser?: AuthContextUser | null) => {
  const identifier = authUser?._id || authUser?.id || authUser?.email || 'guest';
  return `${USER_STORAGE_PREFIX}_${identifier}`;
};

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [storageKey, setStorageKey] = useState<string>(() => getStorageKey(null));
  const [user, setUser] = useState<UserData>(() => deriveUserDataFromAuth(authUser));

  useEffect(() => {
    const nextKey = getStorageKey(authUser);
    setStorageKey(prev => (prev === nextKey ? prev : nextKey));
    const fallbackUser = deriveUserDataFromAuth(authUser);

    if (typeof window === 'undefined') {
      setUser(fallbackUser);
      return;
    }

    try {
      const storedUser = window.localStorage.getItem(nextKey);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as UserData;
        setUser({ ...fallbackUser, ...parsedUser });
      } else {
        window.localStorage.setItem(nextKey, JSON.stringify(fallbackUser));
        setUser(fallbackUser);
      }
    } catch (error) {
      console.error('Failed to read user data from localStorage:', error);
      setUser(fallbackUser);
    }
  }, [authUser]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }
      try {
        const updatedUser = JSON.parse(event.newValue) as UserData;
        setUser(prev => ({ ...prev, ...updatedUser }));
      } catch (error) {
        console.error('Failed to parse updated user data:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleLocalUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<UserDataEventDetail>;
      if (!customEvent.detail || customEvent.detail.key !== storageKey) {
        return;
      }
      setUser(customEvent.detail.user);
    };

    window.addEventListener('userDataUpdated', handleLocalUpdate as EventListener);
    return () => {
      window.removeEventListener('userDataUpdated', handleLocalUpdate as EventListener);
    };
  }, [storageKey]);

  const updateUser = (updates: Partial<UserData>) => {
    setUser(prev => {
      const newUser = { ...prev, ...updates };

      if (typeof window !== 'undefined') {
        try {
          const activeKey = storageKey || getStorageKey(authUser);
          window.localStorage.setItem(activeKey, JSON.stringify(newUser));
          const event = new CustomEvent<UserDataEventDetail>('userDataUpdated', {
            detail: { key: activeKey, user: newUser },
          });
          window.dispatchEvent(event);
        } catch (error) {
          console.error('Failed to persist user data:', error);
        }
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
