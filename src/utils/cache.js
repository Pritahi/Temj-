const logger = require('../utils/logger');

/**
 * Simple in-memory cache for user API keys and other data
 * Production-ready implementation would use Redis
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 30 * 60 * 1000; // 30 minutes in milliseconds
  }

  /**
   * Generate cache key
   * @param {String} prefix 
   * @param {...String} parts 
   * @returns {String}
   */
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Set a value in cache
   * @param {String} key 
   * @param {any} value 
   * @param {Number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiresAt
    });
    
    logger.debug(`📦 Cache set: ${key} (expires in ${ttl}ms)`);
  }

  /**
   * Get a value from cache
   * @param {String} key 
   * @returns {any|null}
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      logger.debug(`📤 Cache miss: ${key}`);
      return null;
    }

    if (Date.now() > item.expiresAt) {
      logger.debug(`📤 Cache expired: ${key}`);
      this.cache.delete(key);
      return null;
    }

    logger.debug(`📥 Cache hit: ${key}`);
    return item.value;
  }

  /**
   * Delete a value from cache
   * @param {String} key 
   * @returns {boolean}
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all expired entries
   */
  clearExpired() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      logger.info(`🧹 Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll() {
    const count = this.cache.size;
    this.cache.clear();
    logger.info(`🗑️ Cleared all ${count} cache entries`);
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      active: this.cache.size - expired,
      expired: expired,
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  /**
   * Calculate approximate memory usage
   * @returns {String}
   */
  calculateMemoryUsage() {
    let bytes = 0;
    
    for (const [key, item] of this.cache.entries()) {
      bytes += key.length;
      bytes += JSON.stringify(item).length;
    }
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * API KEY CACHING METHODS
   */

  /**
   * Get cached API keys for user
   * @param {String} userId 
   * @returns {Promise<Object|null>}
   */
  async getCachedKeys(userId) {
    const key = this.generateKey('api_keys', userId);
    return this.get(key);
  }

  /**
   * Cache API keys for user
   * @param {String} userId 
   * @param {Object} keys 
   * @param {Number} ttl 
   */
  async setCachedKeys(userId, keys, ttl = 30 * 60 * 1000) {
    const key = this.generateKey('api_keys', userId);
    this.set(key, keys, ttl);
  }

  /**
   * Clear API keys cache for user
   * @param {String} userId 
   */
  async clearCachedKeys(userId) {
    const key = this.generateKey('api_keys', userId);
    this.delete(key);
  }

  /**
   * CONVERSATION CACHING METHODS
   */

  /**
   * Get cached conversation
   * @param {String} conversationId 
   * @returns {Promise<Object|null>}
   */
  async getCachedConversation(conversationId) {
    const key = this.generateKey('conversation', conversationId);
    return this.get(key);
  }

  /**
   * Cache conversation data
   * @param {String} conversationId 
   * @param {Object} conversation 
   * @param {Number} ttl 
   */
  async setCachedConversation(conversationId, conversation, ttl = 10 * 60 * 1000) {
    const key = this.generateKey('conversation', conversationId);
    this.set(key, conversation, ttl);
  }

  /**
   * USER QUOTA CACHING METHODS
   */

  /**
   * Get cached user quota
   * @param {String} userId 
   * @returns {Promise<Object|null>}
   */
  async getCachedQuota(userId) {
    const key = this.generateKey('quota', userId);
    return this.get(key);
  }

  /**
   * Cache user quota information
   * @param {String} userId 
   * @param {Object} quota 
   * @param {Number} ttl 
   */
  async setCachedQuota(userId, quota, ttl = 5 * 60 * 1000) {
    const key = this.generateKey('quota', userId);
    this.set(key, quota, ttl);
  }

  /**
   * Clear user quota cache
   * @param {String} userId 
   */
  async clearCachedQuota(userId) {
    const key = this.generateKey('quota', userId);
    this.delete(key);
  }

  /**
   * RATE LIMITING CACHING
   */

  /**
   * Check if user is rate limited
   * @param {String} userId 
   * @param {Number} limit 
   * @param {Number} windowMs 
   * @returns {Promise<boolean>}
   */
  async checkRateLimit(userId, limit = 10, windowMs = 60000) {
    const key = this.generateKey('rate_limit', userId);
    
    let requests = this.get(key);
    if (!requests) {
      requests = { count: 0, windowStart: Date.now() };
    }

    // Reset window if expired
    if (Date.now() - requests.windowStart > windowMs) {
      requests = { count: 0, windowStart: Date.now() };
    }

    requests.count++;
    
    // Set new data
    this.set(key, requests, windowMs);
    
    return requests.count <= limit;
  }

  /**
   * Increment user request count
   * @param {String} userId 
   */
  async incrementRequestCount(userId) {
    const key = this.generateKey('requests', userId);
    const current = this.get(key) || 0;
    this.set(key, current + 1);
  }

  /**
   * COMPREHENSIVE CACHE MANAGEMENT
   */

  /**
   * Clear all cache for a specific user
   * @param {String} userId 
   */
  async clearUserCache(userId) {
    const patterns = [
      this.generateKey('api_keys', userId),
      this.generateKey('quota', userId),
      this.generateKey('rate_limit', userId),
      this.generateKey('requests', userId)
    ];

    for (const pattern of patterns) {
      this.delete(pattern);
    }

    logger.info(`🗑️ Cleared cache for user ${userId}`);
  }

  /**
   * Get all cache keys for debugging
   * @returns {Array}
   */
  getAllKeys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Cleanup method - call this periodically
   */
  async cleanup() {
    this.clearExpired();
    
    // Get statistics
    const stats = this.getStats();
    logger.info(`📊 Cache cleanup completed: ${stats.total} total, ${stats.active} active entries`);
    
    return stats;
  }

  /**
   * Health check for cache service
   * @returns {Object}
   */
  healthCheck() {
    const stats = this.getStats();
    const isHealthy = stats.expired === 0 && stats.total < 1000;
    
    return {
      healthy: isHealthy,
      stats,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

// Create singleton instance
const cache = new CacheService();

// Export with additional helper functions
module.exports = {
  cache,
  
  // Helper functions for easy use
  async getUserApiKeys(userId) {
    return await cache.getCachedKeys(userId);
  },

  async setUserApiKeys(userId, keys) {
    return await cache.setCachedKeys(userId, keys);
  },

  async getUserQuota(userId) {
    return await cache.getCachedQuota(userId);
  },

  async setUserQuota(userId, quota) {
    return await cache.setCachedQuota(userId, quota);
  },

  async isRateLimited(userId, limit = 10) {
    return !(await cache.checkRateLimit(userId, limit));
  },

  async clearUserData(userId) {
    return await cache.clearUserCache(userId);
  }
};