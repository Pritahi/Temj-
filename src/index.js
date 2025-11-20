const express = require('express');
const config = require('./config/env');
const { startTelegramBot, bot } = require('./services/telegram');
const logger = require('./utils/logger');
const errorHandler = require('./utils/errorHandler');
const databaseService = require('./services/database');
const cleanupJobs = require('./jobs/cleanup-demo');
const cacheService = require('./utils/cache');

// Validation functions
const validateTelegramBotToken = (token) => {
  // Telegram bot token format: numbers:alphanumeric_string
  const tokenPattern = /^\d+:[A-Za-z0-9_-]{35}$/;
  return tokenPattern.test(token);
};

const validateApiKeyFormat = (apiKey, keyName) => {
  if (keyName === 'GEMINI_API_KEY') {
    // Gemini API keys typically start with "AIza"
    return apiKey.startsWith('AIza') && apiKey.length > 10;
  } else if (keyName === 'E2B_API_KEY') {
    // E2B API keys are alphanumeric
    return /^[A-Za-z0-9_-]+$/.test(apiKey) && apiKey.length > 10;
  }
  return true;
};

const checkPortAvailability = async (port) => {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
};

// Startup validation function
const validateStartup = async () => {
  logger.info('🔍 Validating configuration...');
  
  // Check environment variables
  logger.info('✅ Environment variables loaded');
  
  // Test database connection
  logger.info('🔗 Connecting to database...');
  try {
    await databaseService.initialize();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
  
  // Validate Telegram bot token format
  if (!validateTelegramBotToken(config.TELEGRAM_BOT_TOKEN)) {
    throw new Error('Invalid Telegram bot token format. Expected format: numbers:alphanumeric_string (e.g., 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)');
  }
  logger.info('✅ Telegram bot token format valid');
  
  // Test Telegram bot connection
  logger.info('🔗 Connecting to Telegram...');
  try {
    const botInfo = await bot.telegram.getMe();
    logger.info(`✅ Bot connected: @${botInfo.username} (ID: ${botInfo.id})`);
    logger.info(`   Bot name: ${botInfo.first_name}`);
    logger.info(`   Supports inline: ${botInfo.supports_inline_queries ? 'Yes' : 'No'}`);
  } catch (error) {
    throw new Error(`Failed to connect to Telegram: ${error.message}. Please check your bot token.`);
  }
  
  // Validate API key formats
  const apiKeys = [
    { key: 'GEMINI_API_KEY', value: config.GEMINI_API_KEY },
    { key: 'E2B_API_KEY', value: config.E2B_API_KEY }
  ];
  
  for (const { key, value } of apiKeys) {
    if (!validateApiKeyFormat(value, key)) {
      logger.warn(`⚠️ ${key} format might be invalid`);
    } else {
      logger.info(`✅ ${key} format validated`);
    }
  }
  
  // Check port availability
  const portAvailable = await checkPortAvailability(config.PORT);
  if (!portAvailable) {
    throw new Error(`Port ${config.PORT} is already in use. Please either stop the process using this port or change the PORT in your .env file.`);
  }
  logger.info(`✅ Port ${config.PORT} is available`);
  
  logger.info('🎉 All validations passed!');
};

// Initialize Express server
const app = express();
const PORT = config.PORT;

// Setup basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make database service available to all routes
app.locals.databaseService = databaseService;

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'CodeBot Backend',
    database: 'connected',
    cache: cacheService.cache.healthCheck(),
    cleanup_jobs: cleanupJobs.getStatus()
  };
  
  res.json(health);
});

// Database status endpoint
app.get('/database/status', async (req, res) => {
  try {
    // Get database status
    const status = await databaseService.getStatus();
    
    res.json({
      status: status.connected ? 'healthy' : 'disconnected',
      mode: status.mode,
      stats: {
        users: status.users,
        messages: status.messages,
        conversations: status.conversations,
        usage_logs: status.logs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Key Management Routes
const keysRouter = require('./routes/keys');
app.use('/api/keys', keysRouter);

// Setup error handling middleware
app.use(errorHandler.middleware);

// Main startup function
const startServer = async () => {
  try {
    // Run startup validations
    await validateStartup();
    
    // Start cleanup jobs
    logger.info('🧹 Starting cleanup jobs...');
    await cleanupJobs.start();
    logger.info('✅ Cleanup jobs started successfully');
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server started on port ${PORT}`);
      logger.info(`📝 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📊 Database status: http://localhost:${PORT}/database/status`);
      logger.info('✅ CodeBot backend is ready!');
    });

    // Start Telegram bot
    await startTelegramBot();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal, shutting down gracefully...');
      
      // Stop cleanup jobs
      try {
        await cleanupJobs.stop();
        logger.info('✅ Cleanup jobs stopped');
      } catch (error) {
        logger.error('❌ Error stopping cleanup jobs:', error);
      }
      
      // Disconnect database
      try {
        await databaseService.disconnect();
        logger.info('✅ Database disconnected');
      } catch (error) {
        logger.error('❌ Error disconnecting database:', error);
      }
      
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal, shutting down gracefully...');
      
      // Stop cleanup jobs
      try {
        await cleanupJobs.stop();
        logger.info('✅ Cleanup jobs stopped');
      } catch (error) {
        logger.error('❌ Error stopping cleanup jobs:', error);
      }
      
      // Disconnect database
      try {
        await databaseService.disconnect();
        logger.info('✅ Database disconnected');
      } catch (error) {
        logger.error('❌ Error disconnecting database:', error);
      }
      
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Startup validation failed:', error);
    logger.error('💥 CodeBot backend failed to start');
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;