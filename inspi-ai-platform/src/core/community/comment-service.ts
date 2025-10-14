/**
 * 评论服务
 * 处理作品评论和回复功能
 */
import mongoose from 'mongoose';

import Comment, { CommentDocument } from '@/lib/models/Comment';
import Work from '@/lib/models/Work';
import connectDB from '@/lib/mongodb';

export interface CreateCommentRequest {
  content: string
  parentCommentId?: string
}

export interface UpdateCommentRequest {
  content: string
}

export interface CommentResponse {
  success: boolean
  comment?: CommentDocument
  comments?: CommentDocument[]
  total?: number
  page?: number
  totalPages?: number
  error?: string
  message?: string
}

/**
 * 评论服务类
 */
export class CommentService {
  /**
   * 创建评论
   */
  static async createComment(
    workId: string,
    authorId: string,
    data: CreateCommentRequest,
  ): Promise<CommentResponse> {
    try {
      await connectDB();

      // 验证作品存在
      const work = await (Work.findById as any)(workId);
      if (!work) {
        return {
          success: false,
          error: '作品不存在',
        };
      }

      // 检查是否允许评论
      if (!work.allowComments) {
        return {
          success: false,
          error: '该作品不允许评论',
        };
      }

      // 验证父评论存在（如果是回复）
      if (data.parentCommentId) {
        const parentComment = await (Comment.findById as any)(data.parentCommentId);
        if (!parentComment || parentComment.work.toString() !== workId) {
          return {
            success: false,
            error: '父评论不存在',
          };
        }
      }

      // 创建评论
      const comment = new Comment({
        work: new mongoose.Types.ObjectId(workId),
        author: new mongoose.Types.ObjectId(authorId),
        content: data.content.trim(),
        parentComment: data.parentCommentId ?
          new mongoose.Types.ObjectId(data.parentCommentId) : undefined,
      });

      const savedComment = await comment.save();
      await savedComment.populate('author', 'name avatar') as any;

      // 更新作品评论数
      if (!data.parentCommentId) {
        work.commentsCount += 1;
        await work.save();
      } else {
        // 更新父评论的回复数
        await (Comment.findByIdAndUpdate as any)(
          data.parentCommentId,
          { $inc: { repliesCount: 1 } },
        );
      }

      return {
        success: true,
        comment: savedComment,
        message: '评论发布成功',
      };
    } catch (error) {
      console.error('Create comment error:', error);
      return {
        success: false,
        error: '发布评论失败',
      };
    }
  }

  /**
   * 获取作品评论
   */
  static async getWorkComments(
    workId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<CommentResponse> {
    try {
      await connectDB();

      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        (Comment.find as any)({
          work: new mongoose.Types.ObjectId(workId),
          status: 'active',
          parentComment: { $exists: false },
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('author', 'name avatar')
          .populate({
            path: 'replies',
            match: { status: 'active' },
            options: { sort: { createdAt: 1 }, limit: 3 },
            populate: { path: 'author', select: 'name avatar' },
          }) as any,
        (Comment.countDocuments as any)({
          work: new mongoose.Types.ObjectId(workId),
          status: 'active',
          parentComment: { $exists: false },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        comments,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('Get work comments error:', error);
      return {
        success: false,
        error: '获取评论失败',
      };
    }
  }

  /**
   * 获取评论回复
   */
  static async getCommentReplies(
    commentId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<CommentResponse> {
    try {
      await connectDB();

      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        (Comment.find as any)({
          parentComment: new mongoose.Types.ObjectId(commentId),
          status: 'active',
        })
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .populate('author', 'name avatar') as any,
        (Comment.countDocuments as any)({
          parentComment: new mongoose.Types.ObjectId(commentId),
          status: 'active',
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        comments,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('Get comment replies error:', error);
      return {
        success: false,
        error: '获取回复失败',
      };
    }
  }

  /**
   * 更新评论
   */
  static async updateComment(
    commentId: string,
    authorId: string,
    data: UpdateCommentRequest,
  ): Promise<CommentResponse> {
    try {
      await connectDB();

      const comment = await (Comment.findOne as any)({
        _id: commentId,
        author: authorId,
      });

      if (!comment) {
        return {
          success: false,
          error: '评论不存在或无权限编辑',
        };
      }

      // 检查评论是否可以编辑（例如：发布后30分钟内）
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (comment.createdAt < thirtyMinutesAgo && !comment.isEdited) {
        return {
          success: false,
          error: '评论发布超过30分钟后不能编辑',
        };
      }

      // 更新评论
      await comment.editContent(data.content.trim());
      await comment.populate('author', 'name avatar') as any;

      return {
        success: true,
        comment,
        message: '评论更新成功',
      };
    } catch (error) {
      console.error('Update comment error:', error);
      return {
        success: false,
        error: '更新评论失败',
      };
    }
  }

  /**
   * 删除评论
   */
  static async deleteComment(
    commentId: string,
    authorId: string,
  ): Promise<CommentResponse> {
    try {
      await connectDB();

      const comment = await (Comment.findOne as any)({
        _id: commentId,
        author: authorId,
      });

      if (!comment) {
        return {
          success: false,
          error: '评论不存在或无权限删除',
        };
      }

      // 软删除评论
      comment.status = 'deleted';
      comment.content = '[该评论已被删除]';
      await comment.save();

      // 更新作品评论数
      if (!comment.parentComment) {
        await (Work.findByIdAndUpdate as any)(
          comment.work,
          { $inc: { commentsCount: -1 } },
        );
      } else {
        // 更新父评论的回复数
        await (Comment.findByIdAndUpdate as any)(
          comment.parentComment,
          { $inc: { repliesCount: -1 } },
        );
      }

      return {
        success: true,
        message: '评论删除成功',
      };
    } catch (error) {
      console.error('Delete comment error:', error);
      return {
        success: false,
        error: '删除评论失败',
      };
    }
  }

  /**
   * 点赞评论
   */
  static async toggleCommentLike(
    commentId: string,
    userId: string,
  ): Promise<CommentResponse> {
    try {
      await connectDB();

      const comment = await (Comment.findById as any)(commentId) as any;
      if (!comment) {
        return {
          success: false,
          error: '评论不存在',
        };
      }

      await comment.toggleLike(new mongoose.Types.ObjectId(userId));

      return {
        success: true,
        message: '操作成功',
      };
    } catch (error) {
      console.error('Toggle comment like error:', error);
      return {
        success: false,
        error: '操作失败',
      };
    }
  }
}

export default CommentService;
