import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { UserProfile, SubscriptionInfo } from '@/types';

interface AuthState {
  user: UserProfile | null;
  subscription: SubscriptionInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (token: string, user: UserProfile, subscription: SubscriptionInfo) => void;
  logout: () => void;
  updateUser: (user: Partial<UserProfile>) => void;
  updateSubscription: (subscription: SubscriptionInfo) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      subscription: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: (token, user, subscription) => {
        set({
          token,
          user,
          subscription,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          subscription: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      updateSubscription: (subscription) => {
        set({ subscription });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
