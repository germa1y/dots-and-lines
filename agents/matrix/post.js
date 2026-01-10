#!/usr/bin/env node

/**
 * Matrix Message Poster for Agent Communication
 *
 * Usage: node post.js <agent-name> <message>
 * Example: node post.js "Terra" "TASK-001 complete"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load config from .env file
function loadConfig() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found in agents/matrix/');
    console.error('Create it with MATRIX_TOKEN, MATRIX_ROOM_ID, and MATRIX_USER_ID');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const config = {};

  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      config[key.trim()] = valueParts.join('=').trim();
    }
  }

  return config;
}

// Post message to Matrix room
async function postToMatrix(agentName, message) {
  const config = loadConfig();

  const roomId = encodeURIComponent(config.MATRIX_ROOM_ID);
  const txnId = Date.now();

  const body = JSON.stringify({
    msgtype: 'm.text',
    body: `[${agentName}] ${message}`,
    format: 'org.matrix.custom.html',
    formatted_body: `<strong>[${agentName}]</strong> ${message}`
  });

  const options = {
    hostname: 'matrix.org',
    port: 443,
    path: `/_matrix/client/r0/rooms/${roomId}/send/m.room.message/${txnId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.MATRIX_TOKEN}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✓ Posted to Matrix: [${agentName}] ${message}`);
          resolve(JSON.parse(data));
        } else {
          console.error(`✗ Failed (${res.statusCode}): ${data}`);
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// CLI
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node post.js <agent-name> <message>');
  console.log('Example: node post.js "Terra" "TASK-001 complete"');
  process.exit(1);
}

const [agentName, ...messageParts] = args;
const message = messageParts.join(' ');

postToMatrix(agentName, message).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
