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

// Canvas container pulsing animation state
let pulseAnimationId = null;
let containerPulsePhase = 0;

// Pulsation parameters (adjustable via debug panel)
let pulseParams = {
    speed: 0.002,      // How fast the pulse moves (0.0001 - 0.05)
    frequency: 4,       // Number of rings (1 - 5)
    thickness: 1,       // Width of the bright ring in % (0 - 100)
    innerFadeWidth: 14, // Inner fade/gradient width in % (0 - 100)
    outerFadeWidth: 14, // Outer fade/gradient width in % (0 - 100)
    opacity: 0.2,       // Overall opacity of the effect (0.05 - 1.0)
    ringBrightness: [15, 35, 25, 45] // Brightness for each ring (0=white, 50=player color, 100=black)
};

// Set to true to show the pulse settings debug panel
const SHOW_PULSE_DEBUG_PANEL = false;

// Sabotage mechanic animation state
let glowPulsePhase = 0;
let glowAnimationId = null;
let isGlowAnimating = false;
let prohibitPulsePhase = 0;
let missPenaltyFlashPhase = 0;

// Roulette animation state (cycles through: 0=prohibit, 1=sabotage, 2=anchor)
let rouletteIconIndex = 0;
let roulettePhase = 0;
const ROULETTE_ICONS = ['prohibit', 'sabotage', 'anchor'];
const ROULETTE_CYCLE_SPEED = 0.02; // Speed of icon cycling

/**
 * Create or update the pulse debug control panel
 * @param {boolean} show - Whether to show or hide the panel
 * @param {string} baseColor - The base color for preview
 */
function updatePulseDebugPanel(show, baseColor) {
    // Check if debug panel is enabled
    if (!SHOW_PULSE_DEBUG_PANEL) {
        let panel = document.getElementById('pulse-debug-panel');
        if (panel) panel.style.display = 'none';
        return;
    }

    let panel = document.getElementById('pulse-debug-panel');

    if (!show) {
        if (panel) panel.style.display = 'none';
        return;
    }

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'pulse-debug-panel';
        panel.innerHTML = `
            <div style="font-weight:bold;margin-bottom:10px;border-bottom:1px solid #555;padding-bottom:5px;">Pulse Settings</div>

            <label>Speed: <span id="pulse-speed-val">${pulseParams.speed}</span></label>
            <input type="range" id="pulse-speed" min="0.0001" max="0.05" step="0.0001" value="${pulseParams.speed}">

            <label>Frequency (rings): <span id="pulse-frequency-val">${pulseParams.frequency}</span></label>
            <input type="range" id="pulse-frequency" min="1" max="4" step="1" value="${pulseParams.frequency}">

            <label>Ring Thickness: <span id="pulse-thickness-val">${pulseParams.thickness}%</span></label>
            <input type="range" id="pulse-thickness" min="0" max="100" step="1" value="${pulseParams.thickness}">

            <label>Inner Fade Width: <span id="pulse-inner-fade-val">${pulseParams.innerFadeWidth}%</span></label>
            <input type="range" id="pulse-inner-fade" min="0" max="100" step="1" value="${pulseParams.innerFadeWidth}">

            <label>Outer Fade Width: <span id="pulse-outer-fade-val">${pulseParams.outerFadeWidth}%</span></label>
            <input type="range" id="pulse-outer-fade" min="0" max="100" step="1" value="${pulseParams.outerFadeWidth}">

            <label>Opacity: <span id="pulse-opacity-val">${pulseParams.opacity}</span></label>
            <input type="range" id="pulse-opacity" min="0.05" max="1.0" step="0.05" value="${pulseParams.opacity}">

            <div id="ring-colors-container" style="margin-top:10px;border-top:1px solid #555;padding-top:10px;">
                <div style="font-weight:bold;margin-bottom:8px;">Ring Brightness</div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;margin-bottom:4px;">
                    <span>White</span>
                    <span>Player</span>
                    <span>Black</span>
                </div>
                ${[1,2,3,4].map(i => `
                    <div class="ring-color-row" data-ring="${i}" style="display:${i <= pulseParams.frequency ? 'flex' : 'none'};align-items:center;gap:8px;margin-bottom:6px;">
                        <label style="margin:0;min-width:50px;">Ring ${i}:</label>
                        <input type="range" id="ring-brightness-${i}" min="0" max="100" step="1" value="${pulseParams.ringBrightness[i-1]}" style="flex:1;">
                        <span id="ring-brightness-val-${i}" style="min-width:30px;text-align:right;">${pulseParams.ringBrightness[i-1]}%</span>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top:10px;font-size:11px;color:#888;">
                Adjust sliders to modify pulse effect
            </div>
        `;
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            min-width: 200px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;

        // Style for labels and inputs
        const style = document.createElement('style');
        style.textContent = `
            #pulse-debug-panel label {
                display: block;
                margin: 8px 0 4px 0;
                color: #ccc;
            }
            #pulse-debug-panel input[type="range"] {
                width: 100%;
                cursor: pointer;
            }
            #pulse-debug-panel span {
                color: #4ecdc4;
                float: right;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);

        // Add event listeners
        document.getElementById('pulse-speed').addEventListener('input', (e) => {
            pulseParams.speed = parseFloat(e.target.value);
            document.getElementById('pulse-speed-val').textContent = pulseParams.speed;
        });
        document.getElementById('pulse-frequency').addEventListener('input', (e) => {
            pulseParams.frequency = parseInt(e.target.value);
            document.getElementById('pulse-frequency-val').textContent = pulseParams.frequency;
            // Show/hide ring color rows based on frequency
            for (let i = 1; i <= 4; i++) {
                const row = document.querySelector(`.ring-color-row[data-ring="${i}"]`);
                if (row) {
                    row.style.display = i <= pulseParams.frequency ? 'flex' : 'none';
                }
            }
        });
        document.getElementById('pulse-thickness').addEventListener('input', (e) => {
            pulseParams.thickness = parseInt(e.target.value);
            document.getElementById('pulse-thickness-val').textContent = pulseParams.thickness + '%';
        });
        document.getElementById('pulse-inner-fade').addEventListener('input', (e) => {
            pulseParams.innerFadeWidth = parseInt(e.target.value);
            document.getElementById('pulse-inner-fade-val').textContent = pulseParams.innerFadeWidth + '%';
        });
        document.getElementById('pulse-outer-fade').addEventListener('input', (e) => {
            pulseParams.outerFadeWidth = parseInt(e.target.value);
            document.getElementById('pulse-outer-fade-val').textContent = pulseParams.outerFadeWidth + '%';
        });
        document.getElementById('pulse-opacity').addEventListener('input', (e) => {
            pulseParams.opacity = parseFloat(e.target.value);
            document.getElementById('pulse-opacity-val').textContent = pulseParams.opacity;
        });

        // Ring brightness sliders
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`ring-brightness-${i}`).addEventListener('input', (e) => {
                pulseParams.ringBrightness[i - 1] = parseInt(e.target.value);
                document.getElementById(`ring-brightness-val-${i}`).textContent = pulseParams.ringBrightness[i - 1] + '%';
            });
        }
    }

    panel.style.display = 'block';
}

/**
 * Parse a hex color to RGB components
 * @param {string} hex - Hex color string (#RRGGBB or #RGB)
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        };
    }
    // Handle shorthand #RGB
    const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (short) {
        return {
            r: parseInt(short[1] + short[1], 16),
            g: parseInt(short[2] + short[2], 16),
            b: parseInt(short[3] + short[3], 16)
        };
    }
    return { r: 128, g: 128, b: 128 }; // Default gray
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Darken a color by a percentage
 * @param {string} hex - Hex color string
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} Darkened hex color
 */
function darkenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const factor = 1 - (percent / 100);
    return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

/**
 * Brighten a color by a percentage
 * @param {string} hex - Hex color string
 * @param {number} percent - Percentage to brighten (0-100)
 * @returns {string} Brightened hex color
 */
function brightenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const factor = percent / 100;
    return rgbToHex(
        rgb.r + (255 - rgb.r) * factor,
        rgb.g + (255 - rgb.g) * factor,
        rgb.b + (255 - rgb.b) * factor
    );
}

/**
 * Convert hex color to RGBA string with opacity
 * @param {string} hex - Hex color string
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} RGBA color string
 */
function hexToRgba(hex, opacity) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Calculate ring color based on brightness slider value
 * 0 = white, 50 = player color, 100 = black
 * @param {string} playerColor - The player's base color (hex)
 * @param {number} brightness - Brightness value (0-100)
 * @returns {string} Calculated hex color
 */
function getRingColorFromBrightness(playerColor, brightness) {
    const playerRgb = hexToRgb(playerColor);

    if (brightness <= 50) {
        // Interpolate from white (0) to player color (50)
        const factor = brightness / 50; // 0 to 1
        return rgbToHex(
            255 - (255 - playerRgb.r) * factor,
            255 - (255 - playerRgb.g) * factor,
            255 - (255 - playerRgb.b) * factor
        );
    } else {
        // Interpolate from player color (50) to black (100)
        const factor = (brightness - 50) / 50; // 0 to 1
        return rgbToHex(
            playerRgb.r * (1 - factor),
            playerRgb.g * (1 - factor),
            playerRgb.b * (1 - factor)
        );
    }
}

/**
 * Update the canvas container background based on current player
 * @param {string} playerColor - The current player's color
 * @param {number} bankedTurns - Number of banked turns for current player
 * @param {boolean} isLocalPlayer - Whether the current player is the local player
 */
function updateCanvasContainerStyle(playerColor, bankedTurns, isLocalPlayer) {
    const container = document.querySelector('.canvas-container');
    if (!container) return;

    // Base color: 75% darker than player color
    const baseColor = darkenColor(playerColor, 75);

    // Stop any existing animation
    if (pulseAnimationId) {
        cancelAnimationFrame(pulseAnimationId);
        pulseAnimationId = null;
    }

    // Only show breathing effect if it's the local player's turn AND they have banked turns
    if (bankedTurns > 0 && isLocalPlayer) {
        // Hide debug panel (not needed for breathing effect)
        updatePulseDebugPanel(false);

        // Breathing effect - slowly oscillate between darker and lighter
        function animateBreathing() {
            // Slow breathing speed
            containerPulsePhase += 0.015;

            // Oscillate between 0 and 1 using sine wave (smooth breathing)
            const breathAmount = 0.5 + 0.5 * Math.sin(containerPulsePhase);

            // Interpolate between base color (darker) and a slightly brighter version
            // At breathAmount=0: base color (75% darker)
            // At breathAmount=1: slightly brighter (65% darker)
            const darkenPercent = 90 - (breathAmount * 15); // 75% to 60%
            const breathingColor = darkenColor(playerColor, darkenPercent);

            container.style.background = breathingColor;
            container.style.opacity = 1;

            pulseAnimationId = requestAnimationFrame(animateBreathing);
        }
        animateBreathing();
    } else {
        // Hide debug panel when no banked turns
        updatePulseDebugPanel(false);

        // Static color when no banked turns
        container.style.background = baseColor;
        container.style.opacity = 1.0;
    }
}

// Game state (will be synced with backend later)
let lines = []; // Array of line objects: { row, col, direction, ownerId }
let boxes = []; // Array of box objects: { row, col, ownerId }
let currentPlayer = 0; // Current player index (for testing, will come from backend)
let turnCounter = 0; // Track turns for special square movement
let nextMoveTurn = getRandomMoveTurn(); // Next turn to move special squares (3-5 turns)

// Special squares state (local mode only - multiplayer uses GameService)
let localSpecialSquares = {
    golden: [],
    penalty: []
};

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
// Ensure players get unique colors
function getUniquePlayers() {
    const color1 = PLAYER_COLORS[0];
    let color2 = PLAYER_COLORS[1];

    // Ensure second player has different color
    if (color1 === color2) {
        color2 = PLAYER_COLORS[2] || PLAYER_COLORS[1];
    }

    return [
        { id: 0, name: 'Player 1', color: color1, score: 0 },
        { id: 1, name: 'Player 2', color: color2, score: 0 }
    ];
}

let players = getUniquePlayers();

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
    drawSabotageElements(); // Sabotage glowing dots and prohibited symbols

    // Update canvas container color for active player
    updateCanvasContainerColor();
}

/**
 * Darken a hex color by a percentage
 * @param {string} color - Hex color (e.g., '#FF0000')
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} Darkened hex color
 */
function darkenColor(color, percent) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const factor = 1 - (percent / 100);
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Brighten a hex color by a percentage
 * @param {string} color - Hex color (e.g., '#FF0000')
 * @param {number} percent - Percentage to brighten (0-100)
 * @returns {string} Brightened hex color
 */
function brightenColor(color, percent) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const factor = percent / 100;
    const newR = Math.min(255, Math.round(r + (255 - r) * factor));
    const newG = Math.min(255, Math.round(g + (255 - g) * factor));
    const newB = Math.min(255, Math.round(b + (255 - b) * factor));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Update the canvas container background color to match active player (50% darker)
 * Only updates if pulse animation is not running (to avoid interference)
 */
function updateCanvasContainerColor() {
    // Skip if pulse animation is running - it manages its own background
    if (pulseAnimationId) return;

    const canvasContainer = canvas.parentElement;
    if (!canvasContainer) return;

    // Check if we're on the game screen
    const gameScreen = document.getElementById('game-screen');
    const isGameActive = gameScreen && !gameScreen.classList.contains('hidden');

    if (isGameActive && players && players[currentPlayer]) {
        const playerColor = players[currentPlayer].color || '#0F3460';
        const darkenedColor = darkenColor(playerColor, 75); // 75% darker
        canvasContainer.style.backgroundColor = darkenedColor;
    } else {
        // Reset to default color when not in game
        canvasContainer.style.backgroundColor = '';
    }
}

/**
 * Draw special square indicators (golden and penalty)
 * Shows visual markers for uncompleted special squares as solid colored insets
 */
function drawSpecialSquareIndicators() {
    // Get special squares from GameService if in multiplayer, otherwise use local
    let specialSquares = { golden: [], penalty: [] };
    if (typeof GameService !== 'undefined' && GameService.getSpecialSquares) {
        specialSquares = GameService.getSpecialSquares();
    } else {
        // Use local special squares for single-player mode
        validateSpecialSquares(); // Ensure counts are correct before drawing
        specialSquares = localSpecialSquares;
    }

    // Helper to check if box is already completed
    const isCompleted = (key) => {
        return boxes.some(b => `${b.row},${b.col}` === key);
    };

    const INSET_MARGIN = 8; // Pixels to inset from box edges

    // Draw golden square indicators (solid gold inset square + star icon)
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

                // Draw solid gold inset square (smaller than box) with 25% opacity
                ctx.fillStyle = 'rgba(255, 215, 0, 0.25)'; // Gold at 25% opacity
                ctx.fillRect(
                    topLeft.x + INSET_MARGIN,
                    topLeft.y + INSET_MARGIN,
                    width - (INSET_MARGIN * 2),
                    height - (INSET_MARGIN * 2)
                );

                // Draw gold star icon in center (original size, 25% darker)
                const radius = Math.min(width, height) * 0.25; // Original size
                drawStar(centerX, centerY, 5, radius, radius * 0.5, '#BFA100'); // 25% darker gold
            }
        });
        ctx.restore();
    }

    // Draw penalty square indicators (solid red inset square + X icon)
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

                // Draw solid red inset square (smaller than box) with 25% opacity
                ctx.fillStyle = 'rgba(255, 68, 68, 0.25)'; // Red at 25% opacity
                ctx.fillRect(
                    topLeft.x + INSET_MARGIN,
                    topLeft.y + INSET_MARGIN,
                    width - (INSET_MARGIN * 2),
                    height - (INSET_MARGIN * 2)
                );

                // Draw red X icon in center (50% smaller, 200% thicker, 25% darker)
                const size = Math.min(width, height) * 0.125; // Reduced from 0.25 to 0.125 (50% smaller)
                ctx.lineCap = 'round';

                // Draw black stroke outline first (slightly thicker)
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 14; // Slightly thicker for outline effect
                ctx.beginPath();
                ctx.moveTo(centerX - size, centerY - size);
                ctx.lineTo(centerX + size, centerY + size);
                ctx.moveTo(centerX + size, centerY - size);
                ctx.lineTo(centerX - size, centerY + size);
                ctx.stroke();

                // Draw red X on top
                ctx.strokeStyle = '#BF3333'; // 25% darker red
                ctx.lineWidth = 12;
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
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
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
    ctx.stroke(); // Add 1px black stroke
    ctx.restore();
}

/**
 * Draw all dots on the grid
 * Activated dot gets pulsating animation effect
 */
function drawDots() {
    const defaultColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--dot-color').trim() || '#FFFFFF';
    const playerColor = players[currentPlayer] ? players[currentPlayer].color : '#FFFFFF';

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
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke(); // 1px black stroke
                ctx.restore();
            } else if (isSnapTarget) {
                // Highlighted snap target
                ctx.save();
                ctx.shadowColor = playerColor;
                ctx.shadowBlur = 10;
                ctx.fillStyle = playerColor + 'AA'; // Semi-transparent
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, DOT_RADIUS_ACTIVE * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke(); // 1px black stroke
                ctx.restore();
            } else {
                // Normal dot
                ctx.fillStyle = defaultColor;
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, DOT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke(); // 1px black stroke
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
        const centerX = topLeft.x + width / 2;
        const centerY = topLeft.y + height / 2;

        // Use the player's stored color, not the local PLAYER_COLORS array
        const player = players.find(p => p.id === box.ownerId);
        const color = player ? player.color : '#FFFFFF';
        ctx.fillStyle = color + '40'; // Add 40 for ~25% opacity (hex alpha)

        ctx.fillRect(topLeft.x, topLeft.y, width, height);

        // Completed boxes no longer show special square icons
        // Icons only appear on uncompleted special squares
    }
}

/**
 * Draw all lines owned by players
 */
function drawLines() {
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';

    for (const line of lines) {
        // Use the player's stored color, not the local PLAYER_COLORS array
        const player = players.find(p => p.id === line.ownerId);
        const color = player ? player.color : '#FFFFFF';
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
    const playerColor = players[currentPlayer] ? players[currentPlayer].color : '#FFFFFF';

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

// ============================================
// SABOTAGE MECHANIC DRAWING FUNCTIONS
// ============================================

/**
 * Draw prohibited symbol (circle with diagonal line) on a dot
 * Same visual style as penalty X icon
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function drawProhibitedSymbol(x, y) {
    // Same base size as penalty X icon (DOT_RADIUS * 2)
    // Oscillate between 100% and 75% size (25% smaller at minimum)
    const pulseFactor = 1 - 0.25 * (0.5 + 0.5 * Math.sin(prohibitPulsePhase));
    const radius = DOT_RADIUS * 2 * pulseFactor;

    ctx.save();
    ctx.lineCap = 'round';

    // Black outline circle (doubled thickness: was 4, now 8)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Black outline diagonal line
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.7, y - radius * 0.7);
    ctx.lineTo(x + radius * 0.7, y + radius * 0.7);
    ctx.stroke();

    // Red circle on top (doubled thickness: was 3, now 6)
    ctx.strokeStyle = '#BF3333';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Red diagonal line
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.7, y - radius * 0.7);
    ctx.lineTo(x + radius * 0.7, y + radius * 0.7);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw anchor symbol on a dot (visible to active player who must use it)
 * Pulsates to draw attention
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function drawAnchoredSymbol(x, y) {
    // Oscillate between 100% and 75% size
    const pulseFactor = 1 - 0.25 * (0.5 + 0.5 * Math.sin(prohibitPulsePhase));
    const s = pulseFactor * 0.9;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Black outline first
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;

    // Ring at top
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 4 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical shaft
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * s);
    ctx.lineTo(x, y + 10 * s);
    ctx.stroke();

    // Horizontal bar (cross piece)
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 2 * s);
    ctx.lineTo(x + 8 * s, y - 2 * s);
    ctx.stroke();

    // Curved bottom flukes
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, y + 4 * s);
    ctx.quadraticCurveTo(x - 10 * s, y + 12 * s, x, y + 10 * s);
    ctx.quadraticCurveTo(x + 10 * s, y + 12 * s, x + 10 * s, y + 4 * s);
    ctx.stroke();

    // Teal fill on top
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 5;

    // Ring at top
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 4 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical shaft
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * s);
    ctx.lineTo(x, y + 10 * s);
    ctx.stroke();

    // Horizontal bar
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 2 * s);
    ctx.lineTo(x + 8 * s, y - 2 * s);
    ctx.stroke();

    // Curved bottom flukes
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, y + 4 * s);
    ctx.quadraticCurveTo(x - 10 * s, y + 12 * s, x, y + 10 * s);
    ctx.quadraticCurveTo(x + 10 * s, y + 12 * s, x + 10 * s, y + 4 * s);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw sabotage (bomb) symbol on a dot (visible to ALL players during effect)
 * Pulsates to draw attention, rotated 45 degrees like the roulette version
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function drawSabotagedSymbol(x, y) {
    // Oscillate between 100% and 75% size
    const pulseFactor = 1 - 0.25 * (0.5 + 0.5 * Math.sin(prohibitPulsePhase));
    const radius = DOT_RADIUS * 1.8 * pulseFactor;

    ctx.save();

    // Rotate 45 degrees clockwise around icon center
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-x, -y);

    // Bomb body (black circle)
    ctx.fillStyle = '#222222';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Highlight reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Fuse stem
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x, y - radius - 5);
    ctx.stroke();

    // Fuse spark/flame
    ctx.fillStyle = '#FF6600';
    ctx.beginPath();
    ctx.arc(x, y - radius - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFCC00';
    ctx.beginPath();
    ctx.arc(x, y - radius - 7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Draw roulette icon at dot position (opponents only)
 * Cycles through: prohibit, sabotage, anchor
 * @param {number} row - Dot row
 * @param {number} col - Dot column
 */
function drawGlowingDot(row, col) {
    const pos = getDotPosition(row, col);
    const currentIcon = ROULETTE_ICONS[rouletteIconIndex];

    // Pulsation: 25% size oscillation (1.0 to 0.75)
    const pulseFactor = 1 - 0.25 * (0.5 + 0.5 * Math.sin(glowPulsePhase));

    ctx.save();

    // Draw the current roulette icon
    switch (currentIcon) {
        case 'prohibit':
            drawRouletteProhibit(pos.x, pos.y, pulseFactor);
            break;
        case 'sabotage':
            drawRouletteSabotage(pos.x, pos.y, pulseFactor);
            break;
        case 'anchor':
            drawRouletteAnchor(pos.x, pos.y, pulseFactor);
            break;
    }

    ctx.restore();
}

/**
 * Draw prohibit icon for roulette (at any position)
 */
function drawRouletteProhibit(x, y, scale) {
    const radius = DOT_RADIUS * 2 * scale;

    ctx.save();
    ctx.lineCap = 'round';

    // Black outline circle
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Black outline diagonal line
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.7, y - radius * 0.7);
    ctx.lineTo(x + radius * 0.7, y + radius * 0.7);
    ctx.stroke();

    // Red circle on top
    ctx.strokeStyle = '#BF3333';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Red diagonal line
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.7, y - radius * 0.7);
    ctx.lineTo(x + radius * 0.7, y + radius * 0.7);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw sabotage (bomb) icon for roulette - rotated 45 degrees
 */
function drawRouletteSabotage(x, y, scale) {
    const radius = DOT_RADIUS * 1.8 * scale;

    ctx.save();

    // Rotate 45 degrees clockwise around icon center
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-x, -y);

    // Bomb body (black circle)
    ctx.fillStyle = '#222222';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Highlight reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Fuse stem
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x, y - radius - 5);
    ctx.stroke();

    // Fuse spark/flame
    ctx.fillStyle = '#FF6600';
    ctx.beginPath();
    ctx.arc(x, y - radius - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFCC00';
    ctx.beginPath();
    ctx.arc(x, y - radius - 7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Draw anchor icon for roulette
 */
function drawRouletteAnchor(x, y, scale) {
    const s = scale * 0.9; // Base scale

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Black outline first
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;

    // Ring at top
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 4 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical shaft
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * s);
    ctx.lineTo(x, y + 10 * s);
    ctx.stroke();

    // Horizontal bar (cross piece)
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 2 * s);
    ctx.lineTo(x + 8 * s, y - 2 * s);
    ctx.stroke();

    // Curved bottom flukes
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, y + 4 * s);
    ctx.quadraticCurveTo(x - 10 * s, y + 12 * s, x, y + 10 * s);
    ctx.quadraticCurveTo(x + 10 * s, y + 12 * s, x + 10 * s, y + 4 * s);
    ctx.stroke();

    // Teal fill on top
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 5;

    // Ring at top
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 4 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical shaft
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * s);
    ctx.lineTo(x, y + 10 * s);
    ctx.stroke();

    // Horizontal bar
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 2 * s);
    ctx.lineTo(x + 8 * s, y - 2 * s);
    ctx.stroke();

    // Curved bottom flukes
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, y + 4 * s);
    ctx.quadraticCurveTo(x - 10 * s, y + 12 * s, x, y + 10 * s);
    ctx.quadraticCurveTo(x + 10 * s, y + 12 * s, x + 10 * s, y + 4 * s);
    ctx.stroke();

    ctx.restore();
}

/**
 * Get the current roulette icon name
 * @returns {string} Current icon: 'prohibit', 'sabotage', or 'anchor'
 */
function getCurrentRouletteIcon() {
    return ROULETTE_ICONS[rouletteIconIndex];
}

/**
 * Animate roulette icon cycling and pulsation
 */
function animateGlowingDot() {
    // Check if we should still be animating
    if (!isGlowAnimating) {
        glowAnimationId = null;
        return;
    }

    // Get slowdown factor from miss penalty (1.0 = normal, 0.1 = 90% slower)
    const slowdown = (typeof GameService !== 'undefined' && GameService.getMissPenaltySlowdown)
        ? GameService.getMissPenaltySlowdown()
        : 1.0;

    // Glow pulse: ~2 cycles per second at 60fps, affected by miss penalty
    glowPulsePhase += 0.15 * slowdown;

    // Roulette cycling: increment phase and switch icon when threshold reached
    roulettePhase += ROULETTE_CYCLE_SPEED * slowdown;
    if (roulettePhase >= 1) {
        roulettePhase = 0;
        rouletteIconIndex = (rouletteIconIndex + 1) % ROULETTE_ICONS.length;
    }

    // Prohibit icon pulse: slower oscillation (~0.5 cycles per second)
    prohibitPulsePhase += 0.05;

    // Miss penalty flash: fast pulsing red vignette
    missPenaltyFlashPhase += 0.2;

    redraw();

    // Only schedule next frame if still animating
    if (isGlowAnimating) {
        glowAnimationId = requestAnimationFrame(animateGlowingDot);
    }
}

/**
 * Start the glowing dot animation
 */
function startGlowAnimation() {
    if (!isGlowAnimating) {
        isGlowAnimating = true;
        glowPulsePhase = 0;
        animateGlowingDot();
    }
}

/**
 * Stop the glowing dot animation
 */
function stopGlowAnimation() {
    isGlowAnimating = false;
    if (glowAnimationId) {
        cancelAnimationFrame(glowAnimationId);
        glowAnimationId = null;
    }
}

/**
 * Draw miss penalty overlay (red pulsing border for opponents in penalty)
 */
function drawMissPenaltyOverlay() {
    if (typeof GameService === 'undefined') return;
    if (GameService.isMyTurn()) return; // Only show for opponents
    if (!GameService.isMissPenaltyActive || !GameService.isMissPenaltyActive()) return;

    // Pulsing red border/vignette effect
    const pulseIntensity = 0.3 + 0.2 * Math.sin(missPenaltyFlashPhase);

    ctx.save();

    // Draw red vignette around edges
    const gradient = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.3,
        canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * 0.7
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(255, 0, 0, ${pulseIntensity})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.restore();
}

/**
 * Draw sabotage elements (glowing dot and prohibited symbol)
 */
function drawSabotageElements() {
    try {
        if (typeof GameService === 'undefined') {
            // Not in multiplayer mode
            return;
        }

        const sabotage = GameService.getSabotageState();
        const isMyTurn = GameService.isMyTurn();
        const isMissPenalty = GameService.isMissPenaltyActive && GameService.isMissPenaltyActive();

        // Draw miss penalty overlay first (behind other elements)
        if (isMissPenalty) {
            drawMissPenaltyOverlay();
        }

        if (!sabotage) {
            // Still need animation for miss penalty overlay
            if (isMissPenalty) {
                startGlowAnimation();
            } else {
                stopGlowAnimation();
            }
            return;
        }

        // Draw prohibited symbol (visible to ALL players)
        if (sabotage.prohibitedDot) {
            const parts = sabotage.prohibitedDot.split(',');
            if (parts.length === 2) {
                const row = parseInt(parts[0], 10);
                const col = parseInt(parts[1], 10);
                if (!isNaN(row) && !isNaN(col)) {
                    const pos = getDotPosition(row, col);
                    drawProhibitedSymbol(pos.x, pos.y);
                }
            }
        }

        // Draw anchor symbol (visible to ALL players)
        if (sabotage.anchoredDot) {
            const parts = sabotage.anchoredDot.split(',');
            if (parts.length === 2) {
                const row = parseInt(parts[0], 10);
                const col = parseInt(parts[1], 10);
                if (!isNaN(row) && !isNaN(col)) {
                    const pos = getDotPosition(row, col);
                    drawAnchoredSymbol(pos.x, pos.y);
                }
            }
        }

        // Draw sabotage symbol (bomb icon visible to ALL players during sabotage effect)
        if (sabotage.sabotagedDot) {
            const parts = sabotage.sabotagedDot.split(',');
            if (parts.length === 2) {
                const row = parseInt(parts[0], 10);
                const col = parseInt(parts[1], 10);
                if (!isNaN(row) && !isNaN(col)) {
                    const pos = getDotPosition(row, col);
                    drawSabotagedSymbol(pos.x, pos.y);
                }
            }
        }

        // Draw glowing dot (only for opponents, not active player)
        let needsAnimation = false;

        if (sabotage.glowingDot && !isMyTurn) {
            const parts = sabotage.glowingDot.split(',');
            if (parts.length === 2) {
                const row = parseInt(parts[0], 10);
                const col = parseInt(parts[1], 10);
                if (!isNaN(row) && !isNaN(col)) {
                    drawGlowingDot(row, col);
                    needsAnimation = true;
                }
            }
        }

        // Also animate if there's a prohibited dot (for the prohibit icon oscillation)
        if (sabotage.prohibitedDot) {
            needsAnimation = true;
        }

        // Also animate if there's an anchored dot (for the anchor icon pulsation)
        if (sabotage.anchoredDot) {
            needsAnimation = true;
        }

        // Also animate if there's a sabotaged dot (for the bomb icon pulsation)
        if (sabotage.sabotagedDot) {
            needsAnimation = true;
        }

        // Also animate during miss penalty (for the red overlay pulsing)
        if (isMissPenalty) {
            needsAnimation = true;
        }

        // Start or stop animation based on whether we need it
        if (needsAnimation && GameService.isSabotageAnimationEnabled && GameService.isSabotageAnimationEnabled()) {
            startGlowAnimation();
        } else {
            stopGlowAnimation();
        }
    } catch (error) {
        console.error('[SABOTAGE-DRAW] Error:', error);
        stopGlowAnimation();
    }
}

/**
 * Check if a point is near a glowing dot and handle the tap
 * Returns true if the tap was handled (glowing dot was tapped)
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 * @returns {boolean} True if glowing dot was tapped
 */
function checkGlowingDotTap(x, y) {
    if (typeof GameService === 'undefined') return false;

    const sabotage = GameService.getSabotageState();

    // Only opponents can tap for sabotage
    if (GameService.isMyTurn()) return false;

    // If no glowing dot, no sabotage interaction possible
    if (!sabotage || !sabotage.glowingDot) return false;

    // Check if miss penalty is active - can't tap during penalty
    if (GameService.isMissPenaltyActive && GameService.isMissPenaltyActive()) {
        console.log('[SABOTAGE] Miss penalty active, tap ignored');
        return true; // Consume the tap but don't process it
    }

    const [glowRow, glowCol] = sabotage.glowingDot.split(',').map(Number);
    const glowDotPos = getDotPosition(glowRow, glowCol);

    // Check distance from tap to glowing dot
    const TAP_TOLERANCE = DOT_RADIUS * 4; // Generous tap area for the glowing dot
    const distanceToGlow = Math.sqrt(Math.pow(x - glowDotPos.x, 2) + Math.pow(y - glowDotPos.y, 2));

    if (distanceToGlow <= TAP_TOLERANCE) {
        // Correct tap on glowing dot!
        console.log('[SABOTAGE] Glowing dot tapped! Sabotaging dot:', sabotage.glowingDot);
        GameService.handleGlowingDotTap(sabotage.glowingDot);
        return true;
    }

    // Check if they tapped any other dot (miss) - use larger tolerance for sabotage
    const MISS_TAP_TOLERANCE = DOT_RADIUS * 4;
    const nearestDot = getNearestDot(x, y, MISS_TAP_TOLERANCE);
    if (nearestDot) {
        // They tapped a dot, but not the glowing one - MISS!
        console.log('[SABOTAGE] Miss! Tapped wrong dot:', nearestDot.row, nearestDot.col);
        if (GameService.triggerMissPenalty) {
            GameService.triggerMissPenalty();
        }
        return true; // Consume the tap
    }

    // Tapped empty space - no penalty, just ignore
    return false;
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
    const result = checkAndCompleteBoxes(line, currentPlayer);

    // Update scores if boxes were completed
    if (result.count > 0) {
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

    // Turn logic:
    // - No boxes completed: check for banked turn, otherwise switch to next player
    // - Boxes completed: player gets another turn (stays as current player)
    // - Golden box completed: player gets TWO more turns (banked turn system)
    let turnEnded = false; // Track if turn actually changed hands
    if (result.count === 0) {
        // No boxes completed - check if player has banked turns
        if (players[currentPlayer] && players[currentPlayer].bankedTurns > 0) {
            // Use a banked turn to stay as current player
            players[currentPlayer].bankedTurns--;
            console.log('Used banked turn! Player', currentPlayer, 'keeps turn. Remaining banked:', players[currentPlayer].bankedTurns);
            updateScoreboard();
        } else {
            // No banked turns - switch to next player
            currentPlayer = (currentPlayer + 1) % players.length;
            turnEnded = true; // Turn changed hands
            updateScoreboard();
        }
    } else {
        // Boxes completed - player naturally gets another turn
        if (result.hasGolden) {
            // Golden box gives ADDITIONAL banked turn for use later
            if (players[currentPlayer]) {
                players[currentPlayer].bankedTurns = (players[currentPlayer].bankedTurns || 0) + 1;
                console.log('Golden box! Player', currentPlayer, 'banked an extra turn. Total banked:', players[currentPlayer].bankedTurns);
            }
        }
        // Player stays as current player (normal box completion behavior)
    }

    // Immediately replace completed special squares with the same type
    if (result.hasGolden) {
        replenishSpecialSquare('golden');
    }
    if (result.hasPenalty) {
        replenishSpecialSquare('penalty');
    }

    // Increment turn counter and check for special square movement
    if (turnEnded) {
        turnCounter++;
        checkAndMoveSpecialSquares();
    }

    console.log('Line placed:', line, 'Boxes:', result.count, 'Golden:', result.hasGolden, 'Player:', currentPlayer);
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

    // Opponents can't initiate drags - only tap for sabotage
    const isOpponent = typeof GameService !== 'undefined' && !GameService.isMyTurn();
    if (isOpponent) return;

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

    // Check if it's NOT our turn - opponents can only tap for sabotage
    const isOpponent = typeof GameService !== 'undefined' && !GameService.isMyTurn();

    if (isOpponent) {
        // Opponents can only interact via sabotage taps
        if (wasQuickTap && movedDistance < DRAG_THRESHOLD) {
            checkGlowingDotTap(x, y); // This handles hits, misses, and penalties
        }
        // Reset all state and return - no normal gameplay for opponents
        clearInputState();
        dragStartDot = null;
        isDragging = false;
        dragCurrentPos = null;
        dragSnapDot = null;
        pointerDownPos = null;
        canvas.classList.remove('dragging');
        return;
    }

    // Active player - normal gameplay
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
 * @returns {{count: number, hasGolden: boolean, hasPenalty: boolean}} Completion results
 */
function checkAndCompleteBoxes(line, ownerId) {
    let completedCount = 0;
    let hasGolden = false;
    let hasPenalty = false;
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

    // Get special squares to check if completed boxes are special
    let specialSquares = { golden: [], penalty: [] };
    if (typeof GameService !== 'undefined' && GameService.getSpecialSquares) {
        specialSquares = GameService.getSpecialSquares();
    } else {
        // Use local special squares for single-player mode
        specialSquares = localSpecialSquares;
    }

    // Check each affected box
    for (const box of boxesToCheck) {
        if (!isBoxOwned(box.row, box.col) && isBoxCompleted(box.row, box.col)) {
            // Check if this box is a special square
            const boxKey = `${box.row},${box.col}`;
            let boxType = null;
            if (specialSquares.golden && specialSquares.golden.includes(boxKey)) {
                boxType = 'golden';
                hasGolden = true;
            } else if (specialSquares.penalty && specialSquares.penalty.includes(boxKey)) {
                boxType = 'penalty';
                hasPenalty = true;
            }

            boxes.push({ row: box.row, col: box.col, ownerId, type: boxType });
            completedCount++;
            console.log('Box completed:', box, 'by player', ownerId, boxType ? `(${boxType})` : '');
        }
    }

    return { count: completedCount, hasGolden, hasPenalty };
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

    // Set CSS variables for active player color (50% brighter)
    if (players[currentPlayer]) {
        const activeColor = players[currentPlayer].color;
        const brighterColor = brightenColor(activeColor, 50); // 50% brighter
        const r = parseInt(brighterColor.slice(1, 3), 16);
        const g = parseInt(brighterColor.slice(3, 5), 16);
        const b = parseInt(brighterColor.slice(5, 7), 16);

        document.documentElement.style.setProperty('--active-player-color', brighterColor);
        document.documentElement.style.setProperty('--active-player-glow-start', `rgba(${r}, ${g}, ${b}, 0.5)`);
        document.documentElement.style.setProperty('--active-player-glow-end', `rgba(${r}, ${g}, ${b}, 0.8)`);
    }

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
        nameEl.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${player.color};margin-right:6px;border:1px solid #FFFFFF;box-sizing:border-box;"></span>${player.name}`;

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
                    <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${player.color};border:1px solid #FFFFFF;box-sizing:border-box;"></span>
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

    // Update canvas container styling based on current player
    if (players[currentPlayer]) {
        const currentPlayerData = players[currentPlayer];
        // Check if it's the local player's turn (pulse only shows for local player)
        const isLocalPlayer = typeof GameService !== 'undefined' && GameService.isMyTurn && GameService.isMyTurn();
        updateCanvasContainerStyle(currentPlayerData.color, currentPlayerData.bankedTurns || 0, isLocalPlayer);
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

    // Reset players to default 2-player setup with unique colors
    players.length = 0;
    const newPlayers = getUniquePlayers();
    players.push(...newPlayers);

    // Redraw empty board
    redraw();

    // Update UI
    updateScoreboard();

    // Reset turn counter and special squares
    turnCounter = 0;
    nextMoveTurn = getRandomMoveTurn();
    initializeSpecialSquares();

    console.log('Board state reset');
}

// ============================================================================
// SPECIAL SQUARE DYNAMIC MOVEMENT (Local Mode)
// ============================================================================

/**
 * Get random turn count for next movement (3-5 turns)
 * @returns {number} Random number between 3 and 5
 */
function getRandomMoveTurn() {
    return Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
}

/**
 * Validate and fix special square counts
 * Ensures exactly 1 golden and 2 penalties
 */
function validateSpecialSquares() {
    // Remove completed squares
    localSpecialSquares.golden = localSpecialSquares.golden.filter(key =>
        !boxes.some(b => `${b.row},${b.col}` === key)
    );
    localSpecialSquares.penalty = localSpecialSquares.penalty.filter(key =>
        !boxes.some(b => `${b.row},${b.col}` === key)
    );

    const uncompletedPositions = getUncompletedBoxPositions();
    const currentSpecial = [...localSpecialSquares.golden, ...localSpecialSquares.penalty];
    const availablePositions = uncompletedPositions.filter(pos => !currentSpecial.includes(pos));

    if (availablePositions.length === 0) return;

    const shuffled = [...availablePositions].sort(() => Math.random() - 0.5);
    let nextIndex = 0;

    // Ensure exactly 1 golden
    while (localSpecialSquares.golden.length < 1 && nextIndex < shuffled.length) {
        localSpecialSquares.golden.push(shuffled[nextIndex++]);
    }
    while (localSpecialSquares.golden.length > 1) {
        localSpecialSquares.golden.pop();
    }

    // Ensure exactly 2 penalties
    while (localSpecialSquares.penalty.length < 2 && nextIndex < shuffled.length) {
        localSpecialSquares.penalty.push(shuffled[nextIndex++]);
    }
    while (localSpecialSquares.penalty.length > 2) {
        localSpecialSquares.penalty.pop();
    }

    console.log('Special squares validated:', localSpecialSquares);
}

/**
 * Initialize special squares at random positions
 * Places 1 golden and 2 penalty squares
 */
function initializeSpecialSquares() {
    // Skip if in multiplayer mode (GameService handles it)
    if (typeof GameService !== 'undefined' && GameService.getState && GameService.getState()) {
        return;
    }

    localSpecialSquares.golden = [];
    localSpecialSquares.penalty = [];

    const uncompletedPositions = getUncompletedBoxPositions();
    if (uncompletedPositions.length < 3) {
        console.log('Not enough positions for special squares');
        return;
    }

    // Shuffle positions
    const shuffled = [...uncompletedPositions].sort(() => Math.random() - 0.5);

    // Place EXACTLY 1 golden and 2 penalty squares
    localSpecialSquares.golden = [shuffled[0]];
    localSpecialSquares.penalty = [shuffled[1], shuffled[2]];

    console.log('Special squares initialized:', localSpecialSquares);
    validateSpecialSquares(); // Validate immediately
}

/**
 * Get all uncompleted box positions
 * @returns {string[]} Array of "row,col" keys for uncompleted boxes
 */
function getUncompletedBoxPositions() {
    const positions = [];
    for (let row = 0; row < GRID_SIZE - 1; row++) {
        for (let col = 0; col < GRID_SIZE - 1; col++) {
            const key = `${row},${col}`;
            if (!boxes.some(b => `${b.row},${b.col}` === key)) {
                positions.push(key);
            }
        }
    }
    return positions;
}

/**
 * Replenish a specific type of special square immediately when completed
 * @param {string} type - 'golden' or 'penalty'
 */
function replenishSpecialSquare(type) {
    // Skip if in multiplayer mode (GameService handles it)
    if (typeof GameService !== 'undefined' && GameService.getState && GameService.getState()) {
        return;
    }

    // Remove completed special squares of this type
    localSpecialSquares[type] = localSpecialSquares[type].filter(key =>
        !boxes.some(b => `${b.row},${b.col}` === key)
    );

    const uncompletedPositions = getUncompletedBoxPositions();
    const currentSpecial = [...localSpecialSquares.golden, ...localSpecialSquares.penalty];
    const availablePositions = uncompletedPositions.filter(pos => !currentSpecial.includes(pos));

    if (availablePositions.length === 0) {
        console.log(`No available positions to place new ${type} square`);
        return;
    }

    // Pick a random available position
    const shuffled = [...availablePositions].sort(() => Math.random() - 0.5);
    const newPosition = shuffled[0];

    // Add the new special square of the same type
    localSpecialSquares[type].push(newPosition);

    console.log(`${type} square completed! New ${type} square placed at ${newPosition}`);
    console.log('Current special squares:', localSpecialSquares);
    redraw();
}

/**
 * Move special squares to new random positions
 * Called every 3-5 turns
 */
function moveSpecialSquares() {
    // Skip if in multiplayer mode (GameService handles it)
    if (typeof GameService !== 'undefined' && GameService.getState && GameService.getState()) {
        return;
    }

    const uncompletedPositions = getUncompletedBoxPositions();

    // Remove current special square positions that are already completed
    localSpecialSquares.golden = localSpecialSquares.golden.filter(key =>
        !boxes.some(b => `${b.row},${b.col}` === key)
    );
    localSpecialSquares.penalty = localSpecialSquares.penalty.filter(key =>
        !boxes.some(b => `${b.row},${b.col}` === key)
    );

    // Get positions available for new squares (excluding current special squares)
    const currentSpecial = [...localSpecialSquares.golden, ...localSpecialSquares.penalty];
    const availablePositions = uncompletedPositions.filter(pos => !currentSpecial.includes(pos));

    if (availablePositions.length === 0) {
        console.log('No available positions to move special squares');
        return;
    }

    // Shuffle available positions
    const shuffled = [...availablePositions].sort(() => Math.random() - 0.5);

    // Maintain 2 penalty + 1 golden
    localSpecialSquares.golden = [shuffled[0] || localSpecialSquares.golden[0]];
    localSpecialSquares.penalty = [
        shuffled[1] || localSpecialSquares.penalty[0],
        shuffled[2] || localSpecialSquares.penalty[1]
    ].filter(Boolean);

    console.log('Special squares moved to new positions:', localSpecialSquares);

    // Redraw to show new positions
    redraw();
}

/**
 * Check if it's time to move special squares and do so
 * Called after each turn
 */
function checkAndMoveSpecialSquares() {
    // Skip if in multiplayer mode
    if (typeof GameService !== 'undefined' && GameService.getState && GameService.getState()) {
        return;
    }

    if (turnCounter >= nextMoveTurn) {
        moveSpecialSquares();
        turnCounter = 0;
        nextMoveTurn = getRandomMoveTurn();
        console.log(`Special squares moved! Next movement in ${nextMoveTurn} turns`);
    }
}

// ============================================
// ICON PREVIEW FUNCTIONS (Design Workspace)
// ============================================

/**
 * Draw all game icons on the preview canvases
 * Called on page load for the landing page design workspace
 */
function drawIconPreviews() {
    drawIconStar();
    drawIconPenalty();
    drawIconProhibit();
    drawIconSabotage();
    drawIconAnchor();
}

/**
 * Draw star icon - MATCHES in-game drawStar() exactly
 */
function drawIconStar() {
    const canvas = document.getElementById('icon-star');
    if (!canvas) return;
    const pctx = canvas.getContext('2d');
    const cx = 30, cy = 30;
    // In-game uses Math.min(width, height) * 0.25, scaled for 60px canvas
    const outerRadius = 15;
    const innerRadius = outerRadius * 0.5;

    pctx.clearRect(0, 0, 60, 60);

    // Exact copy of drawStar() function
    pctx.save();
    pctx.fillStyle = '#BFA100'; // 25% darker gold (same as in-game)
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 1;
    pctx.beginPath();

    const spikes = 5;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    pctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        pctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        pctx.lineTo(x, y);
        rot += step;
    }
    pctx.lineTo(cx, cy - outerRadius);
    pctx.closePath();
    pctx.fill();
    pctx.stroke();
    pctx.restore();
}

/**
 * Draw penalty icon - MATCHES in-game penalty X exactly
 */
function drawIconPenalty() {
    const canvas = document.getElementById('icon-penalty');
    if (!canvas) return;
    const pctx = canvas.getContext('2d');
    const cx = 30, cy = 30;
    // In-game uses Math.min(width, height) * 0.125, scaled for 60px canvas
    const size = 7.5;

    pctx.clearRect(0, 0, 60, 60);
    pctx.lineCap = 'round';

    // Black stroke outline first (slightly thicker) - exact in-game values
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 14;
    pctx.beginPath();
    pctx.moveTo(cx - size, cy - size);
    pctx.lineTo(cx + size, cy + size);
    pctx.moveTo(cx + size, cy - size);
    pctx.lineTo(cx - size, cy + size);
    pctx.stroke();

    // Red X on top - exact in-game values
    pctx.strokeStyle = '#BF3333'; // 25% darker red
    pctx.lineWidth = 12;
    pctx.beginPath();
    pctx.moveTo(cx - size, cy - size);
    pctx.lineTo(cx + size, cy + size);
    pctx.moveTo(cx + size, cy - size);
    pctx.lineTo(cx - size, cy + size);
    pctx.stroke();
}

/**
 * Draw prohibit icon - MATCHES in-game drawProhibitedSymbol() exactly
 */
function drawIconProhibit() {
    const canvas = document.getElementById('icon-prohibit');
    if (!canvas) return;
    const pctx = canvas.getContext('2d');
    const cx = 30, cy = 30;
    // In-game uses DOT_RADIUS * 2 = 12, scaled up for visibility
    const radius = 12;

    pctx.clearRect(0, 0, 60, 60);
    pctx.save();
    pctx.lineCap = 'round';

    // Black outline circle (doubled thickness: was 4, now 8) - exact in-game
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 8;
    pctx.beginPath();
    pctx.arc(cx, cy, radius, 0, Math.PI * 2);
    pctx.stroke();

    // Black outline diagonal line
    pctx.beginPath();
    pctx.moveTo(cx - radius * 0.7, cy - radius * 0.7);
    pctx.lineTo(cx + radius * 0.7, cy + radius * 0.7);
    pctx.stroke();

    // Red circle on top (doubled thickness: was 3, now 6) - exact in-game
    pctx.strokeStyle = '#BF3333';
    pctx.lineWidth = 6;
    pctx.beginPath();
    pctx.arc(cx, cy, radius, 0, Math.PI * 2);
    pctx.stroke();

    // Red diagonal line
    pctx.beginPath();
    pctx.moveTo(cx - radius * 0.7, cy - radius * 0.7);
    pctx.lineTo(cx + radius * 0.7, cy + radius * 0.7);
    pctx.stroke();

    pctx.restore();
}

/**
 * Draw sabotage icon (bomb) - rotated 45 degrees clockwise
 */
function drawIconSabotage() {
    const canvas = document.getElementById('icon-sabotage');
    if (!canvas) return;
    const pctx = canvas.getContext('2d');
    const cx = 30, cy = 30;
    const radius = 12;

    pctx.clearRect(0, 0, 60, 60);
    pctx.save();

    // Rotate 45 degrees clockwise around center
    pctx.translate(cx, cy);
    pctx.rotate(Math.PI / 4); // 45 degrees
    pctx.translate(-cx, -cy);

    // Bomb body (black circle)
    pctx.fillStyle = '#222222';
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.arc(cx, cy, radius, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    // Highlight reflection
    pctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    pctx.beginPath();
    pctx.arc(cx - 4, cy - 4, 3, 0, Math.PI * 2);
    pctx.fill();

    // Fuse stem
    pctx.strokeStyle = '#666666';
    pctx.lineWidth = 3;
    pctx.beginPath();
    pctx.moveTo(cx, cy - radius);
    pctx.lineTo(cx, cy - radius - 5);
    pctx.stroke();

    // Fuse spark/flame
    pctx.fillStyle = '#FF6600';
    pctx.beginPath();
    pctx.arc(cx, cy - radius - 7, 4, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = '#FFCC00';
    pctx.beginPath();
    pctx.arc(cx, cy - radius - 7, 2, 0, Math.PI * 2);
    pctx.fill();

    pctx.restore();
}

/**
 * Draw anchor icon - 100% thicker lines, 25% smaller
 */
function drawIconAnchor() {
    const canvas = document.getElementById('icon-anchor');
    if (!canvas) return;
    const pctx = canvas.getContext('2d');
    const cx = 30, cy = 30;
    const s = 0.75; // Scale factor (25% smaller)

    pctx.clearRect(0, 0, 60, 60);
    pctx.lineCap = 'round';
    pctx.lineJoin = 'round';

    // Black outline first (doubled: 5 -> 10)
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 10;

    // Ring at top
    pctx.beginPath();
    pctx.arc(cx, cy - 14 * s, 5 * s, 0, Math.PI * 2);
    pctx.stroke();

    // Vertical shaft
    pctx.beginPath();
    pctx.moveTo(cx, cy - 9 * s);
    pctx.lineTo(cx, cy + 14 * s);
    pctx.stroke();

    // Horizontal bar (cross piece)
    pctx.beginPath();
    pctx.moveTo(cx - 10 * s, cy - 4 * s);
    pctx.lineTo(cx + 10 * s, cy - 4 * s);
    pctx.stroke();

    // Curved bottom flukes
    pctx.beginPath();
    pctx.moveTo(cx - 14 * s, cy + 6 * s);
    pctx.quadraticCurveTo(cx - 14 * s, cy + 16 * s, cx, cy + 14 * s);
    pctx.quadraticCurveTo(cx + 14 * s, cy + 16 * s, cx + 14 * s, cy + 6 * s);
    pctx.stroke();

    // Blue/teal fill on top (doubled: 3 -> 6)
    pctx.strokeStyle = '#4ECDC4';
    pctx.lineWidth = 6;

    // Ring at top
    pctx.beginPath();
    pctx.arc(cx, cy - 14 * s, 5 * s, 0, Math.PI * 2);
    pctx.stroke();

    // Vertical shaft
    pctx.beginPath();
    pctx.moveTo(cx, cy - 9 * s);
    pctx.lineTo(cx, cy + 14 * s);
    pctx.stroke();

    // Horizontal bar
    pctx.beginPath();
    pctx.moveTo(cx - 10 * s, cy - 4 * s);
    pctx.lineTo(cx + 10 * s, cy - 4 * s);
    pctx.stroke();

    // Curved bottom flukes
    pctx.beginPath();
    pctx.moveTo(cx - 14 * s, cy + 6 * s);
    pctx.quadraticCurveTo(cx - 14 * s, cy + 16 * s, cx, cy + 14 * s);
    pctx.quadraticCurveTo(cx + 14 * s, cy + 16 * s, cx + 14 * s, cy + 6 * s);
    pctx.stroke();
}

// Roulette preview animation state
let roulettePreviewIndex = 0;
let roulettePreviewPhase = 0;
let roulettePreviewPulsePhase = 0;
let roulettePreviewAnimationId = null;

/**
 * Draw roulette preview with animation
 */
function drawIconRoulette() {
    const canvas = document.getElementById('icon-roulette');
    if (!canvas) return;
    const pctx = canvas.getContext('2d');
    const cx = 30, cy = 30;

    // 25% size oscillation (1.0 to 0.75)
    const pulseFactor = 1 - 0.25 * (0.5 + 0.5 * Math.sin(roulettePreviewPulsePhase));
    const currentIcon = ROULETTE_ICONS[roulettePreviewIndex];

    pctx.clearRect(0, 0, 60, 60);

    switch (currentIcon) {
        case 'prohibit':
            drawRouletteProhibitPreview(pctx, cx, cy, pulseFactor);
            break;
        case 'sabotage':
            drawRouletteSabotagePreview(pctx, cx, cy, pulseFactor);
            break;
        case 'anchor':
            drawRouletteAnchorPreview(pctx, cx, cy, pulseFactor);
            break;
    }
}

function drawRouletteProhibitPreview(pctx, x, y, scale) {
    const radius = 12 * scale;

    pctx.save();
    pctx.lineCap = 'round';

    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 8;
    pctx.beginPath();
    pctx.arc(x, y, radius, 0, Math.PI * 2);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x - radius * 0.7, y - radius * 0.7);
    pctx.lineTo(x + radius * 0.7, y + radius * 0.7);
    pctx.stroke();

    pctx.strokeStyle = '#BF3333';
    pctx.lineWidth = 6;
    pctx.beginPath();
    pctx.arc(x, y, radius, 0, Math.PI * 2);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x - radius * 0.7, y - radius * 0.7);
    pctx.lineTo(x + radius * 0.7, y + radius * 0.7);
    pctx.stroke();

    pctx.restore();
}

function drawRouletteSabotagePreview(pctx, x, y, scale) {
    const radius = 11 * scale;

    pctx.save();
    pctx.translate(x, y);
    pctx.rotate(Math.PI / 4);
    pctx.translate(-x, -y);

    pctx.fillStyle = '#222222';
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.arc(x, y, radius, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    pctx.beginPath();
    pctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    pctx.fill();

    pctx.strokeStyle = '#666666';
    pctx.lineWidth = 3;
    pctx.beginPath();
    pctx.moveTo(x, y - radius);
    pctx.lineTo(x, y - radius - 4);
    pctx.stroke();

    pctx.fillStyle = '#FF6600';
    pctx.beginPath();
    pctx.arc(x, y - radius - 6, 3, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = '#FFCC00';
    pctx.beginPath();
    pctx.arc(x, y - radius - 6, 1.5, 0, Math.PI * 2);
    pctx.fill();

    pctx.restore();
}

function drawRouletteAnchorPreview(pctx, x, y, scale) {
    const s = scale * 0.75;

    pctx.save();
    pctx.lineCap = 'round';
    pctx.lineJoin = 'round';

    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 8;

    pctx.beginPath();
    pctx.arc(x, y - 10 * s, 4 * s, 0, Math.PI * 2);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x, y - 6 * s);
    pctx.lineTo(x, y + 10 * s);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x - 8 * s, y - 2 * s);
    pctx.lineTo(x + 8 * s, y - 2 * s);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x - 10 * s, y + 4 * s);
    pctx.quadraticCurveTo(x - 10 * s, y + 12 * s, x, y + 10 * s);
    pctx.quadraticCurveTo(x + 10 * s, y + 12 * s, x + 10 * s, y + 4 * s);
    pctx.stroke();

    pctx.strokeStyle = '#4ECDC4';
    pctx.lineWidth = 5;

    pctx.beginPath();
    pctx.arc(x, y - 10 * s, 4 * s, 0, Math.PI * 2);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x, y - 6 * s);
    pctx.lineTo(x, y + 10 * s);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x - 8 * s, y - 2 * s);
    pctx.lineTo(x + 8 * s, y - 2 * s);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x - 10 * s, y + 4 * s);
    pctx.quadraticCurveTo(x - 10 * s, y + 12 * s, x, y + 10 * s);
    pctx.quadraticCurveTo(x + 10 * s, y + 12 * s, x + 10 * s, y + 4 * s);
    pctx.stroke();

    pctx.restore();
}

/**
 * Animate the roulette preview
 */
function animateRoulettePreview() {
    roulettePreviewPulsePhase += 0.15;
    roulettePreviewPhase += ROULETTE_CYCLE_SPEED;

    if (roulettePreviewPhase >= 1) {
        roulettePreviewPhase = 0;
        roulettePreviewIndex = (roulettePreviewIndex + 1) % ROULETTE_ICONS.length;
    }

    drawIconRoulette();
    roulettePreviewAnimationId = requestAnimationFrame(animateRoulettePreview);
}

// Initialize icon previews when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure canvases are rendered
    setTimeout(() => {
        drawIconPreviews();
        animateRoulettePreview();
    }, 100);
});
