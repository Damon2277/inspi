'use client';

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import React, { useState, useEffect, useCallback } from 'react';

import { DesktopConfirmDialog } from '@/components/desktop/DesktopModal';
import { useToast } from '@/shared/hooks';
import { useAuth } from '@/shared/hooks/useAuth';

interface Comment {
  id: string;
  workId: string | number;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  replies: Comment[];
  parentId?: string;
  isLiked?: boolean;
}

interface CommentSystemProps {
  workId: string | number;
  workTitle?: string;
  onCommentCountChange?: (count: number) => void;
  initialComments?: Comment[];
}

function countComments(commentList: Comment[]): number {
  return commentList.reduce((count, comment) => {
    return count + 1 + countComments(comment.replies || []);
  }, 0);
}

export function CommentSystem({ workId, workTitle, onCommentCountChange, initialComments }: CommentSystemProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>(() => initialComments ?? []);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  // 加载评论
  const loadComments = useCallback(async () => {
    if (initialComments && initialComments.length > 0) {
      setComments(initialComments);
      onCommentCountChange?.(countComments(initialComments));
      return;
    }

    setIsLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      // 模拟数据
      const mockComments: Comment[] = [
        {
          id: '1',
          workId,
          userId: 'user1',
          userName: '王老师',
          userAvatar: '👨‍🏫',
          content: '这个教学设计非常实用，特别是可视化部分，让抽象概念变得生动形象！',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          likes: 12,
          replies: [
            {
              id: '1-1',
              workId,
              userId: 'user2',
              userName: '李老师',
              userAvatar: '👩‍🏫',
              content: '同意！我在课堂上试用了，学生的反应很积极。',
              createdAt: new Date(Date.now() - 43200000).toISOString(),
              likes: 5,
              replies: [],
              parentId: '1',
            },
          ],
        },
        {
          id: '2',
          workId,
          userId: 'user3',
          userName: '张老师',
          userAvatar: '👨‍🏫',
          content: '建议在练习部分增加一些分层作业，照顾不同水平的学生。',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          likes: 8,
          replies: [],
        },
      ];

      setComments(mockComments);
      onCommentCountChange?.(countComments(mockComments));
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initialComments, onCommentCountChange, workId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (initialComments) {
      setComments(initialComments);
      onCommentCountChange?.(countComments(initialComments));
    }
  }, [initialComments, onCommentCountChange]);

  // 提交新评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !isAuthenticated) return;

    setIsSubmitting(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const newCommentObj: Comment = {
        id: Date.now().toString(),
        workId,
        userId: user?._id || 'current-user',
        userName: user?.name || '当前用户',
        userAvatar: '👤',
        content: newComment,
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: [],
      };

      setComments(prev => [newCommentObj, ...prev]);
      setNewComment('');
      onCommentCountChange?.(countComments([newCommentObj, ...comments]));
    } catch (error) {
      console.error('发表评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交回复
  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !isAuthenticated) return;

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const newReply: Comment = {
        id: Date.now().toString(),
        workId,
        userId: user?._id || 'current-user',
        userName: user?.name || '当前用户',
        userAvatar: '👤',
        content: replyContent,
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: [],
        parentId,
      };

      setComments(prev => addReplyToComment(prev, parentId, newReply));
      setReplyTo(null);
      setReplyContent('');
      onCommentCountChange?.(countComments(comments) + 1);
    } catch (error) {
      console.error('发表回复失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 递归添加回复
  const addReplyToComment = (commentList: Comment[], parentId: string, reply: Comment): Comment[] => {
    return commentList.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply],
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, parentId, reply),
        };
      }
      return comment;
    });
  };

  // 点赞评论
  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) return;

    setComments(prev => updateCommentLike(prev, commentId));
  };

  // 递归更新点赞状态
  const updateCommentLike = (commentList: Comment[], commentId: string): Comment[] => {
    return commentList.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !comment.isLiked,
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentLike(comment.replies, commentId),
        };
      }
      return comment;
    });
  };

  // 删除评论
  const requestDeleteComment = (commentId: string) => {
    setPendingDeleteId(commentId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteComment = () => {
    if (!pendingDeleteId) return;

    setComments(prev => {
      const updated = deleteCommentFromList(prev, pendingDeleteId);
      onCommentCountChange?.(countComments(updated));
      return updated;
    });

    toast({
      title: '已删除评论',
      description: '评论内容已从讨论中移除。',
    });

    setPendingDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };

  // 递归删除评论
  const deleteCommentFromList = (commentList: Comment[], commentId: string): Comment[] => {
    return commentList
      .filter(comment => comment.id !== commentId)
      .map(comment => ({
        ...comment,
        replies: comment.replies ? deleteCommentFromList(comment.replies, commentId) : [],
      }));
  };

  // 排序评论
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return b.likes - a.likes;
    }
  });

  // 渲染单条评论
  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div
      key={comment.id}
      style={{
        display: 'flex',
        gap: '12px',
        padding: isReply ? '12px 0 12px 48px' : '16px 0',
        borderBottom: !isReply ? '1px solid var(--gray-200)' : 'none',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'var(--primary-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        flexShrink: 0,
      }}>
        {comment.userAvatar || '👤'}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <span style={{
            fontWeight: '600',
            color: 'var(--gray-900)',
            fontSize: '14px',
          }}>
            {comment.userName}
          </span>
          <span style={{
            fontSize: '12px',
            color: 'var(--gray-500)',
          }}>
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
          {comment.updatedAt && (
            <span style={{
              fontSize: '12px',
              color: 'var(--gray-400)',
            }}>
              (已编辑)
            </span>
          )}
        </div>

        {editingId === comment.id ? (
          <div style={{ marginBottom: '12px' }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px 12px',
                border: '1px solid var(--gray-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
            }}>
              <button
                onClick={() => {
                  // 保存编辑
                  setEditingId(null);
                }}
                className="modern-btn modern-btn-primary modern-btn-sm"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditContent('');
                }}
                className="modern-btn modern-btn-outline modern-btn-sm"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: '14px',
            color: 'var(--gray-700)',
            lineHeight: '1.6',
            marginBottom: '12px',
          }}>
            {comment.content}
          </p>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '13px',
        }}>
          <button
            onClick={() => handleLikeComment(comment.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: comment.isLiked ? 'var(--primary-600)' : 'var(--gray-500)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <svg width="16" height="16" fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {comment.likes > 0 && comment.likes}
          </button>

          <button
            onClick={() => {
              setReplyTo(comment.id);
              setReplyContent('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-500)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            回复
          </button>

          {comment.userId === user?._id && (
            <>
              <button
                onClick={() => {
                  setEditingId(comment.id);
                  setEditContent(comment.content);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-500)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                编辑
              </button>
              <button
                onClick={() => requestDeleteComment(comment.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger-600)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                删除
              </button>
            </>
          )}
        </div>

        {/* 回复输入框 */}
        {replyTo === comment.id && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-md)',
          }}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`回复 ${comment.userName}...`}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '8px 12px',
                border: '1px solid var(--gray-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setReplyTo(null)}
                className="modern-btn modern-btn-outline modern-btn-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleSubmitReply(comment.id)}
                disabled={!replyContent.trim() || isSubmitting}
                className="modern-btn modern-btn-primary modern-btn-sm"
              >
                {isSubmitting ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        )}

        {/* 渲染回复 */}
        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--gray-900)',
        }}>
          评论 ({countComments(comments)})
        </h3>

        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={() => setSortBy('newest')}
            style={{
              padding: '6px 12px',
              background: sortBy === 'newest' ? 'var(--primary-100)' : 'transparent',
              color: sortBy === 'newest' ? 'var(--primary-700)' : 'var(--gray-600)',
              border: '1px solid',
              borderColor: sortBy === 'newest' ? 'var(--primary-300)' : 'var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            最新
          </button>
          <button
            onClick={() => setSortBy('popular')}
            style={{
              padding: '6px 12px',
              background: sortBy === 'popular' ? 'var(--primary-100)' : 'transparent',
              color: sortBy === 'popular' ? 'var(--primary-700)' : 'var(--gray-600)',
              border: '1px solid',
              borderColor: sortBy === 'popular' ? 'var(--primary-300)' : 'var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            热门
          </button>
        </div>
      </div>

      {/* 发表评论 */}
      {isAuthenticated ? (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius-md)',
        }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`对「${workTitle || '这个作品'}」有什么想说的...`}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '12px',
          }}>
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className="modern-btn modern-btn-primary"
            >
              {isSubmitting ? '发表中...' : '发表评论'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
        }}>
          <p style={{
            color: 'var(--gray-600)',
            marginBottom: '12px',
          }}>
            登录后才能发表评论
          </p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="modern-btn modern-btn-primary"
          >
            立即登录
          </button>
        </div>
      )}

      {/* 评论列表 */}
      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--gray-500)',
        }}>
          加载评论中...
        </div>
      ) : sortedComments.length > 0 ? (
        <div>
          {sortedComments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--gray-500)',
        }}>
          暂无评论，快来发表第一条评论吧！
        </div>
      )}

      <DesktopConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDeleteComment}
        title="删除评论"
        message="确定要删除这条评论吗？删除后将无法恢复。"
        confirmText="确认删除"
        variant="danger"
      />
    </div>
  );
}
