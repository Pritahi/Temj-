const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Encryption utilities
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = 'codebot-encryption-key-32chars!' // Must be 32 characters
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'base64');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Validation functions
function isValidGeminiApiKey(key) {
  // Gemini API keys are typically 39 characters long
  return key && typeof key === 'string' && key.length === 39 && key.startsWith('AIza');
}

function isValidE2BApiKey(key) {
  // E2B API keys start with 'e2b_' followed by 40 hex characters
  return key && typeof key === 'string' && key.startsWith('e2b_') && key.length === 45;
}

/**
 * POST /api/keys/activate
 * Activate user's personal API keys
 * Body: { telegram_chat_id, gemini_api_key, e2b_api_key }
 */
router.post('/activate', async (req, res) => {
  try {
    const { telegram_chat_id, gemini_api_key, e2b_api_key } = req.body;

    // Validation
    if (!telegram_chat_id) {
      return res.status(400).json({
        error: 'telegram_chat_id is required'
      });
    }

    if (!gemini_api_key || !e2b_api_key) {
      return res.status(400).json({
        error: 'Both gemini_api_key and e2b_api_key are required'
      });
    }

    // API key format validation
    if (!isValidGeminiApiKey(gemini_api_key)) {
      return res.status(400).json({
        error: 'Invalid Gemini API key format. Must be 39 characters long and start with "AIza"'
      });
    }

    if (!isValidE2BApiKey(e2b_api_key)) {
      return res.status(400).json({
        error: 'Invalid E2B API key format. Must start with "e2b_" and be 45 characters long'
      });
    }

    // Get database service
    const databaseService = req.app.locals.databaseService;
    if (!databaseService) {
      return res.status(500).json({
        error: 'Database service not available'
      });
    }

    // Find or create user
    let user = await databaseService.findUserByTelegramId(telegram_chat_id);
    
    if (!user) {
      user = await databaseService.createUser({
        telegram_chat_id,
        username: `user_${Date.now()}` // Default username for key activation
      });
    }

    // Encrypt the keys before storing
    const encryptedGeminiKey = encrypt(gemini_api_key);
    const encryptedE2BKey = encrypt(e2b_api_key);

    // Store encrypted keys and upgrade tier to BASIC
    await databaseService.updateUser(user.id, {
      gemini_api_key: encryptedGeminiKey,
      e2b_api_key: encryptedE2BKey,
      tier: 'BASIC'
    });

    // Log usage
    await databaseService.logUsage({
      user_id: user.id,
      action: 'API_KEY_ACTIVATED',
      success: true,
      message: 'User activated personal API keys and upgraded to BASIC tier'
    });

    res.json({
      success: true,
      message: 'API keys activated successfully! Your account has been upgraded to BASIC tier.',
      tier: 'BASIC'
    });

  } catch (error) {
    console.error('Error activating API keys:', error);
    
    // Log the error
    try {
      const databaseService = req.app.locals.databaseService;
      await databaseService.logUsage({
        user_id: null,
        action: 'API_KEY_ACTIVATION_FAILED',
        success: false,
        message: `Error: ${error.message}`
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      error: 'Failed to activate API keys. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/keys/status
 * Get user's API key status
 * Query: ?telegram_chat_id=123456
 */
router.get('/status', async (req, res) => {
  try {
    const { telegram_chat_id } = req.query;

    if (!telegram_chat_id) {
      return res.status(400).json({
        error: 'telegram_chat_id query parameter is required'
      });
    }

    const databaseService = req.app.locals.databaseService;
    if (!databaseService) {
      return res.status(500).json({
        error: 'Database service not available'
      });
    }

    const user = await databaseService.findUserByTelegramId(telegram_chat_id);

    if (!user) {
      return res.json({
        has_keys: false,
        tier: 'FREE'
      });
    }

    const hasKeys = !!(user.gemini_api_key && user.e2b_api_key);

    res.json({
      has_keys: hasKeys,
      tier: user.tier || 'FREE'
    });

  } catch (error) {
    console.error('Error getting key status:', error);
    
    res.status(500).json({
      error: 'Failed to get key status. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/keys/revoke
 * Revoke user's API keys
 * Body: { telegram_chat_id }
 */
router.delete('/revoke', async (req, res) => {
  try {
    const { telegram_chat_id } = req.body;

    if (!telegram_chat_id) {
      return res.status(400).json({
        error: 'telegram_chat_id is required'
      });
    }

    const databaseService = req.app.locals.databaseService;
    if (!databaseService) {
      return res.status(500).json({
        error: 'Database service not available'
      });
    }

    const user = await databaseService.findUserByTelegramId(telegram_chat_id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Remove encrypted keys and downgrade tier to FREE
    await databaseService.updateUser(user.id, {
      gemini_api_key: null,
      e2b_api_key: null,
      tier: 'FREE'
    });

    // Log usage
    await databaseService.logUsage({
      user_id: user.id,
      action: 'API_KEYS_REVOKED',
      success: true,
      message: 'User revoked their personal API keys and downgraded to FREE tier'
    });

    res.json({
      success: true,
      message: 'API keys revoked successfully. Your account has been downgraded to FREE tier.',
      tier: 'FREE'
    });

  } catch (error) {
    console.error('Error revoking API keys:', error);
    
    // Log the error
    try {
      const databaseService = req.app.locals.databaseService;
      await databaseService.logUsage({
        user_id: null,
        action: 'API_KEY_REVOCATION_FAILED',
        success: false,
        message: `Error: ${error.message}`
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      error: 'Failed to revoke API keys. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;