/**
 * Redis client with graceful fallback.
 *
 * - When REDIS_URL is set: uses ioredis for full Redis support
 * - When REDIS_URL is not set: provides a no-op stub so the app works without Redis
 */

export interface RedisLike {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<unknown>;
}

const noopRedis: RedisLike = {
  async get() {
    return null;
  },
  async setex() {
    return "OK";
  },
};

async function createRedis(): Promise<RedisLike> {
  if (!process.env.REDIS_URL) {
    return noopRedis;
  }

  try {
    const mod = await import("ioredis");
    const IoRedis = mod.default;
    return new IoRedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  } catch {
    console.warn("ioredis not available, using no-op Redis stub");
    return noopRedis;
  }
}

let _redis: RedisLike | null = null;

export async function getRedis(): Promise<RedisLike> {
  if (!_redis) {
    _redis = await createRedis();
  }
  return _redis;
}

// Synchronous accessor for backwards compat — returns noop if not yet initialized
export const redis: RedisLike = {
  async get(key: string) {
    const r = await getRedis();
    return r.get(key);
  },
  async setex(key: string, ttl: number, value: string) {
    const r = await getRedis();
    return r.setex(key, ttl, value);
  },
};
