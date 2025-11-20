const crypto = require('crypto');
const config = require('../config/env');

// Load environment variables
require('dotenv').config({ path: __dirname + '/../../.env' });

class DatabaseService {
  constructor() {
    this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'codebot32charencryptkey123456789';
    this.initialized = false;
    this.users = new Map(); // In-memory storage for demo
    this.conversations = new Map();
    this.messages = new Map();
    this.usageLogs = new Map();
    this.userIdCounter = 1;
    this.conversationIdCounter = 1;
    this.messageIdCounter = 1;
    this.usageLogIdCounter = 1;
  }

  /**
   * Initialize database service (mock for demo)
   */
  async initialize() {
    try {
      console.log('🔧 Using DEMO database mode (in-memory storage)');
      console.log('✅ Database service initialized (demo mode)');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    console.log('Database disconnected (demo mode)');
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
    for (let [id, user] of this.users) {
      if (user.telegram_chat_id === telegramChatId) {
        return user;
      }
    }
    return null;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    const { telegramChatId, telegramUsername, name, tier = 'FREE' } = userData;
    
    const newUser = {
      id: `user_${this.userIdCounter++}`,
      telegram_chat_id: telegramChatId,
      telegram_username: telegramUsername,
      name: name,
      tier: tier,
      message_quota: tier === 'FREE' ? 100 : tier === 'BASIC' ? 500 : 1000,
      quota_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      message_count: 0,
      is_active: true,
      gemini_api_key_encrypted: null,
      e2b_api_key_encrypted: null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.users.set(newUser.id, newUser);
    console.log(`✅ User created: ${name} (${telegramUsername})`);
    return newUser;
  }

  /**
   * Get user API keys (decrypted)
   */
  async getUserApiKeys(userId) {
    const user = this.users.get(userId);
    if (!user) {
      return { geminiKey: null, e2bKey: null };
    }
    
    return {
      geminiKey: this.decryptApiKey(user.gemini_api_key_encrypted),
      e2bKey: this.decryptApiKey(user.e2b_api_key_encrypted)
    };
  }

  /**
   * Update user API keys
   */
  async updateUserApiKeys(userId, geminiKey, e2bKey) {
    const user = this.users.get(userId);
    if (!user) return null;
    
    user.gemini_api_key_encrypted = geminiKey ? this.encryptApiKey(geminiKey) : null;
    user.e2b_api_key_encrypted = e2bKey ? this.encryptApiKey(e2bKey) : null;
    user.updated_at = new Date();
    
    this.users.set(userId, user);
    return user;
  }

  /**
   * Update user (general method for any field updates)
   */
  async updateUser(userId, updateData) {
    const user = this.users.get(userId);
    if (!user) return null;
    
    // Update provided fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        // Handle special API key encryption
        if (key === 'gemini_api_key') {
          user.gemini_api_key_encrypted = updateData[key] ? this.encryptApiKey(updateData[key]) : null;
        } else if (key === 'e2b_api_key') {
          user.e2b_api_key_encrypted = updateData[key] ? this.encryptApiKey(updateData[key]) : null;
        } else {
          user[key] = updateData[key];
        }
      }
    });
    
    user.updated_at = new Date();
    this.users.set(userId, user);
    return user;
  }

  /**
   * Check user quota
   */
  async checkUserQuota(userId) {
    const user = this.users.get(userId);
    if (!user) {
      return { hasQuota: false, remaining: 0 };
    }
    
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
    const user = this.users.get(userId);
    if (user) {
      user.message_count++;
      user.updated_at = new Date();
      this.users.set(userId, user);
    }
  }

  /**
   * Create conversation
   */
  async createConversation(userId, threadId) {
    const newConversation = {
      id: `conv_${this.conversationIdCounter++}`,
      user_id: userId,
      thread_id: threadId,
      title: null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.conversations.set(newConversation.id, newConversation);
    console.log(`✅ Conversation created: ${threadId}`);
    return newConversation;
  }

  /**
   * Get conversation by thread ID
   */
  async getConversation(threadId) {
    for (let [id, conv] of this.conversations) {
      if (conv.thread_id === threadId) {
        return conv;
      }
    }
    return null;
  }

  /**
   * Get recent messages
   */
  async getRecentMessages(conversationId, limit = 20) {
    const messages = [];
    for (let [id, msg] of this.messages) {
      if (msg.conversation_id === conversationId) {
        messages.push(msg);
      }
    }
    
    // Sort by creation time and limit
    return messages
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-limit);
  }

  /**
   * Save message
   */
  async saveMessage(conversationId, role, content, tokensUsed = null) {
    const newMessage = {
      id: `msg_${this.messageIdCounter++}`,
      conversation_id: conversationId,
      role: role,
      content: content,
      tokens_used: tokensUsed,
      created_at: new Date(),
      deleted_at: null
    };
    
    this.messages.set(newMessage.id, newMessage);
    console.log(`✅ Message saved: ${role} (${content.substring(0, 50)}...)`);
    return newMessage;
  }

  /**
   * Log usage
   */
  async logUsage(data) {
    const { user_id, action, success = true, message = null } = data;
    
    const newLog = {
      id: `log_${this.usageLogIdCounter++}`,
      user_id: user_id,
      operation_type: action,
      tokens_used: null,
      success: success,
      error_message: message,
      created_at: new Date()
    };
    
    this.usageLogs.set(newLog.id, newLog);
    return newLog;
  }

  /**
   * Get database status
   */
  async getStatus() {
    return {
      connected: this.initialized,
      mode: 'demo',
      users: this.users.size,
      conversations: this.conversations.size,
      messages: this.messages.size,
      logs: this.usageLogs.size
    };
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService;