#!/usr/bin/env node

const path = require('path');

// Set up Node.js path to find modules
process.env.NODE_PATH = path.join(__dirname, '../lib/node_modules/codebot-backend/node_modules');
require('module').Module._initPaths();

const logger = require('../src/utils/logger');
const { processMessage } = require('../src/services/messageProcessor');

async function testMessageFlow() {
  console.log('🚀 Starting E2B Integration Test...\n');
  
  const testMessage = "Create a Python file named hello.py with print('Hello World') and execute it";
  const testChatId = 123456789; // Mock chat ID
  
  try {
    console.log(`📤 Sending test message: "${testMessage}"\n`);
    
    const response = await processMessage(testChatId, testMessage);
    
    console.log('\n✅ Test completed successfully!');
    console.log('📥 Response received:');
    console.log(response);
    console.log('\n📊 Check the server logs above for detailed E2B operation logs.');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error('\n📊 Check the server logs above for detailed error information.');
    process.exit(1);
  }
}

// Run the test
testMessageFlow();