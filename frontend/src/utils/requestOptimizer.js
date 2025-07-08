// Request optimization utility for reducing API calls and improving performance

class RequestOptimizer {
  constructor() {
    this.activeRequests = new Map();
    this.cache = new Map();
    this.lastFetchTime = new Map();
    this.batchQueue = new Map();
    this.CACHE_DURATION = 30000; // 30 seconds
    this.BATCH_DELAY = 200; // 200ms batch delay
  }

  createCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    return `${endpoint}-${JSON.stringify(sortedParams)}`;
  }

  isCacheValid(cacheKey) {
    const lastFetch = this.lastFetchTime.get(cacheKey);
    return lastFetch && Date.now() - lastFetch < this.CACHE_DURATION;
  }

  getCachedData(cacheKey) {
    if (this.isCacheValid(cacheKey)) {
      console.log(`[RequestOptimizer] Using cached data for: ${cacheKey}`);
      return this.cache.get(cacheKey);
    }
    return null;
  }

  async fetchWithCache(endpoint, params = {}, axiosInstance) {
    const cacheKey = this.createCacheKey(endpoint, params);

    // Check cache first
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Check if request is already in progress
    if (this.activeRequests.has(cacheKey)) {
      console.log(
        `[RequestOptimizer] Waiting for existing request: ${cacheKey}`
      );
      return this.activeRequests.get(cacheKey);
    }

    // Create new request
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    const requestPromise = axiosInstance
      .get(url)
      .then((response) => {
        const data = response.data.data || response.data;
        this.cache.set(cacheKey, data);
        this.lastFetchTime.set(cacheKey, Date.now());
        console.log(`[RequestOptimizer] Fetched and cached: ${cacheKey}`);
        return data;
      })
      .catch((error) => {
        // Don't cache errors, but log them
        console.error(`[RequestOptimizer] Error fetching ${cacheKey}:`, error);
        throw error;
      })
      .finally(() => {
        this.activeRequests.delete(cacheKey);
      });

    this.activeRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Batch multiple requests to reduce server load
  async batchRequest(batchKey, requestFn, delay = this.BATCH_DELAY) {
    if (this.batchQueue.has(batchKey)) {
      // Return existing batch promise
      return this.batchQueue.get(batchKey);
    }

    const batchPromise = new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.batchQueue.delete(batchKey);
        }
      }, delay);
    });

    this.batchQueue.set(batchKey, batchPromise);
    return batchPromise;
  }

  invalidateCache(pattern) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.lastFetchTime.delete(key);
    });

    console.log(
      `[RequestOptimizer] Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`
    );
  }

  invalidateAllCache() {
    this.cache.clear();
    this.lastFetchTime.clear();
    this.activeRequests.clear();
    this.batchQueue.clear();
    console.log(`[RequestOptimizer] Invalidated all cache`);
  }

  // Get cache statistics for debugging
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests.size,
      batchQueue: this.batchQueue.size,
      oldestEntry: Math.min(...Array.from(this.lastFetchTime.values())),
      newestEntry: Math.max(...Array.from(this.lastFetchTime.values())),
    };
  }
}

// Global instance
const requestOptimizer = new RequestOptimizer();

// Utility functions for common operations
export const optimizedFetch = (endpoint, params, axiosInstance) => {
  return requestOptimizer.fetchWithCache(endpoint, params, axiosInstance);
};

export const batchRequest = (batchKey, requestFn, delay) => {
  return requestOptimizer.batchRequest(batchKey, requestFn, delay);
};

export const invalidateCache = (pattern) => {
  requestOptimizer.invalidateCache(pattern);
};

export const invalidateAllCache = () => {
  requestOptimizer.invalidateAllCache();
};

export const getCacheStats = () => {
  return requestOptimizer.getCacheStats();
};

export default requestOptimizer;
