# Matrix Integration for Agents

## Setup Steps

1. Create a Matrix room for agent communication
2. Get your access token
3. Configure the matrix-post script
4. Agents use the script to post updates

## Getting Your Access Token

### Option A: From Element Web
1. Go to https://app.element.io and sign in
2. Click your profile icon → **All Settings**
3. Go to **Help & About**
4. Scroll down, click **Access Token** (click to reveal)
5. Copy the token (keep it secret!)

### Option B: Login via API
```bash
curl -X POST "https://matrix.org/_matrix/client/r0/login" \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"germaly","password":"YOUR_PASSWORD"}'
```

## Configuration

Create a `.env` file (DO NOT COMMIT):
```
MATRIX_TOKEN=your_access_token_here
MATRIX_ROOM_ID=!your_room_id:matrix.org
MATRIX_USER_ID=@germaly:matrix.org
```

## Usage

Agents post updates like:
```bash
node matrix/post.js "Terra" "Starting TASK-001: Create folder structure"
node matrix/post.js "Pixel" "Waiting for TASK-001 to complete"
node matrix/post.js "Ember" "TASK-002 complete, Firebase project ready"
```
