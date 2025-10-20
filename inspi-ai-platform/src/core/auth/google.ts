import { OAuth2Client } from 'google-auth-library';

import ContributionLog from '@/lib/models/ContributionLog';
import User, { UserDocument } from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

import { generateToken, generateRefreshToken } from './jwt';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

export interface GoogleAuthResponse {
  success: boolean;
  user?: Omit<UserDocument, 'password'>;
  token?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Verify Google ID token and authenticate user
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleAuthResponse> {
  try {
    await connectDB();

    // Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return {
        success: false,
        error: 'Invalid Google token',
      };
    }

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return {
        success: false,
        error: 'Email not provided by Google',
      };
    }

    // Check if user already exists
    let user = await (User.findOne as any)({ email: email.toLowerCase() });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        await user.save();
      }

      // Reset daily usage if needed
      user.resetDailyUsage();
      await user.save();
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        name: name || 'Google User',
        googleId,
        avatar: picture,
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
          title: 'Google OAuth Registration',
        },
        points: 10, // Welcome bonus
        metadata: {
          description: 'User registration via Google OAuth',
          category: 'account',
        },
      });

      user = savedUser;
    }

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
    console.error('Google auth error:', error);
    return {
      success: false,
      error: 'Google authentication failed',
    };
  }
}

/**
 * Get Google OAuth URL for authentication
 */
export function getGoogleAuthUrl(state?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authOptions: Parameters<typeof client.generateAuthUrl>[0] = {
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
    prompt: 'consent',
  };

  if (state) {
    authOptions.state = state;
  }

  const url = client.generateAuthUrl(authOptions);

  return url;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  success: boolean;
  idToken?: string;
  error?: string;
}> {
  try {
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      return {
        success: false,
        error: 'No ID token received from Google',
      };
    }

    return {
      success: true,
      idToken: tokens.id_token,
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return {
      success: false,
      error: 'Failed to exchange code for tokens',
    };
  }
}

const googleAuthService = {
  verifyGoogleToken,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
};

export default googleAuthService;
