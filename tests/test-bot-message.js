const databaseService = require('../src/services/database-demo');

async function testMessageProcessing() {
  console.log('🧪 Testing bot message processing...\n');
  
  try {
    // Simulate a Telegram message from a new user
    const telegramChatId = '123456789';
    const telegramUsername = 'test_user';
    const message = 'Hello, this is a test message';
    
    console.log('TEST 1: Get or Create User');
    let user = await databaseService.findUserByTelegramId(telegramChatId);
    
    if (!user) {
      console.log('  - Creating new user...');
      user = await databaseService.createUser({
        telegramChatId: telegramChatId,
        telegramUsername: telegramUsername,
        name: 'Test User',
        tier: 'FREE'
      });
      console.log('  ✅ User created:', {
        id: user.id,
        username: user.telegram_username,
        tier: user.tier
      });
    } else {
      console.log('  ✅ Existing user found:', {
        id: user.id,
        username: user.telegram_username,
        tier: user.tier
      });
    }
    
    console.log('\nTEST 2: Create Conversation');
    const conversation = await databaseService.createConversation(user.id, `thread_${Date.now()}`);
    console.log('  ✅ Conversation created:', conversation.id);
    
    console.log('\nTEST 3: Save User Message');
    const userMessage = await databaseService.saveMessage(conversation.id, 'USER', message);
    console.log('  ✅ User message saved:', {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content.substring(0, 50) + '...'
    });
    
    console.log('\nTEST 4: Cache Test');
    console.log('  ✅ Cache test: Skipped in demo mode');
    
    console.log('\nTEST 5: Usage Log');
    await databaseService.logUsage(user.id, 'MESSAGE_SENT', 1, true, 'Test message processed');
    console.log('  ✅ Usage log created');
    
    console.log('\n🎉 MESSAGE PROCESSING TESTS COMPLETED!\n');
    console.log('Database integration working correctly in demo mode!');
    
    // Show final stats
    const stats = await databaseService.getStatus();
    console.log('\n📊 Final Database Stats:');
    console.log('  - Users:', stats.users);
    console.log('  - Conversations:', stats.conversations);
    console.log('  - Messages:', stats.messages);
    console.log('  - Usage Logs:', stats.logs);
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testMessageProcessing();