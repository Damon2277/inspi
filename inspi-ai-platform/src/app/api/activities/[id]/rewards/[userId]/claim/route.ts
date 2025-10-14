/**
 * 奖励领取API路由
 * 处理用户活动奖励的领取
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseFactory } from '@/lib/invitation/database';
import { logger } from '@/shared/utils/logger';

// POST /api/activities/[id]/rewards/[userId]/claim - 领取奖励
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  let activityId: string = '';
  let userId: string = '';
  try {
    const resolvedParams = await params;
    activityId = resolvedParams.id;
    userId = resolvedParams.userId;
    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json({
        success: false,
        error: '缺少奖励ID',
      }, { status: 400 });
    }

    const db = DatabaseFactory.getInstance();

    await db.transaction(async (conn) => {
      // 检查奖励是否已被领取
      const [existingClaim] = await conn.query<any>(`
        SELECT id FROM user_reward_claims
        WHERE activity_id = ? AND user_id = ? AND reward_id = ?
      `, [activityId, userId, rewardId]);

      if (existingClaim) {
        throw new Error('奖励已被领取');
      }

      // 查询用户活动结果
      const [result] = await conn.query<any>(`
        SELECT 
          ar.*,
          ia.end_date
        FROM activity_results ar
        JOIN invitation_activities ia ON ar.activity_id = ia.id
        WHERE ar.activity_id = ? AND ar.user_id = ?
      `, [activityId, userId]);

      if (!result) {
        throw new Error('未找到活动结果');
      }

      // 检查领取期限
      const endDate = new Date(result.end_date);
      const claimDeadline = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > claimDeadline) {
        throw new Error('奖励领取期限已过');
      }

      // 验证奖励ID格式和有效性
      const rewardIndex = parseInt(rewardId.split('-', 10).pop() || '0', 10);
      const rewards = JSON.parse(result.rewards_granted || '[]');

      if (rewardIndex >= rewards.length) {
        throw new Error('无效的奖励ID');
      }

      const reward = rewards[rewardIndex];

      // 记录奖励领取
      await conn.execute(`
        INSERT INTO user_reward_claims (
          id, activity_id, user_id, reward_id, reward_type, 
          reward_amount, claimed_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        uuidv4(),
        activityId,
        userId,
        rewardId,
        reward.type,
        reward.amount,
      ]);

      // 根据奖励类型执行相应的发放逻辑
      await processRewardGrant(conn, userId, reward);

      // 记录奖励发放事件
      await conn.execute(`
        INSERT INTO activity_events (
          id, activity_id, user_id, event_type, event_data
        ) VALUES (?, ?, ?, 'rewards_granted', ?)
      `, [
        uuidv4(),
        activityId,
        userId,
        JSON.stringify({
          rewardId,
          rewardType: reward.type,
          rewardAmount: reward.amount,
        }),
      ]);
    });

    logger.info('Reward claimed successfully', { activityId, userId, rewardId });

    return NextResponse.json({
      success: true,
      message: '奖励领取成功',
    });
  } catch (error) {
    logger.error('Failed to claim reward', { error, activityId, userId });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '领取奖励失败',
    }, { status: 500 });
  }
}

/**
 * 处理奖励发放逻辑
 */
async function processRewardGrant(conn: any, userId: string, reward: any): Promise<void> {
  switch (reward.type) {
    case 'ai_credits':
      // 增加用户AI生成次数
      await conn.execute(`
        UPDATE user_quotas 
        SET ai_credits = ai_credits + ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [reward.amount, userId]);
      break;

    case 'badge':
      // 授予用户徽章
      await conn.execute(`
        INSERT IGNORE INTO user_badges (
          id, user_id, badge_id, granted_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [uuidv4(), userId, reward.badgeId]);
      break;

    case 'title':
      // 授予用户称号
      await conn.execute(`
        INSERT IGNORE INTO user_titles (
          id, user_id, title_id, granted_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [uuidv4(), userId, reward.titleId]);
      break;

    case 'premium_access':
      // 延长高级功能访问期限
      await conn.execute(`
        UPDATE user_subscriptions 
        SET premium_expires_at = DATE_ADD(COALESCE(premium_expires_at, CURRENT_TIMESTAMP), INTERVAL ? DAY),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [reward.amount, userId]);
      break;

    case 'template_unlock':
      // 解锁模板
      await conn.execute(`
        INSERT IGNORE INTO user_template_access (
          id, user_id, template_id, granted_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [uuidv4(), userId, reward.templateId]);
      break;

    default:
      logger.warn('Unknown reward type', { rewardType: reward.type });
  }
}
