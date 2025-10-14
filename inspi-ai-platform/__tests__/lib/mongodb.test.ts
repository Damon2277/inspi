/**
 * @jest-environment node
 */
import { it, beforeEach, describe } from 'node:test';

import connectDB from '@/lib/mongodb';

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 1,
  },
}));

describe('MongoDB Connection', () => {
  beforeEach(() => {
    // Clear the global cache before each test
    global.mongoose = { conn: null, promise: null };
    jest.clearAllMocks();
    // Reset modules to clear any cached connections
    jest.resetModules();
  });

  it('should connect to MongoDB successfully', async () => {
    const mongoose = require('mongoose');
    mongoose.connect.mockResolvedValue(mongoose);

    const connection = await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(
      process.env.MONGODB_URI,
      expect.objectContaining({
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      }),
    );
    expect(connection).toBe(mongoose);
  });

  it('should reuse existing connection', async () => {
    const mongoose = require('mongoose');

    // Set up existing connection
    global.mongoose = { conn: mongoose, promise: null };

    const connection = await connectDB();

    expect(connection).toBe(mongoose);
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('should handle connection errors', async () => {
    const mongoose = require('mongoose');
    const error = new Error('Connection failed');
    mongoose.connect.mockRejectedValue(error);

    try {
      await connectDB();
    } catch (e) {
      expect(e.message).toBe('Connection failed');
    }
  });

  it('should use correct connection options', async () => {
    const mongoose = require('mongoose');
    mongoose.connect.mockResolvedValue(mongoose);

    // Clear any existing connections
    global.mongoose = { conn: null, promise: null };

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(
      process.env.MONGODB_URI,
      expect.objectContaining({
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      }),
    );
  });
});
