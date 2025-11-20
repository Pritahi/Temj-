const { Sandbox } = require('e2b');
require('dotenv').config();

async function testOfficialE2BSDK() {
  const apiKey = process.env.E2B_API_KEY;
  
  console.log('Testing Official E2B SDK...');
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10));
  
  try {
    // Create sandbox using official SDK
    console.log('\n1. Creating sandbox with official SDK...');
    const sandbox = await Sandbox.create({
      apiKey: apiKey,
      timeoutMs: 5 * 60 * 1000 // 5 minutes
    });
    
    console.log('✅ Sandbox created successfully!');
    console.log('Sandbox ID:', sandbox.id);
    console.log('Sandbox info:', {
      id: sandbox.id,
      templateId: sandbox.templateId,
      name: sandbox.name
    });
    
    // Test command execution
    console.log('\n2. Testing command execution...');
    const command = await sandbox.commands.run('echo "Hello World from SDK"');
    console.log('✅ Command executed successfully!');
    console.log('Command stdout:', command.stdout);
    console.log('Command stderr:', command.stderr);
    console.log('Exit code:', command.exitCode);
    
    // Test file operations
    console.log('\n3. Testing file operations...');
    await sandbox.files.write('hello.txt', 'Hello World from E2B SDK!');
    const fileContent = await sandbox.files.read('hello.txt');
    console.log('✅ File written and read successfully!');
    console.log('File content:', fileContent);
    
    // Cleanup
    console.log('\n4. Cleaning up sandbox...');
    await sandbox.kill();
    console.log('✅ Sandbox cleaned up successfully!');
    
  } catch (error) {
    console.log('❌ Error with official SDK:', error.message);
    console.log('Error details:', error);
    console.log('Stack:', error.stack);
  }
}

testOfficialE2BSDK();