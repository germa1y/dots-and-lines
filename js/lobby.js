/**
 * lobby.js - Lobby System for Dots and Lines
 * Handles game creation, joining, and lobby management
 *
 * Coordinates with:
 * - firebase.js: Database operations
 * - game.js: Game session initialization
 * - app.js: UI/screen management
 */

// Lobby state
let currentLobbyGameId = null;
let currentPlayerIndex = null;
let unsubscribeFromLobby = null;
let isHost = false;

/**
 * Initialize Firebase and sign in
 * Should be called on app load
 * @returns {Promise<boolean>}
 */
async function initLobby() {
  try {
    // Initialize Firebase
    const initialized = FirebaseService.init();
    if (!initialized) {
      console.error('Failed to initialize Firebase');
      return false;
    }

    // Sign in anonymously
    await FirebaseService.signIn();

    console.log('Lobby initialized');
    return true;
  } catch (error) {
    console.error('Lobby initialization failed:', error);
    return false;
  }
}

/**
 * Create a new game and enter lobby
 * @param {string} playerName - Name of the host player
 * @param {number} maxPlayers - Maximum number of players (2-4)
 * @returns {Promise<{success: boolean, gameId?: string, code?: string, error?: string}>}
 */
async function createGameAndJoinLobby(playerName, maxPlayers = 4) {
  try {
    // Create game in Firebase
    const { gameId, code } = await FirebaseService.createGame(playerName, maxPlayers);

    // Set lobby state
    currentLobbyGameId = gameId;
    currentPlayerIndex = 0;
    isHost = true;

    // Subscribe to lobby updates
    subscribeLobbyUpdates(gameId);

    console.log('Created game and joined lobby:', gameId, code);
    return { success: true, gameId, code };
  } catch (error) {
    console.error('Failed to create game:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Join an existing game's lobby
 * @param {string} code - 6-character game code
 * @param {string} playerName - Name of the joining player
 * @returns {Promise<{success: boolean, gameId?: string, error?: string}>}
 */
async function joinGameLobby(code, playerName) {
  try {
    // Join game in Firebase
    const { gameId, playerIndex } = await FirebaseService.joinGame(code, playerName);

    // Set lobby state
    currentLobbyGameId = gameId;
    currentPlayerIndex = playerIndex;

    // Check if we're the host
    const user = FirebaseService.getUser();
    const gameData = await FirebaseService.findGameByCode(code);
    isHost = gameData && gameData.gameData.hostId === user.uid;

    // Subscribe to lobby updates
    subscribeLobbyUpdates(gameId);

    console.log('Joined game lobby:', gameId, 'as player', playerIndex);
    return { success: true, gameId };
  } catch (error) {
    console.error('Failed to join game:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to lobby state changes
 * @param {string} gameId - Game ID to subscribe to
 */
function subscribeLobbyUpdates(gameId) {
  // Unsubscribe from previous lobby if any
  if (unsubscribeFromLobby) {
    unsubscribeFromLobby();
  }

  unsubscribeFromLobby = FirebaseService.subscribeToGame(gameId, handleLobbyUpdate);
}

/**
 * Handle lobby state updates from Firebase
 * @param {object} gameData - Updated game data
 */
function handleLobbyUpdate(gameData) {
  // Update host status
  const user = FirebaseService.getUser();
  isHost = gameData.hostId === user.uid;

  // Convert players object to array
  const playersArray = [];
  if (gameData.players) {
    Object.keys(gameData.players)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(key => {
        playersArray.push({
          ...gameData.players[key],
          index: parseInt(key)
        });
      });
  }

  // Update lobby UI
  if (typeof updateLobby === 'function') {
    updateLobby({
      code: gameData.code,
      players: playersArray,
      isHost: isHost,
      maxPlayers: gameData.maxPlayers,
      status: gameData.status
    });
  }

  // If game started, transition to game screen
  if (gameData.status === 'active') {
    // Initialize game session
    if (typeof GameService !== 'undefined' && GameService.initSession) {
      GameService.initSession(currentLobbyGameId, currentPlayerIndex);
    }

    // Transition to game screen
    if (typeof showScreen === 'function') {
      showScreen('game');
    }

    // Clean up lobby subscription (game.js will handle game state now)
    cleanupLobby(false); // false = don't leave the game
  }

  console.log('Lobby updated:', gameData.code, playersArray.length, 'players');
}

/**
 * Start the game (host only)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function startGame() {
  if (!isHost) {
    console.error('Only host can start the game');
    return { success: false, error: 'Only host can start the game' };
  }

  try {
    await FirebaseService.startGame(currentLobbyGameId);
    console.log('Game started');
    return { success: true };
  } catch (error) {
    console.error('Failed to start game:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Leave the current lobby
 * @returns {Promise<void>}
 */
async function leaveLobby() {
  if (currentLobbyGameId) {
    try {
      await FirebaseService.leaveGame(currentLobbyGameId);
    } catch (error) {
      console.error('Error leaving game:', error);
    }
  }

  cleanupLobby(true);
}

/**
 * Clean up lobby state
 * @param {boolean} fullCleanup - If true, reset all state. If false, just unsubscribe
 */
function cleanupLobby(fullCleanup = true) {
  if (unsubscribeFromLobby) {
    unsubscribeFromLobby();
    unsubscribeFromLobby = null;
  }

  if (fullCleanup) {
    currentLobbyGameId = null;
    currentPlayerIndex = null;
    isHost = false;
  }

  console.log('Lobby cleaned up');
}

/**
 * Get current lobby game ID
 * @returns {string|null}
 */
function getCurrentGameId() {
  return currentLobbyGameId;
}

/**
 * Get current player index
 * @returns {number|null}
 */
function getCurrentPlayerIndex() {
  return currentPlayerIndex;
}

/**
 * Check if current user is host
 * @returns {boolean}
 */
function getIsHost() {
  return isHost;
}

/**
 * Get player name from localStorage
 * @returns {string}
 */
function getSavedPlayerName() {
  return localStorage.getItem('dotsAndLinesPlayerName') || '';
}

/**
 * Save player name to localStorage
 * @param {string} name
 */
function savePlayerName(name) {
  localStorage.setItem('dotsAndLinesPlayerName', name);
}

// Export for use in other modules
window.LobbyService = {
  // Initialization
  init: initLobby,

  // Game creation/joining
  createGame: createGameAndJoinLobby,
  joinGame: joinGameLobby,
  startGame: startGame,
  leaveLobby: leaveLobby,

  // State access
  getCurrentGameId: getCurrentGameId,
  getCurrentPlayerIndex: getCurrentPlayerIndex,
  isHost: getIsHost,

  // Player name persistence
  getSavedName: getSavedPlayerName,
  saveName: savePlayerName,

  // Cleanup
  cleanup: cleanupLobby
};
