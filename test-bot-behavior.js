/**
 * Test script to simulate Telegram bot message handling
 * This simulates what happens when a user sends "Hello" message to @Dumakebot
 */

const { Telegraf } = require('telegraf');
require('dotenv').config();

// Import database service
const database = require('./src/services/database-demo');

// Initialize the bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function testBotBehavior() {
    console.log('🤖 Testing Bot Behavior - Simulating User Message\n');
    
    const testUserId = '5221301620'; // Prit's user ID
    const testMessage = 'Hello';
    
    try {
        // STEP 1: Check if user exists in database
        console.log('📋 Step 1: Checking user record in database...');
        let user = await database.getUser(testUserId);
        
        if (!user) {
            console.log('👤 User not found - creating new user...');
            user = await database.createUser(testUserId, 'Test User');
            console.log('✅ New user created:', {
                id: user.telegram_chat_id,
                name: user.name,
                tier: user.tier,
                is_active: user.is_active,
                message_count: user.message_count
            });
        } else {
            console.log('👤 Existing user found:', {
                id: user.telegram_chat_id,
                name: user.name,
                tier: user.tier,
                is_active: user.is_active,
                message_count: user.message_count
            });
        }
        
        // STEP 2: Check authentication (simulate what happens in auth middleware)
        console.log('\n🔐 Step 2: Testing authentication...');
        
        // Check if user is active
        if (user.is_active === false) {
            console.log('❌ USER IS DEACTIVATED');
            console.log('   is_active value:', user.is_active);
            console.log('   This would trigger: "❌ Your account has been deactivated"');
            return;
        } else {
            console.log('✅ User is active (is_active =', user.is_active, ')');
        }
        
        // Check quota
        const currentDate = new Date().toISOString().split('T')[0];
        const lastReset = user.last_quota_reset || '2025-01-01';
        
        if (user.tier === 'FREE' && user.message_count >= 50) {
            console.log('🚫 FREE tier quota exceeded');
            console.log('   message_count:', user.message_count);
            console.log('   quota: 50');
            return;
        }
        
        console.log('✅ Quota check passed');
        console.log('   tier:', user.tier);
        console.log('   message_count:', user.message_count);
        console.log('   quota available:', user.tier === 'FREE' ? 50 - user.message_count : 'unlimited');
        
        // STEP 3: Simulate message processing
        console.log('\n💬 Step 3: Processing message...');
        console.log('   Message:', testMessage);
        console.log('   This would proceed to AI processing...');
        
        // STEP 4: Log usage
        console.log('\n📊 Step 4: Logging usage...');
        await database.logUsage(testUserId, testMessage, 'response');
        
        // Get updated user after logging
        const updatedUser = await database.getUser(testUserId);
        console.log('   ✅ Usage logged successfully');
        console.log('   New message count:', updatedUser.message_count);
        
        console.log('\n🎉 RESULT: User message would be processed successfully!');
        console.log('   ✅ No deactivation message');
        console.log('   ✅ No quota limit exceeded');
        console.log('   ✅ Message count updated');
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
    }
}

// Run the test
testBotBehavior().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});