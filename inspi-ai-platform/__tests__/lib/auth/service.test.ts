import { registerUser, loginUser, getUserProfile, updateUserProfile, changePassword } from '@/lib/auth/service';
import { User } from '@/lib/models/User';
import { ContributionLog } from '@/lib/models/ContributionLog';
import { hashPassword, comparePassword } from '@/lib/auth/password';
import connectDB from '@/lib/mongodb';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/lib/models/User');
jest.mock('@/lib/models/ContributionLog');
jest.mock('@/lib/auth/password');
jest.mock('@/lib/auth/jwt', () => ({
  generateToken: jest.fn(() => 'mock-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
}));

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockUser = User as jest.MockedClass<typeof User>;
const mockContributionLog = ContributionLog as jest.MockedClass<typeof ContributionLog>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findOne.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed-password');
      
      const mockSavedUser = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        toObject: () => ({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        }),
        save: jest.fn().mockResolvedValue(true),
      };

      mockUser.mockImplementation(() => mockSavedUser as any);
      mockContributionLog.create.mockResolvedValue({} as any);

      const result = await registerUser(validRegisterData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockHashPassword).toHaveBeenCalledWith('Password123!');
      expect(mockContributionLog.create).toHaveBeenCalled();
    });

    it('should fail if user already exists', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findOne.mockResolvedValue({ email: 'test@example.com' } as any);

      const result = await registerUser(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with this email already exists');
    });

    it('should fail with invalid email', async () => {
      const invalidData = { ...validRegisterData, email: 'invalid-email' };

      const result = await registerUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should fail with missing required fields', async () => {
      const invalidData = { ...validRegisterData, email: '' };

      const result = await registerUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email, password, and name are required');
    });
  });

  describe('loginUser', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockUserDoc = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        resetDailyUsage: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        }),
      };

      mockUser.findOne.mockResolvedValue(mockUserDoc as any);
      mockComparePassword.mockResolvedValue(true);

      const result = await loginUser(validLoginData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockUserDoc.resetDailyUsage).toHaveBeenCalled();
    });

    it('should fail with invalid email', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findOne.mockResolvedValue(null);

      const result = await loginUser(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should fail with invalid password', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockUserDoc = {
        email: 'test@example.com',
        password: 'hashed-password',
      };

      mockUser.findOne.mockResolvedValue(mockUserDoc as any);
      mockComparePassword.mockResolvedValue(false);

      const result = await loginUser(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should fail with missing credentials', async () => {
      const invalidData = { email: '', password: '' };

      const result = await loginUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockUserDoc = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        resetDailyUsage: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        }),
      };

      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserDoc),
      } as any);

      const result = await getUserProfile('user-id');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockUserDoc.resetDailyUsage).toHaveBeenCalled();
    });

    it('should fail if user not found', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await getUserProfile('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockUpdatedUser = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Updated Name',
        toObject: () => ({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Updated Name',
        }),
      };

      mockUser.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUpdatedUser),
      } as any);

      const result = await updateUserProfile('user-id', { name: 'Updated Name' });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should fail if user not found', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await updateUserProfile('non-existent-id', { name: 'Updated Name' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockUserDoc = {
        _id: 'user-id',
        password: 'old-hashed-password',
        save: jest.fn().mockResolvedValue(true),
      };

      mockUser.findById.mockResolvedValue(mockUserDoc as any);
      mockComparePassword.mockResolvedValue(true);
      mockHashPassword.mockResolvedValue('new-hashed-password');

      const result = await changePassword('user-id', 'oldPassword', 'NewPassword123!');

      expect(result.success).toBe(true);
      expect(mockUserDoc.password).toBe('new-hashed-password');
      expect(mockUserDoc.save).toHaveBeenCalled();
    });

    it('should fail with incorrect current password', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      
      const mockUserDoc = {
        password: 'hashed-password',
      };

      mockUser.findById.mockResolvedValue(mockUserDoc as any);
      mockComparePassword.mockResolvedValue(false);

      const result = await changePassword('user-id', 'wrongPassword', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should fail if user not found', async () => {
      mockConnectDB.mockResolvedValue(undefined);
      mockUser.findById.mockResolvedValue(null);

      const result = await changePassword('non-existent-id', 'oldPassword', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
});