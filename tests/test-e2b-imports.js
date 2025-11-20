// Try different import patterns for the installed E2B SDK
console.log('Testing E2B SDK import patterns...');

try {
  const E2B = require('./node_modules/e2b/dist/index.js');
  console.log('✅ Direct path import worked');
  console.log('E2B object keys:', Object.keys(E2B));
} catch (error) {
  console.log('❌ Direct path import failed:', error.message);
}

try {
  const { Sandbox } = require('./node_modules/e2b');
  console.log('✅ Named import worked');
  console.log('Sandbox constructor available:', typeof Sandbox);
} catch (error) {
  console.log('❌ Named import failed:', error.message);
}

try {
  const Sandbox = require('./node_modules/e2b').Sandbox;
  console.log('✅ Sandbox direct import worked');
  console.log('Sandbox type:', typeof Sandbox);
} catch (error) {
  console.log('❌ Sandbox direct import failed:', error.message);
}

// Check what's actually available in the node_modules
const fs = require('fs');
const path = require('path');

console.log('\nChecking node_modules structure...');
try {
  const e2bPath = './node_modules/e2b';
  const files = fs.readdirSync(e2bPath);
  console.log('Files in e2b node_modules:', files);
  
  if (fs.existsSync('./node_modules/e2b/package.json')) {
    const pkg = JSON.parse(fs.readFileSync('./node_modules/e2b/package.json', 'utf8'));
    console.log('E2B package.json main:', pkg.main);
    console.log('E2B version:', pkg.version);
  }
} catch (error) {
  console.log('Error reading e2b node_modules:', error.message);
}