/**
 * Firebase Configuration for Dots and Lines
 * Project: dots-and-lines-game
 *
 * === GAME DOCUMENT SCHEMA (Firebase Realtime Database) ===
 * Path: games/{gameId}
 *
 * {
 *   code: "ABC123",              // 6-char join code (uppercase letters + numbers)
 *   status: "waiting",           // "waiting" | "active" | "finished"
 *   hostId: "uid1",              // User ID of the game creator
 *   gridSize: 6,                 // 6 dots = 5x5 boxes
 *   maxPlayers: 4,               // 2-4 players supported
 *
 *   players: {                   // Object with index keys for 2-4 players
 *     0: { id: "uid1", name: "Player 1", color: "#FF6B6B", score: 0, bankedTurns: 0 },
 *     1: { id: "uid2", name: "Player 2", color: "#4ECDC4", score: 0, bankedTurns: 0 },
 *     2: { id: "uid3", name: "Player 3", color: "#FFE66D", score: 0, bankedTurns: 0 },
 *     3: { id: "uid4", name: "Player 4", color: "#A8E6CF", score: 0, bankedTurns: 0 }
 *   },
 *   playerCount: 2,              // Current number of players
 *
 *   currentPlayerIndex: 0,       // Index of player whose turn it is
 *   turnPhase: "normal",         // "normal" | "bankedDecision" (choosing to use banked turn)
 *
 *   lines: {                     // Object with line keys for efficient lookup
 *     "0,0,h": 0,               // Line key = "row,col,direction" -> playerIndex
 *     "0,0,v": 1
 *   },
 *
 *   boxes: {                     // Object with box keys
 *     "0,0": { ownerId: 0, type: "normal" },
 *     "1,1": { ownerId: 1, type: "golden" },
 *     "2,2": { ownerId: null, type: "penalty" }  // ownerId null until completed
 *   },
 *
 *   specialSquares: {            // Pre-determined special square locations
 *     golden: ["2,2", "3,1"],    // 1-2 golden squares (bank a turn)
 *     penalty: ["1,3", "4,0"]    // 1-2 penalty squares (forfeit turn)
 *   },
 *
 *   createdAt: 1234567890,       // Timestamp when game was created
 *   lastActivity: 1234567890     // Timestamp of last move
 * }
 *
 * === PLAYER COLORS ===
 * Player 1: #FF6B6B (Coral Red)
 * Player 2: #4ECDC4 (Teal)
 * Player 3: #FFE66D (Yellow)
 * Player 4: #A8E6CF (Mint Green)
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqd1RIthPq9fa3MuVrNc4Iu5jOL5wLLrs",
  authDomain: "dots-and-lines-game.firebaseapp.com",
  databaseURL: "https://dots-and-lines-game-default-rtdb.firebaseio.com",
  projectId: "dots-and-lines-game",
  storageBucket: "dots-and-lines-game.firebasestorage.app",
  messagingSenderId: "176209635268",
  appId: "1:176209635268:web:26648016869663f4a8e691"
};

// Player color palette (supports up to 4 players)
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF'];

// Initialize Firebase
let app, database, auth;
let currentGameRef = null;
let currentGameListener = null;

function initializeFirebase() {
  try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    auth = firebase.auth();
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

// Sign in anonymously
async function signInAnonymously() {
  try {
    const userCredential = await auth.signInAnonymously();
    console.log('Signed in anonymously:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
    throw error;
  }
}

// Get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Database helpers
function getGameRef(gameId) {
  return database.ref(`games/${gameId}`);
}

function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate random special square positions
 * @param {number} gridSize - Grid size (6 = 5x5 boxes)
 * @returns {{golden: string[], penalty: string[]}} Special square positions
 */
function generateSpecialSquares(gridSize) {
  const boxCount = gridSize - 1;
  const positions = [];

  // Generate all possible positions
  for (let row = 0; row < boxCount; row++) {
    for (let col = 0; col < boxCount; col++) {
      positions.push(`${row},${col}`);
    }
  }

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Pick 1-2 golden and 1-2 penalty squares
  const goldenCount = Math.floor(Math.random() * 2) + 1; // 1 or 2
  const penaltyCount = Math.floor(Math.random() * 2) + 1; // 1 or 2

  return {
    golden: positions.slice(0, goldenCount),
    penalty: positions.slice(goldenCount, goldenCount + penaltyCount)
  };
}

/**
 * Create a new game in Firebase
 * @param {string} playerName - Name of the creating player
 * @param {number} maxPlayers - Maximum number of players (2-4)
 * @returns {Promise<{gameId: string, code: string}>}
 */
async function createGame(playerName, maxPlayers = 4) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not signed in');
  }

  const code = generateGameCode();
  const gameId = code.toLowerCase();
  const gridSize = 6; // 5x5 boxes

  const gameData = {
    code: code,
    status: 'waiting',
    hostId: user.uid,
    gridSize: gridSize,
    maxPlayers: Math.min(4, Math.max(2, maxPlayers)),

    players: {
      0: {
        id: user.uid,
        name: playerName || 'Player 1',
        color: PLAYER_COLORS[0],
        score: 0,
        bankedTurns: 0
      }
    },
    playerCount: 1,

    currentPlayerIndex: 0,
    turnPhase: 'normal',

    lines: {},
    boxes: {},

    specialSquares: generateSpecialSquares(gridSize),

    createdAt: firebase.database.ServerValue.TIMESTAMP,
    lastActivity: firebase.database.ServerValue.TIMESTAMP
  };

  const gameRef = getGameRef(gameId);
  await gameRef.set(gameData);

  console.log('Game created:', gameId, code);
  return { gameId, code };
}

/**
 * Find a game by its code
 * @param {string} code - 6-character game code
 * @returns {Promise<{gameId: string, gameData: object}|null>}
 */
async function findGameByCode(code) {
  const normalizedCode = code.toUpperCase().trim();
  const gameId = normalizedCode.toLowerCase();

  const gameRef = getGameRef(gameId);
  const snapshot = await gameRef.once('value');

  if (!snapshot.exists()) {
    return null;
  }

  const gameData = snapshot.val();

  // Verify code matches (defensive check)
  if (gameData.code !== normalizedCode) {
    return null;
  }

  return { gameId, gameData };
}

/**
 * Join an existing game
 * @param {string} code - Game code to join
 * @param {string} playerName - Name of the joining player
 * @returns {Promise<{gameId: string, playerIndex: number}>}
 */
async function joinGame(code, playerName) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not signed in');
  }

  const result = await findGameByCode(code);
  if (!result) {
    throw new Error('Game not found');
  }

  const { gameId, gameData } = result;

  // Check game status
  if (gameData.status !== 'waiting') {
    throw new Error('Game has already started');
  }

  // Check if player is already in the game
  const playersObj = gameData.players || {};
  const existingPlayerIndex = Object.keys(playersObj).find(
    key => playersObj[key].id === user.uid
  );

  if (existingPlayerIndex !== undefined) {
    console.log('Player already in game at index:', existingPlayerIndex);
    return { gameId, playerIndex: parseInt(existingPlayerIndex) };
  }

  // Check if game is full
  const currentPlayerCount = gameData.playerCount || Object.keys(playersObj).length;
  if (currentPlayerCount >= gameData.maxPlayers) {
    throw new Error('Game is full');
  }

  // Find next available player slot
  const playerIndex = currentPlayerCount;

  // Add player to the game
  const updates = {};
  updates[`players/${playerIndex}`] = {
    id: user.uid,
    name: playerName || `Player ${playerIndex + 1}`,
    color: PLAYER_COLORS[playerIndex],
    score: 0,
    bankedTurns: 0
  };
  updates.playerCount = playerIndex + 1;
  updates.lastActivity = firebase.database.ServerValue.TIMESTAMP;

  const gameRef = getGameRef(gameId);
  await gameRef.update(updates);

  console.log('Joined game:', gameId, 'as player', playerIndex);
  return { gameId, playerIndex };
}

/**
 * Start a game (host only)
 * @param {string} gameId - Game ID to start
 * @returns {Promise<void>}
 */
async function startGame(gameId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not signed in');
  }

  const gameRef = getGameRef(gameId);
  const snapshot = await gameRef.once('value');

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const gameData = snapshot.val();

  // Verify user is host
  if (gameData.hostId !== user.uid) {
    throw new Error('Only the host can start the game');
  }

  // Check minimum players
  if (gameData.playerCount < 2) {
    throw new Error('Need at least 2 players to start');
  }

  // Update game status to active
  await gameRef.update({
    status: 'active',
    lastActivity: firebase.database.ServerValue.TIMESTAMP
  });

  console.log('Game started:', gameId);
}

/**
 * Subscribe to game state changes
 * @param {string} gameId - Game ID to subscribe to
 * @param {function} callback - Callback function receiving game state
 * @returns {function} Unsubscribe function
 */
function subscribeToGame(gameId, callback) {
  // Unsubscribe from previous game if any
  if (currentGameListener) {
    currentGameRef.off('value', currentGameListener);
  }

  currentGameRef = getGameRef(gameId);
  currentGameListener = currentGameRef.on('value', (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
      callback(gameData);
    }
  });

  // Return unsubscribe function
  return () => {
    if (currentGameListener) {
      currentGameRef.off('value', currentGameListener);
      currentGameListener = null;
      currentGameRef = null;
    }
  };
}

/**
 * Draw a line in the game
 * @param {string} gameId - Game ID
 * @param {number} row - Line row
 * @param {number} col - Line column
 * @param {string} direction - 'h' for horizontal, 'v' for vertical
 * @param {number} playerIndex - Player making the move
 * @returns {Promise<void>}
 */
async function drawLine(gameId, row, col, direction, playerIndex) {
  const lineKey = `${row},${col},${direction}`;
  const gameRef = getGameRef(gameId);

  const updates = {};
  updates[`lines/${lineKey}`] = playerIndex;
  updates.lastActivity = firebase.database.ServerValue.TIMESTAMP;

  await gameRef.update(updates);
  console.log('Line drawn:', lineKey, 'by player', playerIndex);
}

/**
 * Update game state after a move (boxes, scores, turn)
 * @param {string} gameId - Game ID
 * @param {object} updates - Partial game state updates
 * @returns {Promise<void>}
 */
async function updateGameState(gameId, updates) {
  const gameRef = getGameRef(gameId);
  updates.lastActivity = firebase.database.ServerValue.TIMESTAMP;
  await gameRef.update(updates);
}

/**
 * Leave a game (remove player from lobby)
 * @param {string} gameId - Game ID
 * @returns {Promise<void>}
 */
async function leaveGame(gameId) {
  const user = getCurrentUser();
  if (!user) return;

  const gameRef = getGameRef(gameId);
  const snapshot = await gameRef.once('value');

  if (!snapshot.exists()) return;

  const gameData = snapshot.val();
  const playersObj = gameData.players || {};

  // Find player's index
  const playerIndex = Object.keys(playersObj).find(
    key => playersObj[key].id === user.uid
  );

  if (playerIndex === undefined) return;

  // If game hasn't started yet and player is host, delete the game
  if (gameData.status === 'waiting' && gameData.hostId === user.uid) {
    await gameRef.remove();
    console.log('Game deleted (host left):', gameId);
    return;
  }

  // If game is waiting, remove player (only if not started)
  if (gameData.status === 'waiting') {
    // Remove player and reassign indices
    const updates = {};
    updates[`players/${playerIndex}`] = null;
    updates.playerCount = gameData.playerCount - 1;
    updates.lastActivity = firebase.database.ServerValue.TIMESTAMP;

    // If host left, assign new host
    if (gameData.hostId === user.uid) {
      const remainingPlayers = Object.keys(playersObj).filter(k => k !== playerIndex);
      if (remainingPlayers.length > 0) {
        const newHostIndex = remainingPlayers[0];
        updates.hostId = playersObj[newHostIndex].id;
      }
    }

    await gameRef.update(updates);
    console.log('Left game:', gameId);
  }
}

/**
 * End the game
 * @param {string} gameId - Game ID
 * @returns {Promise<void>}
 */
async function endGame(gameId) {
  const gameRef = getGameRef(gameId);
  await gameRef.update({
    status: 'finished',
    lastActivity: firebase.database.ServerValue.TIMESTAMP
  });
  console.log('Game ended:', gameId);
}

// Export for use in other modules
window.FirebaseService = {
  // Core
  init: initializeFirebase,
  signIn: signInAnonymously,
  getUser: getCurrentUser,
  database: () => database,
  auth: () => auth,

  // Game management
  createGame: createGame,
  findGameByCode: findGameByCode,
  joinGame: joinGame,
  startGame: startGame,
  leaveGame: leaveGame,
  endGame: endGame,

  // Real-time sync
  subscribeToGame: subscribeToGame,
  drawLine: drawLine,
  updateGameState: updateGameState,

  // Helpers
  getGameRef: getGameRef,
  generateCode: generateGameCode,

  // Constants
  PLAYER_COLORS: PLAYER_COLORS
};
