#!/usr/bin/env node

const path = require('path');
const logger = require('../src/utils/logger');
const databaseService = require('../src/services/database');
const cacheService = require('../utils/cache');
const cleanupJobs = require('../jobs/cleanup');

// Set up Node.js path to find modules
process.env.NODE_PATH = path.join(__dirname, '../lib/node_modules/codebot-backend/node_modules');
require('module').Module._initPaths();

async function testDatabaseSetup() {
  console.log('🚀 Starting CodeBot Database Test Suite...\n');
  
  const testResults = {
    database: { success: false, message: '' },
    cache: { success: false, message: '' },
    user: { success: false, message: '' },
    conversation: { success: false, message: '' },
    message: { success: false, message: '' },
    usage: { success: false, message: '' },
    encryption: { success: false, message: '' },
    cleanup: { success: false, message: '' }
  };

  try {
    // Test 1: Database Connection
    console.log('📊 Testing Database Connection...');
    try {
      await databaseService.initialize();
      console.log('✅ Database connected successfully');
      testResults.database.success = true;
      testResults.database.message = 'Connected successfully';
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      testResults.database.message = error.message;
    }

    // Test 2: Cache Service
    console.log('\n📦 Testing Cache Service...');
    try {
      // Test basic cache operations
      cacheService.cache.set('test_key', { value: 'test_data' });
      const cachedData = cacheService.cache.get('test_key');
      
      if (cachedData && cachedData.value === 'test_data') {
        console.log('✅ Cache operations working correctly');
        testResults.cache.success = true;
        testResults.cache.message = 'Operations working';
      } else {
        throw new Error('Cache data mismatch');
      }
    } catch (error) {
      console.log('❌ Cache test failed:', error.message);
      testResults.cache.message = error.message;
    }

    // Test 3: User Management
    console.log('\n👤 Testing User Management...');
    try {
      const testChatId = 123456789;
      const testUsername = 'test_user';
      const testName = 'Test User';
      
      // Check if test user exists and clean up
      const existingUser = await databaseService.findUserByTelegramId(testChatId);
      if (existingUser) {
        await databaseService.updateUser(existingUser.id, { is_active: false });
        console.log('🧹 Cleaned up existing test user');
      }
      
      // Create new test user
      const newUser = await databaseService.createUser({
        telegramChatId: testChatId,
        username: testUsername,
        name: testName,
        tier: 'FREE'
      });
      
      console.log('✅ User created successfully:', {
        id: newUser.id,
        chatId: newUser.telegram_chat_id,
        name: newUser.name,
        tier: newUser.tier
      });
      
      // Test finding user
      const foundUser = await databaseService.findUserByTelegramId(testChatId);
      if (foundUser && foundUser.id === newUser.id) {
        console.log('✅ User found by Telegram ID');
        testResults.user.success = true;
        testResults.user.message = `Created and found user: ${foundUser.name}`;
      } else {
        throw new Error('User not found after creation');
      }
    } catch (error) {
      console.log('❌ User management test failed:', error.message);
      testResults.user.message = error.message;
    }

    // Test 4: API Key Encryption/Decryption
    console.log('\n🔐 Testing API Key Encryption...');
    try {
      const testApiKey = 'test-gemini-api-key-12345';
      
      // Encrypt the key
      const encrypted = databaseService.encryptApiKey(testApiKey);
      console.log('✅ Key encrypted successfully');
      
      // Decrypt the key
      const decrypted = databaseService.decryptApiKey(encrypted);
      
      if (decrypted === testApiKey) {
        console.log('✅ Key encrypted and decrypted correctly');
        testResults.encryption.success = true;
        testResults.encryption.message = 'Encryption/Decryption working';
      } else {
        throw new Error('Decrypted key does not match original');
      }
    } catch (error) {
      console.log('❌ Encryption test failed:', error.message);
      testResults.encryption.message = error.message;
    }

    // Test 5: Conversation Management
    console.log('\n💬 Testing Conversation Management...');
    try {
      // Use the test user created earlier
      const testUser = await databaseService.findUserByTelegramId(123456789);
      if (!testUser) {
        throw new Error('Test user not found');
      }
      
      const testThreadId = 'test-thread-123';
      
      // Create conversation
      const conversation = await databaseService.createConversation(testUser.id, testThreadId);
      console.log('✅ Conversation created:', conversation.id);
      
      // Get conversation
      const foundConversation = await databaseService.getConversation(testThreadId);
      if (foundConversation && foundConversation.id === conversation.id) {
        console.log('✅ Conversation retrieved successfully');
        testResults.conversation.success = true;
        testResults.conversation.message = `Created and retrieved conversation: ${conversation.thread_id}`;
      } else {
        throw new Error('Conversation not found after creation');
      }
    } catch (error) {
      console.log('❌ Conversation test failed:', error.message);
      testResults.conversation.message = error.message;
    }

    // Test 6: Message Management
    console.log('\n📝 Testing Message Management...');
    try {
      // Get the conversation from previous test
      const testConversation = await databaseService.getConversation('test-thread-123');
      if (!testConversation) {
        throw new Error('Test conversation not found');
      }
      
      // Save user message
      const userMessage = await databaseService.saveMessage(
        testConversation.id,
        'USER',
        'Hello, this is a test message!',
        10
      );
      console.log('✅ User message saved:', userMessage.id);
      
      // Save assistant message
      const assistantMessage = await databaseService.saveMessage(
        testConversation.id,
        'ASSISTANT',
        'Hello! I received your test message.',
        15
      );
      console.log('✅ Assistant message saved:', assistantMessage.id);
      
      // Get recent messages
      const recentMessages = await databaseService.getRecentMessages(testConversation.id, 10);
      if (recentMessages.length >= 2 && 
          recentMessages[0].role === 'USER' && 
          recentMessages[1].role === 'ASSISTANT') {
        console.log('✅ Messages retrieved correctly');
        testResults.message.success = true;
        testResults.message.message = `Saved and retrieved ${recentMessages.length} messages`;
      } else {
        throw new Error('Messages not retrieved correctly');
      }
    } catch (error) {
      console.log('❌ Message test failed:', error.message);
      testResults.message.message = error.message;
    }

    // Test 7: Usage Tracking
    console.log('\n📊 Testing Usage Tracking...');
    try {
      const testUser = await databaseService.findUserByTelegramId(123456789);
      if (!testUser) {
        throw new Error('Test user not found');
      }
      
      // Log usage
      const usageLog = await databaseService.logUsage(
        testUser.id,
        'test_operation',
        25,
        true,
        null
      );
      console.log('✅ Usage logged:', usageLog.id);
      
      // Check message count
      const quotaCheck = await databaseService.checkUserQuota(testUser.id);
      console.log('✅ Quota check:', quotaCheck);
      
      testResults.usage.success = true;
      testResults.usage.message = 'Usage tracking working';
    } catch (error) {
      console.log('❌ Usage tracking test failed:', error.message);
      testResults.usage.message = error.message;
    }

    // Test 8: Cleanup Jobs
    console.log('\n🧹 Testing Cleanup Jobs...');
    try {
      // Get cleanup job status
      const jobStatus = cleanupJobs.status();
      console.log('✅ Cleanup jobs status retrieved:', {
        isRunning: jobStatus.isRunning,
        jobsCount: jobStatus.jobsCount
      });
      
      testResults.cleanup.success = true;
      testResults.cleanup.message = `${jobStatus.jobsCount} jobs scheduled`;
    } catch (error) {
      console.log('❌ Cleanup jobs test failed:', error.message);
      testResults.cleanup.message = error.message;
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CODEBOT DATABASE TEST RESULTS');
  console.log('='.repeat(60));
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r.success).length;
  
  for (const [testName, result] of Object.entries(testResults)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName.toUpperCase()}: ${result.message}`);
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`📈 SUMMARY: ${passedTests}/${totalTests} tests passed`);
  console.log('-'.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Database setup is complete and working.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('\n🏥 HEALTH CHECK ENDPOINTS:');
  console.log(`   • Health: http://localhost:3001/health`);
  console.log(`   • Database: http://localhost:3001/database/status`);
  
  console.log('\n✅ Database test completed!');
  
  // Don't disconnect here as tests may be running continuously
  // await databaseService.disconnect();
}

if (require.main === module) {
  testDatabaseSetup().catch(console.error);
}

module.exports = testDatabaseSetup;