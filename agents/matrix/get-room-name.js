const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const config = {};
for (const line of envContent.split('\n')) {
  const [key, ...v] = line.split('=');
  if (key && v.length) config[key.trim()] = v.join('=').trim();
}

const roomId = encodeURIComponent(config.MATRIX_ROOM_ID);
const options = {
  hostname: 'matrix.org',
  path: `/_matrix/client/r0/rooms/${roomId}/state/m.room.name`,
  headers: { 'Authorization': `Bearer ${config.MATRIX_TOKEN}` }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('Room name:', JSON.parse(data).name);
    } else {
      console.log('Could not get room name. Room ID:', config.MATRIX_ROOM_ID);
    }
  });
});
