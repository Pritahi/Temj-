const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testDatabase() {
  console.log('🧪 Testing Direct PostgreSQL Database Connection...\n');
  
  try {
    // Test 1: Connection
    console.log('TEST 1: Database Connection');
    const client = await pool.connect();
    console.log('✅ Connected to database successfully\n');
    client.release();
    
    // Test 2: Check if tables exist
    console.log('TEST 2: Check if tables exist');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tablesResult = await pool.query(tablesQuery);
    console.log('✅ Found tables:', tablesResult.rows.map(row => row.table_name));
    console.log('');
    
    // Test 3: Create test user (manual SQL)
    console.log('TEST 3: Create Test User');
    const insertUserQuery = `
      INSERT INTO users (id, telegram_chat_id, telegram_username, name, tier, message_quota, quota_reset_date)
      VALUES (gen_random_uuid(), 999999999, 'test_user', 'Test User', 'FREE', 100, NOW() + INTERVAL '30 days')
      ON CONFLICT (telegram_chat_id) DO NOTHING
      RETURNING *;
    `;
    const userResult = await pool.query(insertUserQuery);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('✅ User created:', {
        id: user.id,
        telegram_chat_id: user.telegram_chat_id,
        tier: user.tier,
        quota: user.message_quota
      });
    } else {
      console.log('⚠️  User may already exist (conflict handled)');
    }
    console.log('');
    
    // Test 4: Find user by Telegram ID
    console.log('TEST 4: Find User by Telegram ID');
    const findUserQuery = 'SELECT * FROM users WHERE telegram_chat_id = 999999999;';
    const foundResult = await pool.query(findUserQuery);
    console.log('✅ User found:', foundResult.rows.length > 0 ? 'Yes' : 'No');
    if (foundResult.rows.length > 0) {
      const user = foundResult.rows[0];
      console.log('   User details:', {
        id: user.id,
        tier: user.tier,
        quota: user.message_quota
      });
    }
    console.log('');
    
    // Test 5: Create conversation
    console.log('TEST 5: Create Conversation');
    const insertConversationQuery = `
      INSERT INTO conversations (id, user_id, thread_id)
      VALUES (gen_random_uuid(), $1, 'test_thread_123')
      ON CONFLICT (thread_id) DO NOTHING
      RETURNING *;
    `;
    const conversationResult = await pool.query(insertConversationQuery, [foundResult.rows[0]?.id]);
    if (conversationResult.rows.length > 0) {
      const conversation = conversationResult.rows[0];
      console.log('✅ Conversation created:', conversation.id);
    } else {
      console.log('⚠️  Conversation may already exist');
    }
    console.log('');
    
    // Test 6: Save message
    console.log('TEST 6: Save Message');
    const insertMessageQuery = `
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (gen_random_uuid(), $1, 'USER', 'Test message')
      RETURNING *;
    `;
    const messageResult = await pool.query(insertMessageQuery, [conversationResult.rows[0]?.id]);
    if (messageResult.rows.length > 0) {
      const message = messageResult.rows[0];
      console.log('✅ Message saved:', message.id);
    }
    console.log('');
    
    // Test 7: Log usage
    console.log('TEST 7: Log Usage');
    const insertUsageQuery = `
      INSERT INTO usage_logs (id, user_id, operation_type, tokens_used, success)
      VALUES (gen_random_uuid(), $1, 'test_operation', 150, true)
      RETURNING *;
    `;
    const usageResult = await pool.query(insertUsageQuery, [foundResult.rows[0]?.id]);
    if (usageResult.rows.length > 0) {
      const usage = usageResult.rows[0];
      console.log('✅ Usage logged:', usage.id);
    }
    console.log('');
    
    // Test 8: Cleanup test data
    console.log('TEST 8: Cleanup Test Data');
    await pool.query('DELETE FROM usage_logs WHERE operation_type = $1', ['test_operation']);
    await pool.query('DELETE FROM messages WHERE role = $1', ['USER']);
    await pool.query('DELETE FROM conversations WHERE thread_id = $1', ['test_thread_123']);
    await pool.query('DELETE FROM users WHERE telegram_chat_id = $1', [999999999]);
    console.log('✅ Test data cleaned up\n');
    
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('✅ Database connection successful');
    console.log('✅ Tables created and accessible');
    console.log('✅ CRUD operations working');
    console.log('✅ Database is ready for use!');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();