/**
 * game.js - Game State Management for Dots and Lines
 * Handles game logic, special squares, banked turns, and turn management
 *
 * Coordinates with:
 * - firebase.js: Real-time sync
 * - board.js: Canvas rendering
 * - app.js: UI/screen management
 */

// Game state (synced with Firebase)
let gameState = null;
let currentGameId = null;
let localPlayerIndex = null;
let unsubscribeFromGame = null;

/**
 * Initialize a game session
 * @param {string} gameId - The game ID to join
 * @param {number} playerIndex - The local player's index
 */
function initGameSession(gameId, playerIndex) {
  currentGameId = gameId;
  localPlayerIndex = playerIndex;

  // Subscribe to game state changes
  unsubscribeFromGame = FirebaseService.subscribeToGame(gameId, handleGameStateUpdate);

  console.log('Game session initialized:', gameId, 'as player', playerIndex);
}

/**
 * Handle incoming game state updates from Firebase
 * @param {object} newState - The updated game state from Firebase
 */
function handleGameStateUpdate(newState) {
  const oldState = gameState;
  gameState = newState;

  // Convert Firebase objects to arrays for easier handling
  gameState.playersArray = objectToArray(newState.players);
  gameState.linesArray = convertLinesToArray(newState.lines);
  gameState.boxesArray = convertBoxesToArray(newState.boxes);

  // Notify board.js to update rendering
  if (typeof updateBoardFromGameState === 'function') {
    updateBoardFromGameState(gameState);
  }

  // Update scoreboard
  if (typeof updateScoreboardFromState === 'function') {
    updateScoreboardFromState(gameState);
  }

  // Check for game state transitions
  if (oldState) {
    // Check if game just started
    if (oldState.status === 'waiting' && newState.status === 'active') {
      if (typeof showScreen === 'function') {
        showScreen('game');
      }
    }

    // Check if game just ended
    if (oldState.status === 'active' && newState.status === 'finished') {
      if (typeof showGameOverFromState === 'function') {
        showGameOverFromState(gameState);
      }
    }
  }

  console.log('Game state updated:', gameState);
}

/**
 * Convert Firebase players object to array
 * @param {object} playersObj - Firebase players object
 * @returns {Array} Players array
 */
function objectToArray(obj) {
  if (!obj) return [];
  return Object.keys(obj)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(key => ({ ...obj[key], index: parseInt(key) }));
}

/**
 * Convert Firebase lines object to array format for board.js
 * @param {object} linesObj - Firebase lines object {"row,col,dir": playerIndex}
 * @returns {Array} Lines array [{row, col, direction, ownerId}]
 */
function convertLinesToArray(linesObj) {
  if (!linesObj) return [];

  return Object.entries(linesObj).map(([key, ownerId]) => {
    const [row, col, direction] = key.split(',');
    return {
      row: parseInt(row),
      col: parseInt(col),
      direction: direction,
      ownerId: ownerId
    };
  });
}

/**
 * Convert Firebase boxes object to array format for board.js
 * @param {object} boxesObj - Firebase boxes object {"row,col": {ownerId, type}}
 * @returns {Array} Boxes array [{row, col, ownerId, type}]
 */
function convertBoxesToArray(boxesObj) {
  if (!boxesObj) return [];

  return Object.entries(boxesObj).map(([key, boxData]) => {
    const [row, col] = key.split(',');
    return {
      row: parseInt(row),
      col: parseInt(col),
      ownerId: boxData.ownerId,
      type: boxData.type || 'normal'
    };
  });
}

/**
 * Check if it's the local player's turn
 * @returns {boolean}
 */
function isMyTurn() {
  if (!gameState || gameState.status !== 'active') return false;
  return gameState.currentPlayerIndex === localPlayerIndex;
}

/**
 * Get the current player object
 * @returns {object|null}
 */
function getCurrentPlayer() {
  if (!gameState || !gameState.playersArray) return null;
  return gameState.playersArray[gameState.currentPlayerIndex];
}

/**
 * Get the local player object
 * @returns {object|null}
 */
function getLocalPlayer() {
  if (!gameState || !gameState.playersArray) return null;
  return gameState.playersArray[localPlayerIndex];
}

/**
 * Get line key from row, col, direction
 * @param {number} row
 * @param {number} col
 * @param {string} direction
 * @returns {string}
 */
function getLineKey(row, col, direction) {
  return `${row},${col},${direction}`;
}

/**
 * Get box key from row, col
 * @param {number} row
 * @param {number} col
 * @returns {string}
 */
function getBoxKey(row, col) {
  return `${row},${col}`;
}

/**
 * Check if a line already exists
 * @param {number} row
 * @param {number} col
 * @param {string} direction
 * @returns {boolean}
 */
function lineExists(row, col, direction) {
  if (!gameState || !gameState.lines) return false;
  const key = getLineKey(row, col, direction);
  return gameState.lines[key] !== undefined;
}

/**
 * Check if a box is completed (all 4 sides have lines)
 * @param {number} row - Box row (0-4)
 * @param {number} col - Box column (0-4)
 * @returns {boolean}
 */
function isBoxComplete(row, col) {
  const hasTop = lineExists(row, col, 'h');
  const hasBottom = lineExists(row + 1, col, 'h');
  const hasLeft = lineExists(row, col, 'v');
  const hasRight = lineExists(row, col + 1, 'v');

  return hasTop && hasBottom && hasLeft && hasRight;
}

/**
 * Get special square type for a box
 * @param {number} row
 * @param {number} col
 * @returns {string} 'golden', 'penalty', or 'normal'
 */
function getSpecialSquareType(row, col) {
  if (!gameState || !gameState.specialSquares) return 'normal';

  const key = getBoxKey(row, col);

  if (gameState.specialSquares.golden && gameState.specialSquares.golden.includes(key)) {
    return 'golden';
  }

  if (gameState.specialSquares.penalty && gameState.specialSquares.penalty.includes(key)) {
    return 'penalty';
  }

  return 'normal';
}

/**
 * Check which boxes would be completed by drawing a line
 * @param {number} row
 * @param {number} col
 * @param {string} direction
 * @returns {Array} Array of {row, col, type} for newly completed boxes
 */
function findCompletedBoxes(row, col, direction) {
  const completed = [];
  const gridSize = gameState ? gameState.gridSize : 6;
  const boxCount = gridSize - 1;

  // Temporarily add the line to check
  const tempLines = { ...(gameState?.lines || {}) };
  tempLines[getLineKey(row, col, direction)] = localPlayerIndex;

  // Helper to check if box is complete with temp lines
  const isComplete = (r, c) => {
    const hasTop = tempLines[getLineKey(r, c, 'h')] !== undefined;
    const hasBottom = tempLines[getLineKey(r + 1, c, 'h')] !== undefined;
    const hasLeft = tempLines[getLineKey(r, c, 'v')] !== undefined;
    const hasRight = tempLines[getLineKey(r, c + 1, 'v')] !== undefined;
    return hasTop && hasBottom && hasLeft && hasRight;
  };

  // Determine affected boxes
  const boxesToCheck = [];

  if (direction === 'h') {
    // Horizontal line affects box above and below
    if (row > 0) boxesToCheck.push({ row: row - 1, col });
    if (row < boxCount) boxesToCheck.push({ row, col });
  } else {
    // Vertical line affects box to left and right
    if (col > 0) boxesToCheck.push({ row, col: col - 1 });
    if (col < boxCount) boxesToCheck.push({ row, col });
  }

  // Check each affected box
  for (const box of boxesToCheck) {
    const boxKey = getBoxKey(box.row, box.col);
    const isAlreadyOwned = gameState?.boxes?.[boxKey]?.ownerId !== undefined;

    if (!isAlreadyOwned && isComplete(box.row, box.col)) {
      completed.push({
        row: box.row,
        col: box.col,
        type: getSpecialSquareType(box.row, box.col)
      });
    }
  }

  return completed;
}

/**
 * Respawn special squares in unoccupied boxes
 * @param {string[]} goldenToRespawn - Golden square keys that were completed
 * @param {string[]} penaltyToRespawn - Penalty square keys that were completed
 * @param {string[]} justCompleted - Box keys just completed this turn
 * @returns {object|null} New specialSquares object or null if no respawn needed
 */
function respawnSpecialSquares(goldenToRespawn, penaltyToRespawn, justCompleted) {
  if (!gameState || !gameState.specialSquares) return null;

  const gridSize = gameState.gridSize || 6;
  const boxCount = gridSize - 1;

  // Get all currently occupied boxes (owned + just completed + current special squares)
  const occupiedBoxes = new Set();

  // Add already owned boxes
  if (gameState.boxes) {
    Object.keys(gameState.boxes).forEach(key => occupiedBoxes.add(key));
  }

  // Add just completed boxes
  justCompleted.forEach(key => occupiedBoxes.add(key));

  // Copy current special squares
  let newGolden = [...(gameState.specialSquares.golden || [])];
  let newPenalty = [...(gameState.specialSquares.penalty || [])];

  // Remove completed special squares from their lists
  goldenToRespawn.forEach(key => {
    newGolden = newGolden.filter(k => k !== key);
  });
  penaltyToRespawn.forEach(key => {
    newPenalty = newPenalty.filter(k => k !== key);
  });

  // Find all unoccupied boxes (not owned, not special)
  const allSpecial = new Set([...newGolden, ...newPenalty]);
  const unoccupiedBoxes = [];

  for (let row = 0; row < boxCount; row++) {
    for (let col = 0; col < boxCount; col++) {
      const key = `${row},${col}`;
      if (!occupiedBoxes.has(key) && !allSpecial.has(key)) {
        unoccupiedBoxes.push(key);
      }
    }
  }

  // Shuffle unoccupied boxes
  for (let i = unoccupiedBoxes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unoccupiedBoxes[i], unoccupiedBoxes[j]] = [unoccupiedBoxes[j], unoccupiedBoxes[i]];
  }

  // Respawn golden squares
  let spawnIndex = 0;
  for (let i = 0; i < goldenToRespawn.length && spawnIndex < unoccupiedBoxes.length; i++) {
    newGolden.push(unoccupiedBoxes[spawnIndex]);
    console.log('Golden square respawned at:', unoccupiedBoxes[spawnIndex]);
    spawnIndex++;
  }

  // Respawn penalty squares
  for (let i = 0; i < penaltyToRespawn.length && spawnIndex < unoccupiedBoxes.length; i++) {
    newPenalty.push(unoccupiedBoxes[spawnIndex]);
    console.log('Penalty square respawned at:', unoccupiedBoxes[spawnIndex]);
    spawnIndex++;
  }

  return {
    golden: newGolden,
    penalty: newPenalty
  };
}

/**
 * Handle a line draw attempt by the local player
 * Called from board.js when player clicks/taps a line
 * @param {number} row
 * @param {number} col
 * @param {string} direction
 * @returns {Promise<boolean>} Success status
 */
async function handleLineDrawAttempt(row, col, direction) {
  // Validate it's our turn
  if (!isMyTurn()) {
    console.log('Not your turn!');
    if (typeof showNotification === 'function') {
      showNotification('Not your turn!');
    }
    return false;
  }

  // Check if line already exists
  if (lineExists(row, col, direction)) {
    console.log('Line already exists');
    return false;
  }

  // Find any boxes that will be completed
  const completedBoxes = findCompletedBoxes(row, col, direction);

  // Build updates for Firebase
  const updates = {};

  // Add the line
  const lineKey = getLineKey(row, col, direction);
  updates[`lines/${lineKey}`] = localPlayerIndex;

  // Process completed boxes
  let earnedTurn = false;
  let forfeitTurn = false;
  let pointsEarned = 0;

  // Track special squares that need to respawn
  const goldenToRespawn = [];
  const penaltyToRespawn = [];

  for (const box of completedBoxes) {
    const boxKey = getBoxKey(box.row, box.col);
    updates[`boxes/${boxKey}`] = {
      ownerId: localPlayerIndex,
      type: box.type
    };

    pointsEarned++;

    // Handle special square effects
    if (box.type === 'golden') {
      // Golden: Bank a turn
      const currentBanked = gameState.playersArray[localPlayerIndex]?.bankedTurns || 0;
      updates[`players/${localPlayerIndex}/bankedTurns`] = currentBanked + 1;
      earnedTurn = true; // Also keep your turn
      goldenToRespawn.push(boxKey);
      console.log('Golden square! Banked a turn.');
    } else if (box.type === 'penalty') {
      // Penalty: Forfeit turn even if you completed a box
      forfeitTurn = true;
      penaltyToRespawn.push(boxKey);
      console.log('Penalty square! Turn forfeited.');
    }
  }

  // Respawn special squares in unoccupied boxes
  if (goldenToRespawn.length > 0 || penaltyToRespawn.length > 0) {
    const respawnedSquares = respawnSpecialSquares(
      goldenToRespawn,
      penaltyToRespawn,
      completedBoxes.map(b => getBoxKey(b.row, b.col))
    );

    if (respawnedSquares) {
      updates['specialSquares'] = respawnedSquares;
    }
  }

  // Update score
  if (pointsEarned > 0) {
    const currentScore = gameState.playersArray[localPlayerIndex]?.score || 0;
    updates[`players/${localPlayerIndex}/score`] = currentScore + pointsEarned;
  }

  // Determine next turn
  if (completedBoxes.length > 0 && !forfeitTurn) {
    // Completed a box (non-penalty) - keep turn
    // currentPlayerIndex stays the same
    console.log('Box completed! Extra turn.');
  } else if (forfeitTurn) {
    // Penalty box - forfeit turn immediately, no banked turn usage
    const nextPlayer = (gameState.currentPlayerIndex + 1) % gameState.playerCount;
    updates.currentPlayerIndex = nextPlayer;
    console.log('Penalty! Turn forfeited to player', nextPlayer);
  } else {
    // No box completed - check for banked turns
    // Get current banked turns (accounting for any just-banked turns in this move)
    const currentBanked = updates[`players/${localPlayerIndex}/bankedTurns`]
      ?? gameState.playersArray[localPlayerIndex]?.bankedTurns
      ?? 0;

    if (currentBanked > 0) {
      // Use a banked turn - decrement and keep playing
      // Visual feedback provided by pulsating canvas container
      updates[`players/${localPlayerIndex}/bankedTurns`] = currentBanked - 1;
      console.log('Using banked turn! Remaining:', currentBanked - 1);
    } else {
      // No banked turns - advance to next player
      const nextPlayer = (gameState.currentPlayerIndex + 1) % gameState.playerCount;
      updates.currentPlayerIndex = nextPlayer;
      console.log('Turn passed to player', nextPlayer);
    }
  }

  // Check if game is over
  const totalBoxes = (gameState.gridSize - 1) * (gameState.gridSize - 1);
  const completedCount = Object.keys(gameState.boxes || {}).length + completedBoxes.length;

  if (completedCount >= totalBoxes) {
    updates.status = 'finished';
  }

  // Send updates to Firebase
  try {
    await FirebaseService.updateGameState(currentGameId, updates);
    console.log('Move sent:', lineKey, 'boxes:', completedBoxes.length);
    return true;
  } catch (error) {
    console.error('Failed to send move:', error);
    return false;
  }
}

/**
 * Use a banked turn (called when player chooses to use one)
 * @returns {Promise<boolean>}
 */
async function useBankedTurn() {
  if (!gameState || gameState.status !== 'active') return false;

  const player = getLocalPlayer();
  if (!player || player.bankedTurns <= 0) {
    console.log('No banked turns available');
    return false;
  }

  // Check if it would become our turn after using banked turn
  // This is for when you want to take an extra turn after your normal turn ends
  const updates = {};
  updates[`players/${localPlayerIndex}/bankedTurns`] = player.bankedTurns - 1;
  updates.currentPlayerIndex = localPlayerIndex;

  try {
    await FirebaseService.updateGameState(currentGameId, updates);
    console.log('Used banked turn');
    return true;
  } catch (error) {
    console.error('Failed to use banked turn:', error);
    return false;
  }
}

/**
 * Clean up game session (called when leaving game)
 */
function cleanupGameSession() {
  if (unsubscribeFromGame) {
    unsubscribeFromGame();
    unsubscribeFromGame = null;
  }

  gameState = null;
  currentGameId = null;
  localPlayerIndex = null;

  console.log('Game session cleaned up');
}

/**
 * Get the current game state
 * @returns {object|null}
 */
function getGameState() {
  return gameState;
}

/**
 * Get special squares for rendering hints
 * @returns {{golden: string[], penalty: string[]}}
 */
function getSpecialSquares() {
  if (!gameState || !gameState.specialSquares) {
    return { golden: [], penalty: [] };
  }
  return gameState.specialSquares;
}

/**
 * Check if a box key is a golden square
 * @param {string} key - Box key "row,col"
 * @returns {boolean}
 */
function isGoldenSquare(key) {
  return gameState?.specialSquares?.golden?.includes(key) || false;
}

/**
 * Check if a box key is a penalty square
 * @param {string} key - Box key "row,col"
 * @returns {boolean}
 */
function isPenaltySquare(key) {
  return gameState?.specialSquares?.penalty?.includes(key) || false;
}

// Export for use in other modules
window.GameService = {
  // Session management
  initSession: initGameSession,
  cleanup: cleanupGameSession,

  // State access
  getState: getGameState,
  isMyTurn: isMyTurn,
  getCurrentPlayer: getCurrentPlayer,
  getLocalPlayer: getLocalPlayer,
  getSpecialSquares: getSpecialSquares,

  // Line/Box helpers
  lineExists: lineExists,
  isBoxComplete: isBoxComplete,
  getSpecialSquareType: getSpecialSquareType,
  isGoldenSquare: isGoldenSquare,
  isPenaltySquare: isPenaltySquare,

  // Actions
  handleLineDrawAttempt: handleLineDrawAttempt,
  useBankedTurn: useBankedTurn,

  // Key helpers
  getLineKey: getLineKey,
  getBoxKey: getBoxKey
};
