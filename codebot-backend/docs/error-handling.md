# Error Handling Documentation

This document provides comprehensive information about error handling in the CodeBot backend, including error types, causes, solutions, and code examples.

## Error Categories

### 1. Telegram Bot Errors

#### 1.1 Invalid Bot Token
**Error Message:** `Invalid Telegram bot token format. Expected format: numbers:alphanumeric_string`

**Cause:** 
- Bot token format doesn't match expected pattern
- Token contains invalid characters
- Token is malformed

**Solution:**
```javascript
// Validate token format
const validateTelegramBotToken = (token) => {
  const tokenPattern = /^\d+:[A-Za-z0-9_-]{35}$/;
  return tokenPattern.test(token);
};

// Get fresh token from BotFather
const token = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
if (!validateTelegramBotToken(token)) {
  throw new Error('Invalid token format');
}
```

**Prevention:**
- Always copy token directly from BotFather
- Don't add extra spaces or characters
- Test token before deployment

---

#### 1.2 Network Connection Errors
**Error Message:** `Failed to connect to Telegram: getaddrinfo ENOTFOUND api.telegram.org`

**Cause:**
- No internet connection
- DNS resolution issues
- Firewall blocking connections

**Solution:**
```javascript
const { bot } = require('./services/telegram');

async function testConnection() {
  try {
    const botInfo = await bot.telegram.getMe();
    console.log('Bot connected:', botInfo.username);
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.error('DNS resolution failed - check internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - check firewall settings');
    } else {
      console.error('Connection error:', error.message);
    }
  }
}
```

**Prevention:**
- Test connection before starting bot
- Implement retry logic with exponential backoff
- Monitor network stability

---

#### 1.3 Rate Limiting
**Error Message:** `Too Many Requests: retry after 10`

**Cause:**
- Sending too many requests to Telegram API
- Exceeding Telegram's rate limits

**Solution:**
```javascript
const { bot } = require('./services/telegram');

// Implement rate limiting
const rateLimiter = {
  requests: [],
  maxRequests: 30, // Telegram allows 30 messages per second
  timeWindow: 1000, // 1 second
  
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  },
  
  recordRequest() {
    this.requests.push(Date.now());
  }
};

// Use in message handler
bot.on('text', async (ctx) => {
  if (!rateLimiter.canMakeRequest()) {
    await ctx.reply('Please wait a moment before sending another message.');
    return;
  }
  
  rateLimiter.recordRequest();
  // Process message...
});
```

**Prevention:**
- Implement rate limiting
- Add delays between messages
- Monitor API usage

---

#### 1.4 Message Too Long
**Error Message:** `Message is too long`

**Cause:**
- User message exceeds Telegram's character limit (4096 for regular users)
- Bot response exceeds limits

**Solution:**
```javascript
const { bot } = require('./services/telegram');

// Split long messages
async function sendLongMessage(ctx, message) {
  const maxLength = 4000; // Leave buffer for formatting
  const chunks = message.match(/.{1,4000}/g);
  
  for (const chunk of chunks) {
    await ctx.reply(chunk);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
}

// Validate message length
function validateMessageLength(message) {
  if (message.length > 8000) {
    throw new Error('Message too long. Please keep requests under 8000 characters.');
  }
  return true;
}
```

**Prevention:**
- Validate message length before processing
- Implement message chunking
- Optimize response formatting

---

### 2. Gemini API Errors

#### 2.1 Invalid API Key
**Error Message:** `Authentication failed with Gemini API. Please check API key.`

**Cause:**
- API key is invalid or expired
- API key format is incorrect
- Key doesn't have proper permissions

**Solution:**
```javascript
const { callGemini } = require('./services/gemini');

async function testGeminiAPI(apiKey) {
  try {
    // Test with simple prompt
    const response = await callGemini('Hello');
    console.log('API key is valid');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Invalid API key');
      return false;
    }
    throw error;
  }
}

// Validate key format
function validateGeminiKey(apiKey) {
  return apiKey.startsWith('AIza') && apiKey.length > 10;
}
```

**Prevention:**
- Test API key before deployment
- Validate key format
- Monitor key expiration

---

#### 2.2 Quota Exceeded
**Error Message:** `Rate limit exceeded for Gemini API. Please wait and try again.`

**Cause:**
- Exceeded daily/monthly API quotas
- Too many requests in short time

**Solution:**
```javascript
const { callGemini } = require('./services/gemini');

// Implement exponential backoff
async function callGeminiWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callGemini(prompt);
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Check quota usage
function checkQuotaStatus(response) {
  const remaining = response.headers['x-ratelimit-remaining'];
  if (remaining && parseInt(remaining) < 10) {
    console.warn('Low quota remaining:', remaining);
  }
}
```

**Prevention:**
- Monitor API usage
- Implement request queuing
- Optimize prompt lengths
- Consider upgrading plan

---

#### 2.3 Timeout Errors
**Error Message:** `Gemini API request timed out. Please try again.`

**Cause:**
- Network latency
- Large prompts taking too long
- Server overloaded

**Solution:**
```javascript
const axios = require('axios');

async function callGeminiWithTimeout(prompt, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    return response.data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}
```

**Prevention:**
- Set appropriate timeout values
- Optimize prompt complexity
- Monitor network conditions

---

#### 2.4 Invalid Response Format
**Error Message:** `Invalid response structure from Gemini API`

**Cause:**
- API returned unexpected format
- Response was truncated
- JSON parsing failed

**Solution:**
```javascript
const { extractJsonFromResponse } = require('./services/gemini');

function safeParseResponse(responseText) {
  try {
    // Validate response structure
    if (!responseText || typeof responseText !== 'string') {
      throw new Error('Empty or invalid response text');
    }
    
    // Try to extract JSON
    const operations = extractJsonFromResponse(responseText);
    if (operations) {
      return operations;
    }
    
    // Fallback to plain text
    return { response: responseText, status: 'complete' };
    
  } catch (parseError) {
    console.error('Failed to parse response:', parseError.message);
    return { 
      response: 'I received your message but had trouble processing it. Please try rephrasing.', 
      status: 'error' 
    };
  }
}
```

**Prevention:**
- Validate response structure
- Implement fallbacks
- Log malformed responses

---

### 3. E2B API Errors

#### 3.1 Invalid API Key
**Error Message:** `Failed to create sandbox environment`

**Cause:**
- E2B API key is invalid
- API key doesn't have proper permissions
- Account is suspended

**Solution:**
```javascript
const { createSandbox } = require('./services/e2b');

async function testE2BAPI(apiKey) {
  try {
    const sandboxId = await createSandbox();
    console.log('E2B API key is valid');
    await deleteSandbox(sandboxId);
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Invalid E2B API key');
      return false;
    }
    throw error;
  }
}

// Validate key format
function validateE2BKey(apiKey) {
  return /^[A-Za-z0-9_-]+$/.test(apiKey) && apiKey.length > 10;
}
```

**Prevention:**
- Test API key before deployment
- Validate key format
- Monitor account status

---

#### 3.2 Sandbox Creation Failed
**Error Message:** `Failed to create E2B sandbox`

**Cause:**
- API quota exceeded
- Network issues
- Service temporarily unavailable

**Solution:**
```javascript
const { createSandbox } = require('./services/e2b');

async function createSandboxWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createSandbox();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = 1000 * attempt;
      console.log(`Sandbox creation failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Handle quota errors
function handleQuotaError(error) {
  if (error.response?.status === 429) {
    return {
      success: false,
      error: 'E2B quota exceeded. Please try again later.',
      retryAfter: 300 // seconds
    };
  }
  throw error;
}
```

**Prevention:**
- Monitor E2B quota usage
- Implement retry logic
- Queue operations when quota low

---

#### 3.3 Execution Timeout
**Error Message:** `Operation timeout`

**Cause:**
- Command taking too long to execute
- Infinite loops in code
- Resource-intensive operations

**Solution:**
```javascript
const { executeTerminalCommand } = require('./services/e2b');

async function executeWithTimeout(sandboxId, command, timeoutMs = 30000) {
  return Promise.race([
    executeTerminalCommand(sandboxId, command),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ]);
}

// Kill runaway processes
async function killLongRunningProcesses(sandboxId) {
  try {
    await executeTerminalCommand(sandboxId, 'pkill -f python');
    await executeTerminalCommand(sandboxId, 'pkill -f node');
    console.log('Long-running processes terminated');
  } catch (error) {
    console.log('No processes to terminate');
  }
}
```

**Prevention:**
- Set appropriate timeouts
- Monitor resource usage
- Implement process cleanup

---

#### 3.4 Command Execution Failed
**Error Message:** `Command execution failed with exit code 1`

**Cause:**
- Syntax errors in code
- Missing dependencies
- Permission issues

**Solution:**
```javascript
const { executeTerminalCommand } = require('./services/e2b');

function formatCommandResult(result) {
  const output = [];
  
  if (result.success) {
    output.push('✅ Command executed successfully');
  } else {
    output.push('❌ Command failed');
  }
  
  if (result.stdout) {
    output.push(`📤 Output:\n\`\`\`\n${result.stdout}\n\`\`\``);
  }
  
  if (result.stderr) {
    output.push(`⚠️ Errors:\n\`\`\`\n${result.stderr}\n\`\`\``);
  }
  
  output.push(`📊 Exit Code: ${result.exit_code}`);
  
  return output.join('\n');
}

// Analyze common failures
function analyzeFailure(result) {
  const suggestions = [];
  
  if (result.stderr.includes('ModuleNotFoundError')) {
    suggestions.push('💡 Try installing the missing module first');
  } else if (result.stderr.includes('SyntaxError')) {
    suggestions.push('💡 Check your code syntax');
  } else if (result.exit_code === 126) {
    suggestions.push('💡 Permission denied - check file permissions');
  }
  
  return suggestions;
}
```

**Prevention:**
- Test commands before execution
- Install dependencies automatically
- Provide helpful error messages

---

### 4. General System Errors

#### 4.1 Environment Variables Missing
**Error Message:** `Missing required environment variables: TELEGRAM_BOT_TOKEN, GEMINI_API_KEY`

**Cause:**
- `.env` file not created
- Variables not exported properly
- typos in variable names

**Solution:**
```javascript
const config = require('./config/env');

function validateEnvironment() {
  const required = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'E2B_API_KEY'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ All environment variables validated');
}

// Check file exists
function checkEnvFile() {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found. Run: cp .env.example .env');
  }
}
```

**Prevention:**
- Validate environment on startup
- Provide clear error messages
- Create `.env` template

---

#### 4.2 Port Already in Use
**Error Message:** `Port 3000 is already in use`

**Cause:**
- Another instance running
- Different service using port
- Zombie processes

**Solution:**
```javascript
const net = require('net');

async function checkPortAvailability(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

// Find and suggest solutions
async function handlePortConflict(port) {
  const isAvailable = await checkPortAvailability(port);
  
  if (!isAvailable) {
    console.error(`Port ${port} is already in use.`);
    console.log('Solutions:');
    console.log(`1. Stop other process: lsof -ti:${port} | xargs kill`);
    console.log(`2. Use different port: export PORT=${port + 1}`);
    console.log(`3. Check running processes: ps aux | grep node`);
    process.exit(1);
  }
}
```

**Prevention:**
- Check port availability on startup
- Provide helpful error messages
- Suggest alternative solutions

---

#### 4.3 Out of Memory
**Error Message:** `JavaScript heap out of memory`

**Cause:**
- Memory leak in code
- Processing large datasets
- Too many concurrent operations

**Solution:**
```javascript
// Increase Node.js memory limit
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Implement memory monitoring
function monitorMemory() {
  const used = process.memoryUsage();
  const mb = 1024 * 1024;
  
  console.log(`Memory usage: ${Math.round(used.heapUsed / mb)}MB / ${Math.round(used.heapTotal / mb)}MB`);
  
  if (used.heapUsed / used.heapTotal > 0.9) {
    console.warn('High memory usage detected');
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}

// Clean up resources
function cleanup() {
  // Close unnecessary connections
  // Clear timers
  // Reset large objects
}
```

**Prevention:**
- Monitor memory usage
- Implement garbage collection
- Limit concurrent operations
- Use streaming for large data

---

#### 4.4 Unhandled Promise Rejections
**Error Message:** `Unhandled promise rejection`

**Cause:**
- Missing error handlers
- Async functions without try-catch
- Promise rejections not caught

**Solution:**
```javascript
// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log for debugging
  // Don't crash the process
});

// Proper async error handling
async function safeAsync(fn) {
  try {
    return await fn();
  } catch (error) {
    console.error('Async operation failed:', error);
    throw error; // Re-throw if caller should handle
  }
}

// Wrapper for promise-based operations
function handlePromise(promise) {
  return promise.catch(error => {
    console.error('Promise rejected:', error);
    return { error: error.message };
  });
}
```

**Prevention:**
- Always use try-catch with async/await
- Add global error handlers
- Use promise wrappers
- Log all rejections

---

## Best Practices

### 1. Always Handle Errors
```javascript
// ❌ Bad
async function processData() {
  const data = await fetchData();
  return process(data);
}

// ✅ Good
async function processData() {
  try {
    const data = await fetchData();
    return await process(data);
  } catch (error) {
    console.error('Failed to process data:', error);
    throw new Error(`Processing failed: ${error.message}`);
  }
}
```

### 2. Provide Meaningful Error Messages
```javascript
// ❌ Bad
throw new Error('Error');

// ✅ Good
throw new Error(`Failed to connect to ${serviceName}: ${error.message}`);
```

### 3. Log Errors with Context
```javascript
logger.error('Operation failed', {
  operation: 'createSandbox',
  userId: chatId,
  error: error.message,
  stack: error.stack
});
```

### 4. Implement Retry Logic
```javascript
async function withRetry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}
```

### 5. Fail Gracefully
```javascript
// Provide fallback behavior
async function processMessage(message) {
  try {
    return await aiProcess(message);
  } catch (error) {
    console.warn('AI processing failed, using fallback:', error);
    return generateFallbackResponse(message);
  }
}
```

## Error Monitoring

### Log Levels
- **ERROR**: System errors, failed operations
- **WARN**: Recoverable issues, rate limits
- **INFO**: Normal operations, status updates
- **DEBUG**: Detailed execution info

### Error Tracking
```javascript
const errorTracker = {
  errors: [],
  
  log(error, context) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      context: context,
      stack: error.stack
    };
    
    this.errors.push(errorEntry);
    logger.error(`${context}: ${error.message}`, error);
  },
  
  getStats() {
    return {
      total: this.errors.length,
      recent: this.errors.slice(-10),
      byType: this.groupByType()
    };
  },
  
  groupByType() {
    return this.errors.reduce((acc, error) => {
      const type = error.message.split(':')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }
};
```

This documentation should help you understand and handle all common error scenarios in the CodeBot backend. For specific issues not covered here, check the logs and refer to the individual service documentation.