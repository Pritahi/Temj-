const config = require('../config/env');

// ANSI color codes for terminal output
const colors = {
  info: '\x1b[36m',     // Cyan
  error: '\x1b[31m',    // Red
  warn: '\x1b[33m',     // Yellow
  reset: '\x1b[0m'      // Reset
};

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message, color) => {
  const timestamp = getTimestamp();
  const logLevel = level.toUpperCase().padEnd(5);
  return `${colors[color]}${timestamp} [${logLevel}] ${message}${colors.reset}`;
};

const shouldLog = (level) => {
  const levels = ['error', 'warn', 'info', 'debug'];
  const configLevelIndex = levels.indexOf(config.LOG_LEVEL);
  const currentLevelIndex = levels.indexOf(level);
  
  return currentLevelIndex <= configLevelIndex;
};

const logger = {
  info(message) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, 'info'));
    }
  },

  error(message, error = null) {
    if (shouldLog('error')) {
      const logMessage = error ? `${message}: ${error.message}` : message;
      console.error(formatMessage('error', logMessage, 'error'));
      if (error && error.stack) {
        console.error(colors.error + 'Stack trace: ' + error.stack + colors.reset);
      }
    }
  },

  warn(message) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, 'warn'));
    }
  },

  debug(message) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, 'info'));
    }
  }
};

module.exports = logger;