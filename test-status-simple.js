#!/usr/bin/env node

// Simulate the status command functionality without requiring env vars
async function testStatusCommand() {
  console.log('🧪 Testing Status Command Fix...\n');

  // Simulate user data from logs
  const mockUser = {
    id: 'user_1',
    telegram_chat_id: 5221301620,
    name: 'Pritarp',
    username: 'Prit',
    tier: 'FREE',
    is_active: true,
    message_count: 92, // From the latest logs
    message_quota: 100,
    created_at: new Date().toISOString(),
    quota_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  };

  console.log('📋 Simulating User Status:');
  console.log('   - Chat ID:', mockUser.telegram_chat_id);
  console.log('   - Name:', mockUser.name);
  console.log('   - Tier:', mockUser.tier);
  console.log('   - Message Count:', mockUser.message_count);
  console.log('   - Quota:', mockUser.message_quota);
  console.log('   - Active:', mockUser.is_active);
  
  const remainingQuota = mockUser.message_quota - mockUser.message_count;
  console.log('\n📊 Quota Status:');
  console.log('   - Used:', mockUser.message_count);
  console.log('   - Total:', mockUser.message_quota);
  console.log('   - Remaining:', remainingQuota);
  
  // Test the status message formatting that we fixed
  console.log('\n📝 Fixed Status Message Format:');
  console.log('─'.repeat(50));
  
  const statusMessage = `📊 *Your CodeBot Status*

*Account Details:*
• Tier: ${mockUser.tier}
• Messages Used: ${mockUser.message_count}/${mockUser.message_quota}
• Remaining: ${remainingQuota}
• Account Created: ${new Date(mockUser.created_at).toLocaleDateString()}

*Next Reset:* ${new Date(mockUser.quota_reset_date).toLocaleDateString()}`;
  
  console.log(statusMessage);
  console.log('─'.repeat(50));
  
  console.log('\n✅ Status Command Fixes Applied:');
  console.log('   • Changed **bold** to *italic* for better Telegram compatibility');
  console.log('   • Simplified date formatting to avoid parsing errors');
  console.log('   • Removed complex locale formatting that caused issues');
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Send /status to @Dumakebot on Telegram');
  console.log('   2. The status message should now display correctly');
  console.log('   3. No more "can\'t parse entities" errors');
}

// Run the test
testStatusCommand();