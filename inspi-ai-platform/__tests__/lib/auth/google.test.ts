import { verifyGoogleToken, getGoogleAuthUrl, exchangeCodeForTokens } from '@/lib/auth/google';
import { OAuth2Client } from 'google-auth-library';
import { User } from '@/lib/models/User';
import { ContributionLog } from '@/lib/models/ContributionLog';
import connectDB from '@/lib/mongodb';

// Mock dependencies
jest.mock('google-auth-library');
jest.mock('@/lib/mongodb');
jest.mock('@/lib/models/User');
jest.mock('@/lib/models/ContributionLog');
jest.mock('@/lib/auth/jwt', () => ({
  generateToken: jest.fn(() => 'mock-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
}));

const mockOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockUser = User as jest.MockedClass<typeof User>;
const mockContributionLog = ContributionLog as jest.MockedClass<typeof ContributionLog>;

describe('Google Auth', () => {
  let mockClient: jest.Mocked<OAuth2Client>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      verifyIdToken: jest.fn(),
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
    } as any;
    mockOAuth2Client.mockImplementation(() => mockClient);
  });

  describe('verifyGoogleToken', () => {
    const mockPayload = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      sub: 'google-user-id',
    };

    it('should verify token and authenticate existing user', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };
      mockClient.verifyIdToken.mockResolvedValue(mockTicket as any);

      const mockExistingUser = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        googleId: null,
        avatar: null,
        resetDailyUsage: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        }),
      };

      mockUser.findOne.mockResolvedValue(mockExistingUser as any);

      const result = await verifyGoogleToken('mock-id-token');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockExistingUser.googleId).toBe('google-user-id');
      expect(mockExistingUser.avatar).toBe('https://example.com/avatar.jpg');
      expect(mockExistingUser.resetDailyUsage).toHaveBeenCalled();
    });

    it('should verify token and create new user', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };
      mockClient.verifyIdToken.mockResolvedValue(mockTicket as any);

      mockUser.findOne.mockResolvedValue(null);

      const mockNewUser = {
        _id: 'new-user-id',
        email: 'test@example.com',
        name: 'Test User',
        toObject: () => ({
          _id: 'new-user-id',
          email: 'test@example.com',
          name: 'Test User',
        }),
        save: jest.fn().mockResolvedValue(true),
      };

      mockUser.mockImplementation(() => mockNewUser as any);
      mockContributionLog.create.mockResolvedValue({} as any);

      const result = await verifyGoogleToken('mock-id-token');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockContributionLog.create).toHaveBeenCalled();
    });

    it('should fail with invalid token', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(null),
      };
      mockClient.verifyIdToken.mockResolvedValue(mockTicket as any);

      const result = await verifyGoogleToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Google token');
    });

    it('should fail when email is not provided', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockTicket = {
        getPayload: jest.fn().mockReturnValue({ ...mockPayload, email: undefined }),
      };
      mockClient.verifyIdToken.mockResolvedValue(mockTicket as any);

      const result = await verifyGoogleToken('mock-id-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not provided by Google');
    });

    it('should handle verification errors', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      mockClient.verifyIdToken.mockRejectedValue(new Error('Verification failed'));

      const result = await verifyGoogleToken('mock-id-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Google authentication failed');
    });
  });

  describe('getGoogleAuthUrl', () => {
    it('should generate Google auth URL', () => {
      mockClient.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize?...');

      const url = getGoogleAuthUrl();

      expect(url).toBe('https://accounts.google.com/oauth/authorize?...');
      expect(mockClient.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        include_granted_scopes: true,
      });
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockTokens = {
        id_token: 'mock-id-token',
        access_token: 'mock-access-token',
      };

      mockClient.getToken.mockResolvedValue({ tokens: mockTokens } as any);

      const result = await exchangeCodeForTokens('auth-code');

      expect(result.success).toBe(true);
      expect(result.idToken).toBe('mock-id-token');
    });

    it('should fail when no ID token is received', async () => {
      const mockTokens = {
        access_token: 'mock-access-token',
      };

      mockClient.getToken.mockResolvedValue({ tokens: mockTokens } as any);

      const result = await exchangeCodeForTokens('auth-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No ID token received from Google');
    });

    it('should handle token exchange errors', async () => {
      mockClient.getToken.mockRejectedValue(new Error('Token exchange failed'));

      const result = await exchangeCodeForTokens('auth-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to exchange code for tokens');
    });
  });
});