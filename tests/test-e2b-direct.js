const axios = require('axios');
require('dotenv').config();

async function testE2B() {
  const apiKey = process.env.E2B_API_KEY;
  
  console.log('Testing E2B API...');
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10));
  console.log('');
  
  try {
    console.log('Making request to E2B...');
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
    
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Sandbox ID:', response.data.sandboxID);
    console.log('Full response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ ERROR!');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Message:', error.message);
    console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
  }
}

testE2B();