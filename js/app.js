/**
 * app.js - Main application entry point
 * Initializes the game and handles app-level state
 */

// Track auth state
let authReady = false;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dots and Lines - App initialized');

    // Show menu screen (landing page)
    showScreen('menu');

    // Set up menu screen (buttons start disabled)
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

    // Initialize lobby (Firebase + Auth) - do this after UI is set up
    if (typeof LobbyService !== 'undefined') {
        const result = await LobbyService.init();
        if (result.success || result === true) {
            console.log('Firebase and Auth ready');
            authReady = true;
            enableGameButtons();
        } else {
            console.error('Failed to initialize Firebase/Auth:', result.error);
            showAuthError(result.error || 'Unknown error');
        }
    }
});

/**
 * Enable game buttons once auth is ready
 */
function enableGameButtons() {
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');

    if (createGameBtn) {
        createGameBtn.disabled = false;
        createGameBtn.textContent = 'Create Game';
    }
    if (joinGameBtn) {
        joinGameBtn.disabled = false;
        joinGameBtn.textContent = 'Join Game';
    }
    console.log('Game buttons enabled - auth ready');
}

/**
 * Show auth error to user
 * @param {string} errorMessage - The error message to display
 */
function showAuthError(errorMessage) {
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');

    if (createGameBtn) {
        createGameBtn.textContent = 'Connection Error';
    }
    if (joinGameBtn) {
        joinGameBtn.textContent = 'Connection Error';
    }

    // Display error with details
    let message = 'Failed to connect to game server.\n\nError: ' + errorMessage;

    // Add helpful hints based on error type
    if (errorMessage.includes('auth/operation-not-allowed')) {
        message += '\n\nThis means Anonymous Authentication is not enabled in Firebase Console.';
    }

    message += '\n\nPlease check the browser console (F12) for more details.';

    alert(message);
}

/**
 * Set up menu screen functionality
 */
function setupMenuScreen() {
    const playerNameInput = document.getElementById('player-name');
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const gameCodeInput = document.getElementById('game-code-input');

    // Disable buttons until auth is ready
    if (createGameBtn) {
        createGameBtn.disabled = true;
        createGameBtn.textContent = 'Connecting...';
    }
    if (joinGameBtn) {
        joinGameBtn.disabled = true;
        joinGameBtn.textContent = 'Connecting...';
    }

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
            // Safety check - auth must be ready
            if (!authReady) {
                alert('Still connecting to server. Please wait...');
                return;
            }

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
            // Safety check - auth must be ready
            if (!authReady) {
                alert('Still connecting to server. Please wait...');
                return;
            }

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
        playAgainBtn.addEventListener('click', async function() {
            console.log('Play again clicked');
            // Leave the current game properly
            if (typeof LobbyService !== 'undefined') {
                await LobbyService.leaveLobby();
            }
            // Clean up current game session
            if (typeof GameService !== 'undefined') {
                GameService.cleanup();
            }
            // Reset local game state
            resetGameState();
            // Go back to menu to start a new game
            showScreen('menu');
        });
    }

    // Back to Menu button
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', async function() {
            console.log('Back to menu clicked');
            // Leave the game properly
            if (typeof LobbyService !== 'undefined') {
                await LobbyService.leaveLobby();
            }
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
    // Reset board state via board.js API
    if (typeof resetBoardState === 'function') {
        resetBoardState();
    } else {
        console.warn('resetBoardState function not found - board.js may not be loaded');
    }
}

/**
 * Show a notification message to the user
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds (default 2000)
 */
function showNotification(message, duration = 2000) {
    // Check if notification element exists, create if not
    let notificationEl = document.getElementById('game-notification');

    if (!notificationEl) {
        notificationEl = document.createElement('div');
        notificationEl.id = 'game-notification';
        notificationEl.className = 'game-notification hidden';
        document.body.appendChild(notificationEl);
    }

    // Set message and show
    notificationEl.textContent = message;
    notificationEl.classList.remove('hidden');
    notificationEl.classList.add('show');

    // Auto-hide after duration
    setTimeout(() => {
        notificationEl.classList.remove('show');
        notificationEl.classList.add('hidden');
    }, duration);
}
