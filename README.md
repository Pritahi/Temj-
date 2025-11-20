# CodeBot Backend

A Node.js backend service for a Telegram bot that integrates Gemini AI and E2B sandbox APIs to provide intelligent coding assistance and execution capabilities.

## Features

- **🤖 Telegram Bot Interface**: Built with Telegraf framework for robust Telegram integration
- **🧠 Gemini AI Integration**: Uses Google's Gemini 2.0 Flash model for intelligent responses
- **⚡ E2B Sandbox Execution**: Executes code and operations in secure sandbox environments
- **🔧 Multi-language Support**: Handles Python, JavaScript, Bash, and other programming languages
- **📁 File Operations**: Create, read, and manage files within sandbox environments
- **🌐 Browser Automation**: Navigate websites, take screenshots, and automate web interactions
- **📊 Comprehensive Logging**: Centralized logging with multiple levels and proper error handling
- **🛡️ Security Features**: Input validation, environment variable protection, and graceful error handling

## Architecture

```
codebot-backend/
├── src/
│   ├── index.js              # Main application entry point
│   ├── config/
│   │   └── env.js            # Environment configuration
│   ├── services/
│   │   ├── telegram.js       # Telegram bot service
│   │   ├── gemini.js         # Gemini AI integration
│   │   ├── e2b.js            # E2B sandbox execution
│   │   └── messageProcessor.js # Message processing orchestration
│   ├── utils/
│   │   ├── logger.js         # Centralized logging utility
│   │   └── errorHandler.js   # Error handling middleware
│   └── prompts/
│       └── systemPrompt.js   # Gemini AI system prompt
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── package.json             # Project dependencies
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd codebot-backend
npm install
```

### 2. Get API Keys

#### Telegram Bot Token
1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### Gemini AI API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" button
4. Copy the generated API key (starts with `AIza`)

#### E2B Sandbox API Key
1. Sign up at [E2B](https://e2b.dev)
2. Go to your dashboard
3. Copy your API key from the API settings

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file and add your API keys:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
GEMINI_API_KEY=AIzaSy...
E2B_API_KEY=your_e2b_key_here
```

### 4. Run Tests
```bash
npm test
```

This will validate:
- Environment variables configuration
- Service imports
- API request structures
- File structure
- Package.json configuration

### 5. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

Success indicators:
- ✅ Bot connected: @YourBotName (ID: 123456789)
- 🚀 Server started on port 3000
- ✅ CodeBot backend is ready!

### 6. Test Your Bot
1. Open Telegram and search for your bot
2. Send `/start` command
3. Try sending a message like "Hello, can you help me with Python?"

## Prerequisites

- Node.js 18+ 
- npm or yarn
- API Keys:
  - Telegram Bot Token
  - Google Gemini API Key
  - E2B Sandbox API Key

## Installation

1. **Clone or create the project directory:**
   ```bash
   mkdir codebot-backend
   cd codebot-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   PORT=3000
   NODE_ENV=development
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   E2B_API_KEY=your_e2b_api_key_here
   LOG_LEVEL=info
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **For production deployment:**
   ```bash
   npm start
   ```

## API Keys Setup

### Telegram Bot Token
1. Start a chat with [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot using `/newbot`
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`

### Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to `GEMINI_API_KEY`

### E2B Sandbox API Key
1. Sign up at [E2B](https://e2b.dev)
2. Go to your dashboard and copy the API key
3. Add it to `E2B_API_KEY`

## Available Operations

### 1. Terminal Commands
Execute shell commands and get output:
```json
{
  "type": "terminal_command",
  "command": "python --version",
  "description": "Check Python version"
}
```

### 2. File Operations
Create and manage files:
```json
{
  "type": "write_file",
  "path": "/tmp/main.py",
  "content": "print('Hello, World!')",
  "description": "Create Python file"
}

{
  "type": "read_file",
  "path": "/tmp/main.py",
  "description": "Read file contents"
}
```

### 3. Browser Automation
Automate web interactions:
```json
{
  "type": "browser_action",
  "action": "navigate",
  "url": "https://example.com",
  "description": "Navigate to website"
}
```

## Bot Commands

- `/start` - Welcome message and bot introduction
- `/help` - Detailed help and usage examples
- Send any text message for AI assistance

## Examples

### Code Generation
```
User: Write a Python function to calculate fibonacci numbers
Bot: Generates a Python function with explanation
```

### Code Execution
```
User: Run this code to test if it works
[Python code]
Bot: Executes code in sandbox and shows results
```

### File Operations
```
User: Create a JSON file with user data and read it back
Bot: Creates file, writes data, reads and displays contents
```

### Web Automation
```
User: Check if this website is working properly
Bot: Navigates to site, takes screenshot, analyzes functionality
```

## 🧪 Testing

### Run Test Suite
```bash
npm test
```

The test suite validates:

1. **Environment Variables**
   - ✅ PORT loaded
   - ✅ TELEGRAM_BOT_TOKEN loaded
   - ✅ GEMINI_API_KEY loaded
   - ✅ E2B_API_KEY loaded

2. **Service Imports**
   - ✅ telegram.js imported successfully
   - ✅ gemini.js imported successfully
   - ✅ e2b.js imported successfully
   - ✅ messageProcessor.js imported successfully

3. **API Request Structures**
   - ✅ Gemini request structure valid
   - ✅ E2B request structure valid

4. **File Structure**
   - ✅ All required files exist

5. **Package Configuration**
   - ✅ All dependencies found
   - ✅ All scripts configured

### Manual Testing

#### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-19T19:56:12.000Z",
  "uptime": 3600,
  "service": "CodeBot Backend"
}
```

#### Bot Testing
1. Send `/start` command to your bot
2. Send `/help` command
3. Try a simple message like "Write a hello world in Python"
4. Check logs for any errors

#### Debug Mode
Set `LOG_LEVEL=debug` in `.env` for detailed logging:
```bash
LOG_LEVEL=debug
npm run dev
```

## Configuration

### Environment Variables Reference

| Variable | Description | Default | Required | Where to Get |
|----------|-------------|---------|----------|--------------|
| `PORT` | Server port number | 3000 | No | Any available port |
| `NODE_ENV` | Environment mode | development | No | `development` or `production` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - | Yes | [@BotFather](https://t.me/BotFather) |
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `E2B_API_KEY` | E2B sandbox API key | - | Yes | [E2B Dashboard](https://e2b.dev) |
| `LOG_LEVEL` | Logging level | info | No | `error`, `warn`, `info`, `debug` |

### API Key Formats

**Telegram Bot Token:**
- Format: `numbers:alphanumeric_string`
- Example: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- Length: ~45 characters

**Gemini API Key:**
- Format: Starts with `AIza`
- Example: `AIzaSyBEXAMPLEKEY123456789`
- Length: ~39 characters

**E2B API Key:**
- Format: Alphanumeric string
- Example: `e2b_1234567890abcdef`
- Variable length

### Logging Levels
- `error` - Error messages only
- `warn` - Warning and error messages  
- `info` - Information, warning, and error messages
- `debug` - All messages including debug info

## Security Features

- **Input Validation**: All user inputs are validated before processing
- **Environment Variables**: API keys stored securely in environment variables
- **Sandbox Execution**: Code runs in isolated E2B sandbox environments
- **Error Handling**: Graceful error handling without exposing sensitive information
- **Rate Limiting**: Built-in timeout and retry mechanisms
- **Content Filtering**: Basic filtering for potentially dangerous commands

## Error Handling

The application includes comprehensive error handling:

- **API Failures**: Automatic retry with exponential backoff
- **Timeout Protection**: 5-minute timeout for complex operations
- **Network Errors**: Graceful handling of connection issues
- **User Feedback**: Clear, user-friendly error messages
- **Logging**: Detailed error logging for debugging

## Monitoring & Health

### Health Check Endpoint
```
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-19T19:50:05.000Z",
  "uptime": 3600,
  "service": "CodeBot Backend"
}
```

### Logging
All operations are logged with timestamps and proper categorization:
- **INFO**: General operational information
- **ERROR**: Error conditions and failures
- **WARN**: Warning conditions
- **DEBUG**: Detailed debugging information

## Development

### Code Style Guidelines
- Use async/await instead of promise chains
- Arrow functions where appropriate
- Descriptive variable names
- Comprehensive error handling
- Comment complex logic
- Use axios for HTTP requests (no heavy SDKs)

### Adding New Features

1. **New Operation Types**: Add to `e2b.js` and update system prompt
2. **New Bot Commands**: Add handlers in `telegram.js`
3. **Enhanced Logging**: Extend `logger.js` utility
4. **Error Types**: Add to `errorHandler.js`

### Testing
```bash
# Run in development mode with auto-restart
npm run dev

# Test health endpoint
curl http://localhost:3000/health

# Check logs
tail -f logs/app.log
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper logging level
- [ ] Set up SSL/TLS if needed
- [ ] Configure process manager (PM2)
- [ ] Set up monitoring and alerts
- [ ] Backup and rotation for logs

### Docker Support (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Troubleshooting

### Common Errors and Solutions

#### 1. **"Missing required environment variables"**
**Cause:** API keys not configured or using placeholder values  
**Solutions:**
- Run `cp .env.example .env` if `.env` doesn't exist
- Replace all `your_*_here` placeholders with actual API keys
- Verify `.env` file is in the project root directory
- Restart the server after making changes

#### 2. **"Invalid Telegram bot token format"**
**Cause:** Bot token format doesn't match expected pattern  
**Solutions:**
- Get a fresh token from [@BotFather](https://t.me/BotFather)
- Verify token format: `numbers:alphanumeric_string`
- Check there are no extra spaces in the token
- Ensure you're using the token, not the bot username

#### 3. **"Failed to connect to Telegram"**
**Cause:** Invalid bot token or network issues  
**Solutions:**
- Test token manually: `curl -X GET "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"`
- Check internet connectivity
- Verify bot wasn't deleted or disabled
- Ensure bot token hasn't expired

#### 4. **"Gemini API error (401/403)"**
**Cause:** Invalid or expired Gemini API key  
**Solutions:**
- Get a fresh API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Verify key starts with `AIza`
- Check if you've exceeded rate limits
- Ensure billing is enabled for your Google Cloud project

#### 5. **"Gemini API error (429)"**
**Cause:** Rate limit exceeded  
**Solutions:**
- Wait a few minutes before retrying
- Implement request queuing for high traffic
- Consider upgrading your Google Cloud plan
- Optimize prompt lengths to reduce token usage

#### 6. **"E2B sandbox creation failed"**
**Cause:** Invalid API key or quota exceeded  
**Solutions:**
- Verify E2B API key from dashboard
- Check your E2B account quota/limits
- Ensure your E2B account is active
- Contact E2B support if issues persist

#### 7. **"Port is already in use"**
**Cause:** Another process using the same port  
**Solutions:**
- Change PORT in `.env` file to a different port
- Find and stop the process using port 3000:
  ```bash
  # Find process
  lsof -i :3000
  
  # Kill process (replace PID)
  kill -9 PID
  ```
- Use port 0 to let system assign available port

#### 8. **"Bot responds but doesn't execute code"**
**Cause:** E2B API issues or operation format errors  
**Solutions:**
- Check E2B API key is valid
- Verify E2B service status
- Check logs for specific error messages
- Test simple operations first (e.g., "run: python --version")

#### 9. **"Message timeout"**
**Cause:** Long-running operations exceed timeout  
**Solutions:**
- Break complex requests into smaller parts
- Increase timeout values in configuration
- Optimize code for faster execution
- Use simpler operations when possible

#### 10. **"Health check endpoint fails"**
**Cause:** Server not running or port issues  
**Solutions:**
- Verify server is running (`npm run dev`)
- Check server logs for errors
- Verify PORT in `.env` matches actual port
- Ensure firewall allows inbound connections

### Debug Mode
Enable detailed logging:
```bash
# In .env file
LOG_LEVEL=debug

# Restart server
npm run dev
```

### Getting Help

#### Check Logs
```bash
# View real-time logs
npm run dev

# Check for errors
grep -i error logs/*.log
```

#### Test Individual Services
```bash
# Test bot connection
curl -X GET "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"

# Test Gemini API
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: <YOUR_GEMINI_KEY>" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
```

#### Common Log Messages
- `✅ Bot connected: @BotName (ID: 123456789)` - Bot working correctly
- `🚀 Server started on port 3000` - Server running
- `❌ Failed to start Telegram bot` - Check bot token
- `⚠️ Some operations failed` - Check E2B API key

#### Support Resources
1. **BotFather**: For Telegram bot issues
2. **Google AI Studio**: For Gemini API problems
3. **E2B Docs**: For sandbox execution issues
4. **Project Logs**: Check console output for detailed errors

## Contributing

1. Follow the existing code style
2. Add appropriate error handling
3. Include comprehensive logging
4. Test thoroughly before submitting
5. Update documentation for new features

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Verify API key configuration
4. Test with simple operations first

## Author

Created by MiniMax Agent - AI assistant for complex development tasks.