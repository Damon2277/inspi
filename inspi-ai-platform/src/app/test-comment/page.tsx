'use client';

import { CommentSystem } from '@/components/comments/CommentSystem';
import { AppLayout } from '@/components/layout';

export default function TestCommentPage() {
  return (
    <AppLayout>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '32px' }}>
          评论系统测试页面
        </h1>
        <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>测试作品评论</h2>
          <CommentSystem
            workId="test-work-123"
            workTitle="测试作品标题"
            initialComments={[
              {
                id: 'comment-1',
                workId: 'test-work-123',
                userId: 'user-1',
                userName: '张老师',
                userAvatar: '👩‍🏫',
                content: '这个教学设计非常有创意！特别是互动环节的设计，能够充分调动学生的积极性。',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                likes: 5,
                isLiked: false,
                replies: [
                  {
                    id: 'reply-1',
                    workId: 'test-work-123',
                    userId: 'user-2',
                    userName: '李老师',
                    userAvatar: '👨‍🏫',
                    content: '同意！我也觉得这个设计很棒，准备在我的课堂上试试。',
                    createdAt: new Date(Date.now() - 1800000).toISOString(),
                    likes: 2,
                    isLiked: false,
                    parentId: 'comment-1',
                    replies: [],
                  },
                ],
              },
              {
                id: 'comment-2',
                workId: 'test-work-123',
                userId: 'user-3',
                userName: '王老师',
                userAvatar: '🧑‍🏫',
                content: '**很好的分享！** 我有几点补充：\n\n1. 可以增加更多的小组讨论环节\n2. 建议加入一些实践操作\n3. 评价方式可以更多元化\n\n> 整体来说是一个优秀的教学设计！',
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                likes: 8,
                isLiked: true,
                replies: [],
              },
            ]}
          />
        </div>
      </div>
    </AppLayout>
  );
}
