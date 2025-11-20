const axios = require('axios');
require('dotenv').config();

async function testFixedE2B() {
  const apiKey = process.env.E2B_API_KEY;
  
  console.log('Testing FIXED E2B API...');
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10));
  console.log('');
  
  try {
    console.log('Making request to E2B with FIXED endpoint...');
    console.log('URL: https://api.e2b.app/sandboxes');
    console.log('Headers:', {
      'X-API-Key': apiKey.substring(0, 10) + '...',
      'Content-Type': 'application/json'
    });
    console.log('Body:', { templateID: 'rki5dems9wqfm4r03t7g' });
    console.log('');
    
    const response = await axios.post(
      'https://api.e2b.app/sandboxes',
      { templateID: 'rki5dems9wqfm4r03t7g' },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ SUCCESS WITH FIXED ENDPOINT!');
    console.log('Status:', response.status);
    console.log('Sandbox ID:', response.data.sandboxID);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Test other endpoints too
    console.log('\nTesting command execution...');
    const commandResponse = await axios.post(
      `https://api.e2b.app/sandboxes/${response.data.sandboxID}/commands`,
      { command: 'echo "Hello World"', timeout: 30 },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Command execution also works!');
    console.log('Command result:', JSON.stringify(commandResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ ERROR WITH FIXED ENDPOINT!');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Message:', error.message);
    console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
  }
}

testFixedE2B();