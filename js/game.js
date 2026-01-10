/**
 * game.js - Complete Dots and Lines Game (Single-File Architecture)
 *
 * This file contains ALL game logic for local 2-player gameplay:
 * - Screen management (menu, game, gameover)
 * - Canvas rendering and interaction
 * - Game state management
 * - Turn handling and scoring
 *
 * No external dependencies except the existing CSS.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const GRID_SIZE = 6; // 6 dots = 5x5 boxes
const DOT_RADIUS = 6;
const DOT_RADIUS_ACTIVE = 10;
const LINE_WIDTH = 4;
const SNAP_DISTANCE = 30;

// Player colors
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF'];

// ============================================================================
// GAME STATE
// ============================================================================

let gameState = {
    players: [
        { name: 'Player 1', color: PLAYER_COLORS[0], score: 0 },
        { name: 'Player 2', color: PLAYER_COLORS[1], score: 0 }
    ],
    currentPlayerIndex: 0,
    lines: {}, // Key: "row,col,direction" -> playerIndex
    boxes: {}, // Key: "row,col" -> { ownerId: playerIndex }
    status: 'waiting' // 'waiting', 'active', 'finished'
};

// ============================================================================
// CANVAS STATE
// ============================================================================

let canvas = null;
let ctx = null;
let pixelRatio = 1;
let canvasWidth = 0;
let canvasHeight = 0;
let gridSpacing = 0;
let gridOffsetX = 0;
let gridOffsetY = 0;

// Input state
let activeDot = null;
let isDragging = false;
let dragStartDot = null;
let dragCurrentPos = null;
let dragSnapDot = null;
let pointerDownTime = 0;
let pointerDownPos = null;

// Animation state
let animationFrameId = null;
let pulsePhase = 0;

const DRAG_THRESHOLD = 10;
const CLICK_TIMEOUT = 200;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dots and Lines - Initializing...');

    // Set up menu screen
    setupMenuScreen();

    // Set up game over screen
    setupGameOverScreen();

    // Initialize canvas
    initCanvas();

    // Show menu screen
    showScreen('menu');

    console.log('Dots and Lines - Ready!');
});

/**
 * Set up menu screen event handlers
 */
function setupMenuScreen() {
    const playerNameInput = document.getElementById('player-name');
    const createGameBtn = document.getElementById('create-game-btn');
    const gameCodeInput = document.getElementById('game-code-input');
    const joinGameBtn = document.getElementById('join-game-btn');

    // Load saved player name
    const savedName = localStorage.getItem('dotsAndLinesPlayerName');
    if (savedName && playerNameInput) {
        playerNameInput.value = savedName;
    }

    // Save player name on input
    if (playerNameInput) {
        playerNameInput.addEventListener('input', function() {
            localStorage.setItem('dotsAndLinesPlayerName', this.value);
        });
    }

    // Create Game button - goes directly to game (skip lobby for local play)
    if (createGameBtn) {
        createGameBtn.addEventListener('click', function() {
            const playerName = playerNameInput ? playerNameInput.value.trim() : '';

            if (!playerName) {
                alert('Please enter your name');
                return;
            }

            // Start local 2-player game
            startLocalGame(playerName);
        });
    }

    // Hide join section for now (local play only)
    if (gameCodeInput) {
        gameCodeInput.parentElement.style.display = 'none';
    }
    if (joinGameBtn) {
        joinGameBtn.style.display = 'none';
    }
}

/**
 * Set up game over screen event handlers
 */
function setupGameOverScreen() {
    const playAgainBtn = document.getElementById('play-again-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', function() {
            // Get current player name
            const savedName = localStorage.getItem('dotsAndLinesPlayerName') || 'Player 1';
            startLocalGame(savedName);
        });
    }

    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', function() {
            resetGameState();
            showScreen('menu');
        });
    }
}

/**
 * Start a local 2-player game
 * @param {string} player1Name - Name of player 1
 */
function startLocalGame(player1Name) {
    // Reset game state
    resetGameState();

    // Set player names
    gameState.players[0].name = player1Name;
    gameState.players[1].name = 'Player 2';
    gameState.status = 'active';

    // Update scoreboard
    updateScoreboard();

    // Show game screen
    showScreen('game');

    // Trigger resize to ensure canvas is properly sized
    setTimeout(handleResize, 100);

    console.log('Local game started:', player1Name, 'vs Player 2');
}

/**
 * Reset game state to initial values
 */
function resetGameState() {
    gameState.players[0].score = 0;
    gameState.players[1].score = 0;
    gameState.currentPlayerIndex = 0;
    gameState.lines = {};
    gameState.boxes = {};
    gameState.status = 'waiting';

    // Clear input state
    clearInputState();

    // Redraw if canvas is initialized
    if (ctx) {
        redraw();
    }
}

// ============================================================================
// SCREEN MANAGEMENT
// ============================================================================

/**
 * Show a specific screen and hide others
 * @param {string} screenName - 'menu', 'lobby', 'game', or 'gameover'
 */
function showScreen(screenName) {
    const screens = ['menu', 'lobby', 'game', 'gameover'];

    screens.forEach(name => {
        const screen = document.getElementById(name + '-screen');
        if (screen) {
            if (name === screenName) {
                screen.classList.remove('hidden');
            } else {
                screen.classList.add('hidden');
            }
        }
    });

    console.log('Screen changed to:', screenName);
}

// ============================================================================
// CANVAS INITIALIZATION
// ============================================================================

/**
 * Initialize canvas and set up event listeners
 */
function initCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }

    // Set up resize handling
    window.addEventListener('resize', handleResize);

    // Set up input listeners
    setupInputListeners();

    // Initial resize
    handleResize();

    console.log('Canvas initialized');
}

/**
 * Set up touch and mouse event listeners
 */
function setupInputListeners() {
    // Mouse events
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('mouseleave', handlePointerCancel);

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handlePointerCancel);
}

/**
 * Handle window resize
 */
function handleResize() {
    if (!canvas) return;

    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    pixelRatio = window.devicePixelRatio || 1;

    // Set display size
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';

    // Set canvas size
    canvas.width = containerWidth * pixelRatio;
    canvas.height = containerHeight * pixelRatio;

    // Scale context
    ctx.scale(pixelRatio, pixelRatio);

    canvasWidth = containerWidth;
    canvasHeight = containerHeight;

    calculateGridLayout();
    redraw();
}

/**
 * Calculate grid layout based on canvas dimensions
 */
function calculateGridLayout() {
    const padding = 40;
    const availableWidth = canvasWidth - (padding * 2);
    const availableHeight = canvasHeight - (padding * 2);

    const maxSpacingWidth = availableWidth / (GRID_SIZE - 1);
    const maxSpacingHeight = availableHeight / (GRID_SIZE - 1);
    gridSpacing = Math.min(maxSpacingWidth, maxSpacingHeight);

    const gridWidth = gridSpacing * (GRID_SIZE - 1);
    const gridHeight = gridSpacing * (GRID_SIZE - 1);

    gridOffsetX = (canvasWidth - gridWidth) / 2;
    gridOffsetY = (canvasHeight - gridHeight) / 2;
}

// ============================================================================
// CANVAS RENDERING
// ============================================================================

/**
 * Clear the canvas
 */
function clearCanvas() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

/**
 * Main redraw function
 */
function redraw() {
    if (!ctx) return;

    clearCanvas();
    drawBoxes();
    drawLines();
    drawDragPreview();
    drawDots();
}

/**
 * Get canvas position of a dot
 */
function getDotPosition(row, col) {
    return {
        x: gridOffsetX + (col * gridSpacing),
        y: gridOffsetY + (row * gridSpacing)
    };
}

/**
 * Draw all dots
 */
function drawDots() {
    const defaultColor = '#FFFFFF';
    const playerColor = PLAYER_COLORS[gameState.currentPlayerIndex];

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const pos = getDotPosition(row, col);
            const isActive = activeDot && activeDot.row === row && activeDot.col === col;
            const isDragStart = dragStartDot && dragStartDot.row === row && dragStartDot.col === col;
            const isSnapTarget = dragSnapDot && dragSnapDot.row === row && dragSnapDot.col === col;

            if (isActive || isDragStart) {
                // Pulsating active dot
                const pulseScale = 1 + 0.3 * Math.sin(pulsePhase);
                const radius = DOT_RADIUS_ACTIVE * pulseScale;

                ctx.save();
                ctx.shadowColor = playerColor;
                ctx.shadowBlur = 15;
                ctx.fillStyle = playerColor;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (isSnapTarget) {
                ctx.save();
                ctx.shadowColor = playerColor;
                ctx.shadowBlur = 10;
                ctx.fillStyle = playerColor + 'AA';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, DOT_RADIUS_ACTIVE * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                ctx.fillStyle = defaultColor;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, DOT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

/**
 * Draw all completed boxes
 */
function drawBoxes() {
    for (const [key, boxData] of Object.entries(gameState.boxes)) {
        const [row, col] = key.split(',').map(Number);
        const topLeft = getDotPosition(row, col);
        const bottomRight = getDotPosition(row + 1, col + 1);

        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        const color = PLAYER_COLORS[boxData.ownerId];
        ctx.fillStyle = color + '40';
        ctx.fillRect(topLeft.x, topLeft.y, width, height);
    }
}

/**
 * Draw all lines
 */
function drawLines() {
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';

    for (const [key, ownerId] of Object.entries(gameState.lines)) {
        const [row, col, direction] = key.split(',');
        const color = PLAYER_COLORS[ownerId];
        ctx.strokeStyle = color;

        const dot1 = getDotPosition(parseInt(row), parseInt(col));
        let dot2;

        if (direction === 'h') {
            dot2 = getDotPosition(parseInt(row), parseInt(col) + 1);
        } else {
            dot2 = getDotPosition(parseInt(row) + 1, parseInt(col));
        }

        ctx.beginPath();
        ctx.moveTo(dot1.x, dot1.y);
        ctx.lineTo(dot2.x, dot2.y);
        ctx.stroke();
    }
}

/**
 * Draw drag preview line
 */
function drawDragPreview() {
    if (!isDragging || !dragStartDot || !dragCurrentPos) return;

    const startPos = getDotPosition(dragStartDot.row, dragStartDot.col);
    const playerColor = PLAYER_COLORS[gameState.currentPlayerIndex];

    let endPos;
    if (dragSnapDot) {
        endPos = getDotPosition(dragSnapDot.row, dragSnapDot.col);
    } else {
        endPos = dragCurrentPos;
    }

    ctx.save();
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.strokeStyle = dragSnapDot ? playerColor : playerColor + '80';
    ctx.setLineDash(dragSnapDot ? [] : [8, 4]);

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(endPos.x, endPos.y);
    ctx.stroke();
    ctx.restore();
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

/**
 * Convert screen coordinates to canvas coordinates
 */
function screenToCanvasCoords(screenX, screenY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: screenX - rect.left,
        y: screenY - rect.top
    };
}

/**
 * Get nearest dot to coordinates
 */
function getNearestDot(x, y, tolerance) {
    if (tolerance === undefined) tolerance = 25;

    let nearestDot = null;
    let nearestDistance = tolerance;

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const pos = getDotPosition(row, col);
            const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestDot = { row: row, col: col };
            }
        }
    }

    return nearestDot;
}

/**
 * Check if two dots are adjacent
 */
function areDotsAdjacent(dot1, dot2) {
    const rowDiff = Math.abs(dot1.row - dot2.row);
    const colDiff = Math.abs(dot1.col - dot2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Get line definition from two dots
 */
function getLineFromDots(dot1, dot2) {
    if (!areDotsAdjacent(dot1, dot2)) return null;

    if (dot1.row === dot2.row) {
        const col = Math.min(dot1.col, dot2.col);
        return { row: dot1.row, col: col, direction: 'h' };
    } else {
        const row = Math.min(dot1.row, dot2.row);
        return { row: row, col: dot1.col, direction: 'v' };
    }
}

/**
 * Get line key
 */
function getLineKey(row, col, direction) {
    return row + ',' + col + ',' + direction;
}

/**
 * Get box key
 */
function getBoxKey(row, col) {
    return row + ',' + col;
}

/**
 * Check if line exists
 */
function lineExists(row, col, direction) {
    const key = getLineKey(row, col, direction);
    return gameState.lines[key] !== undefined;
}

/**
 * Check if a line is already owned
 */
function isLineOwned(line) {
    return lineExists(line.row, line.col, line.direction);
}

/**
 * Start pulse animation
 */
function startPulseAnimation() {
    if (animationFrameId) return;

    function animate() {
        pulsePhase += 0.15;
        redraw();
        animationFrameId = requestAnimationFrame(animate);
    }
    animate();
}

/**
 * Stop pulse animation
 */
function stopPulseAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    pulsePhase = 0;
}

/**
 * Clear all input state
 */
function clearInputState() {
    activeDot = null;
    isDragging = false;
    dragStartDot = null;
    dragCurrentPos = null;
    dragSnapDot = null;
    stopPulseAnimation();
}

/**
 * Handle pointer down at coordinates
 */
function handlePointerDownAt(x, y) {
    if (gameState.status !== 'active') return;

    pointerDownTime = Date.now();
    pointerDownPos = { x: x, y: y };

    const dot = getNearestDot(x, y);

    if (dot) {
        dragStartDot = dot;
        dragCurrentPos = { x: x, y: y };
    }
}

/**
 * Handle pointer move at coordinates
 */
function handlePointerMoveAt(x, y) {
    if (!dragStartDot) return;

    const dx = x - pointerDownPos.x;
    const dy = y - pointerDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > DRAG_THRESHOLD && !isDragging) {
        isDragging = true;
        activeDot = null;
        startPulseAnimation();
    }

    if (isDragging) {
        dragCurrentPos = { x: x, y: y };

        const nearDot = getNearestDot(x, y, SNAP_DISTANCE);
        if (nearDot && areDotsAdjacent(dragStartDot, nearDot)) {
            const potentialLine = getLineFromDots(dragStartDot, nearDot);
            if (potentialLine && !isLineOwned(potentialLine)) {
                dragSnapDot = nearDot;
            } else {
                dragSnapDot = null;
            }
        } else {
            dragSnapDot = null;
        }

        redraw();
    }
}

/**
 * Handle pointer up at coordinates
 */
function handlePointerUpAt(x, y) {
    const wasQuickTap = (Date.now() - pointerDownTime) < CLICK_TIMEOUT;
    const movedDistance = pointerDownPos ?
        Math.sqrt(Math.pow(x - pointerDownPos.x, 2) + Math.pow(y - pointerDownPos.y, 2)) : 0;

    if (isDragging) {
        if (dragSnapDot && dragStartDot) {
            tryPlaceLine(dragStartDot, dragSnapDot);
        } else {
            clearInputState();
            redraw();
        }
    } else if (wasQuickTap && movedDistance < DRAG_THRESHOLD) {
        const dot = getNearestDot(x, y);

        if (dot) {
            if (activeDot) {
                if (areDotsAdjacent(activeDot, dot)) {
                    tryPlaceLine(activeDot, dot);
                } else {
                    activeDot = dot;
                    startPulseAnimation();
                }
            } else {
                activeDot = dot;
                startPulseAnimation();
            }
            redraw();
        } else {
            clearInputState();
            redraw();
        }
    } else {
        clearInputState();
        redraw();
    }

    dragStartDot = null;
    isDragging = false;
    dragCurrentPos = null;
    dragSnapDot = null;
    pointerDownPos = null;
}

/**
 * Handle pointer cancel
 */
function handlePointerCancel() {
    clearInputState();
    dragStartDot = null;
    isDragging = false;
    pointerDownPos = null;
    redraw();
}

// Mouse event handlers
function handlePointerDown(e) {
    const coords = screenToCanvasCoords(e.clientX, e.clientY);
    handlePointerDownAt(coords.x, coords.y);
}

function handlePointerMove(e) {
    const coords = screenToCanvasCoords(e.clientX, e.clientY);
    handlePointerMoveAt(coords.x, coords.y);
}

function handlePointerUp(e) {
    const coords = screenToCanvasCoords(e.clientX, e.clientY);
    handlePointerUpAt(coords.x, coords.y);
}

// Touch event handlers
function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const coords = screenToCanvasCoords(touch.clientX, touch.clientY);
        handlePointerDownAt(coords.x, coords.y);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const coords = screenToCanvasCoords(touch.clientX, touch.clientY);
        handlePointerMoveAt(coords.x, coords.y);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const coords = screenToCanvasCoords(touch.clientX, touch.clientY);
        handlePointerUpAt(coords.x, coords.y);
    } else if (dragCurrentPos) {
        handlePointerUpAt(dragCurrentPos.x, dragCurrentPos.y);
    }
}

// ============================================================================
// GAME LOGIC
// ============================================================================

/**
 * Try to place a line between two dots
 */
function tryPlaceLine(dot1, dot2) {
    const line = getLineFromDots(dot1, dot2);
    if (!line) {
        console.log('Dots are not adjacent');
        return false;
    }

    if (isLineOwned(line)) {
        console.log('Line already owned');
        return false;
    }

    // Place the line
    const lineKey = getLineKey(line.row, line.col, line.direction);
    gameState.lines[lineKey] = gameState.currentPlayerIndex;

    // Check for completed boxes
    const completedBoxes = checkAndCompleteBoxes(line, gameState.currentPlayerIndex);

    // Clear input state
    clearInputState();

    // Redraw
    redraw();

    // Update scores
    updateScoreboard();

    // Check if game is over
    if (isGameOver()) {
        gameState.status = 'finished';
        showGameOver();
        return true;
    }

    // If no boxes were completed, switch players
    if (completedBoxes === 0) {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        updateScoreboard();
    }

    console.log('Line placed:', lineKey, 'Boxes completed:', completedBoxes);
    return true;
}

/**
 * Check if a box is completed (all 4 sides have lines)
 */
function isBoxCompleted(row, col) {
    const hasTop = lineExists(row, col, 'h');
    const hasBottom = lineExists(row + 1, col, 'h');
    const hasLeft = lineExists(row, col, 'v');
    const hasRight = lineExists(row, col + 1, 'v');

    return hasTop && hasBottom && hasLeft && hasRight;
}

/**
 * Check and complete boxes after a line is placed
 */
function checkAndCompleteBoxes(line, ownerId) {
    let completedCount = 0;
    const boxesToCheck = [];

    if (line.direction === 'h') {
        // Horizontal line affects box above and below
        if (line.row > 0) {
            boxesToCheck.push({ row: line.row - 1, col: line.col });
        }
        if (line.row < GRID_SIZE - 1) {
            boxesToCheck.push({ row: line.row, col: line.col });
        }
    } else {
        // Vertical line affects box left and right
        if (line.col > 0) {
            boxesToCheck.push({ row: line.row, col: line.col - 1 });
        }
        if (line.col < GRID_SIZE - 1) {
            boxesToCheck.push({ row: line.row, col: line.col });
        }
    }

    for (const box of boxesToCheck) {
        const boxKey = getBoxKey(box.row, box.col);
        const isAlreadyOwned = gameState.boxes[boxKey] !== undefined;

        if (!isAlreadyOwned && isBoxCompleted(box.row, box.col)) {
            gameState.boxes[boxKey] = { ownerId: ownerId };
            gameState.players[ownerId].score++;
            completedCount++;
            console.log('Box completed:', boxKey, 'by player', ownerId);
        }
    }

    return completedCount;
}

/**
 * Check if game is over
 */
function isGameOver() {
    const totalBoxes = (GRID_SIZE - 1) * (GRID_SIZE - 1);
    return Object.keys(gameState.boxes).length >= totalBoxes;
}

/**
 * Determine winner(s)
 */
function determineWinner() {
    const maxScore = Math.max(...gameState.players.map(function(p) { return p.score; }));
    const winners = gameState.players.filter(function(p) { return p.score === maxScore; });
    return {
        winners: winners,
        isTie: winners.length > 1
    };
}

// ============================================================================
// UI UPDATES
// ============================================================================

/**
 * Update the scoreboard
 */
function updateScoreboard() {
    const scoreboardEl = document.getElementById('scoreboard');
    if (!scoreboardEl) return;

    scoreboardEl.innerHTML = '';

    gameState.players.forEach(function(player, index) {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';

        if (index === gameState.currentPlayerIndex && gameState.status === 'active') {
            scoreItem.classList.add('active');
        }

        const nameEl = document.createElement('div');
        nameEl.className = 'score-name';
        nameEl.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + player.color + ';margin-right:6px;"></span>' + player.name;

        const scoreEl = document.createElement('div');
        scoreEl.className = 'score-value';
        scoreEl.textContent = player.score;

        scoreItem.appendChild(nameEl);
        scoreItem.appendChild(scoreEl);
        scoreboardEl.appendChild(scoreItem);
    });

    updateGameStatus();
}

/**
 * Update game status message
 */
function updateGameStatus() {
    const statusEl = document.getElementById('game-status');
    if (!statusEl) return;

    if (gameState.status !== 'active') {
        statusEl.innerHTML = '';
        return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    statusEl.innerHTML = '<strong style="color:' + currentPlayer.color + '">' + currentPlayer.name + "'s Turn</strong>";
}

/**
 * Show game over screen
 */
function showGameOver() {
    const result = determineWinner();

    // Update winner display
    const winnerDisplayEl = document.getElementById('winner-display');
    if (winnerDisplayEl) {
        if (result.isTie) {
            const winnerNames = result.winners.map(function(w) { return w.name; }).join(' and ');
            winnerDisplayEl.innerHTML = '<span style="color:' + result.winners[0].color + '">It\'s a Tie!</span><br>' + winnerNames;
        } else {
            const winner = result.winners[0];
            winnerDisplayEl.innerHTML = '<span style="color:' + winner.color + '">' + winner.name + ' Wins!</span>';
        }
    }

    // Update final scores
    const finalScoresEl = document.getElementById('final-scores');
    if (finalScoresEl) {
        finalScoresEl.innerHTML = '';

        // Sort by score
        const sortedPlayers = gameState.players.slice().sort(function(a, b) { return b.score - a.score; });

        sortedPlayers.forEach(function(player) {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'final-score-item';
            scoreItem.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:' + player.color + ';"></span>' +
                    '<strong>' + player.name + '</strong>' +
                '</div>' +
                '<div style="font-size:1.5rem;font-weight:700;">' + player.score + '</div>';
            finalScoresEl.appendChild(scoreItem);
        });
    }

    showScreen('gameover');
    console.log('Game Over!', result);
}
