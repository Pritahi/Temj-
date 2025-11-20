const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');
const { processConversation } = require('./gemini');
const { executeOperations } = require('./e2b');
const systemPrompt = require('../prompts/systemPrompt');
const config = require('../config/env');
const databaseService = require('./database');
const cache = require('../utils/cache');

/**
 * Process a user message through the complete pipeline:
 * Authentication -> Database Integration -> Gemini AI -> E2B operations (if needed) -> response
 * @param {number} chatId - Telegram chat ID
 * @param {string} messageText - User's message text
 * @param {Object} user - Authenticated user object (optional)
 * @param {Array} conversationHistory - Previous messages (optional)
 * @returns {Promise<string>} - Final response to send to user
 */
const processMessage = async (chatId, messageText, user = null, conversationHistory = []) => {
  const startTime = Date.now();
  let currentConversationHistory = [...conversationHistory];
  let conversation = null;
  
  try {
    logger.info(`Processing message for chat ${chatId}: "${messageText.substring(0, 100)}..."`);
    logger.info(`User provided: ${!!user}, User ID: ${user?.id || 'N/A'}`);

    // Get or create conversation in database
    if (user) {
      try {
        conversation = await databaseService.getConversation(`telegram_${chatId}`);
        if (!conversation) {
          conversation = await databaseService.createConversation(user.id, `telegram_${chatId}`);
          logger.info(`Created new conversation: ${conversation.id}`);
        }
      } catch (error) {
        logger.error('Error managing conversation:', error);
      }
    }

    // Validate input
    validateInput(messageText);

    // Get API keys (user-specific or default)
    let apiKeys = {
      gemini: config.GEMINI_API_KEY,
      e2b: config.E2B_API_KEY
    };

    if (user) {
      try {
        // Try to get cached keys first
        let cachedKeys = await cache.getUserApiKeys(user.id);
        
        if (!cachedKeys) {
          // Get from database
          const dbKeys = await databaseService.getUserApiKeys(user.id);
          if (dbKeys) {
            // Cache the keys
            await cache.setUserApiKeys(user.id, dbKeys);
            cachedKeys = dbKeys;
          }
        }
        
        if (cachedKeys) {
          if (cachedKeys.gemini) apiKeys.gemini = cachedKeys.gemini;
          if (cachedKeys.e2b) apiKeys.e2b = cachedKeys.e2b;
        }
        
        logger.info(`API keys configured for user ${user.id}: Gemini=${!!apiKeys.gemini}, E2B=${!!apiKeys.e2b}`);
      } catch (error) {
        logger.error('Error getting user API keys:', error);
      }
    }

    // Initialize conversation with system prompt
    if (currentConversationHistory.length === 0) {
      currentConversationHistory.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add user message to conversation history
    currentConversationHistory.push({
      role: 'user',
      content: messageText
    });

    // Step 1: Send message to Gemini AI with user's API key
    logger.info('Calling Gemini AI with API key...');
    const geminiResponse = await processConversation(messageText, currentConversationHistory, apiKeys.gemini);
    
    // Log Gemini usage if user provided
    if (user && geminiResponse.tokensUsed) {
      try {
        await databaseService.logUsage(
          user.id,
          'gemini_request',
          geminiResponse.tokensUsed,
          true
        );
      } catch (error) {
        logger.error('Error logging Gemini usage:', error);
      }
    }
    
    // Save user message to database
    if (conversation) {
      try {
        await databaseService.saveMessage(conversation.id, 'USER', messageText, geminiResponse.tokensUsed);
      } catch (error) {
        logger.error('Error saving user message:', error);
      }
    }
    
    // Step 2: Check if operations need to be executed
    if (geminiResponse.operations && geminiResponse.operations.length > 0) {
      logger.info(`Found ${geminiResponse.operations.length} operations to execute`);
      logger.info(`Operations received from Gemini: ${JSON.stringify(geminiResponse.operations, null, 2)}`);
      logger.info(`E2B API Key check (first 10 chars): ${apiKeys.e2b?.substring(0, 10) || 'NONE'}...`);
      
      // Execute operations in E2B sandbox with user's API key
      logger.info(`Calling executeOperations with ${geminiResponse.operations.length} operations...`);
      const operationResults = await executeOperations(geminiResponse.operations, apiKeys.e2b);
      
      // Log E2B usage
      if (user) {
        try {
          const successCount = operationResults.filter(r => r.success).length;
          await databaseService.logUsage(
            user.id,
            'e2b_operations',
            null,
            successCount === operationResults.length,
            successCount < operationResults.length ? 'Some operations failed' : null
          );
        } catch (error) {
          logger.error('Error logging E2B usage:', error);
        }
      }
      
      // Step 3: If status is "in_progress", send results back to Gemini
      if (geminiResponse.status === 'in_progress') {
        const resultsText = formatOperationResults(operationResults);
        
        // Add current exchange to conversation history
        currentConversationHistory.push({
          role: 'assistant',
          content: JSON.stringify(geminiResponse)
        });
        currentConversationHistory.push({
          role: 'user',
          content: `Here are the results of the operations:\n${resultsText}`
        });

        // Get final response from Gemini
        logger.info('Getting final response from Gemini with operation results...');
        const finalResponse = await processConversation(
          'Please summarize and explain the operation results.', 
          currentConversationHistory,
          apiKeys.gemini
        );
        
        // Save assistant response to database
        if (conversation) {
          try {
            await databaseService.saveMessage(conversation.id, 'ASSISTANT', finalResponse.response || geminiResponse.response, finalResponse.tokensUsed);
          } catch (error) {
            logger.error('Error saving assistant message:', error);
          }
        }
        
        const processingTime = Date.now() - startTime;
        logger.info(`Message processing completed in ${processingTime}ms`);
        
        return finalResponse.response || geminiResponse.response;
      }
      
      // If status is complete, return the original response
      const processingTime = Date.now() - startTime;
      logger.info(`Message processing completed in ${processingTime}ms`);
      
      // Save assistant response to database
      if (conversation) {
        try {
          await databaseService.saveMessage(conversation.id, 'ASSISTANT', geminiResponse.response, geminiResponse.tokensUsed);
        } catch (error) {
          logger.error('Error saving assistant message:', error);
        }
      }
      
      return geminiResponse.response;
    }

    // Step 4: If no operations, return Gemini's response directly
    const processingTime = Date.now() - startTime;
    logger.info(`Message processing completed in ${processingTime}ms`);
    
    // Save assistant response to database
    if (conversation) {
      try {
        await databaseService.saveMessage(conversation.id, 'ASSISTANT', geminiResponse.response, geminiResponse.tokensUsed);
      } catch (error) {
        logger.error('Error saving assistant message:', error);
      }
    }
    
    return geminiResponse.response;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Failed to process message after ${processingTime}ms for chat ${chatId}:`, error);
    logger.error(`Error stack: ${error.stack}`);
    logger.error(`Error details: ${JSON.stringify({ name: error.name, message: error.message, code: error.code }, null, 2)}`);
    
    // Log error to database
    if (user) {
      try {
        await databaseService.logUsage(
          user.id,
          'message_processing_error',
          null,
          false,
          error.message
        );
      } catch (logError) {
        logger.error('Error logging processing error:', logError);
      }
    }
    
    // Return user-friendly error message
    return `❌ I encountered an error while processing your request: ${error.message}\n\nPlease try rephrasing your question or contact support if the issue persists.`;
  }
};

/**
 * Format operation results for display to user
 * @param {Array} results - Array of operation results
 * @returns {string} - Formatted results text
 */
const formatOperationResults = (results) => {
  let formattedText = '📊 **Operation Results:**\n\n';
  
  results.forEach((result, index) => {
    formattedText += `**${index + 1}. ${result.operation}**\n`;
    
    if (result.success) {
      switch (result.operation) {
        case 'terminal_command':
          formattedText += `✅ Command executed successfully\n`;
          if (result.stdout) {
            formattedText += `📤 **Output:**\n\`\`\`\n${result.stdout}\n\`\`\`\n`;
          }
          if (result.stderr) {
            formattedText += `⚠️ **Errors/Warnings:**\n\`\`\`\n${result.stderr}\n\`\`\`\n`;
          }
          formattedText += `📊 **Exit Code:** ${result.exit_code}\n\n`;
          break;
          
        case 'write_file':
          formattedText += `✅ File written successfully\n📁 **Path:** \`${result.path}\`\n\n`;
          break;
          
        case 'read_file':
          formattedText += `✅ File read successfully\n📁 **Path:** \`${result.path}\`\n📏 **Size:** ${result.size} characters\n`;
          if (result.content) {
            formattedText += `📄 **Content:**\n\`\`\`\n${result.content.substring(0, 500)}${result.content.length > 500 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
          }
          formattedText += '\n';
          break;
          
        case 'browser_action':
          formattedText += `✅ Browser action completed\n🌐 **URL:** ${result.url}\n📸 **Screenshot:** ${result.screenshot_url ? '[Available]' : 'Not available'}\n\n`;
          break;
      }
    } else {
      formattedText += `❌ Operation failed\n`;
      if (result.error) {
        formattedText += `💥 **Error:** ${result.error}\n`;
      }
      formattedText += '\n';
    }
  });
  
  return formattedText;
};

/**
 * Extract operations from Gemini response
 * @param {Object} geminiResponse - Response from Gemini
 * @returns {Array} - Array of operations
 */
const extractOperations = (geminiResponse) => {
  if (!geminiResponse.operations || !Array.isArray(geminiResponse.operations)) {
    return [];
  }
  
  // Validate operation structure
  return geminiResponse.operations.filter(operation => {
    return operation.type && (
      operation.type === 'terminal_command' ||
      operation.type === 'write_file' ||
      operation.type === 'read_file' ||
      operation.type === 'browser_action'
    );
  });
};

/**
 * Handle timeout scenarios
 * @param {number} chatId - Chat ID
 * @param {string} messageText - User message
 * @returns {Promise<string>} - Timeout response
 */
const handleTimeout = async (chatId, messageText) => {
  logger.warn(`Request timeout for chat ${chatId}`);
  return `⏱️ Your request is taking longer than expected to process. This might be due to complex operations or high server load.

**What you can try:**
• Simplify your request
• Break it into smaller parts
• Try again in a few moments

I'm still working on your request: "${messageText.substring(0, 100)}..."`;
};

/**
 * Validate user input before processing
 * @param {string} messageText - User's message
 * @returns {boolean} - Is valid
 */
const validateInput = (messageText) => {
  // Check if message is too long
  if (messageText.length > 8000) {
    throw errorHandler.createError('Message is too long. Please keep requests under 8000 characters.', 'Input Validation');
  }
  
  // Check if message is empty or only whitespace
  if (!messageText.trim()) {
    throw errorHandler.createError('Empty message. Please provide a valid request.', 'Input Validation');
  }
  
  // Check for potentially malicious content (basic check)
  const dangerousPatterns = [
    /rm\s+-rf\s+\//i,
    /format\s+c:/i,
    /\.\.\/\.\.\//,
    /eval\s*\(/i,
    /exec\s*\(/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(messageText)) {
      throw errorHandler.createError('Potentially dangerous command detected. Please rephrase your request.', 'Input Validation');
    }
  }
  
  return true;
};

module.exports = {
  processMessage,
  formatOperationResults,
  extractOperations,
  handleTimeout,
  validateInput
};