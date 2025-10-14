declare module '../lib/models/Work' {
  export interface IWork {
    _id: string;
    title: string;
    description?: string;
    authorId: string;
    tags?: string[];
    reuseCount?: number;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
  }
}
