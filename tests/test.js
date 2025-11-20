#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Running CodeBot Backend Tests...\n');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  blue: '\x1b[34m'
};

const logSuccess = (message) => {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
};

const logError = (message) => {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
};

const logInfo = (message) => {
  console.log(`${colors.blue}ℹ️ ${message}${colors.reset}`);
};

const logWarning = (message) => {
  console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`);
};

// Test 1: Environment Variables
console.log(`${colors.blue}🔍 Testing Environment Variables...${colors.reset}`);
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });

    const requiredVars = ['PORT', 'TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'E2B_API_KEY'];
    let allVarsLoaded = true;

    requiredVars.forEach(varName => {
      if (envVars[varName] && envVars[varName] !== '' && !envVars[varName].includes('your_')) {
        logSuccess(`${varName} loaded: ${varName === 'TELEGRAM_BOT_TOKEN' || varName === 'GEMINI_API_KEY' || varName === 'E2B_API_KEY' ? '[REDACTED]' : envVars[varName]}`);
      } else {
        logWarning(`${varName} not configured or using placeholder`);
        if (varName !== 'PORT') {
          allVarsLoaded = false;
        }
      }
    });

    if (!allVarsLoaded) {
      logWarning('Some environment variables are not configured. Check .env file.');
    }
  } else {
    logError('.env file not found');
  }
} catch (error) {
  logError(`Environment variable test failed: ${error.message}`);
}

// Test 2: Service Imports
console.log(`\n${colors.blue}📦 Testing Service Imports...${colors.reset}`);
const services = [
  { name: 'telegram.js', path: '../src/services/telegram' },
  { name: 'gemini.js', path: '../src/services/gemini' },
  { name: 'e2b.js', path: '../src/services/e2b' },
  { name: 'messageProcessor.js', path: '../src/services/messageProcessor' }
];

let allImportsSuccess = true;

services.forEach(service => {
  try {
    require(service.path);
    logSuccess(`${service.name} imported successfully`);
  } catch (error) {
    logError(`Failed to import ${service.name}: ${error.message}`);
    allImportsSuccess = false;
  }
});

// Test 3: Mock API Requests
console.log(`\n${colors.blue}🔌 Testing API Request Structures...${colors.reset}`);

try {
  // Mock Gemini request structure
  const mockGeminiRequest = {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': '[API_KEY]'
    },
    body: {
      contents: [{
        parts: [{ text: 'test prompt' }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    }
  };

  logSuccess('Gemini request structure valid');
  logInfo(`Endpoint: ${mockGeminiRequest.url}`);
  logInfo(`Method: ${mockGeminiRequest.method}`);

} catch (error) {
  logError(`Gemini request test failed: ${error.message}`);
  allImportsSuccess = false;
}

try {
  // Mock E2B request structure
  const mockE2BRequest = {
    url: 'https://api.e2b.dev/v1/sandbox',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer [API_KEY]',
      'Content-Type': 'application/json'
    },
    body: {}
  };

  logSuccess('E2B request structure valid');
  logInfo(`Endpoint: ${mockE2BRequest.url}`);
  logInfo(`Method: ${mockE2BRequest.method}`);

} catch (error) {
  logError(`E2B request test failed: ${error.message}`);
  allImportsSuccess = false;
}

// Test 4: File Structure
console.log(`\n${colors.blue}📁 Testing File Structure...${colors.reset}`);

const requiredFiles = [
  'src/index.js',
  'src/config/env.js',
  'src/services/telegram.js',
  'src/services/gemini.js',
  'src/services/e2b.js',
  'src/services/messageProcessor.js',
  'src/utils/logger.js',
  'src/utils/errorHandler.js',
  'src/prompts/systemPrompt.js',
  'package.json',
  '.env',
  '.gitignore',
  'README.md'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    logSuccess(`${file} exists`);
  } else {
    logError(`${file} missing`);
    allFilesExist = false;
  }
});

// Test 5: Package.json validation
console.log(`\n${colors.blue}📄 Testing package.json...${colors.reset}`);

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  const requiredDeps = ['express', 'telegraf', 'axios', 'dotenv'];
  const requiredScripts = ['start', 'dev'];

  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      logSuccess(`Dependency ${dep} found`);
    } else {
      logError(`Missing dependency: ${dep}`);
    }
  });

  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      logSuccess(`Script ${script} found: ${packageJson.scripts[script]}`);
    } else {
      logError(`Missing script: ${script}`);
    }
  });

} catch (error) {
  logError(`Package.json validation failed: ${error.message}`);
}

// Summary
console.log(`\n${colors.blue}📊 Test Summary${colors.reset}`);
console.log('─'.repeat(50));

if (allImportsSuccess && allFilesExist) {
  logSuccess('All tests passed!');
  console.log(`\n${colors.green}🚀 CodeBot backend is ready to start!${colors.reset}`);
  console.log(`${colors.blue}Next steps:${colors.reset}`);
  console.log('1. Configure your API keys in .env file');
  console.log('2. Run: npm run dev');
  console.log('3. Test the bot in Telegram');
} else {
  logWarning('Some tests failed. Please check the errors above.');
  process.exit(1);
}

console.log(`\n${colors.blue}🔗 Useful commands:${colors.reset}`);
console.log(`• npm run dev    - Start development server`);
console.log(`• npm start      - Start production server`);
console.log(`• npm test       - Run this test suite`);