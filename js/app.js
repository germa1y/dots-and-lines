/**
 * app.js - Main application entry point
 * Initializes the game and handles app-level state
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dots and Lines - App initialized');

    // Initialize lobby (Firebase + Auth)
    if (typeof LobbyService !== 'undefined') {
        const success = await LobbyService.init();
        if (success) {
            console.log('Firebase and Auth ready');
        } else {
            console.error('Failed to initialize Firebase/Auth');
        }
    }

    // Show menu screen (landing page)
    showScreen('menu');

    // Set up menu screen
    setupMenuScreen();

    // Set up lobby screen
    setupLobbyScreen();

    // Set up game over screen
    setupGameOverScreen();

    // Initialize canvas and board rendering (for when game screen is shown)
    if (typeof initCanvas === 'function') {
        initCanvas();
    } else {
        console.error('initCanvas function not found - board.js may not be loaded');
    }
});

/**
 * Set up menu screen functionality
 */
function setupMenuScreen() {
    const playerNameInput = document.getElementById('player-name');
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const gameCodeInput = document.getElementById('game-code-input');

    // Load player name from localStorage
    const savedName = localStorage.getItem('dotsAndLinesPlayerName');
    if (savedName && playerNameInput) {
        playerNameInput.value = savedName;
    }

    // Save player name to localStorage on change
    if (playerNameInput) {
        playerNameInput.addEventListener('input', function() {
            localStorage.setItem('dotsAndLinesPlayerName', this.value);
        });
    }

    // Create Game button
    if (createGameBtn) {
        createGameBtn.addEventListener('click', async function() {
            const playerName = playerNameInput ? playerNameInput.value.trim() : '';

            if (!playerName) {
                alert('Please enter your name');
                return;
            }

            // Disable button during operation
            createGameBtn.disabled = true;
            createGameBtn.textContent = 'Creating...';

            console.log('Create game clicked:', playerName);

            // Create game via LobbyService
            if (typeof LobbyService !== 'undefined') {
                const result = await LobbyService.createGame(playerName, 4);
                if (result.success) {
                    console.log('Game created:', result.code);
                    showScreen('lobby');
                } else {
                    alert('Failed to create game: ' + (result.error || 'Unknown error'));
                }
            } else {
                // Fallback for testing
                showScreen('lobby');
            }

            // Re-enable button
            createGameBtn.disabled = false;
            createGameBtn.textContent = 'Create Game';
        });
    }

    // Join Game button
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', async function() {
            const playerName = playerNameInput ? playerNameInput.value.trim() : '';
            const gameCode = gameCodeInput ? gameCodeInput.value.trim().toUpperCase() : '';

            if (!playerName) {
                alert('Please enter your name');
                return;
            }

            if (!gameCode || gameCode.length !== 6) {
                alert('Please enter a valid 6-character game code');
                return;
            }

            // Disable button during operation
            joinGameBtn.disabled = true;
            joinGameBtn.textContent = 'Joining...';

            console.log('Join game clicked:', { playerName, gameCode });

            // Join game via LobbyService
            if (typeof LobbyService !== 'undefined') {
                const result = await LobbyService.joinGame(gameCode, playerName);
                if (result.success) {
                    console.log('Joined game:', result.gameId);
                    showScreen('lobby');
                } else {
                    alert('Failed to join game: ' + (result.error || 'Unknown error'));
                }
            }

            // Re-enable button
            joinGameBtn.disabled = false;
            joinGameBtn.textContent = 'Join Game';
        });
    }

    // Auto-uppercase game code input
    if (gameCodeInput) {
        gameCodeInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }
}

/**
 * Set up lobby screen functionality
 */
function setupLobbyScreen() {
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const leaveLobbyBtn = document.getElementById('leave-lobby-btn');

    // Copy game code button
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', function() {
            const gameCodeEl = document.getElementById('game-code');
            if (gameCodeEl) {
                const code = gameCodeEl.textContent;

                // Use Clipboard API if available
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        copyCodeBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyCodeBtn.textContent = 'Copy';
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy:', err);
                        alert('Could not copy code. Please copy manually: ' + code);
                    });
                } else {
                    // Fallback for older browsers
                    alert('Game code: ' + code);
                }
            }
        });
    }

    // Start Game button (host only)
    if (startGameBtn) {
        startGameBtn.addEventListener('click', async function() {
            console.log('Start game clicked');

            // Disable button during operation
            startGameBtn.disabled = true;
            startGameBtn.textContent = 'Starting...';

            // Start game via LobbyService
            if (typeof LobbyService !== 'undefined') {
                const result = await LobbyService.startGame();
                if (!result.success) {
                    alert('Failed to start game: ' + (result.error || 'Unknown error'));
                    // Re-enable button on failure
                    startGameBtn.disabled = false;
                    startGameBtn.textContent = 'Start Game';
                }
                // On success, the lobby update handler will transition to game screen
            } else {
                // Fallback for testing
                showScreen('game');
                startGameBtn.disabled = false;
                startGameBtn.textContent = 'Start Game';
            }
        });
    }

    // Leave Lobby button
    if (leaveLobbyBtn) {
        leaveLobbyBtn.addEventListener('click', async function() {
            console.log('Leave lobby clicked');

            // Leave lobby via LobbyService
            if (typeof LobbyService !== 'undefined') {
                await LobbyService.leaveLobby();
            }

            showScreen('menu');
        });
    }
}

/**
 * Set up game over screen functionality
 */
function setupGameOverScreen() {
    const playAgainBtn = document.getElementById('play-again-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    // Play Again button
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', function() {
            console.log('Play again clicked');
            // Clean up current game session
            if (typeof GameService !== 'undefined') {
                GameService.cleanup();
            }
            // Reset local game state
            resetGameState();
            // Go back to lobby to start a new game
            showScreen('menu');
        });
    }

    // Back to Menu button
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', function() {
            console.log('Back to menu clicked');
            // Clean up current game session
            if (typeof GameService !== 'undefined') {
                GameService.cleanup();
            }
            // Reset local game state
            resetGameState();
            showScreen('menu');
        });
    }
}

/**
 * Update lobby screen with game data
 * @param {{code: string, players: Array, isHost: boolean}} lobbyData - Lobby information
 */
function updateLobby(lobbyData) {
    // Update game code
    const gameCodeEl = document.getElementById('game-code');
    if (gameCodeEl && lobbyData.code) {
        gameCodeEl.textContent = lobbyData.code;
    }

    // Update players list
    const playersContainerEl = document.getElementById('players-container');
    if (playersContainerEl && lobbyData.players) {
        playersContainerEl.innerHTML = '';

        lobbyData.players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <div class="player-color-dot" style="background:${player.color};"></div>
                <strong>${player.name}</strong>
            `;
            playersContainerEl.appendChild(playerItem);
        });
    }

    // Update lobby status
    const lobbyStatusEl = document.getElementById('lobby-status');
    if (lobbyStatusEl) {
        const playerCount = lobbyData.players ? lobbyData.players.length : 0;
        if (playerCount < 2) {
            lobbyStatusEl.textContent = 'Waiting for players...';
        } else {
            lobbyStatusEl.textContent = `${playerCount} players ready`;
        }
    }

    // Show/hide start button based on host status and player count
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        const playerCount = lobbyData.players ? lobbyData.players.length : 0;
        if (lobbyData.isHost && playerCount >= 2) {
            startGameBtn.classList.remove('hidden');
            startGameBtn.disabled = false;
        } else {
            startGameBtn.classList.add('hidden');
        }
    }
}

/**
 * Show a specific screen and hide others
 * Screen transition flow: menu → lobby → game → gameover
 *
 * @param {string} screenName - 'menu', 'lobby', 'game', or 'gameover'
 */
function showScreen(screenName) {
    const screens = ['menu', 'lobby', 'game', 'gameover'];

    // Hide all screens except the target
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

    // Handle screen-specific initialization
    if (screenName === 'game') {
        // Trigger canvas resize when showing game screen
        // This ensures canvas is properly sized if window was resized while on another screen
        if (typeof handleResize === 'function') {
            setTimeout(() => handleResize(), 100);
        }
    }

    console.log('Screen changed to:', screenName);
}

/**
 * Reset game state for a new game
 * Called when starting a new game or returning to menu
 */
function resetGameState() {
    // Reset game board state (defined in board.js)
    if (typeof lines !== 'undefined') {
        lines.length = 0;
    }
    if (typeof boxes !== 'undefined') {
        boxes.length = 0;
    }
    if (typeof currentPlayer !== 'undefined') {
        currentPlayer = 0;
    }

    // Redraw empty board
    if (typeof redraw === 'function') {
        redraw();
    }

    // Update scoreboard
    if (typeof updateScoreboard === 'function') {
        updateScoreboard();
    }

    console.log('Game state reset');
}
