#!/usr/bin/env node

const DatabaseService = require('/workspace/codebot-backend/src/services/database.js');

// Simulate the status command functionality
async function testStatusCommand() {
  console.log('🧪 Testing Status Command...\n');

  try {
    // Test 1: Check if user exists
    console.log('📋 Step 1: Checking if user 5221301620 exists...');
    const existingUser = DatabaseService.getUserByChatId(5221301620);
    
    if (existingUser) {
      console.log('✅ User found:', existingUser);
      console.log('   - Name:', existingUser.name);
      console.log('   - Tier:', existingUser.tier);
      console.log('   - Message Count:', existingUser.message_count);
      console.log('   - Quota:', existingUser.message_quota);
      console.log('   - Active:', existingUser.is_active);
      
      // Test 2: Calculate remaining quota
      const remainingQuota = existingUser.message_quota - existingUser.message_count;
      console.log('\n📊 Step 2: Quota Status');
      console.log('   - Used:', existingUser.message_count);
      console.log('   - Total:', existingUser.message_quota);
      console.log('   - Remaining:', remainingQuota);
      
      // Test 3: Test the status message formatting (without actually sending)
      console.log('\n📝 Step 3: Testing Status Message Format');
      const statusMessage = `📊 *Your CodeBot Status*

*Account Details:*
• Tier: ${existingUser.tier}
• Messages Used: ${existingUser.message_count}/${existingUser.message_quota}
• Remaining: ${remainingQuota}
• Account Created: ${new Date(existingUser.created_at).toLocaleDateString()}

*Next Reset:* ${new Date(existingUser.quota_reset_date).toLocaleDateString()}`;
      
      console.log('📄 Status Message Preview:');
      console.log('─'.repeat(50));
      console.log(statusMessage);
      console.log('─'.repeat(50));
      
      console.log('\n✅ Status command should work correctly now!');
      console.log('💡 Try sending /status to @Dumakebot on Telegram');
      
    } else {
      console.log('❌ User not found - this is unexpected since logs show user exists');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testStatusCommand();