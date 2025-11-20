const databaseService = require('../services/database');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

/**
 * Authentication middleware for Telegram bot
 * This middleware:
 * 1. Extracts telegram_chat_id from message
 * 2. Checks if user exists in database
 * 3. If not exists: sends registration message and blocks request
 * 4. If exists: checks active status and quota
 * 5. If quota exceeded: sends upgrade message
 * 6. If OK: allows request and attaches user object
 */

class AuthenticationMiddleware {
  /**
   * Main authentication handler
   * @param {Object} ctx - Telegraf context
   * @returns {Promise<Object>} - User object if authenticated, null if blocked
   */
  async authenticate(ctx) {
    const chatId = ctx.chat.id;
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    
    try {
      logger.info(`🔐 Authenticating user ${chatId} (${username})`);

      // Step 1: Find user in database
      let user = await databaseService.findUserByTelegramId(chatId);
      
      if (!user) {
        logger.info(`👤 User ${chatId} not found, creating new user`);
        await this.handleNewUser(ctx, chatId, username);
        return null;
      }

      // Step 2: Check if user is active (handle undefined as active for backward compatibility)
      if (user.is_active === false) {
        logger.warn(`⚠️ User ${chatId} is inactive`);
        await ctx.reply(
          '❌ Your account has been deactivated. Please contact support for assistance.'
        );
        return null;
      }

      // Step 3: Check message quota
      const quota = await databaseService.checkUserQuota(user.id);
      
      if (!quota.hasQuota) {
        logger.warn(`⚠️ User ${chatId} exceeded message quota (${quota.used}/${quota.total})`);
        await this.handleQuotaExceeded(ctx, user, quota);
        return null;
      }

      // Step 4: Update last activity and return user
      await databaseService.updateUser(user.id, {
        updated_at: new Date()
      });

      // Increment message count
      await databaseService.incrementMessageCount(user.id);

      logger.info(`✅ User ${chatId} authenticated successfully (quota: ${quota.remaining}/${quota.total} remaining)`);
      
      return {
        ...user,
        remaining_quota: quota.remaining
      };

    } catch (error) {
      logger.error('❌ Authentication error:', error);
      await ctx.reply(
        '❌ Authentication error. Please try again or contact support.'
      );
      return null;
    }
  }

  /**
   * Handle new user registration
   * @param {Object} ctx - Telegraf context  
   * @param {BigInt} chatId - Telegram chat ID
   * @param {String} username - Telegram username
   */
  async handleNewUser(ctx, chatId, username) {
    try {
      // Create new user
      const newUser = await databaseService.createUser({
        telegramChatId: chatId,
        username: username,
        name: username,
        tier: 'FREE'
      });

      logger.info(`👤 New user created: ${newUser.id} (${chatId})`);

      const welcomeMessage = `🎉 *Welcome to CodeBot!*

I've created your account. Here are your details:

📊 *Your Limits:*
• Tier: FREE
• Monthly Messages: ${newUser.message_quota}
• Start Date: ${new Date().toLocaleDateString()}

🔧 *How to Use:*
• Simply describe what you want to code
• I'll create files, run commands, and test your code
• All operations run in secure sandboxed environments

🚀 *Need More Features?*
Upgrade to PRO for:
• Higher message limits
• Priority support
• Advanced features

Ready to start coding? Send me your first request! 👨‍💻`;

      await ctx.replyWithMarkdown(welcomeMessage);
      
      // Block the first request (already replied with welcome)
      logger.info(`🚫 Blocking initial request for new user ${chatId}`);
      
    } catch (error) {
      logger.error('❌ Error handling new user:', error);
      await ctx.reply('❌ Error creating your account. Please try again.');
    }
  }

  /**
   * Handle quota exceeded situation
   * @param {Object} ctx - Telegraf context
   * @param {Object} user - User object
   * @param {Object} quota - Quota information
   */
  async handleQuotaExceeded(ctx, user, quota) {
    const upgradeMessage = `🚨 *Message Limit Reached*

You've used ${quota.used} out of ${quota.total} messages this month.

💳 *Upgrade Options:*
• *BASIC*: $5/month - 500 messages  
• *PRO*: $15/month - 2000 messages + priority support

🔄 *Reset Schedule:*
Your quota resets automatically on the ${this.getNextResetDate()}.

To upgrade, contact: @codebot_support

Or wait until next month for a fresh start!`;

    await ctx.replyWithMarkdown(upgradeMessage);
  }

  /**
   * Get next quota reset date
   * @returns {String} - Date string
   */
  getNextResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  /**
   * Middleware wrapper for Telegraf
   * @param {Object} ctx - Telegraf context
   * @param {Function} next - Next middleware function
   */
  async middleware(ctx, next) {
    try {
      const user = await this.authenticate(ctx);
      
      // Attach user to context if authenticated
      if (user) {
        ctx.state.user = user;
        await next();
      }
      // If not authenticated, the authentication function already sent a response
      
    } catch (error) {
      logger.error('❌ Authentication middleware error:', error);
      errorHandler.handleError(error, 'Authentication Middleware');
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }

  /**
   * Check if user has custom API keys
   * @param {Object} user - User object
   * @returns {Object} - API keys configuration
   */
  getApiKeyConfig(user) {
    return {
      useDefault: !user.gemini_api_key_encrypted,
      gemini: user.gemini_api_key_encrypted || null,
      e2b: user.e2b_api_key_encrypted || null
    };
  }

  /**
   * Rate limiting check (basic implementation)
   * @param {BigInt} chatId - User chat ID
   * @returns {Promise<boolean>} - True if within rate limits
   */
  async checkRateLimit(chatId) {
    try {
      // Basic rate limiting: max 10 requests per minute
      // This is a simple implementation - in production, use Redis
      const logs = await databaseService.prisma.usageLog.findMany({
        where: {
          user: {
            telegram_chat_id: chatId
          },
          created_at: {
            gte: new Date(Date.now() - 60000) // Last minute
          },
          operation_type: 'message'
        },
        take: 10
      });

      return logs.length < 10;
    } catch (error) {
      logger.error('❌ Rate limit check error:', error);
      return true; // Allow on error
    }
  }

  /**
   * Get user's tier information
   * @param {Object} user - User object
   * @returns {Object} - Tier configuration
   */
  getTierConfig(user) {
    const configs = {
      FREE: {
        messages: 100,
        features: ['basic_coding', 'file_operations', 'terminal_commands']
      },
      BASIC: {
        messages: 500,
        features: ['basic_coding', 'file_operations', 'terminal_commands', 'browser_automation']
      },
      PRO: {
        messages: 2000,
        features: ['basic_coding', 'file_operations', 'terminal_commands', 'browser_automation', 'priority_support']
      }
    };

    return configs[user.tier] || configs.FREE;
  }
}

// Export middleware instance
const auth = new AuthenticationMiddleware();

module.exports = auth;