const { Telegraf } = require('telegraf');
const config = require('../config/env');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');
const { processMessage } = require('./messageProcessor');
const auth = require('../middleware/auth');
const cache = require('../utils/cache');
const databaseService = require('./database');

// Create Telegram bot instance
const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

/**
 * Setup bot commands and message handlers
 */
const setupBotHandlers = () => {
  // Command: /start
  bot.start(async (ctx) => {
    try {
      const userName = ctx.from.first_name || ctx.from.username || 'there';
      
      // Try to authenticate user (creates account if new)
      const user = await auth.authenticate(ctx);
      
      if (!user) {
        // User already handled by authentication (new users get welcome message)
        return;
      }
      
      // Check for custom API keys
      const apiConfig = auth.getApiKeyConfig(user);
      const tierConfig = auth.getTierConfig(user);
      
      const welcomeMessage = `
🤖 Welcome back to CodeBot, ${userName}!

**📊 Your Account:**
• Tier: ${user.tier}
• Messages Used: ${user.message_count}/${user.message_quota}
• Remaining: ${user.remaining_quota}

**🔧 Available Features:**
${tierConfig.features.map(feature => `• ${feature}`).join('\n')}

**💾 Your API Keys:**
• Gemini: ${apiConfig.useDefault ? 'Default' : 'Custom'}
• E2B: ${apiConfig.useDefault ? 'Default' : 'Custom'}

Just send me your programming questions or requests!
Need help? Type /help to see more options.
      `;
      
      await ctx.replyWithMarkdown(welcomeMessage);
      logger.info(`User ${ctx.from.id} started the bot (existing user)`);
      
    } catch (error) {
      logger.error('Error in start command:', error);
      await ctx.reply('Sorry, there was an error starting the bot. Please try again.');
    }
  });

  // Command: /help
  bot.help((ctx) => {
    try {
      const helpMessage = `
🆘 **CodeBot Help**

Here are the things I can help you with:

**💻 Code Operations:**
• Write code in Python, JavaScript, Bash, etc.
• Debug existing code
• Run scripts and commands
• Test code functionality

**📁 File Operations:**
• Create and edit files
• Read file contents
• Organize project structure

**🌐 Web Automation:**
• Navigate websites
• Take screenshots
• Fill out forms
• Test web applications

**❓ Example Requests:**
• "Write a Python script to sort a list"
• "Help me debug this JavaScript code: ..."
• "Create a web scraper for news articles"
• "Install pandas and show me how to use it"
• "Test if this website is working correctly"

**🔧 Bot Commands:**
/start - Start the bot
/help - Show this help message
/status - Check your account status
/setkeys - Activate your personal API keys
/revoke - Revoke your API keys

Just describe what you want to do, and I'll handle the technical details!
      `;
      
      ctx.replyWithMarkdown(helpMessage);
      logger.info(`User ${ctx.from.id} requested help`);
      
    } catch (error) {
      errorHandler.handleError(error, 'Bot Help Command', null, ctx);
      ctx.reply('Sorry, there was an error showing help. Please try again.');
    }
  });

  // Command: /setkeys - Guide user to activate API keys
  bot.command('setkeys', async (ctx) => {
    try {
      const user = await auth.authenticate(ctx);
      if (!user) return;

      const setkeysMessage = `
🔑 **Activate Your Personal API Keys**

To unlock full features and higher limits, activate your personal Gemini and E2B API keys:

**🚀 Benefits of Personal Keys:**
• Use your own API quotas
• Higher message limits
• Better performance
• Full feature access

**📝 Steps to Activate:**
1. **Visit:** http://localhost:3001/activate
2. **Enter your chat ID:** ${ctx.chat.id}
3. **Get your API keys:**
   - Gemini: https://makersuite.google.com/app/apikey
   - E2B: https://e2b.dev/

4. **Submit your keys** on the activation page

**🔒 Security:**
• Your keys will be encrypted and stored securely
• Only you have access to your keys
• You can revoke them anytime with /revoke

Need help getting API keys? Type /revoke for more info!
      `;

      await ctx.replyWithMarkdown(setkeysMessage);
      logger.info(`User ${ctx.from.id} requested setkeys command`);

    } catch (error) {
      logger.error('Error in setkeys command:', error);
      await ctx.reply('Error setting up API key activation. Please try again.');
    }
  });

  // Command: /revoke - Revoke API keys
  bot.command('revoke', async (ctx) => {
    try {
      const user = await auth.authenticate(ctx);
      if (!user) return;

      const revokeMessage = `
🗑️ **Revoke Your API Keys**

If you want to remove your personal API keys and return to default keys:

**⚠️ This will:**
• Remove your personal Gemini and E2B keys
• Downgrade your account to FREE tier
• Reset your quota limits
• Use default API keys going forward

**🔄 To reactivate:**
• Visit: http://localhost:3001/activate
• Or use /setkeys command

Are you sure you want to revoke your keys? 

Reply with "YES" to confirm, or "NO" to cancel.
      `;

      // Set a temporary state for confirmation
      ctx.session = ctx.session || {};
      ctx.session.awaitingRevokeConfirmation = true;

      await ctx.replyWithMarkdown(revokeMessage);
      logger.info(`User ${ctx.from.id} requested revoke command`);

    } catch (error) {
      logger.error('Error in revoke command:', error);
      await ctx.reply('Error setting up key revocation. Please try again.');
    }
  });

  // Command: /status - Show user status
  bot.command('status', async (ctx) => {
    try {
      const user = await auth.authenticate(ctx);
      if (!user) return;
      
      const tierConfig = auth.getTierConfig(user);
      const stats = `📊 *Your CodeBot Status*

*Account Details:*
• Tier: ${user.tier}
• Messages Used: ${user.message_count}/${user.message_quota}
• Remaining: ${user.remaining_quota}
• Account Created: ${new Date(user.created_at).toLocaleDateString()}

*Available Features:*
${tierConfig.features.map(feature => `• ${feature}`).join('\n')}

*Next Reset:* ${new Date(user.quota_reset_date).toLocaleDateString()}`;
      
      await ctx.replyWithMarkdown(stats);
      logger.info(`User ${ctx.from.id} requested status`);
    } catch (error) {
      logger.error('Error in status command:', error);
      await ctx.reply('Error getting your status. Please try again.');
    }
  });

  // Command: /reset - Reset monthly quota (for testing)
  bot.command('reset', async (ctx) => {
    try {
      const user = await auth.authenticate(ctx);
      if (!user) return;
      
      if (user.tier === 'FREE') {
        await ctx.reply('❌ Monthly quota reset is only available for PRO users.');
        return;
      }
      
      await databaseService.resetMonthlyQuota(user.id);
      await cache.clearUserCache(user.id);
      
      await ctx.reply('✅ Your monthly quota has been reset!');
      logger.info(`User ${ctx.from.id} reset their monthly quota`);
    } catch (error) {
      logger.error('Error in reset command:', error);
      await ctx.reply('Error resetting quota. Please try again.');
    }
  });

  // Handle all text messages with authentication
  bot.on('text', async (ctx, next) => {
    const userMessage = ctx.message.text;
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || 'Unknown';

    try {
      logger.info(`=== TELEGRAM MESSAGE RECEIVED ===`);
      logger.info(`User ID: ${userId}`);
      logger.info(`Username: ${userName}`);
      logger.info(`Chat ID: ${chatId}`);
      logger.info(`Message: ${userMessage.substring(0, 200)}...`);
      logger.info(`Message length: ${userMessage.length}`);

      // Send "typing" indicator
      logger.info('Sending typing indicator...');
      await ctx.telegram.sendChatAction(chatId, 'typing');

      // Run authentication middleware
      await auth.middleware(ctx, next);
      
    } catch (error) {
      logger.error(`=== TELEGRAM ERROR ===`);
      logger.error(`Error processing message from user ${userId}:`, error);
      
      const userMessage = errorHandler.handleError(error, 'Message Processing');
      logger.info(`Sending error message to user: ${userMessage}`);
      await ctx.reply(`Sorry, I encountered an error: ${userMessage}`);
    }
  });

  // Additional message handler for authenticated messages
  bot.on('text', async (ctx) => {
    // Only process if user is authenticated
    if (!ctx.state.user) {
      return; // User not authenticated, skip
    }
    
    const userMessage = ctx.message.text;
    const user = ctx.state.user;
    const chatId = ctx.chat.id;
    
    try {
      logger.info(`Processing authenticated message for user ${user.telegram_chat_id}`);
      
      // Get or create conversation
      let conversation = await databaseService.getConversation(`telegram_${chatId}`);
      if (!conversation) {
        conversation = await databaseService.createConversation(user.id, `telegram_${chatId}`);
      }
      
      // Log message usage
      await databaseService.logUsage(user.id, 'message', null, true);
      
      // Process the message with user context
      const response = await processMessage(chatId, userMessage, user);

      // Send response back to user
      logger.info('Processing message completed, sending response...');
      logger.info(`Response length: ${response?.length || 0}`);
      
      if (response) {
        // Handle long messages by splitting if needed
        if (response.length > 4000) {
          logger.info('Response is long, splitting into chunks...');
          const chunks = response.match(/.{1,4000}/g);
          logger.info(`Splitting into ${chunks.length} chunks`);
          for (const chunk of chunks) {
            await ctx.reply(chunk);
            // Small delay between chunks to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          await ctx.reply(response);
        }
        logger.info('Response sent successfully');
      } else {
        logger.warn('No response generated from processMessage');
        await ctx.reply('I received your message but couldn\'t process it. Please try rephrasing your request.');
      }

    } catch (error) {
      logger.error('Error in authenticated message handler:', error);
      await ctx.reply('Sorry, I encountered an error processing your message.');
    }
  });

  // Handle unsupported message types
  bot.on('photo', async (ctx) => {
    await ctx.reply('I can see you sent an image, but I currently only process text messages. Please describe what you need help with!');
  });

  bot.on('document', async (ctx) => {
    await ctx.reply('I can see you sent a file, but I currently only process text messages. Please describe what you need help with!');
  });

  bot.on('voice', async (ctx) => {
    await ctx.reply('I received your voice message, but I currently only process text messages. Please type your question!');
  });

  // Handle bot errors gracefully
  bot.catch((error, ctx) => {
    logger.error('Bot error:', error);
    if (ctx && ctx.reply) {
      ctx.reply('Sorry, I encountered an error. Please try again.');
    }
  });
};

/**
 * Start the Telegram bot
 */
const startTelegramBot = async () => {
  try {
    logger.info('Initializing Telegram bot...');
    
    // Setup handlers
    setupBotHandlers();
    
    // Launch bot
    await bot.launch();
    
    logger.info('Telegram bot started successfully');
    logger.info(`Bot username: @${bot.botInfo?.username || 'unknown'}`);
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    logger.error('Failed to start Telegram bot:', error);
    throw errorHandler.createError('Failed to start Telegram bot', 'Bot Initialization');
  }
};

/**
 * Stop the Telegram bot
 */
const stopTelegramBot = () => {
  try {
    logger.info('Stopping Telegram bot...');
    bot.stop('Manual stop');
    logger.info('Telegram bot stopped successfully');
  } catch (error) {
    logger.error('Error stopping Telegram bot:', error);
  }
};

module.exports = {
  bot,
  startTelegramBot,
  stopTelegramBot
};