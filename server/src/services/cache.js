const { LRUCache } = require('lru-cache');

const cache = new LRUCache({ max: 500, ttl: 5 * 60 * 1000 });

const getOrSet = async (key, loader, ttl) => {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const pending = Promise.resolve().then(loader);
  cache.set(key, pending, { ttl });
  try {
    const value = await pending;
    cache.set(key, value, { ttl });
    return value;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
};

const invalidatePrefix = (prefix) => {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
};

module.exports = { cache, getOrSet, invalidatePrefix };
