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

const options = {
  hostname: 'matrix.org',
  path: '/_matrix/client/r0/joined_rooms',
  headers: { 'Authorization': `Bearer ${config.MATRIX_TOKEN}` }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const rooms = JSON.parse(data).joined_rooms;
    console.log('Finding room names...\n');
    
    let completed = 0;
    rooms.forEach(roomId => {
      const encodedId = encodeURIComponent(roomId);
      const nameOpts = {
        hostname: 'matrix.org',
        path: `/_matrix/client/r0/rooms/${encodedId}/state/m.room.name`,
        headers: { 'Authorization': `Bearer ${config.MATRIX_TOKEN}` }
      };
      
      https.get(nameOpts, (nameRes) => {
        let nameData = '';
        nameRes.on('data', c => nameData += c);
        nameRes.on('end', () => {
          let name = '(unnamed)';
          if (nameRes.statusCode === 200) {
            name = JSON.parse(nameData).name;
          }
          const current = roomId === config.MATRIX_ROOM_ID ? ' ← CURRENT CONFIG' : '';
          console.log(`${name}`);
          console.log(`  ID: ${roomId}${current}`);
          console.log('');
          
          completed++;
          if (completed === rooms.length) {
            console.log('---');
            console.log('Copy the Room ID for "dots-and-lines-agents" and update your .env file');
          }
        });
      });
    });
  });
});
