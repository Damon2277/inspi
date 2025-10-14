declare module '@/lib/cache/manager' {
  export interface CacheSetOptions {
    ttl?: number;
    metadata?: Record<string, unknown>;
  }

  export interface CacheInfo {
    key: string;
    ttl?: number;
    expiresAt?: number;
    size?: number;
    hits?: number;
    metadata?: Record<string, unknown>;
  }

  export class CacheManager {
    constructor(options?: Record<string, unknown>);

    get<T = unknown>(key: string): Promise<T | null>;

    set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

    delete(key: string): Promise<void>;

    getKeys(pattern?: string): Promise<string[]>;

    getInfo(key: string): Promise<CacheInfo | null>;

    clear(): Promise<void>;
  }
}
