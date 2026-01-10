/**
 * board.js - Canvas rendering and game board visualization
 * Handles canvas setup, scaling, grid rendering, and user interactions
 */

// Canvas and context
let canvas;
let ctx;
let pixelRatio = 1;

// Canvas dimensions
let canvasWidth;
let canvasHeight;

// Game constants
const GRID_SIZE = 6; // 5 boxes = 6 dots per side
const DOT_RADIUS = 6; // Radius of dots in pixels
const LINE_WIDTH = 4; // Width of lines in pixels

// Grid layout variables (calculated on resize)
let gridSpacing; // Distance between dots
let gridOffsetX; // X offset to center the grid
let gridOffsetY; // Y offset to center the grid

// Game state (will be synced with backend later)
let lines = []; // Array of line objects: { row, col, direction, ownerId }
let boxes = []; // Array of box objects: { row, col, ownerId }
let currentPlayer = 0; // Current player index (for testing, will come from backend)
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF']; // Matches CSS vars

// Players (for testing, will come from backend)
let players = [
    { id: 0, name: 'Player 1', color: PLAYER_COLORS[0], score: 0 },
    { id: 1, name: 'Player 2', color: PLAYER_COLORS[1], score: 0 }
];

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

    // Set up input event listeners
    setupInputListeners();

    // Initial resize to set canvas size
    handleResize();

    // Initialize scoreboard
    updateScoreboard();

    console.log('Canvas initialized:', { width: canvasWidth, height: canvasHeight, pixelRatio });
}

/**
 * Set up touch and mouse event listeners
 */
function setupInputListeners() {
    // Mouse events
    canvas.addEventListener('click', handleCanvasClick);

    // Touch events (prevent default to avoid double-firing with click)
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault(); // Prevent mouse events from firing
    });
}

/**
 * Handle window resize and recalculate canvas dimensions
 */
function handleResize() {
    const container = canvas.parentElement;

    // Get the container's dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate pixel ratio for sharp rendering on high-DPI displays
    pixelRatio = window.devicePixelRatio || 1;

    // Set display size (CSS pixels)
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';

    // Set actual canvas size (backing store pixels)
    canvas.width = containerWidth * pixelRatio;
    canvas.height = containerHeight * pixelRatio;

    // Scale context to account for pixel ratio
    ctx.scale(pixelRatio, pixelRatio);

    // Store logical dimensions (CSS pixels)
    canvasWidth = containerWidth;
    canvasHeight = containerHeight;

    // Calculate grid layout
    calculateGridLayout();

    // Redraw the board with new dimensions
    redraw();
}

/**
 * Calculate grid layout based on canvas dimensions
 * Centers the grid and calculates spacing between dots
 */
function calculateGridLayout() {
    // Calculate the maximum available space for the grid
    const padding = 40; // Padding around the grid
    const availableWidth = canvasWidth - (padding * 2);
    const availableHeight = canvasHeight - (padding * 2);

    // Calculate spacing based on the smaller dimension to ensure grid fits
    const maxSpacingWidth = availableWidth / (GRID_SIZE - 1);
    const maxSpacingHeight = availableHeight / (GRID_SIZE - 1);
    gridSpacing = Math.min(maxSpacingWidth, maxSpacingHeight);

    // Calculate total grid size
    const gridWidth = gridSpacing * (GRID_SIZE - 1);
    const gridHeight = gridSpacing * (GRID_SIZE - 1);

    // Center the grid
    gridOffsetX = (canvasWidth - gridWidth) / 2;
    gridOffsetY = (canvasHeight - gridHeight) / 2;

    console.log('Grid layout calculated:', {
        spacing: gridSpacing,
        offsetX: gridOffsetX,
        offsetY: gridOffsetY,
        gridWidth,
        gridHeight
    });
}

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
 * Main redraw function - clears and redraws the entire board
 */
function redraw() {
    clearCanvas();

    // Draw game elements in order (boxes behind lines)
    drawDots(); // Grid dots
    drawBoxes(); // Filled boxes
    drawLines(); // Lines drawn by players
}

/**
 * Draw all dots on the grid
 */
function drawDots() {
    ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--dot-color').trim() || '#FFFFFF';

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const pos = getDotPosition(row, col);

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Draw all completed boxes
 */
function drawBoxes() {
    for (const box of boxes) {
        const topLeft = getDotPosition(box.row, box.col);
        const bottomRight = getDotPosition(box.row + 1, box.col + 1);

        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        const color = PLAYER_COLORS[box.ownerId] || '#FFFFFF';
        ctx.fillStyle = color + '40'; // Add 40 for ~25% opacity (hex alpha)

        ctx.fillRect(topLeft.x, topLeft.y, width, height);
    }
}

/**
 * Draw all lines owned by players
 */
function drawLines() {
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';

    for (const line of lines) {
        const color = PLAYER_COLORS[line.ownerId] || '#FFFFFF';
        ctx.strokeStyle = color;

        const dot1 = getDotPosition(line.row, line.col);
        let dot2;

        if (line.direction === 'h') {
            // Horizontal line
            dot2 = getDotPosition(line.row, line.col + 1);
        } else {
            // Vertical line
            dot2 = getDotPosition(line.row + 1, line.col);
        }

        ctx.beginPath();
        ctx.moveTo(dot1.x, dot1.y);
        ctx.lineTo(dot2.x, dot2.y);
        ctx.stroke();
    }
}

/**
 * Get canvas dimensions
 * @returns {{width: number, height: number}} Canvas dimensions in CSS pixels
 */
function getCanvasDimensions() {
    return {
        width: canvasWidth,
        height: canvasHeight
    };
}

/**
 * Convert screen coordinates to canvas coordinates
 * @param {number} screenX - X coordinate in screen space
 * @param {number} screenY - Y coordinate in screen space
 * @returns {{x: number, y: number}} Canvas coordinates
 */
function screenToCanvasCoords(screenX, screenY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: screenX - rect.left,
        y: screenY - rect.top
    };
}

/**
 * Get the canvas position of a dot
 * @param {number} row - Row index (0 to GRID_SIZE-1)
 * @param {number} col - Column index (0 to GRID_SIZE-1)
 * @returns {{x: number, y: number}} Canvas coordinates of the dot
 */
function getDotPosition(row, col) {
    return {
        x: gridOffsetX + (col * gridSpacing),
        y: gridOffsetY + (row * gridSpacing)
    };
}

/**
 * Handle mouse click on canvas
 * @param {MouseEvent} e - Mouse event
 */
function handleCanvasClick(e) {
    const coords = screenToCanvasCoords(e.clientX, e.clientY);
    handleTap(coords.x, coords.y);
}

/**
 * Handle touch start on canvas
 * @param {TouchEvent} e - Touch event
 */
function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const coords = screenToCanvasCoords(touch.clientX, touch.clientY);
        handleTap(coords.x, coords.y);
    }
}

/**
 * Handle tap/click at canvas coordinates
 * @param {number} x - X coordinate on canvas
 * @param {number} y - Y coordinate on canvas
 */
function handleTap(x, y) {
    const line = getNearestLine(x, y);

    if (line) {
        // Check if line is already owned
        if (isLineOwned(line)) {
            console.log('Line already owned');
            return;
        }

        // Mark line as owned by current player
        addLine(line.row, line.col, line.direction, currentPlayer);

        // Check for completed boxes
        const completedBoxes = checkAndCompleteBoxes(line, currentPlayer);

        // Update scores if boxes were completed
        if (completedBoxes > 0) {
            calculateScores();
            updateScoreboard();
        }

        // Redraw board immediately for visual feedback
        redraw();

        // Check if game is over
        if (isGameOver()) {
            showGameOver();
            return;
        }

        // If no boxes were completed, switch to next player
        // If boxes were completed, current player gets another turn
        if (completedBoxes === 0) {
            currentPlayer = (currentPlayer + 1) % 2;
            updateScoreboard(); // Update to highlight next player
        }

        console.log('Line added:', line, 'Boxes completed:', completedBoxes, 'Next player:', currentPlayer);
    } else {
        console.log('No line near tap location');
    }
}

/**
 * Get the nearest line to a canvas coordinate
 * @param {number} x - X coordinate on canvas
 * @param {number} y - Y coordinate on canvas
 * @returns {{row: number, col: number, direction: string}|null} Line position or null if no line nearby
 */
function getNearestLine(x, y) {
    const TAP_TOLERANCE = 25; // Maximum distance from line center to register tap
    let nearestLine = null;
    let nearestDistance = TAP_TOLERANCE;

    // Check all possible horizontal lines
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE - 1; col++) {
            const dot1 = getDotPosition(row, col);
            const dot2 = getDotPosition(row, col + 1);

            // Calculate line center
            const lineX = (dot1.x + dot2.x) / 2;
            const lineY = dot1.y;

            // Check if tap is near this horizontal line
            const distance = Math.sqrt(Math.pow(x - lineX, 2) + Math.pow(y - lineY, 2));

            // Also check if tap is within the line's bounds
            const withinBounds = x >= dot1.x && x <= dot2.x && Math.abs(y - lineY) < TAP_TOLERANCE;

            if (withinBounds && distance < nearestDistance) {
                nearestDistance = distance;
                nearestLine = { row, col, direction: 'h' };
            }
        }
    }

    // Check all possible vertical lines
    for (let row = 0; row < GRID_SIZE - 1; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const dot1 = getDotPosition(row, col);
            const dot2 = getDotPosition(row + 1, col);

            // Calculate line center
            const lineX = dot1.x;
            const lineY = (dot1.y + dot2.y) / 2;

            // Check if tap is near this vertical line
            const distance = Math.sqrt(Math.pow(x - lineX, 2) + Math.pow(y - lineY, 2));

            // Also check if tap is within the line's bounds
            const withinBounds = y >= dot1.y && y <= dot2.y && Math.abs(x - lineX) < TAP_TOLERANCE;

            if (withinBounds && distance < nearestDistance) {
                nearestDistance = distance;
                nearestLine = { row, col, direction: 'v' };
            }
        }
    }

    return nearestLine;
}

/**
 * Check if a line is already owned
 * @param {{row: number, col: number, direction: string}} line - Line to check
 * @returns {boolean} True if line is owned
 */
function isLineOwned(line) {
    return lines.some(l =>
        l.row === line.row &&
        l.col === line.col &&
        l.direction === line.direction
    );
}

/**
 * Add a line to the game state
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} direction - 'h' for horizontal, 'v' for vertical
 * @param {number} ownerId - Player ID who owns the line
 */
function addLine(row, col, direction, ownerId) {
    lines.push({ row, col, direction, ownerId });
}

/**
 * Check if a box is already owned
 * @param {number} row - Box row index
 * @param {number} col - Box column index
 * @returns {boolean} True if box is owned
 */
function isBoxOwned(row, col) {
    return boxes.some(b => b.row === row && b.col === col);
}

/**
 * Check if a box is completed (all 4 sides have lines)
 * @param {number} row - Box row index
 * @param {number} col - Box column index
 * @returns {boolean} True if all 4 sides have lines
 */
function isBoxCompleted(row, col) {
    // A box is completed if all 4 lines exist:
    // Top: horizontal at (row, col)
    // Bottom: horizontal at (row+1, col)
    // Left: vertical at (row, col)
    // Right: vertical at (row, col+1)

    const hasTop = isLineOwned({ row, col, direction: 'h' });
    const hasBottom = isLineOwned({ row: row + 1, col, direction: 'h' });
    const hasLeft = isLineOwned({ row, col, direction: 'v' });
    const hasRight = isLineOwned({ row, col: col + 1, direction: 'v' });

    return hasTop && hasBottom && hasLeft && hasRight;
}

/**
 * Check and complete boxes affected by a new line
 * @param {{row: number, col: number, direction: string}} line - The line that was just added
 * @param {number} ownerId - Player ID who placed the line
 * @returns {number} Number of boxes completed
 */
function checkAndCompleteBoxes(line, ownerId) {
    let completedCount = 0;
    const boxesToCheck = [];

    // Determine which boxes might be affected by this line
    if (line.direction === 'h') {
        // Horizontal line can affect box above and below
        if (line.row > 0) {
            boxesToCheck.push({ row: line.row - 1, col: line.col });
        }
        if (line.row < GRID_SIZE - 1) {
            boxesToCheck.push({ row: line.row, col: line.col });
        }
    } else {
        // Vertical line can affect box left and right
        if (line.col > 0) {
            boxesToCheck.push({ row: line.row, col: line.col - 1 });
        }
        if (line.col < GRID_SIZE - 1) {
            boxesToCheck.push({ row: line.row, col: line.col });
        }
    }

    // Check each affected box
    for (const box of boxesToCheck) {
        if (!isBoxOwned(box.row, box.col) && isBoxCompleted(box.row, box.col)) {
            boxes.push({ row: box.row, col: box.col, ownerId });
            completedCount++;
            console.log('Box completed:', box, 'by player', ownerId);
        }
    }

    return completedCount;
}

/**
 * Calculate scores for all players based on owned boxes
 */
function calculateScores() {
    // Reset scores
    players.forEach(player => player.score = 0);

    // Count boxes owned by each player
    boxes.forEach(box => {
        const player = players.find(p => p.id === box.ownerId);
        if (player) {
            player.score++;
        }
    });
}

/**
 * Update the scoreboard UI
 */
function updateScoreboard() {
    const scoreboardEl = document.getElementById('scoreboard');
    if (!scoreboardEl) return;

    // Clear existing content
    scoreboardEl.innerHTML = '';

    // Create score items for each player
    players.forEach((player, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';

        // Highlight current player
        if (index === currentPlayer) {
            scoreItem.classList.add('active');
        }

        // Player name with color indicator
        const nameEl = document.createElement('div');
        nameEl.className = 'score-name';
        nameEl.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${player.color};margin-right:6px;"></span>${player.name}`;

        // Score value
        const scoreEl = document.createElement('div');
        scoreEl.className = 'score-value';
        scoreEl.textContent = player.score;

        scoreItem.appendChild(nameEl);
        scoreItem.appendChild(scoreEl);
        scoreboardEl.appendChild(scoreItem);
    });

    // Update game status message
    updateGameStatus();
}

/**
 * Update the game status message
 */
function updateGameStatus() {
    const statusEl = document.getElementById('game-status');
    if (!statusEl) return;

    const currentPlayerObj = players[currentPlayer];
    if (currentPlayerObj) {
        statusEl.innerHTML = `<strong style="color:${currentPlayerObj.color}">${currentPlayerObj.name}'s Turn</strong>`;
    }
}

/**
 * Check if the game is over (all boxes filled)
 * @returns {boolean} True if game is over
 */
function isGameOver() {
    const totalBoxes = (GRID_SIZE - 1) * (GRID_SIZE - 1); // 5x5 = 25 boxes
    return boxes.length >= totalBoxes;
}

/**
 * Determine the winner(s) based on scores
 * @returns {{winners: Array, isTie: boolean}} Winner information
 */
function determineWinner() {
    const maxScore = Math.max(...players.map(p => p.score));
    const winners = players.filter(p => p.score === maxScore);
    return {
        winners,
        isTie: winners.length > 1
    };
}

/**
 * Show the game over screen with winner information
 */
function showGameOver() {
    const result = determineWinner();

    // Update winner display
    const winnerDisplayEl = document.getElementById('winner-display');
    if (winnerDisplayEl) {
        if (result.isTie) {
            const winnerNames = result.winners.map(w => w.name).join(' and ');
            winnerDisplayEl.innerHTML = `<span style="color:${result.winners[0].color}">It's a Tie!</span><br>${winnerNames}`;
        } else {
            const winner = result.winners[0];
            winnerDisplayEl.innerHTML = `<span style="color:${winner.color}">${winner.name} Wins!</span>`;
        }
    }

    // Update final scores
    const finalScoresEl = document.getElementById('final-scores');
    if (finalScoresEl) {
        finalScoresEl.innerHTML = '';

        // Sort players by score (highest first)
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

        sortedPlayers.forEach(player => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'final-score-item';
            scoreItem.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${player.color};"></span>
                    <strong>${player.name}</strong>
                </div>
                <div style="font-size:1.5rem;font-weight:700;">${player.score}</div>
            `;
            finalScoresEl.appendChild(scoreItem);
        });
    }

    // Show game over screen
    if (typeof showScreen === 'function') {
        showScreen('gameover');
    }

    console.log('Game Over!', result);
}
