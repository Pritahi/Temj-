require('dotenv').config();

const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  E2B_API_KEY: process.env.E2B_API_KEY,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Validate required environment variables
const requiredVars = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'E2B_API_KEY'];
const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Validate PORT is a number
if (isNaN(config.PORT) || config.PORT <= 0 || config.PORT > 65535) {
  throw new Error('PORT must be a valid port number (1-65535)');
}

module.exports = config;