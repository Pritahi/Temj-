const logger = require('./logger');

const errorHandler = {
  /**
   * Handle and log errors, return user-friendly messages
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @param {Object} req - Express request object (optional)
   * @param {Object} res - Express response object (optional)
   * @returns {string} User-friendly error message
   */
  handleError(error, context = 'Unknown', req = null, res = null) {
    // Log the error with context
    logger.error(`Error in ${context}:`, error);

    // Determine error type and create appropriate user message
    let userMessage = 'An unexpected error occurred. Please try again later.';

    if (error.message) {
      if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try a simpler request.';
      } else if (error.message.includes('rate limit') || error.response?.status === 429) {
        userMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('invalid') || error.response?.status === 400) {
        userMessage = 'Invalid request. Please check your input and try again.';
      } else if (error.message.includes('unauthorized') || error.response?.status === 401) {
        userMessage = 'Authentication error. Please contact support.';
      } else if (error.message.includes('forbidden') || error.response?.status === 403) {
        userMessage = 'Access denied. Please contact support.';
      } else if (error.message.includes('not found') || error.response?.status === 404) {
        userMessage = 'Resource not found. Please check your request.';
      } else if (error.message.includes('network') || error.code === 'ECONNREFUSED') {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('parse') || error.message.includes('JSON')) {
        userMessage = 'Data processing error. Please try rephrasing your request.';
      }
    }

    // Log user message for debugging
    logger.info(`User-facing message: ${userMessage}`);

    // If we have a response object, send the error response
    if (res && typeof res.status === 'function') {
      const statusCode = error.response?.status || 500;
      res.status(statusCode).json({
        error: userMessage,
        timestamp: new Date().toISOString(),
        context: context
      });
    }

    return userMessage;
  },

  /**
   * Middleware for Express error handling
   * @param {Error} error - Error object
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  middleware(error, req, res, next) {
    errorHandler.handleError(error, 'Express Middleware', req, res);
  },

  /**
   * Create a custom error with message and context
   * @param {string} message - Error message
   * @param {string} context - Context where error occurred
   * @param {number} statusCode - HTTP status code
   * @returns {Error} Custom error object
   */
  createError(message, context = 'Custom Error', statusCode = 500) {
    const error = new Error(message);
    error.context = context;
    error.statusCode = statusCode;
    return error;
  }
};

module.exports = errorHandler;