const http = require('http');

// Test API key activation
async function testAPI() {
  const activateData = {
    telegram_chat_id: "5221301620",
    gemini_api_key: "AIzaSyBCDEFGHIJKLMNOPQRSTUVWXYZ123456789",
    e2b_api_key: "e2b_1234567890abcdef1234567890abcdef1234567890"
  };

  console.log('Testing /api/keys/activate...');
  
  const activateOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/keys/activate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(activateData))
    }
  };

  const activateReq = http.request(activateOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Activate Response:', data);
      
      // Now test status endpoint
      setTimeout(testStatus, 1000);
    });
  });

  activateReq.on('error', (e) => {
    console.error('Activate Error:', e);
  });

  activateReq.write(JSON.stringify(activateData));
  activateReq.end();
}

function testStatus() {
  console.log('Testing /api/keys/status...');
  
  const statusOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/keys/status?telegram_chat_id=5221301620',
    method: 'GET'
  };

  const statusReq = http.request(statusOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Status Response:', data);
    });
  });

  statusReq.on('error', (e) => {
    console.error('Status Error:', e);
  });

  statusReq.end();
}

testAPI();