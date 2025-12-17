import type { LeanDocument } from 'mongoose';

import type { WorkDocument } from '@/lib/models/Work';

export function serializeAdminWork(work: LeanDocument<WorkDocument>) {
  const plain: any = JSON.parse(JSON.stringify(work));

  plain._id = plain?._id || plain?.id || '';
  plain.id = plain.id || plain._id;

  if (!plain.author) {
    plain.author = {
      _id: '',
      name: '未知作者',
      avatar: null,
    };
  } else if (typeof plain.author === 'string') {
    plain.author = {
      _id: plain.author,
      name: '未知作者',
      avatar: null,
    };
  } else {
    plain.author._id = plain.author._id || plain.author.id || '';
    plain.author.avatar = plain.author.avatar ?? null;
    plain.author.name = plain.author.name || plain.author.email || '未知作者';
  }

  if (!Array.isArray(plain.cards)) {
    plain.cards = [];
  }
  if (!Array.isArray(plain.tags)) {
    plain.tags = [];
  }

  plain.createdAt = plain.createdAt || null;
  plain.updatedAt = plain.updatedAt || plain.createdAt || null;
  if (plain.publishedAt === undefined) {
    plain.publishedAt = null;
  }

  plain.likesCount = plain.likesCount ?? 0;
  plain.views = plain.views ?? 0;
  plain.reuseCount = plain.reuseCount ?? 0;
  plain.bookmarksCount = plain.bookmarksCount ?? 0;

  return plain;
}

export type AdminSerializedWork = ReturnType<typeof serializeAdminWork>;
