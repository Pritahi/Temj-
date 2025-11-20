const axios = require('axios');
require('dotenv').config();

async function testE2BCommandEndpoints() {
  const apiKey = process.env.E2B_API_KEY;
  
  console.log('Testing E2B Command Endpoints...');
  
  try {
    // Create sandbox
    console.log('1. Creating sandbox...');
    const createResponse = await axios.post(
      'https://api.e2b.app/sandboxes',
      { templateID: 'rki5dems9wqfm4r03t7g' },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const sandboxId = createResponse.data.sandboxID;
    console.log('✅ Sandbox created:', sandboxId);
    
    // Test different command endpoint patterns
    const commandEndpoints = [
      `/sandboxes/${sandboxId}/commands`,
      `/sandboxes/${sandboxId}/command`,
      `/sandboxes/${sandboxId}/terminal`,
      `/sandboxes/${sandboxId}/execute`
    ];
    
    for (const endpoint of commandEndpoints) {
      try {
        console.log(`\n2. Testing endpoint: ${endpoint}`);
        
        const commandResponse = await axios.post(
          `https://api.e2b.app${endpoint}`,
          { command: 'echo "Hello World"', timeout: 30 },
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ SUCCESS with endpoint:', endpoint);
        console.log('Command result:', JSON.stringify(commandResponse.data, null, 2));
        break;
        
      } catch (error) {
        console.log(`❌ Failed with endpoint ${endpoint}:`);
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testE2BCommandEndpoints();