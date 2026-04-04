import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

/**
 * Hybrid Distributed Cache Service.
 * L1: In-process Map (Process-local fast access)
 * L2: Redis (Shared across all Microservices)
 * Fallback: Automatically falls back to L1 if Redis is unavailable.
 */
@Injectable()
export class CacheService implements OnModuleInit {
    private readonly localStore = new Map<string, CacheEntry<any>>();
    private redisClient: Redis | null = null;
    private isRedisReady = false;

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        this.initRedis();
    }

    private initRedis() {
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';

        try {
            this.redisClient = new Redis(redisUrl, {
                maxRetriesPerRequest: 1,
                retryStrategy(times) {
                    return Math.min(times * 100, 3000);
                },
                connectTimeout: 2000,
            });

            this.redisClient.on('error', (err) => {
                this.isRedisReady = false;
                console.warn('[Redis] Connection Issue (Cache):', err.message);
            });

            this.redisClient.on('connect', () => {
                this.isRedisReady = true;
                console.log('[Redis] Connected (Cache) for Distributed Caching.');
            });

            this.redisClient.on('ready', () => {
                this.isRedisReady = true;
            });

        } catch (error) {
            console.warn('[Redis] Cache initialization failed, using In-Memory mode only.');
        }
    }

    /**
     * Hybrid Get-Or-Set.
     * Priority: L1 (Local) -> L2 (Redis) -> Loader (DB)
     */
    async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
        const now = Date.now();

        // 1. Try L1 (Memory)
        const localEntry = this.localStore.get(key);
        if (localEntry && localEntry.expiresAt > now) {
            return localEntry.data as T;
        }

        // 2. Try L2 (Redis)
        if (this.isRedisReady && this.redisClient) {
            try {
                const cached = await this.redisClient.get(key);
                if (cached) {
                    const data = JSON.parse(cached) as T;
                    // Seed L1 for next time
                    this.localStore.set(key, { data, expiresAt: now + ttlMs });
                    return data;
                }
            } catch (err) {
                console.warn('[Redis] Cache Get Error:', err.message);
            }
        }

        // 3. Fallback to Loader (Database)
        const data = await loader();

        // 4. Update L1
        this.localStore.set(key, { data, expiresAt: now + ttlMs });

        // 5. Update L2 (Fire and forget)
        if (this.isRedisReady && this.redisClient) {
            this.redisClient.set(key, JSON.stringify(data), 'PX', ttlMs).catch(err => {
                console.warn('[Redis] Cache Set Error:', err.message);
            });
        }

        return data;
    }

    /** Invalidate a specific key across L1 and L2 */
    async invalidate(key: string): Promise<void> {
        this.localStore.delete(key);
        if (this.isRedisReady && this.redisClient) {
            await this.redisClient.del(key).catch(() => { });
        }
    }

    /** Invalidate by prefix (caution: L2 uses SCAN/KEYS which can be slow) */
    async invalidatePrefix(prefix: string): Promise<void> {
        // Clear L1
        for (const key of this.localStore.keys()) {
            if (key.startsWith(prefix)) {
                this.localStore.delete(key);
            }
        }

        // Clear L2
        if (this.isRedisReady && this.redisClient) {
            try {
                const keys = await this.redisClient.keys(`${prefix}*`);
                if (keys.length > 0) {
                    await this.redisClient.del(...keys);
                }
            } catch (err) {
                console.warn('[Redis] InvalidatePrefix Error:', err.message);
            }
        }
    }

    /** Purge all cache */
    async invalidateAll(): Promise<void> {
        this.localStore.clear();
        if (this.isRedisReady && this.redisClient) {
            await this.redisClient.flushdb().catch(() => { });
        }
    }

    get size(): number {
        return this.localStore.size;
    }
}
