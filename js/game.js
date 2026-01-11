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

// Sabotage mechanic state
// Set to false to disable sabotage for debugging
const SABOTAGE_ENABLED = true;
// Set to false to disable glow animation (static red dot instead)
const SABOTAGE_ANIMATION_ENABLED = true;

// Miss penalty state - when opponent taps wrong dot
let missPenaltyActive = false;
let missPenaltyEndTime = 0;
const MISS_PENALTY_DURATION = 2000; // 2 seconds cooldown after a miss

// Idle move reminder state
let idleMoveReminderTimer = null;
const IDLE_MOVE_REMINDER_DELAY = 10000; // 10 seconds

let sabotageState = {
  glowingDot: null,
  glowStartTime: null,
  glowDuration: null,
  prohibitedDot: null,
  prohibitedUntilPlayerIndex: null,
  nextGlowTime: null,
  anchoredDot: null,
  sabotagedDot: null,
  effectUntilPlayerIndex: null
};
let glowExpiryTimer = null;
let nextGlowTimer = null;
let anchorTimeoutTimer = null;
const ANCHOR_TIMEOUT_DURATION = 3000; // 3 seconds if no valid moves

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
      // Initialize sabotage when game starts (host triggers this)
      if (SABOTAGE_ENABLED) {
        FirebaseService.initializeSabotage(currentGameId);
      }
    }

    // Check if game just ended
    if (oldState.status === 'active' && newState.status === 'finished') {
      if (typeof showGameOverFromState === 'function') {
        showGameOverFromState(gameState);
      }
    }

    // Check if turn changed to a new player (for clearing prohibition)
    if (oldState.currentPlayerIndex !== newState.currentPlayerIndex) {
      handleTurnChange(oldState.currentPlayerIndex, newState.currentPlayerIndex);
    }
  } else {
    // First state received - if game is already active but no sabotage data, initialize it
    // This handles the case where a client joins/reconnects to an active game
    if (SABOTAGE_ENABLED && newState.status === 'active' && !newState.sabotage) {
      FirebaseService.initializeSabotage(currentGameId);
    }
  }

  // Update sabotage state from Firebase
  if (SABOTAGE_ENABLED && newState.sabotage) {
    const oldSabotage = { ...sabotageState };
    sabotageState = { ...newState.sabotage };
    handleSabotageStateUpdate(oldSabotage);
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

  // Cancel any idle move reminder since player is making a move
  cancelIdleMoveReminder();

  // Check if line already exists
  if (lineExists(row, col, direction)) {
    console.log('Line already exists');
    return false;
  }

  // Check if line is prohibited by sabotage
  if (isLineProhibited(row, col, direction)) {
    console.log('Line is prohibited by sabotage');
    return false;
  }

  // Check if anchor is active - player MUST use the anchored dot
  if (sabotageState.anchoredDot && !lineUsesAnchoredDot(row, col, direction)) {
    console.log('Must use anchored dot!');
    if (typeof showNotification === 'function') {
      showNotification('You must use the anchored dot!');
    }
    return false;
  }

  // Track if we need to clear the anchor after this move
  const shouldClearAnchor = sabotageState.anchoredDot && lineUsesAnchoredDot(row, col, direction);

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

      // If this was the last banked turn, start idle move reminder
      // Player still has one more move but bonus animation will stop
      if (currentBanked - 1 === 0) {
        // Use setTimeout to start after state update is processed
        setTimeout(() => startIdleMoveReminder(), 100);
      }
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

    // Clear anchor if this line used the anchored dot
    if (shouldClearAnchor) {
      console.log('[ANCHOR] Clearing anchor after player used anchored dot');
      await FirebaseService.clearAnchor(currentGameId);
    }

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

  // Cancel any pending timers
  cancelIdleMoveReminder();

  if (glowExpiryTimer) {
    clearTimeout(glowExpiryTimer);
    glowExpiryTimer = null;
  }
  if (nextGlowTimer) {
    clearTimeout(nextGlowTimer);
    nextGlowTimer = null;
  }
  if (anchorTimeoutTimer) {
    clearTimeout(anchorTimeoutTimer);
    anchorTimeoutTimer = null;
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

// ============================================
// SABOTAGE MECHANIC FUNCTIONS
// ============================================

/**
 * Handle turn change - clear all roulette effects when the affected player's turn starts
 * @param {number} oldPlayerIndex - Previous player index
 * @param {number} newPlayerIndex - New player index
 */
function handleTurnChange(oldPlayerIndex, newPlayerIndex) {
  // Cancel any idle move reminder when turn changes
  cancelIdleMoveReminder();

  // Check if roulette effects should be cleared (turn changed to the next player)
  // This covers: prohibit, anchor (if player didn't use it), sabotage visual
  const hasActiveEffect = sabotageState.prohibitedDot ||
      sabotageState.anchoredDot ||
      sabotageState.sabotagedDot;

  // Use effectUntilPlayerIndex (new) or prohibitedUntilPlayerIndex (legacy)
  const effectEndPlayerIndex = sabotageState.effectUntilPlayerIndex ??
      sabotageState.prohibitedUntilPlayerIndex;

  if (hasActiveEffect && effectEndPlayerIndex === newPlayerIndex) {
    console.log('[ROULETTE] Turn changed to player', newPlayerIndex, '- clearing all effects');
    FirebaseService.clearAllRouletteEffects(currentGameId);
  }
}

/**
 * Handle sabotage state updates from Firebase
 * @param {object} oldSabotage - Previous sabotage state
 */
function handleSabotageStateUpdate(oldSabotage) {
  try {

    // Clear existing timers
    if (glowExpiryTimer) {
      clearTimeout(glowExpiryTimer);
      glowExpiryTimer = null;
    }
    if (nextGlowTimer) {
      clearTimeout(nextGlowTimer);
      nextGlowTimer = null;
    }
    if (anchorTimeoutTimer) {
      clearTimeout(anchorTimeoutTimer);
      anchorTimeoutTimer = null;
    }

    const isMyTurnNow = isMyTurn();

  // If there's a glowing dot and it's NOT my turn, handle glow timer
  // Only the "coordinator" (lowest non-active player index) manages the timer
  if (sabotageState.glowingDot && !isMyTurnNow && !sabotageState.prohibitedDot) {

    // Check if we're the coordinator for timer management
    const activePlayerIndex = gameState?.currentPlayerIndex ?? 0;
    const playerCount = gameState?.playerCount ?? 2;
    let coordinatorIndex = -1;
    for (let i = 0; i < playerCount; i++) {
      if (i !== activePlayerIndex) {
        coordinatorIndex = i;
        break;
      }
    }

    if (localPlayerIndex === coordinatorIndex) {
      const now = Date.now();
      const elapsed = now - (sabotageState.glowStartTime || now);
      const originalRemaining = (sabotageState.glowDuration || 500) - elapsed;

      // IMPORTANT: Even if the glow "expired" according to server time,
      // give players a minimum window to see and tap it (accounts for network latency)
      const MIN_GLOW_DISPLAY_TIME = 750; // ms - minimum time to show the glow
      const remaining = Math.max(originalRemaining, MIN_GLOW_DISPLAY_TIME);

      // Set timer to clear glow when it expires
      glowExpiryTimer = setTimeout(() => {
        // Only clear if the glow hasn't been tapped
        if (sabotageState.glowingDot) {
          FirebaseService.clearGlowAndScheduleNext(currentGameId);
        }
      }, remaining);
    }
  }

  // If waiting for next glow and it's NOT my turn and no roulette effect active
  // Only the coordinator schedules the next glow cycle
  const hasActiveRouletteEffect = sabotageState.prohibitedDot ||
      sabotageState.anchoredDot ||
      sabotageState.sabotagedDot;
  const checkNextGlow = sabotageState.nextGlowTime && !sabotageState.glowingDot &&
      !hasActiveRouletteEffect && !isMyTurnNow;

  if (checkNextGlow) {
    // Check if we're the coordinator
    const activePlayerIndex = gameState?.currentPlayerIndex ?? 0;
    const playerCount = gameState?.playerCount ?? 2;
    let coordinatorIndex = -1;
    for (let i = 0; i < playerCount; i++) {
      if (i !== activePlayerIndex) {
        coordinatorIndex = i;
        break;
      }
    }

    if (localPlayerIndex === coordinatorIndex) {
      const now = Date.now();
      const waitTime = sabotageState.nextGlowTime - now;

      if (waitTime > 0) {
        nextGlowTimer = setTimeout(() => {
          startNewGlowCycle();
        }, waitTime);
      } else {
        // Time already passed, start immediately
        startNewGlowCycle();
      }
    }
  }

  // Handle anchor timeout - if anchor has no valid moves, clear after 3 seconds
  // Only the active player manages this timer
  if (sabotageState.anchoredDot && isMyTurnNow) {
    const anchorChanged = oldSabotage.anchoredDot !== sabotageState.anchoredDot;

    if (anchorChanged) {
      // Check if anchored dot has any available lines
      const [aRow, aCol] = sabotageState.anchoredDot.split(',').map(Number);
      const hasValidMove = dotHasAvailableLine(aRow, aCol);

      if (!hasValidMove) {
        console.log('[ANCHOR] No valid moves from anchored dot, starting 3-second timeout');
        anchorTimeoutTimer = setTimeout(() => {
          // Re-check that anchor is still active
          if (sabotageState.anchoredDot) {
            console.log('[ANCHOR] Timeout expired, clearing anchor');
            FirebaseService.clearAnchor(currentGameId);
          }
        }, ANCHOR_TIMEOUT_DURATION);
      }
    }
  }

    // Trigger board redraw to show/hide glowing dot and prohibition
    if (typeof redraw === 'function') {
      redraw();
    }
  } catch (error) {
    console.error('[SABOTAGE] Error in handleSabotageStateUpdate:', error);
  }
}

/**
 * Start a new glow cycle with a random eligible dot
 */
function startNewGlowCycle() {
  // Safety check - must have game ID
  if (!currentGameId) return;

  // Don't start if it's my turn or there's already a glow/prohibition
  if (isMyTurn() || sabotageState.glowingDot || sabotageState.prohibitedDot) return;

  // Only allow ONE opponent to start the glow cycle to prevent race conditions
  // The "coordinator" is the opponent with the lowest player index
  const activePlayerIndex = gameState?.currentPlayerIndex ?? 0;
  const playerCount = gameState?.playerCount ?? 2;
  let coordinatorIndex = -1;

  // Find the lowest player index that isn't the active player
  for (let i = 0; i < playerCount; i++) {
    if (i !== activePlayerIndex) {
      coordinatorIndex = i;
      break;
    }
  }

  if (localPlayerIndex !== coordinatorIndex) return;

  const eligibleDots = getEligibleDotsForSabotage();
  if (eligibleDots.length > 0) {
    const randomDot = eligibleDots[Math.floor(Math.random() * eligibleDots.length)];
    FirebaseService.startGlowCycle(currentGameId, randomDot);
  }
}

/**
 * Get dots that have at least one available line (eligible for sabotage)
 * @returns {string[]} Array of dot keys "row,col"
 */
function getEligibleDotsForSabotage() {
  if (!gameState) return [];

  const eligible = [];
  const gridSize = gameState.gridSize || 6;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (dotHasAvailableLine(row, col)) {
        eligible.push(`${row},${col}`);
      }
    }
  }
  return eligible;
}

/**
 * Check if a dot has at least one available (undrawn) line
 * @param {number} row - Dot row
 * @param {number} col - Dot column
 * @returns {boolean}
 */
function dotHasAvailableLine(row, col) {
  const gridSize = gameState?.gridSize || 6;
  const lines = gameState?.lines || {};

  // Check all 4 possible lines from this dot
  // Right (horizontal from this dot)
  if (col < gridSize - 1 && lines[`${row},${col},h`] === undefined) return true;
  // Down (vertical from this dot)
  if (row < gridSize - 1 && lines[`${row},${col},v`] === undefined) return true;
  // Left (horizontal from left neighbor to this dot)
  if (col > 0 && lines[`${row},${col - 1},h`] === undefined) return true;
  // Up (vertical from top neighbor to this dot)
  if (row > 0 && lines[`${row - 1},${col},v`] === undefined) return true;

  return false;
}

/**
 * Check if a line is prohibited (touches the prohibited dot)
 * @param {number} row - Line row
 * @param {number} col - Line column
 * @param {string} direction - 'h' or 'v'
 * @returns {boolean}
 */
function isLineProhibited(row, col, direction) {
  if (!sabotageState.prohibitedDot) return false;

  const [pRow, pCol] = sabotageState.prohibitedDot.split(',').map(Number);

  if (direction === 'h') {
    // Horizontal line from (row, col) to (row, col+1)
    if ((row === pRow && col === pCol) || (row === pRow && col + 1 === pCol)) {
      return true;
    }
  } else {
    // Vertical line from (row, col) to (row+1, col)
    if ((row === pRow && col === pCol) || (row + 1 === pRow && col === pCol)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a line uses the anchored dot (one of its endpoints)
 * @param {number} row - Line row
 * @param {number} col - Line column
 * @param {string} direction - 'h' or 'v'
 * @returns {boolean}
 */
function lineUsesAnchoredDot(row, col, direction) {
  if (!sabotageState.anchoredDot) return true; // No anchor, any line is valid

  const [aRow, aCol] = sabotageState.anchoredDot.split(',').map(Number);

  if (direction === 'h') {
    // Horizontal line from (row, col) to (row, col+1)
    return (row === aRow && col === aCol) || (row === aRow && col + 1 === aCol);
  } else {
    // Vertical line from (row, col) to (row+1, col)
    return (row === aRow && col === aCol) || (row + 1 === aRow && col === aCol);
  }
}

/**
 * Get anchored dot for rendering
 * @returns {string|null} Anchored dot key "row,col" or null
 */
function getAnchoredDot() {
  return sabotageState.anchoredDot || null;
}

/**
 * Handle opponent tapping the glowing dot (roulette)
 * @param {string} dotKey - The dot that was tapped "row,col"
 */
async function handleGlowingDotTap(dotKey) {
  // Validate this is the glowing dot
  if (sabotageState.glowingDot !== dotKey) {
    console.log('Tapped dot is not the glowing dot');
    return;
  }

  // Can't tap if it's my turn
  if (isMyTurn()) {
    console.log('Cannot tap glowing dot on your own turn');
    return;
  }

  // Get the current roulette icon
  const rouletteIcon = typeof getCurrentRouletteIcon === 'function'
    ? getCurrentRouletteIcon()
    : 'prohibit';

  // Calculate next player index (the one after current player)
  const currentPlayer = gameState.currentPlayerIndex;
  const nextPlayer = (currentPlayer + 1) % gameState.playerCount;

  // Get tapping player's user ID
  const user = FirebaseService.getUser();
  const tappingPlayerId = user ? user.uid : 'unknown';

  console.log('[ROULETTE] Tapping dot:', dotKey, 'with effect:', rouletteIcon);

  // Apply the roulette effect (marks the dot, blocks new glows)
  await FirebaseService.tapGlowingDot(currentGameId, dotKey, tappingPlayerId, nextPlayer, rouletteIcon);

  // For sabotage, delay the destructive effects by 0.5 seconds
  if (rouletteIcon === 'sabotage') {
    console.log('[ROULETTE] Scheduling sabotage destruction in 500ms');
    setTimeout(async () => {
      // Re-check that sabotage is still active (turn hasn't changed)
      if (sabotageState.sabotagedDot === dotKey) {
        const destructiveUpdates = calculateSabotageEffect(dotKey);
        await FirebaseService.applySabotageEffects(currentGameId, destructiveUpdates);
      }
    }, 500);
  }
}

/**
 * Calculate sabotage effect - find all lines connected to dot and affected boxes
 * @param {string} dotKey - The dot key "row,col"
 * @returns {object} Firebase updates to apply
 */
function calculateSabotageEffect(dotKey) {
  const [row, col] = dotKey.split(',').map(Number);
  const gridSize = gameState?.gridSize || 6;
  const lines = gameState?.lines || {};
  const boxes = gameState?.boxes || {};
  const updates = {};

  // Find all lines connected to this dot
  const connectedLines = [];

  // Right (horizontal from this dot)
  if (col < gridSize - 1 && lines[`${row},${col},h`] !== undefined) {
    connectedLines.push({ key: `${row},${col},h`, owner: lines[`${row},${col},h`] });
  }
  // Down (vertical from this dot)
  if (row < gridSize - 1 && lines[`${row},${col},v`] !== undefined) {
    connectedLines.push({ key: `${row},${col},v`, owner: lines[`${row},${col},v`] });
  }
  // Left (horizontal from left neighbor)
  if (col > 0 && lines[`${row},${col - 1},h`] !== undefined) {
    connectedLines.push({ key: `${row},${col - 1},h`, owner: lines[`${row},${col - 1},h`] });
  }
  // Up (vertical from top neighbor)
  if (row > 0 && lines[`${row - 1},${col},v`] !== undefined) {
    connectedLines.push({ key: `${row - 1},${col},v`, owner: lines[`${row - 1},${col},v`] });
  }

  console.log('[SABOTAGE] Found connected lines:', connectedLines);

  // Find all boxes that will be "un-completed" by removing these lines
  const affectedBoxes = new Set();
  const boxCount = gridSize - 1;

  for (const line of connectedLines) {
    const [lRow, lCol, dir] = line.key.split(',');
    const lineRow = parseInt(lRow);
    const lineCol = parseInt(lCol);

    if (dir === 'h') {
      // Horizontal line affects box above (lineRow-1, lineCol) and below (lineRow, lineCol)
      if (lineRow > 0) {
        const boxKey = `${lineRow - 1},${lineCol}`;
        if (boxes[boxKey]) affectedBoxes.add(boxKey);
      }
      if (lineRow < boxCount) {
        const boxKey = `${lineRow},${lineCol}`;
        if (boxes[boxKey]) affectedBoxes.add(boxKey);
      }
    } else {
      // Vertical line affects box to left (lineRow, lineCol-1) and right (lineRow, lineCol)
      if (lineCol > 0) {
        const boxKey = `${lineRow},${lineCol - 1}`;
        if (boxes[boxKey]) affectedBoxes.add(boxKey);
      }
      if (lineCol < boxCount) {
        const boxKey = `${lineRow},${lineCol}`;
        if (boxes[boxKey]) affectedBoxes.add(boxKey);
      }
    }
  }

  console.log('[SABOTAGE] Affected boxes:', Array.from(affectedBoxes));

  // Calculate point deductions per player
  const pointDeductions = {};
  for (const boxKey of affectedBoxes) {
    const box = boxes[boxKey];
    if (box && box.ownerId !== undefined) {
      pointDeductions[box.ownerId] = (pointDeductions[box.ownerId] || 0) + 1;
      // Remove the box ownership
      updates[`boxes/${boxKey}`] = null;
    }
  }

  // Apply point deductions
  for (const [playerIdx, deduction] of Object.entries(pointDeductions)) {
    const currentScore = gameState.playersArray[playerIdx]?.score || 0;
    const newScore = Math.max(0, currentScore - deduction);
    updates[`players/${playerIdx}/score`] = newScore;
    console.log('[SABOTAGE] Player', playerIdx, 'loses', deduction, 'points:', currentScore, '->', newScore);
  }

  // Remove the lines
  for (const line of connectedLines) {
    updates[`lines/${line.key}`] = null;
  }

  return updates;
}

/**
 * Get current sabotage state for rendering
 * @returns {object}
 */
function getSabotageState() {
  if (!SABOTAGE_ENABLED) return null;
  return sabotageState;
}

function isSabotageAnimationEnabled() {
  return SABOTAGE_ANIMATION_ENABLED;
}

/**
 * Trigger a miss penalty when opponent taps wrong dot
 */
function triggerMissPenalty() {
  missPenaltyActive = true;
  missPenaltyEndTime = Date.now() + MISS_PENALTY_DURATION;
  console.log('[SABOTAGE] Miss penalty triggered, expires in', MISS_PENALTY_DURATION, 'ms');
}

/**
 * Check if miss penalty is currently active
 * @returns {boolean}
 */
function isMissPenaltyActive() {
  if (!missPenaltyActive) return false;

  // Check if penalty has expired
  if (Date.now() >= missPenaltyEndTime) {
    missPenaltyActive = false;
    console.log('[SABOTAGE] Miss penalty expired');
    return false;
  }
  return true;
}

/**
 * Get the miss penalty slowdown factor (1.0 = normal, 0.1 = 90% slower)
 * @returns {number}
 */
function getMissPenaltySlowdown() {
  return isMissPenaltyActive() ? 0.1 : 1.0;
}

// ============================================
// IDLE MOVE REMINDER FUNCTIONS
// ============================================

/**
 * Start the idle move reminder timer
 * Called when bonus animation stops but player still has a move
 */
function startIdleMoveReminder() {
  // Cancel any existing timer
  cancelIdleMoveReminder();

  // Only start if it's our turn
  if (!isMyTurn()) return;

  console.log('[IDLE] Starting 10-second idle move reminder timer');

  idleMoveReminderTimer = setTimeout(() => {
    // Double-check it's still our turn
    if (isMyTurn()) {
      console.log('[IDLE] Showing idle move reminder');
      if (typeof showNotification === 'function') {
        // Use persistent notification (true = dismiss on tap/click)
        showNotification("It's still your move ⭐", true);
      }
    }
    idleMoveReminderTimer = null;
  }, IDLE_MOVE_REMINDER_DELAY);
}

/**
 * Cancel the idle move reminder timer
 * Called when player makes a move or turn changes
 */
function cancelIdleMoveReminder() {
  if (idleMoveReminderTimer) {
    console.log('[IDLE] Cancelling idle move reminder timer');
    clearTimeout(idleMoveReminderTimer);
    idleMoveReminderTimer = null;
  }
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
  getBoxKey: getBoxKey,

  // Sabotage/Roulette mechanic
  getSabotageState: getSabotageState,
  isLineProhibited: isLineProhibited,
  handleGlowingDotTap: handleGlowingDotTap,
  isSabotageAnimationEnabled: isSabotageAnimationEnabled,
  triggerMissPenalty: triggerMissPenalty,
  isMissPenaltyActive: isMissPenaltyActive,
  getMissPenaltySlowdown: getMissPenaltySlowdown,
  getAnchoredDot: getAnchoredDot
};
