import mongoose from 'mongoose';

import { User, Work, KnowledgeGraph as KnowledgeGraphModel, ContributionLog } from '../models';
import type {
  UserDocument,
  WorkDocument,
  KnowledgeGraphDocument,
  ContributionLogDocument,
  IContributionLog,
} from '../models';
import connectDB from '../mongodb';

/**
 * Database operation utilities
 * Provides common database operations with error handling
 */

export class DatabaseOperations {
  /**
   * Ensure database connection before operations
   */
  private static async ensureConnection() {
    await connectDB();
  }

  /**
   * User operations
   */
  static async createUser(userData: Partial<UserDocument>): Promise<UserDocument> {
    await this.ensureConnection();

    try {
      const user = new User(userData);
      return await user.save();
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        throw new Error(`Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  static async findUserByEmail(email: string): Promise<UserDocument | null> {
    await this.ensureConnection();
    return await (User.findOne as any)({ email: email.toLowerCase() });
  }

  static async updateUser(userId: string, updateData: Partial<UserDocument>): Promise<UserDocument | null> {
    await this.ensureConnection();

    try {
      return await (User.findByIdAndUpdate as any)(
        userId,
        updateData,
        { new: true, runValidators: true },
      );
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        throw new Error(`Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Work operations
   */
  static async createWork(workData: Partial<WorkDocument>): Promise<WorkDocument> {
    await this.ensureConnection();

    try {
      const work = new Work(workData);
      return await work.save();
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        throw new Error(`Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  static async findPublicWorks(limit = 20, skip = 0): Promise<WorkDocument[]> {
    await this.ensureConnection();
    return await (Work.find as any)({ isPublic: true, status: 'published' })
      .populate('author', 'name avatar')
        .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  static async findWorksByAuthor(authorId: string): Promise<WorkDocument[]> {
    await this.ensureConnection();
    return await (Work.find as any)({ author: authorId })
      .populate('author', 'name avatar')
        .sort({ createdAt: -1 });
  }

  /**
   * Knowledge Graph operations
   */
  static async createKnowledgeGraph(graphData: Partial<KnowledgeGraphDocument>): Promise<KnowledgeGraphDocument> {
    await this.ensureConnection();

    try {
      const graph = new KnowledgeGraphModel(graphData);
      const savedGraph = await graph.save();
      return savedGraph;
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        throw new Error(`Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  static async findPublicKnowledgeGraphs(limit = 20, skip = 0): Promise<KnowledgeGraphDocument[]> {
    await this.ensureConnection();
    return await (KnowledgeGraphModel.find as any)({ isPublic: true })
      .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  /**
   * Contribution Log operations
   */
  static async logContribution(contributionData: Partial<IContributionLog>): Promise<IContributionLog> {
    await this.ensureConnection();

    try {
      const log = new ContributionLog(contributionData);
      return await log.save();
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        throw new Error(`Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  static async getUserContributions(userId: string, limit = 50): Promise<IContributionLog[]> {
    await this.ensureConnection();
    return await (ContributionLog.find as any)({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name avatar') as any;
  }

  /**
   * Generic operations
   */
  static async findById<T extends mongoose.Document>(
    model: mongoose.Model<T>,
    id: string,
  ): Promise<T | null> {
    await this.ensureConnection();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId format');
    }
    return await (model.findById as any)(id);
  }

  static async deleteById<T extends mongoose.Document>(
    model: mongoose.Model<T>,
    id: string,
  ): Promise<boolean> {
    await this.ensureConnection();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId format');
    }

    const result = await (model.findByIdAndDelete as any)(id);
    return result !== null;
  }

  /**
   * Health check operations
   */
  static async healthCheck(): Promise<{
    mongodb: { connected: boolean; status: string };
    models: { registered: string[] };
  }> {
    try {
      await this.ensureConnection();

      return {
        mongodb: {
          connected: mongoose.connection.readyState === 1,
          status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
        },
        models: {
          registered: Object.keys(mongoose.models),
        },
      };
    } catch (error) {
      return {
        mongodb: {
          connected: false,
          status: 'error',
        },
        models: {
          registered: [],
        },
      };
    }
  }
}

export default DatabaseOperations;
