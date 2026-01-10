/**
 * board.js - Canvas rendering and game board visualization
 * Handles canvas setup, scaling, grid rendering, and user interactions
 *
 * Enhanced Input Mechanics:
 * - Single-click: First click ACTIVATES dot (pulsating), second click on adjacent dot completes line
 * - Drag & drop: Drag from dot, line follows cursor, snaps to legal connecting dot
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
const DOT_RADIUS_ACTIVE = 10; // Larger radius for activated dot
const LINE_WIDTH = 4; // Width of lines in pixels
const SNAP_DISTANCE = 30; // Distance threshold for snapping to a dot during drag

// Grid layout variables (calculated on resize)
let gridSpacing; // Distance between dots
let gridOffsetX; // X offset to center the grid
let gridOffsetY; // Y offset to center the grid

// Game state (will be synced with backend later)
let lines = []; // Array of line objects: { row, col, direction, ownerId }
let boxes = []; // Array of box objects: { row, col, ownerId }
let currentPlayer = 0; // Current player index (for testing, will come from backend)

// Enhanced input state
let activeDot = null; // Currently activated dot: { row, col } or null
let isDragging = false; // Whether we're in drag mode
let dragStartDot = null; // Dot where drag started: { row, col }
let dragCurrentPos = null; // Current drag position: { x, y } in canvas coords
let dragSnapDot = null; // Dot we're snapping to: { row, col } or null

// Animation state
let animationFrameId = null; // For pulsating animation
let pulsePhase = 0; // Animation phase for pulsating effect

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
 * Set up touch and mouse event listeners for enhanced input
 * Supports both single-click (tap) and drag-and-drop modes
 */
function setupInputListeners() {
    // Mouse events for drag-and-drop
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('mouseleave', handlePointerCancel);

    // Touch events for mobile drag-and-drop
    canvas.addEventListener('touchstart', handleTouchStartEnhanced, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMoveEnhanced, { passive: false });
    canvas.addEventListener('touchend', handleTouchEndEnhanced, { passive: false });
    canvas.addEventListener('touchcancel', handlePointerCancel);
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

    // Draw game elements in order (boxes behind lines, then drag preview)
    drawSpecialSquareIndicators(); // Special square markers (before boxes)
    drawBoxes(); // Filled boxes (behind everything)
    drawLines(); // Lines drawn by players
    drawDragPreview(); // Preview line during drag
    drawDots(); // Grid dots (on top so they're clickable)
}

/**
 * Draw special square indicators (golden and penalty)
 * Shows visual markers for uncompleted special squares
 */
function drawSpecialSquareIndicators() {
    // Get special squares from GameService if available
    let specialSquares = { golden: [], penalty: [] };
    if (typeof GameService !== 'undefined' && GameService.getSpecialSquares) {
        specialSquares = GameService.getSpecialSquares();
    }

    // Helper to check if box is already completed
    const isCompleted = (key) => {
        return boxes.some(b => `${b.row},${b.col}` === key);
    };

    // Draw golden square indicators (star icon with golden border)
    if (specialSquares.golden && specialSquares.golden.length > 0) {
        ctx.save();
        specialSquares.golden.forEach(key => {
            if (!isCompleted(key)) {
                const [row, col] = key.split(',').map(Number);
                const topLeft = getDotPosition(row, col);
                const bottomRight = getDotPosition(row + 1, col + 1);

                const width = bottomRight.x - topLeft.x;
                const height = bottomRight.y - topLeft.y;
                const centerX = topLeft.x + width / 2;
                const centerY = topLeft.y + height / 2;

                // Draw golden border
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(topLeft.x + 2, topLeft.y + 2, width - 4, height - 4);
                ctx.setLineDash([]);

                // Draw star icon in center
                drawStar(centerX, centerY, 5, 12, 6, '#FFD700');
            }
        });
        ctx.restore();
    }

    // Draw penalty square indicators (X icon with red border)
    if (specialSquares.penalty && specialSquares.penalty.length > 0) {
        ctx.save();
        specialSquares.penalty.forEach(key => {
            if (!isCompleted(key)) {
                const [row, col] = key.split(',').map(Number);
                const topLeft = getDotPosition(row, col);
                const bottomRight = getDotPosition(row + 1, col + 1);

                const width = bottomRight.x - topLeft.x;
                const height = bottomRight.y - topLeft.y;
                const centerX = topLeft.x + width / 2;
                const centerY = topLeft.y + height / 2;

                // Draw red border
                ctx.strokeStyle = '#FF4444';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(topLeft.x + 2, topLeft.y + 2, width - 4, height - 4);
                ctx.setLineDash([]);

                // Draw X icon in center
                const size = 14;
                ctx.strokeStyle = '#FF4444';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(centerX - size, centerY - size);
                ctx.lineTo(centerX + size, centerY + size);
                ctx.moveTo(centerX + size, centerY - size);
                ctx.lineTo(centerX - size, centerY + size);
                ctx.stroke();
            }
        });
        ctx.restore();
    }
}

/**
 * Draw a star shape
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} spikes - Number of spikes
 * @param {number} outerRadius - Outer radius
 * @param {number} innerRadius - Inner radius
 * @param {string} color - Fill color
 */
function drawStar(cx, cy, spikes, outerRadius, innerRadius, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();

    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/**
 * Draw all dots on the grid
 * Activated dot gets pulsating animation effect
 */
function drawDots() {
    const defaultColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--dot-color').trim() || '#FFFFFF';
    const playerColor = PLAYER_COLORS[currentPlayer] || '#FFFFFF';

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const pos = getDotPosition(row, col);
            const isActive = activeDot && activeDot.row === row && activeDot.col === col;
            const isDragStart = dragStartDot && dragStartDot.row === row && dragStartDot.col === col;
            const isSnapTarget = dragSnapDot && dragSnapDot.row === row && dragSnapDot.col === col;

            // Draw dot with different styles based on state
            if (isActive || isDragStart) {
                // Pulsating active dot
                const pulseScale = 1 + 0.3 * Math.sin(pulsePhase);
                const radius = DOT_RADIUS_ACTIVE * pulseScale;

                // Draw glow effect
                ctx.save();
                ctx.shadowColor = playerColor;
                ctx.shadowBlur = 15;
                ctx.fillStyle = playerColor;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (isSnapTarget) {
                // Highlighted snap target
                ctx.save();
                ctx.shadowColor = playerColor;
                ctx.shadowBlur = 10;
                ctx.fillStyle = playerColor + 'AA'; // Semi-transparent
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, DOT_RADIUS_ACTIVE * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Normal dot
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
 * Draw the drag preview line during drag-and-drop
 */
function drawDragPreview() {
    if (!isDragging || !dragStartDot || !dragCurrentPos) return;

    const startPos = getDotPosition(dragStartDot.row, dragStartDot.col);
    const playerColor = PLAYER_COLORS[currentPlayer] || '#FFFFFF';

    // Determine end position: snap to dot if available, otherwise follow cursor
    let endPos;
    if (dragSnapDot) {
        endPos = getDotPosition(dragSnapDot.row, dragSnapDot.col);
    } else {
        endPos = dragCurrentPos;
    }

    // Draw the preview line
    ctx.save();
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.strokeStyle = dragSnapDot ? playerColor : playerColor + '80'; // Semi-transparent if not snapped
    ctx.setLineDash(dragSnapDot ? [] : [8, 4]); // Dashed if not snapped

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(endPos.x, endPos.y);
    ctx.stroke();
    ctx.restore();
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

// ============================================================================
// ENHANCED INPUT HANDLERS (Single-click activation + Drag-and-drop)
// ============================================================================

/**
 * Get the nearest dot to a canvas coordinate
 * @param {number} x - X coordinate on canvas
 * @param {number} y - Y coordinate on canvas
 * @param {number} tolerance - Maximum distance to consider a dot "near"
 * @returns {{row: number, col: number}|null} Dot position or null
 */
function getNearestDot(x, y, tolerance = 25) {
    let nearestDot = null;
    let nearestDistance = tolerance;

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const pos = getDotPosition(row, col);
            const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestDot = { row, col };
            }
        }
    }

    return nearestDot;
}

/**
 * Check if two dots are adjacent (horizontally or vertically)
 * @param {{row: number, col: number}} dot1
 * @param {{row: number, col: number}} dot2
 * @returns {boolean}
 */
function areDotsAdjacent(dot1, dot2) {
    const rowDiff = Math.abs(dot1.row - dot2.row);
    const colDiff = Math.abs(dot1.col - dot2.col);
    // Adjacent if exactly one step horizontally OR vertically (not diagonal)
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Get line definition from two adjacent dots
 * @param {{row: number, col: number}} dot1
 * @param {{row: number, col: number}} dot2
 * @returns {{row: number, col: number, direction: string}|null}
 */
function getLineFromDots(dot1, dot2) {
    if (!areDotsAdjacent(dot1, dot2)) return null;

    if (dot1.row === dot2.row) {
        // Horizontal line
        const col = Math.min(dot1.col, dot2.col);
        return { row: dot1.row, col, direction: 'h' };
    } else {
        // Vertical line
        const row = Math.min(dot1.row, dot2.row);
        return { row, col: dot1.col, direction: 'v' };
    }
}

/**
 * Start the pulsating animation for active dot
 */
function startPulseAnimation() {
    if (animationFrameId) return; // Already running

    function animate() {
        pulsePhase += 0.15; // Animation speed
        redraw();
        animationFrameId = requestAnimationFrame(animate);
    }
    animate();
}

/**
 * Stop the pulsating animation
 */
function stopPulseAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    pulsePhase = 0;
}

/**
 * Clear all enhanced input state
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
 * Try to place a line between two dots and handle game logic
 * @param {{row: number, col: number}} dot1
 * @param {{row: number, col: number}} dot2
 * @returns {boolean} True if line was successfully placed
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

    // Check if we're in multiplayer mode (GameService exists and has active game)
    if (typeof GameService !== 'undefined' && GameService.getState && GameService.getState()) {
        // Check if it's our turn first
        if (!GameService.isMyTurn()) {
            console.log('Not your turn!');
            // Clear input state but don't send move
            clearInputState();
            redraw();
            return false;
        }

        // Multiplayer mode - delegate to GameService
        // Clear input state first for visual feedback
        clearInputState();
        redraw();

        // Send move to Firebase (async, state will update via subscription)
        GameService.handleLineDrawAttempt(line.row, line.col, line.direction)
            .then(success => {
                if (!success) {
                    console.log('Move rejected by GameService');
                }
            })
            .catch(err => {
                console.error('Error sending move:', err);
            });

        return true; // Return true to indicate attempt was made
    }

    // Single-player/local mode - handle locally
    // Place the line
    addLine(line.row, line.col, line.direction, currentPlayer);

    // Check for completed boxes
    const completedBoxes = checkAndCompleteBoxes(line, currentPlayer);

    // Update scores if boxes were completed
    if (completedBoxes > 0) {
        calculateScores();
        updateScoreboard();
    }

    // Clear input state
    clearInputState();

    // Redraw board
    redraw();

    // Check if game is over
    if (isGameOver()) {
        showGameOver();
        return true;
    }

    // If no boxes were completed, switch to next player
    if (completedBoxes === 0) {
        currentPlayer = (currentPlayer + 1) % players.length;
        updateScoreboard();
    }

    console.log('Line placed:', line, 'Boxes completed:', completedBoxes, 'Current player:', currentPlayer);
    return true;
}

// Track pointer state for distinguishing click from drag
let pointerDownTime = 0;
let pointerDownPos = null;
const DRAG_THRESHOLD = 10; // Minimum pixels to consider it a drag
const CLICK_TIMEOUT = 200; // Max ms for a quick tap

/**
 * Handle pointer down (mouse or touch start)
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 */
function handlePointerDownAt(x, y) {
    pointerDownTime = Date.now();
    pointerDownPos = { x, y };

    const dot = getNearestDot(x, y);

    if (dot) {
        // Start potential drag from this dot
        dragStartDot = dot;
        dragCurrentPos = { x, y };
        // Don't set isDragging yet - wait to see if user moves
    }
}

/**
 * Handle pointer move (mouse move or touch move)
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 */
function handlePointerMoveAt(x, y) {
    if (!dragStartDot) return;

    const dx = x - pointerDownPos.x;
    const dy = y - pointerDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If moved beyond threshold, enter drag mode
    if (distance > DRAG_THRESHOLD && !isDragging) {
        isDragging = true;
        activeDot = null; // Cancel click mode if we were in it
        startPulseAnimation();
        canvas.classList.add('dragging'); // Add dragging cursor class
        console.log('Drag mode started');
    }

    if (isDragging) {
        dragCurrentPos = { x, y };

        // Check for snap to adjacent dot
        const nearDot = getNearestDot(x, y, SNAP_DISTANCE);
        if (nearDot && areDotsAdjacent(dragStartDot, nearDot)) {
            // Check if line already exists
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
 * Handle pointer up (mouse up or touch end)
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 */
function handlePointerUpAt(x, y) {
    const wasQuickTap = (Date.now() - pointerDownTime) < CLICK_TIMEOUT;
    const movedDistance = pointerDownPos ?
        Math.sqrt(Math.pow(x - pointerDownPos.x, 2) + Math.pow(y - pointerDownPos.y, 2)) : 0;

    if (isDragging) {
        // Complete drag operation
        if (dragSnapDot && dragStartDot) {
            tryPlaceLine(dragStartDot, dragSnapDot);
        } else {
            // No valid snap - cancel drag
            clearInputState();
            redraw();
            console.log('Drag cancelled - no valid connection');
        }
    } else if (wasQuickTap && movedDistance < DRAG_THRESHOLD) {
        // This was a tap/click, not a drag
        const dot = getNearestDot(x, y);

        if (dot) {
            if (activeDot) {
                // Second tap - try to complete line
                if (areDotsAdjacent(activeDot, dot)) {
                    tryPlaceLine(activeDot, dot);
                } else {
                    // Tapped non-adjacent dot - switch to this one
                    activeDot = dot;
                    startPulseAnimation();
                    console.log('Activated new dot:', dot);
                }
            } else {
                // First tap - activate this dot
                activeDot = dot;
                startPulseAnimation();
                console.log('Activated dot:', dot);
            }
            redraw();
        } else {
            // Tapped empty space - deactivate
            clearInputState();
            redraw();
        }
    } else {
        // It was a slow tap or moved slightly but not enough to drag
        clearInputState();
        redraw();
    }

    // Reset drag tracking
    dragStartDot = null;
    isDragging = false;
    dragCurrentPos = null;
    dragSnapDot = null;
    pointerDownPos = null;
    canvas.classList.remove('dragging'); // Remove dragging cursor class
}

/**
 * Handle pointer cancel (mouse leave, touch cancel)
 */
function handlePointerCancel() {
    clearInputState();
    dragStartDot = null;
    isDragging = false;
    pointerDownPos = null;
    canvas.classList.remove('dragging'); // Remove dragging cursor class
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
function handleTouchStartEnhanced(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const coords = screenToCanvasCoords(touch.clientX, touch.clientY);
        handlePointerDownAt(coords.x, coords.y);
    }
}

function handleTouchMoveEnhanced(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const coords = screenToCanvasCoords(touch.clientX, touch.clientY);
        handlePointerMoveAt(coords.x, coords.y);
    }
}

function handleTouchEndEnhanced(e) {
    e.preventDefault();
    // Use changedTouches for the final position
    if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const coords = screenToCanvasCoords(touch.clientX, touch.clientY);
        handlePointerUpAt(coords.x, coords.y);
    } else if (dragCurrentPos) {
        // Fallback to last known position
        handlePointerUpAt(dragCurrentPos.x, dragCurrentPos.y);
    }
}

// Legacy handleTap function for backward compatibility
function handleTap(x, y) {
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
    // Check against Firebase state if in multiplayer mode
    if (typeof GameService !== 'undefined' && GameService.lineExists) {
        return GameService.lineExists(line.row, line.col, line.direction);
    }

    // Fallback to local state
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

// ============================================================================
// MULTIPLAYER SYNC FUNCTIONS (Called by game.js)
// ============================================================================

/**
 * Update board state from Firebase game state
 * Called when game state updates come from Firebase
 * @param {object} gameState - The game state from Firebase
 */
function updateBoardFromGameState(gameState) {
    if (!gameState) return;

    // Update lines array from game state
    lines.length = 0;
    if (gameState.linesArray) {
        gameState.linesArray.forEach(line => {
            lines.push({
                row: line.row,
                col: line.col,
                direction: line.direction,
                ownerId: line.ownerId
            });
        });
    }

    // Update boxes array from game state
    boxes.length = 0;
    if (gameState.boxesArray) {
        gameState.boxesArray.forEach(box => {
            boxes.push({
                row: box.row,
                col: box.col,
                ownerId: box.ownerId,
                type: box.type
            });
        });
    }

    // Update current player
    if (gameState.currentPlayerIndex !== undefined) {
        currentPlayer = gameState.currentPlayerIndex;
    }

    // Update players array
    if (gameState.playersArray) {
        players.length = 0;
        gameState.playersArray.forEach((player, index) => {
            players.push({
                id: index,
                name: player.name,
                color: player.color,
                score: player.score || 0,
                bankedTurns: player.bankedTurns || 0
            });
        });
    }

    // Redraw the board with updated state
    redraw();

    console.log('Board updated from game state:', {
        lines: lines.length,
        boxes: boxes.length,
        currentPlayer,
        players: players.length
    });
}

/**
 * Update scoreboard from Firebase game state
 * Called when game state updates come from Firebase
 * @param {object} gameState - The game state from Firebase
 */
function updateScoreboardFromState(gameState) {
    if (!gameState || !gameState.playersArray) return;

    // Update local players array scores
    gameState.playersArray.forEach((player, index) => {
        if (players[index]) {
            players[index].score = player.score || 0;
            players[index].name = player.name;
            players[index].bankedTurns = player.bankedTurns || 0;
        }
    });

    // Update current player index
    if (gameState.currentPlayerIndex !== undefined) {
        currentPlayer = gameState.currentPlayerIndex;
    }

    // Refresh the scoreboard UI
    updateScoreboard();
}

/**
 * Show game over screen with state from Firebase
 * Called when game transitions to 'finished' status
 * @param {object} gameState - The game state from Firebase
 */
function showGameOverFromState(gameState) {
    if (!gameState || !gameState.playersArray) {
        showGameOver(); // Fallback to local state
        return;
    }

    // Update local players with final scores from Firebase
    players.length = 0;
    gameState.playersArray.forEach((player, index) => {
        players.push({
            id: index,
            name: player.name,
            color: player.color,
            score: player.score || 0
        });
    });

    // Use the standard game over display
    showGameOver();
}

/**
 * Reset the board to initial state
 * Called when starting a new game or returning to menu
 */
function resetBoardState() {
    // Clear lines and boxes
    lines.length = 0;
    boxes.length = 0;

    // Reset current player
    currentPlayer = 0;

    // Clear input state
    clearInputState();

    // Reset players to default 2-player setup
    players.length = 0;
    players.push(
        { id: 0, name: 'Player 1', color: PLAYER_COLORS[0], score: 0 },
        { id: 1, name: 'Player 2', color: PLAYER_COLORS[1], score: 0 }
    );

    // Redraw empty board
    redraw();

    // Update UI
    updateScoreboard();

    console.log('Board state reset');
}
