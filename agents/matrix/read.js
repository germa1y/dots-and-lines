#!/usr/bin/env node

/**
 * Matrix Room Reader - Check recent messages
 * Usage: node read.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function loadConfig() {
  const envPath = path.join(__dirname, '.env');
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

function readRoom() {
  const config = loadConfig();
  const roomId = encodeURIComponent(config.MATRIX_ROOM_ID);

  console.log('Room ID:', config.MATRIX_ROOM_ID);
  console.log('Fetching recent messages...\n');

  const options = {
    hostname: 'matrix.org',
    port: 443,
    path: `/_matrix/client/r0/rooms/${roomId}/messages?dir=b&limit=10`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.MATRIX_TOKEN}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        const result = JSON.parse(data);
        console.log('Recent messages:');
        console.log('================');

        if (result.chunk && result.chunk.length > 0) {
          for (const event of result.chunk.reverse()) {
            if (event.type === 'm.room.message') {
              const sender = event.sender;
              const body = event.content?.body || '[no body]';
              console.log(`${sender}: ${body}`);
            }
          }
        } else {
          console.log('No messages found in room.');
        }
      } else if (res.statusCode === 403) {
        console.error('ERROR 403: Not authorized to read this room.');
        console.error('Make sure you have joined the room first.');
      } else {
        console.error(`Error (${res.statusCode}): ${data}`);
      }
    });
  });

  req.on('error', (e) => console.error('Request error:', e.message));
  req.end();
}

// Also check which rooms you're in
function listRooms() {
  const config = loadConfig();

  console.log('\nRooms you have joined:');
  console.log('======================');

  const options = {
    hostname: 'matrix.org',
    port: 443,
    path: '/_matrix/client/r0/joined_rooms',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.MATRIX_TOKEN}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        const result = JSON.parse(data);
        for (const roomId of result.joined_rooms) {
          const match = roomId === config.MATRIX_ROOM_ID ? ' ← CONFIGURED' : '';
          console.log(`  ${roomId}${match}`);
        }

        if (!result.joined_rooms.includes(config.MATRIX_ROOM_ID)) {
          console.log('\n⚠ WARNING: Your configured MATRIX_ROOM_ID is NOT in your joined rooms!');
          console.log('  Configured:', config.MATRIX_ROOM_ID);
        }
      } else {
        console.error(`Error (${res.statusCode}): ${data}`);
      }
    });
  });

  req.on('error', (e) => console.error('Request error:', e.message));
  req.end();
}

readRoom();
setTimeout(listRooms, 1000);
