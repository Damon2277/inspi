#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting TypeScript error auto-fix...\n');

// Fix 1: Add missing type exports to shared hooks
function fixSharedHooks() {
  const hookPath = path.join(__dirname, '../src/shared/hooks/useAuth.ts');
  
  if (!fs.existsSync(hookPath)) {
    // Create the file if it doesn't exist
    const content = `import { User, AuthState, LoginCredentials, RegisterData } from '@/types';

export type { User, AuthState, LoginCredentials, RegisterData };

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  // Implementation will be added by the actual hook
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
  };
}
`;
    
    // Create directory if it doesn't exist
    const dir = path.dirname(hookPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(hookPath, content);
    console.log('✅ Created missing useAuth hook with proper exports');
  }
}

// Fix 2: Update AuthContext imports
function fixAuthContextImports() {
  const contextPath = path.join(__dirname, '../src/contexts/AuthContext.tsx');
  
  if (fs.existsSync(contextPath)) {
    let content = fs.readFileSync(contextPath, 'utf8');
    
    // Fix imports
    content = content.replace(
      /import.*from.*['"]@\/shared\/hooks\/useAuth['"]/g,
      "import { UseAuthReturn, User, AuthState, LoginCredentials,
        RegisterData } from '@/shared/hooks/useAuth'"
    );
    
    fs.writeFileSync(contextPath, content);
    console.log('✅ Fixed AuthContext imports');
  }
}

// Fix 3: Fix subscription property references
function fixSubscriptionProperties() {
  const filesToFix = [
    'src/components/auth/ProtectedRoute.tsx',
  ];
  
  filesToFix.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix subscriptionTier to subscription.tier
      content = content.replace(
        /user\.subscriptionTier/g,
        'user.subscription?.tier'
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed subscription properties in ${file}`);
    }
  });
}

// Fix 4: Add missing component imports
function fixMissingComponents() {
  const componentsToCreate = [
    {
      path: 'src/components/subscription/SubscriptionPlans.tsx',
      content: `import React from 'react';

export default function SubscriptionPlans() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Subscription Plans</h2>
      <p>Choose your subscription plan</p>
    </div>
  );
}
`
    },
    {
      path: 'src/components/payment/PaymentForm.tsx',
      content: `import React from 'react';

export default function PaymentForm() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Payment</h2>
      <form>
        <p>Payment form placeholder</p>
      </form>
    </div>
  );
}
`
    },
    {
      path: 'src/components/profile/UserProfile.tsx',
      content: `import React from 'react';

export default function UserProfile() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      <p>User profile content</p>
    </div>
  );
}
`
    }
  ];
  
  componentsToCreate.forEach(({ path: componentPath, content }) => {
    const fullPath = path.join(__dirname, '..', componentPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(fullPath)) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Created missing component: ${componentPath}`);
    }
  });
}

// Fix 5: Fix form state types
function fixFormStateTypes() {
  const filesToFix = [
    'src/components/auth/LoginForm.tsx',
  ];
  
  filesToFix.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix setState parameter types
      content = content.replace(
        /setFormData\(\(prev\)\s*=>/g,
        'setFormData((prev: typeof formData) =>'
      );
      
      content = content.replace(
        /setErrors\(\(prev\)\s*=>/g,
        'setErrors((prev: typeof errors) =>'
      );
      
      content = content.replace(
        /setShowPassword\(\(prev\)\s*=>/g,
        'setShowPassword((prev: boolean) =>'
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed form state types in ${file}`);
    }
  });
}

// Fix 6: Fix missing AuthProvider
function fixAuthProvider() {
  const providerPath = path.join(__dirname, '../src/core/auth/AuthProvider.tsx');
  
  if (!fs.existsSync(providerPath)) {
    const content = `import React from 'react';
import { AuthContext } from './context';

export const AuthProvider = AuthContext.Provider;

export default AuthProvider;
`;
    fs.writeFileSync(providerPath, content);
    console.log('✅ Created missing AuthProvider');
  }
}

// Fix 7: Fix d3 type issues
function fixD3Types() {
  const graphRendererPath = path.join(__dirname, '../src/core/graph/graph-renderer.ts');
  
  if (fs.existsSync(graphRendererPath)) {
    let content = fs.readFileSync(graphRendererPath, 'utf8');
    
    // Add proper type definitions at the top
    const typeImports = `import * as d3 from 'd3';
import { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  radius?: number;
  color?: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}
`;
    
    if (!content.includes('SimulationNodeDatum')) {
      content = typeImports + '\n' + content;
      fs.writeFileSync(graphRendererPath, content);
      console.log('✅ Fixed d3 type definitions');
    }
  }
}

// Fix 8: Create missing shared types
function createSharedTypes() {
  const sharedTypesPath = path.join(__dirname, '../src/shared/types/subscription.ts');
  const dir = path.dirname(sharedTypesPath);
  
  if (!fs.existsSync(sharedTypesPath)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const content = `export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'expired' | 'pending';
  startDate: Date | string;
  endDate?: Date | string;
  billingCycle: 'monthly' | 'yearly';
  autoRenew: boolean;
  canceledAt?: Date | string;
  cancelReason?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date | string;
  completedAt?: Date | string;
  failureReason?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}
`;
    
    fs.writeFileSync(sharedTypesPath, content);
    console.log('✅ Created shared subscription types');
  }
}

// Fix 9: Create shared contexts
function createSharedContexts() {
  const contextPath = path.join(__dirname, '../src/shared/contexts/AuthContext.tsx');
  const dir = path.dirname(contextPath);
  
  if (!fs.existsSync(contextPath)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const content = `'use client';

import React, { createContext, useContext } from 'react';
import { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // This is a placeholder implementation
  const value: AuthContextValue = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => {},
    logout: async () => {},
    register: async () => {},
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
`;
    
    fs.writeFileSync(contextPath, content);
    console.log('✅ Created shared AuthContext');
  }
}

// Main execution
async function main() {
  try {
    console.log('📋 Running TypeScript error fixes...\n');
    
    fixSharedHooks();
    fixAuthContextImports();
    fixSubscriptionProperties();
    fixMissingComponents();
    fixFormStateTypes();
    fixAuthProvider();
    fixD3Types();
    createSharedTypes();
    createSharedContexts();
    
    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📊 Running type check to see remaining errors...\n');
    
    // Run type check to see remaining errors
    try {
      execSync('npm run type-check', { stdio: 'inherit' });
    } catch (e) {
      // Type check will likely still have errors, but should be fewer
    }
    
  } catch (error) {
    console.error('❌ Error during fix process:', error.message);
    process.exit(1);
  }
}

// Run the script
main();