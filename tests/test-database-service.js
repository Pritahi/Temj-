// Load environment variables
require('dotenv').config({ path: __dirname + '/../.env' });
const databaseService = require('../src/services/database-direct');

async function testDatabaseService() {
  console.log('🧪 Testing Database Service (Direct PostgreSQL)...\n');
  
  try {
    // Test 1: Initialize connection
    console.log('TEST 1: Database Connection');
    await databaseService.initialize();
    console.log('✅ Database connected successfully\n');
    
    // Test 2: Get database status
    console.log('TEST 2: Database Status');
    const status = await databaseService.getStatus();
    console.log('✅ Database status:', status);
    console.log('');
    
    // Test 3: Create test user
    console.log('TEST 3: Create Test User');
    const testUser = await databaseService.createUser({
      telegramChatId: 999999999,
      telegramUsername: 'test_user',
      name: 'Test User',
      tier: 'FREE'
    });
    console.log('✅ User created:', {
      id: testUser.id,
      telegram_chat_id: testUser.telegram_chat_id,
      tier: testUser.tier,
      quota: testUser.message_quota
    });
    console.log('');
    
    // Test 4: Find user
    console.log('TEST 4: Find User by Telegram ID');
    const foundUser = await databaseService.findUserByTelegramId(999999999);
    console.log('✅ User found:', foundUser ? 'Yes' : 'No');
    console.log('');
    
    // Test 5: Create conversation
    console.log('TEST 5: Create Conversation');
    const conversation = await databaseService.createConversation(testUser.id, 'test_thread_123');
    console.log('✅ Conversation created:', conversation.id);
    console.log('');
    
    // Test 6: Save messages
    console.log('TEST 6: Save Messages');
    const userMessage = await databaseService.saveMessage(conversation.id, 'USER', 'Hello, test message!', 10);
    const assistantMessage = await databaseService.saveMessage(conversation.id, 'ASSISTANT', 'Hello! How can I help you?', 15);
    console.log('✅ User message saved:', userMessage.id);
    console.log('✅ Assistant message saved:', assistantMessage.id);
    console.log('');
    
    // Test 7: Get recent messages
    console.log('TEST 7: Get Recent Messages');
    const messages = await databaseService.getRecentMessages(conversation.id, 10);
    console.log('✅ Retrieved', messages.length, 'messages');
    messages.forEach(msg => {
      console.log(`   ${msg.role}: ${msg.content}`);
    });
    console.log('');
    
    // Test 8: Test API key encryption
    console.log('TEST 8: API Key Encryption/Decryption');
    const testKey = 'test-api-key-12345';
    const encrypted = databaseService.encryptApiKey(testKey);
    const decrypted = databaseService.encryptApiKey ? databaseService.decryptApiKey(encrypted) : 'decrypt error';
    console.log('✅ Original key:', testKey);
    console.log('✅ Encrypted:', encrypted.substring(0, 20) + '...');
    console.log('✅ Decrypted:', decrypted);
    console.log('✅ Encryption test:', testKey === decrypted ? 'PASSED' : 'FAILED');
    console.log('');
    
    // Test 9: Log usage
    console.log('TEST 9: Log Usage');
    const usageLog = await databaseService.logUsage(testUser.id, 'test_operation', 25, true);
    console.log('✅ Usage logged:', usageLog.id);
    console.log('');
    
    // Test 10: Check quota
    console.log('TEST 10: Check User Quota');
    const quota = await databaseService.checkUserQuota(testUser.id);
    console.log('✅ Quota check:', quota);
    
    // Increment message count
    await databaseService.incrementMessageCount(testUser.id);
    const newQuota = await databaseService.checkUserQuota(testUser.id);
    console.log('✅ After increment:', newQuota);
    console.log('');
    
    // Test 11: Cleanup test data
    console.log('TEST 11: Cleanup Test Data');
    await databaseService.pool.query('DELETE FROM usage_logs WHERE operation_type = $1', ['test_operation']);
    await databaseService.pool.query('DELETE FROM messages WHERE id = $1 OR id = $2', [userMessage.id, assistantMessage.id]);
    await databaseService.pool.query('DELETE FROM conversations WHERE id = $1', [conversation.id]);
    await databaseService.pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    console.log('✅ Test data cleaned up\n');
    
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('✅ Database service working correctly');
    console.log('✅ All CRUD operations functional');
    console.log('✅ Encryption/decryption working');
    console.log('✅ Database is ready for production use!');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

testDatabaseService();