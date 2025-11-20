const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

/**
 * Call Gemini API with exponential backoff retry logic
 * @param {string} prompt - The prompt to send to Gemini
 * @param {string} apiKey - Gemini API key (optional, uses default if not provided)
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<Object>} - Response text and usage info from Gemini
 */
const callGemini = async (prompt, apiKey = null, retries = 3) => {
  const apiKeyToUse = apiKey || config.GEMINI_API_KEY;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(`Calling Gemini API (attempt ${attempt}/${retries})`);
      
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await axios.post(GEMINI_API_URL, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKeyToUse
        },
        timeout: 30000 // 30 seconds timeout
      });

      // Validate response structure
      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        throw new Error('Invalid response structure from Gemini API');
      }

      const candidate = response.data.candidates[0];
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        throw new Error('Invalid candidate structure in Gemini response');
      }

      const responseText = candidate.content.parts[0].text;
      if (!responseText) {
        throw new Error('Empty response text from Gemini API');
      }

      // Extract usage information if available
      const tokensUsed = response.data.usageMetadata ? 
        (response.data.usageMetadata.promptTokenCount + response.data.usageMetadata.candidatesTokenCount) : 
        null;

      logger.debug('Successfully received response from Gemini API');
      return {
        response: responseText,
        tokensUsed: tokensUsed,
        usageMetadata: response.data.usageMetadata
      };

    } catch (error) {
      logger.error(`Gemini API call failed (attempt ${attempt}/${retries})`, error);

      // If it's the last attempt, throw the error
      if (attempt === retries) {
        let errorMessage = 'Failed to get response from Gemini AI';
        
        if (error.response) {
          // API responded with error status
          const status = error.response.status;
          const errorData = error.response.data;
          
          switch (status) {
            case 400:
              errorMessage = 'Invalid request to Gemini API. Please check your input.';
              break;
            case 401:
              errorMessage = 'Authentication failed with Gemini API. Please check API key.';
              break;
            case 403:
              errorMessage = 'Access forbidden to Gemini API. Please check API permissions.';
              break;
            case 429:
              errorMessage = 'Rate limit exceeded for Gemini API. Please wait and try again.';
              break;
            case 500:
              errorMessage = 'Gemini API server error. Please try again later.';
              break;
            default:
              errorMessage = `Gemini API error (${status}): ${errorData?.error?.message || 'Unknown error'}`;
          }
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Gemini API request timed out. Please try again.';
        } else if (error.code === 'ENOTFOUND') {
          errorMessage = 'Cannot connect to Gemini API. Please check your internet connection.';
        }

        throw errorHandler.createError(errorMessage, 'Gemini API Call');
      }

      // Calculate delay for exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logger.warn(`Retrying Gemini API call in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Extract JSON from Gemini response text
 * @param {string} responseText - Raw response text from Gemini
 * @returns {Object|null} - Parsed JSON object or null if not valid JSON
 */
const extractJsonFromResponse = (responseText) => {
  try {
    // Try to find JSON block in the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                      responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonString);
    }

    // Try parsing the entire response as JSON
    return JSON.parse(responseText);
  } catch (error) {
    logger.debug('Failed to extract JSON from response:', error.message);
    return null;
  }
};

/**
 * Process a conversation with Gemini, handling iterative responses
 * @param {string} userMessage - User's message
 * @param {Object} conversationHistory - Previous messages (optional)
 * @param {string} apiKey - Gemini API key (optional, uses default if not provided)
 * @returns {Promise<Object>} - Response object with text, operations, and usage
 */
const processConversation = async (userMessage, conversationHistory = [], apiKey = null) => {
  try {
    let context = '';
    
    if (conversationHistory.length > 0) {
      context = '\n\nPrevious conversation context:\n' + 
        conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\n\n';
    }

    const prompt = userMessage + context;
    const geminiResponse = await callGemini(prompt, apiKey);
    
    // Check if response contains operations
    const operations = extractJsonFromResponse(geminiResponse.response);
    
    if (operations && operations.operations && operations.operations.length > 0) {
      return {
        response: operations.response || geminiResponse.response,
        operations: operations.operations,
        status: operations.status || 'in_progress',
        tokensUsed: geminiResponse.tokensUsed
      };
    }

    return {
      response: geminiResponse.response,
      status: 'complete',
      tokensUsed: geminiResponse.tokensUsed
    };

  } catch (error) {
    logger.error('Failed to process conversation with Gemini:', error);
    throw error;
  }
};

module.exports = {
  callGemini,
  extractJsonFromResponse,
  processConversation
};