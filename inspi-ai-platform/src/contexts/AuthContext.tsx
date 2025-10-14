'use client';

// Re-export everything from the main auth implementation
export { 
  AuthProvider, 
  useAuth as useAuthContext 
} from '@/shared/hooks/useAuth';

// Re-export types
export type { 
  User, 
  AuthState, 
  LoginCredentials, 
  RegisterData,
  AuthUser,
  AuthContextType,
  UseAuthReturn
} from '@/shared/hooks/useAuth';
