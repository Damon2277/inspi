import ContributionLog from '@/lib/models/ContributionLog';
import User, { UserDocument } from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

import { generateToken, generateRefreshToken } from './jwt';
import { hashPassword, comparePassword, validatePassword } from './password';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<UserDocument, 'password'>;
  token?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Register new user
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  try {
    await connectDB();

    // Validate input
    if (!data.email || !data.password || !data.name) {
      return {
        success: false,
        error: 'Email, password, and name are required',
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // Validate password strength
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.errors.join(', '),
      };
    }

    // Check if user already exists
    const existingUser = await (User.findOne as any)({ email: data.email.toLowerCase() });
    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = new User({
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      password: hashedPassword,
      subscription: {
        plan: 'free',
        startDate: new Date(),
        isActive: true,
      },
      usage: {
        dailyGenerations: 0,
        dailyReuses: 0,
        lastResetDate: new Date(),
      },
      settings: {
        emailNotifications: true,
        publicProfile: false,
      },
    });

    const savedUser = await user.save();

    // Log registration contribution
    await (ContributionLog.create as any)({
      user: savedUser._id,
      action: 'create',
      target: {
        type: 'user',
        id: savedUser._id.toString(),
        title: 'User Registration',
      },
      points: 10, // Welcome bonus
      metadata: {
        description: 'User registration',
        category: 'account',
      },
    });

    // Generate tokens
    const token = generateToken(savedUser);
    const refreshToken = generateRefreshToken(savedUser);

    // Remove password from response
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    return {
      success: true,
      user: userResponse,
      token,
      refreshToken,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Registration failed. Please try again.',
    };
  }
}

/**
 * Login user
 */
export async function loginUser(data: LoginData): Promise<AuthResponse> {
  try {
    await connectDB();

    // Validate input
    if (!data.email || !data.password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    // Find user
    const user = await (User.findOne as any)({ email: data.email.toLowerCase() });
    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Check password
    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Reset daily usage if needed
    user.resetDailyUsage();
    await user.save();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      user: userResponse,
      token,
      refreshToken,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.',
    };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<{
  success: boolean;
  user?: Omit<UserDocument, 'password'>;
  error?: string;
}> {
  try {
    await connectDB();

    const user = await (User.findById as any)(userId).select('-password');
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Reset daily usage if needed
    user.resetDailyUsage();
    await user.save();

    return {
      success: true,
      user: user.toObject(),
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      success: false,
      error: 'Failed to get user profile',
    };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserDocument, 'name'>>,
): Promise<{
  success: boolean;
  user?: Omit<UserDocument, 'password'>;
  error?: string;
}> {
  try {
    await connectDB();

    const user = await (User.findByIdAndUpdate as any)(
      userId,
      { $set: updates },
      { new: true, runValidators: true },
    ).select('-password');

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      user: user.toObject(),
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      error: 'Failed to update profile',
    };
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await connectDB();

    // Find user with password
    const user = await (User.findById as any)(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: 'Current password is incorrect',
      };
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.errors.join(', '),
      };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    return {
      success: true,
    };
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      error: 'Failed to change password',
    };
  }
}

export default {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
};
