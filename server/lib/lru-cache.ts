/**
 * LRU Cache implementation with size limit to prevent memory leaks.
 * Thread-safe for single-threaded Node.js environments.
 */

export interface LRUCacheOptions {
  maxSize: number;
  ttlMs?: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, { value: V; ts: number }>;
  private readonly maxSize: number;
  private readonly ttlMs: number | null;

  constructor(options: LRUCacheOptions) {
    this.cache = new Map();
    this.maxSize = options.maxSize;
    this.ttlMs = options.ttlMs ?? null;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    if (this.ttlMs && Date.now() - entry.ts > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Delete existing to update order
    this.cache.delete(key);
    this.cache.set(key, { value, ts: Date.now() });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries first
    if (this.ttlMs) {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.ts > this.ttlMs) {
          this.cache.delete(key);
        }
      }
    }
    return this.cache.size;
  }
}
