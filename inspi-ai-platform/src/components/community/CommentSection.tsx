/**
 * 评论区组件
 * 支持评论展示、发布、回复、点赞等功能
 */
'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/shared/hooks/useAuth';

interface Comment {
  _id: string
  content: string
  author: {
    _id: string
    name: string
    avatar?: string
  }
  likesCount: number
  repliesCount: number
  isEdited: boolean
  editedAt?: string
  createdAt: string
  replies?: Comment[]
  userInteractions?: {
    isLiked: boolean
  }
}

interface CommentSectionProps {
  workId: string
  allowComments: boolean
  initialCommentsCount?: number
  className?: string
}

export function CommentSection({
  workId,
  allowComments,
  initialCommentsCount = 0,
  className = '',
}: CommentSectionProps) {
  const { user } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(initialCommentsCount);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 加载评论
  const loadComments = useCallback(
    async ({ page: targetPage, reset = false }: { page: number; reset?: boolean }) => {
      setLoading(true);

      try {
        const response = await fetch(`/api/works/${workId}/comments?page=${targetPage}&limit=20`);
        const result = await response.json();

        if (result.success) {
          const nextComments: Comment[] = Array.isArray(result.comments) ? result.comments : [];

          setComments(prev => (reset ? nextComments : [...prev, ...nextComments]));
          setPage(targetPage);
          setTotal(result.total ?? nextComments.length);
          setHasMore(targetPage < (result.totalPages ?? targetPage));
        }
      } catch (error) {
        console.error('Load comments error:', error);
      } finally {
        setLoading(false);
      }
    },
    [workId],
  );

  // 初始加载
  useEffect(() => {
    void loadComments({ page: 1, reset: true });
  }, [loadComments]);

  // 发布评论
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !newComment.trim()) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/works/${workId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setComments(prev => [result.comment, ...prev]);
        setNewComment('');
        setTotal(prev => prev + 1);
      }
    } catch (error) {
      console.error('Submit comment error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 发布回复
  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user || !replyContent.trim()) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/works/${workId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parentCommentId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新评论列表，添加回复
        setComments(prev =>
          prev.map(comment => {
            if (comment._id === parentCommentId) {
              return {
                ...comment,
                repliesCount: comment.repliesCount + 1,
                replies: [...(comment.replies || []), result.comment],
              };
            }
            return comment;
          }),
        );

        setReplyContent('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Submit reply error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 点赞评论
  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        setComments(prev =>
          prev.map(comment => {
            if (comment._id === commentId) {
              const isLiked = comment.userInteractions?.isLiked;
              return {
                ...comment,
                likesCount: isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
                userInteractions: {
                  ...comment.userInteractions,
                  isLiked: !isLiked,
                },
              };
            }
            return comment;
          }),
        );
      }
    } catch (error) {
      console.error('Like comment error:', error);
    }
  };

  // 编辑评论
  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setComments(prev =>
          prev.map(comment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                content: editContent.trim(),
                isEdited: true,
                editedAt: new Date().toISOString(),
              };
            }
            return comment;
          }),
        );

        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Edit comment error:', error);
    }
  };

  // 删除评论
  const handleDeleteComment = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteSubmitting(true);

      const response = await fetch(`/api/comments/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment._id !== deleteTarget._id));
        setTotal(prev => Math.max(prev - 1, 0));
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error('Delete comment error:', error);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const requestDeleteComment = (comment: Comment) => {
    setDeleteTarget(comment);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div key={comment._id} className={`${isReply ? 'ml-8 mt-3' : 'mb-6'}`}>
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          {comment.author.avatar ? (
            <Image
              src={comment.author.avatar}
              alt={comment.author.name}
              width={isReply ? 24 : 32}
              height={isReply ? 24 : 32}
              className="rounded-full"
            />
          ) : (
            <div className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} bg-gray-300 rounded-full flex items-center justify-center`}>
              <span className={`${isReply ? 'text-xs' : 'text-sm'} text-gray-600`}>
                {comment.author.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`${isReply ? 'text-sm' : 'text-base'} font-medium text-gray-900`}>
              {comment.author.name}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-gray-400">(已编辑)</span>
            )}
          </div>

          {editingComment === comment._id ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEditComment(comment._id)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`${isReply ? 'text-sm' : 'text-base'} text-gray-700 mb-2`}>
                {comment.content}
              </p>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {user && (
                  <>
                    <button
                      onClick={() => handleLikeComment(comment._id)}
                      className={`flex items-center space-x-1 hover:text-red-500 ${
                        comment.userInteractions?.isLiked ? 'text-red-500' : ''
                      }`}
                    >
                      <svg className="w-4 h-4" fill={comment.userInteractions?.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{comment.likesCount}</span>
                    </button>

                    {!isReply && (
                      <button
                        onClick={() => setReplyingTo(comment._id)}
                        className="hover:text-blue-500"
                      >
                        回复
                      </button>
                    )}

                    {comment.author._id === ((user as any)?._id || '') && (
                      <>
                        <button
                          onClick={() => {
                            setEditingComment(comment._id);
                            setEditContent(comment.content);
                          }}
                          className="hover:text-blue-500"
                        >
                          编辑
                        </button>
                      <button
                        onClick={() => requestDeleteComment(comment)}
                        className="hover:text-red-500"
                      >
                        删除
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* 回复表单 */}
          {replyingTo === comment._id && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`回复 ${comment.author.name}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSubmitReply(comment._id)}
                  disabled={submitting || !replyContent.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '发布中...' : '发布回复'}
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-3">
              {comment.replies.map(reply => renderComment(reply, true))}

              {comment.repliesCount > comment.replies.length && (
                <button
                  onClick={() => loadMoreReplies(comment._id)}
                  className="ml-8 text-sm text-blue-600 hover:text-blue-800"
                >
                  查看更多回复 ({comment.repliesCount - comment.replies.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const loadMoreReplies = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/replies`);
      const result = await response.json();

      if (result.success) {
        const replies: Comment[] = Array.isArray(result.comments) ? result.comments : [];

        setComments(prev =>
          prev.map(comment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                replies,
              };
            }
            return comment;
          }),
        );
      }
    } catch (error) {
      console.error('Load more replies error:', error);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    void loadComments({ page: nextPage });
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm ${className}`}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            评论 ({total})
        </h3>

        {/* 发布评论表单 */}
        {user && allowComments && (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm text-gray-600">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下你的评论..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {newComment.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? '发布中...' : '发布评论'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {!user && allowComments && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 mb-2">登录后可以发表评论</p>
            <a
              href="/auth/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              立即登录
            </a>
          </div>
        )}

        {!allowComments && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg text-center">
            <p className="text-yellow-800">该作品暂不允许评论</p>
          </div>
        )}

        {/* 评论列表 */}
        <div className="space-y-6">
          {comments.map(comment => renderComment(comment))}
        </div>

        {/* 加载更多 */}
        {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? '加载中...' : '加载更多评论'}
            </button>
          </div>
        )}

        {/* 空状态 */}
        {comments.length === 0 && !loading && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-600">
              {allowComments ? '还没有评论，快来发表第一条评论吧！' : '该作品暂不允许评论'}
            </p>
          </div>
        )}
      </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">删除评论</h3>
              <p className="mt-1 text-sm text-gray-500">
                确认删除这条评论吗？操作不可撤销。
              </p>
            </div>
            <div className="px-6 py-4 text-sm text-gray-700">
              <p className="max-h-32 overflow-y-auto break-words text-gray-600">
                {deleteTarget.content}
              </p>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                disabled={deleteSubmitting}
              >
                取消
              </button>
              <button
                onClick={handleDeleteComment}
                disabled={deleteSubmitting}
                className="rounded-lg px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {deleteSubmitting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CommentSection;
