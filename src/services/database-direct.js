const { Pool } = require('pg');
const crypto = require('crypto');
const config = require('../config/env');

// Load environment variables
require('dotenv').config({ path: __dirname + '/../../.env' });

class DatabaseService {
  constructor() {
    this.pool = null;
    this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'codebot-encryption-key-32chars-secret';
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database disconnected');
    }
  }

  /**
   * Encrypt API key
   */
  encryptApiKey(apiKey) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt API key
   */
  decryptApiKey(encryptedKey) {
    if (!encryptedKey) return null;
    
    try {
      const parts = encryptedKey.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.ENCRYPTION_KEY), iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Error decrypting API key:', error);
      return null;
    }
  }

  /**
   * Find user by Telegram ID
   */
  async findUserByTelegramId(telegramChatId) {
    const query = 'SELECT * FROM users WHERE telegram_chat_id = $1';
    const result = await this.pool.query(query, [telegramChatId]);
    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    const { telegramChatId, telegramUsername, name, tier = 'FREE' } = userData;
    
    const query = `
      INSERT INTO users (id, telegram_chat_id, telegram_username, name, tier, message_quota, quota_reset_date)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 100, NOW() + INTERVAL '30 days')
      RETURNING *;
    `;
    
    const result = await this.pool.query(query, [telegramChatId, telegramUsername, name, tier]);
    return result.rows[0];
  }

  /**
   * Get user API keys (decrypted)
   */
  async getUserApiKeys(userId) {
    const query = 'SELECT gemini_api_key_encrypted, e2b_api_key_encrypted FROM users WHERE id = $1';
    const result = await this.pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return { geminiKey: null, e2bKey: null };
    }
    
    const row = result.rows[0];
    return {
      geminiKey: this.decryptApiKey(row.gemini_api_key_encrypted),
      e2bKey: this.decryptApiKey(row.e2b_api_key_encrypted)
    };
  }

  /**
   * Update user API keys
   */
  async updateUserApiKeys(userId, geminiKey, e2bKey) {
    const encryptedGemini = geminiKey ? this.encryptApiKey(geminiKey) : null;
    const encryptedE2b = e2bKey ? this.encryptApiKey(e2bKey) : null;
    
    const query = `
      UPDATE users 
      SET gemini_api_key_encrypted = $1, e2b_api_key_encrypted = $2
      WHERE id = $3
      RETURNING *;
    `;
    
    const result = await this.pool.query(query, [encryptedGemini, encryptedE2b, userId]);
    return result.rows[0];
  }

  /**
   * Check user quota
   */
  async checkUserQuota(userId) {
    const query = 'SELECT message_count, message_quota, quota_reset_date FROM users WHERE id = $1';
    const result = await this.pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return { hasQuota: false, remaining: 0 };
    }
    
    const user = result.rows[0];
    const remaining = user.message_quota - user.message_count;
    
    return {
      hasQuota: remaining > 0,
      remaining: Math.max(0, remaining),
      total: user.message_quota,
      used: user.message_count
    };
  }

  /**
   * Increment message count
   */
  async incrementMessageCount(userId) {
    const query = 'UPDATE users SET message_count = message_count + 1 WHERE id = $1';
    await this.pool.query(query, [userId]);
  }

  /**
   * Create conversation
   */
  async createConversation(userId, threadId) {
    const query = `
      INSERT INTO conversations (id, user_id, thread_id)
      VALUES (gen_random_uuid(), $1, $2)
      RETURNING *;
    `;
    
    const result = await this.pool.query(query, [userId, threadId]);
    return result.rows[0];
  }

  /**
   * Get conversation by thread ID
   */
  async getConversation(threadId) {
    const query = 'SELECT * FROM conversations WHERE thread_id = $1';
    const result = await this.pool.query(query, [threadId]);
    return result.rows[0] || null;
  }

  /**
   * Get recent messages
   */
  async getRecentMessages(conversationId, limit = 20) {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [conversationId, limit]);
    return result.rows.reverse(); // Return in chronological order
  }

  /**
   * Save message
   */
  async saveMessage(conversationId, role, content, tokensUsed = null) {
    const query = `
      INSERT INTO messages (id, conversation_id, role, content, tokens_used)
      VALUES (gen_random_uuid(), $1, $2, $3, $4)
      RETURNING *;
    `;
    
    const result = await this.pool.query(query, [conversationId, role, content, tokensUsed]);
    return result.rows[0];
  }

  /**
   * Log usage
   */
  async logUsage(userId, operationType, tokensUsed = null, success = true, errorMessage = null) {
    const query = `
      INSERT INTO usage_logs (id, user_id, operation_type, tokens_used, success, error_message)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const result = await this.pool.query(query, [userId, operationType, tokensUsed, success, errorMessage]);
    return result.rows[0];
  }

  /**
   * Get database status
   */
  async getStatus() {
    try {
      const [users, conversations, messages, logs] = await Promise.all([
        this.pool.query('SELECT COUNT(*) as count FROM users'),
        this.pool.query('SELECT COUNT(*) as count FROM conversations'),
        this.pool.query('SELECT COUNT(*) as count FROM messages'),
        this.pool.query('SELECT COUNT(*) as count FROM usage_logs')
      ]);
      
      return {
        connected: true,
        users: parseInt(users.rows[0].count),
        conversations: parseInt(conversations.rows[0].count),
        messages: parseInt(messages.rows[0].count),
        logs: parseInt(logs.rows[0].count)
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService;