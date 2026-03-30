import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

/**
 * Lightweight in-process TTL cache.
 * Designed for read-heavy, write-rarely data (rooms, semesters, faculties, etc.)
 * No external dependency required — works within a single NestJS process.
 */
@Injectable()
export class CacheService {
    private readonly store = new Map<string, CacheEntry<any>>();

    /**
     * Returns cached value if found and not expired, otherwise calls loader() and caches the result.
     * @param key   Unique cache key
     * @param ttlMs Time-to-live in milliseconds
     * @param loader Function that fetches fresh data when cache is cold/expired
     */
    async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
        const now = Date.now();
        const entry = this.store.get(key);

        if (entry && entry.expiresAt > now) {
            return entry.data as T;
        }

        const data = await loader();
        this.store.set(key, { data, expiresAt: now + ttlMs });
        return data;
    }

    /** Remove a specific key (use after a write operation to invalidate stale data) */
    invalidate(key: string): void {
        this.store.delete(key);
    }

    /** Remove all keys that start with the given prefix */
    invalidatePrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }

    /** Purge all cached entries (use sparingly) */
    invalidateAll(): void {
        this.store.clear();
    }

    /** Return the number of entries currently in cache (for diagnostics) */
    get size(): number {
        return this.store.size;
    }
}
