const cron = require('node-cron');
const databaseService = require('../services/database');
const cacheService = require('../utils/cache');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

/**
 * Cleanup jobs for database maintenance
 * Uses node-cron for scheduled tasks
 */

class CleanupJobs {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
  }

  /**
   * Initialize all cleanup jobs
   */
  async initialize() {
    try {
      if (this.isRunning) {
        logger.warn('⚠️ Cleanup jobs already running');
        return;
      }

      logger.info('🧹 Initializing cleanup jobs...');

      // Job 1: Clean old messages (daily at 2 AM)
      this.scheduleJob('old-messages', '0 2 * * *', async () => {
        await this.cleanOldMessages();
      });

      // Job 2: Reset monthly quotas (1st of each month at midnight)
      this.scheduleJob('reset-quotas', '0 0 1 * *', async () => {
        await this.resetMonthlyQuotas();
      });

      // Job 3: Clear expired cache (every 5 minutes)
      this.scheduleJob('clear-cache', '*/5 * * * *', async () => {
        await this.clearExpiredCache();
      });

      // Job 4: Clean old usage logs (weekly on Sunday at 3 AM)
      this.scheduleJob('old-logs', '0 3 * * 0', async () => {
        await this.cleanOldUsageLogs();
      });

      // Job 5: Database health check (daily at 6 AM)
      this.scheduleJob('health-check', '0 6 * * *', async () => {
        await this.databaseHealthCheck();
      });

      // Job 6: Clean inactive users (weekly on Monday at 4 AM)
      this.scheduleJob('inactive-users', '0 4 * * 1', async () => {
        await this.cleanInactiveUsers();
      });

      this.isRunning = true;
      logger.info('✅ Cleanup jobs initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize cleanup jobs:', error);
      throw error;
    }
  }

  /**
   * Schedule a cleanup job
   * @param {String} name 
   * @param {String} schedule 
   * @param {Function} task 
   */
  scheduleJob(name, schedule, task) {
    try {
      const job = cron.schedule(schedule, async () => {
        const startTime = Date.now();
        logger.info(`🔄 Starting cleanup job: ${name}`);

        try {
          await task();
          const duration = Date.now() - startTime;
          logger.info(`✅ Completed cleanup job: ${name} (${duration}ms)`);
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`❌ Failed cleanup job: ${name} (${duration}ms)`, error);
          errorHandler.handleError(error, `Cleanup Job: ${name}`);
        }
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.jobs.push({ name, job, schedule, task });
      logger.info(`📅 Scheduled job: ${name} (${schedule})`);
      
    } catch (error) {
      logger.error(`❌ Failed to schedule job ${name}:`, error);
    }
  }

  /**
   * Clean messages older than 30 days
   */
  async cleanOldMessages() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const result = await databaseService.prisma.message.updateMany({
        where: {
          created_at: {
            lt: cutoffDate
          },
          deleted_at: null
        },
        data: {
          deleted_at: new Date()
        }
      });

      logger.info(`🧹 Cleaned ${result.count} old messages (older than 30 days)`);

    } catch (error) {
      logger.error('❌ Error cleaning old messages:', error);
      throw error;
    }
  }

  /**
   * Reset monthly quotas for all users
   */
  async resetMonthlyQuotas() {
    try {
      const result = await databaseService.prisma.user.updateMany({
        where: {
          quota_reset_date: {
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        data: {
          message_count: 0,
          quota_reset_date: new Date()
        }
      });

      // Clear quota cache for all users
      await cacheService.cache.clearExpired();

      logger.info(`🔄 Reset quotas for ${result.count} users`);

    } catch (error) {
      logger.error('❌ Error resetting monthly quotas:', error);
      throw error;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    try {
      const stats = await cacheService.cache.cleanup();
      logger.debug(`🧹 Cache cleanup: ${stats.cleared} entries cleared`);
    } catch (error) {
      logger.error('❌ Error clearing expired cache:', error);
      throw error;
    }
  }

  /**
   * Clean usage logs older than 90 days
   */
  async cleanOldUsageLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await databaseService.prisma.usageLog.deleteMany({
        where: {
          created_at: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`🧹 Cleaned ${result.count} old usage logs (older than 90 days)`);

    } catch (error) {
      logger.error('❌ Error cleaning old usage logs:', error);
      throw error;
    }
  }

  /**
   * Database health check
   */
  async databaseHealthCheck() {
    try {
      // Check database connection
      await databaseService.prisma.$queryRaw`SELECT 1`;
      
      // Get database statistics
      const userCount = await databaseService.prisma.user.count();
      const messageCount = await databaseService.prisma.message.count();
      const conversationCount = await databaseService.prisma.conversation.count();
      const usageLogCount = await databaseService.prisma.usageLog.count();

      // Check for inactive users
      const inactiveUsers = await databaseService.prisma.user.count({
        where: {
          is_active: false
        }
      });

      // Check cache health
      const cacheHealth = cacheService.cache.healthCheck();

      logger.info(`🏥 Database Health Check Results:`);
      logger.info(`   Users: ${userCount} (${inactiveUsers} inactive)`);
      logger.info(`   Messages: ${messageCount}`);
      logger.info(`   Conversations: ${conversationCount}`);
      logger.info(`   Usage logs: ${usageLogCount}`);
      logger.info(`   Cache: ${JSON.stringify(cacheHealth.stats)}`);

      // Alert if numbers are too high
      if (usageLogCount > 100000) {
        logger.warn(`⚠️ High usage log count: ${usageLogCount}`);
      }

      if (messageCount > 500000) {
        logger.warn(`⚠️ High message count: ${messageCount}`);
      }

    } catch (error) {
      logger.error('❌ Database health check failed:', error);
      throw error;
    }
  }

  /**
   * Clean inactive users (optional cleanup)
   */
  async cleanInactiveUsers() {
    try {
      // Only clean users inactive for more than 6 months
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);

      // Count users that would be cleaned
      const inactiveUsers = await databaseService.prisma.user.count({
        where: {
          is_active: false,
          updated_at: {
            lt: cutoffDate
          }
        }
      });

      if (inactiveUsers > 0) {
        const result = await databaseService.prisma.user.deleteMany({
          where: {
            is_active: false,
            updated_at: {
              lt: cutoffDate
            }
          }
        });

        logger.info(`🧹 Deleted ${result.count} inactive users (6+ months inactive)`);
      }

    } catch (error) {
      logger.error('❌ Error cleaning inactive users:', error);
      throw error;
    }
  }

  /**
   * Manually run a specific cleanup job
   * @param {String} jobName 
   */
  async runManualJob(jobName) {
    const job = this.jobs.find(j => j.name === jobName);
    
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    logger.info(`🔄 Manually running job: ${jobName}`);
    
    try {
      await job.task();
      logger.info(`✅ Manual job completed: ${jobName}`);
    } catch (error) {
      logger.error(`❌ Manual job failed: ${jobName}`, error);
      throw error;
    }
  }

  /**
   * Get job status
   * @returns {Array}
   */
  getJobStatus() {
    return this.jobs.map(job => ({
      name: job.name,
      schedule: job.schedule,
      running: job.job.running,
      lastError: job.lastError || null
    }));
  }

  /**
   * Stop all cleanup jobs
   */
  stopAll() {
    try {
      logger.info('🛑 Stopping all cleanup jobs...');
      
      this.jobs.forEach(({ name, job }) => {
        job.stop();
        logger.info(`🛑 Stopped job: ${name}`);
      });

      this.jobs = [];
      this.isRunning = false;
      
      logger.info('✅ All cleanup jobs stopped');
      
    } catch (error) {
      logger.error('❌ Error stopping cleanup jobs:', error);
      throw error;
    }
  }

  /**
   * Restart all cleanup jobs
   */
  async restart() {
    try {
      this.stopAll();
      await this.initialize();
      logger.info('🔄 Cleanup jobs restarted');
    } catch (error) {
      logger.error('❌ Error restarting cleanup jobs:', error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   * @returns {Object}
   */
  getStats() {
    const cacheStats = cacheService.cache.getStats();
    
    return {
      isRunning: this.isRunning,
      jobsCount: this.jobs.length,
      runningJobs: this.jobs.filter(j => j.job.running).length,
      cache: cacheStats,
      uptime: process.uptime(),
      nodeVersion: process.version,
      memory: process.memoryUsage()
    };
  }
}

// Create singleton instance
const cleanupJobs = new CleanupJobs();

module.exports = {
  cleanupJobs,
  
  // Helper functions for easy access
  async start() {
    return await cleanupJobs.initialize();
  },

  async stop() {
    return cleanupJobs.stopAll();
  },

  async restart() {
    return await cleanupJobs.restart();
  },

  async run(jobName) {
    return await cleanupJobs.runManualJob(jobName);
  },

  status() {
    return cleanupJobs.getStats();
  }
};