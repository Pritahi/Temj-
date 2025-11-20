/**
 * Quick test to verify database methods are working
 */

const databaseService = require('./src/services/database');

async function testDatabase() {
    console.log('🧪 Testing Database Methods...\n');
    
    try {
        // Test user creation
        console.log('1. Testing user creation...');
        const newUser = await databaseService.createUser({
            telegramChatId: '5221301620',
            telegramUsername: 'Prit',
            name: 'Test User',
            tier: 'FREE'
        });
        console.log('✅ User created:', newUser.id);
        console.log('   is_active:', newUser.is_active);
        
        // Test quota check
        console.log('\n2. Testing quota check...');
        const quota = await databaseService.checkUserQuota(newUser.id);
        console.log('✅ Quota:', quota);
        
        // Test updateUser
        console.log('\n3. Testing updateUser...');
        const updated = await databaseService.updateUser(newUser.id, {
            updated_at: new Date(),
            tier: 'BASIC'
        });
        console.log('✅ User updated:', updated.tier);
        
        // Test increment message count
        console.log('\n4. Testing message count increment...');
        await databaseService.incrementMessageCount(newUser.id);
        const finalUser = await databaseService.findUserByTelegramId('5221301620');
        console.log('✅ Message count:', finalUser.message_count);
        
        console.log('\n🎉 All database methods working correctly!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testDatabase().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});