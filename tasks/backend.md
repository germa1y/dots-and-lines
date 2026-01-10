# Backend Tasks

Firebase, Firestore, Authentication, data synchronization, and game state management.

---

## Phase 1: Foundation

### TASK-002: Set up Firebase project
- **Priority**: P0
- **Source**: openspec/TASK-002
- **Status**: complete

Acceptance criteria:
- [x] Create new project in Firebase Console
- [x] Enable Realtime Database (test mode)
- [x] Enable Anonymous Authentication
- [x] Copy project config credentials

### TASK-005: Configure Firebase connection
- **Priority**: P0
- **Source**: openspec/TASK-005
- **Status**: complete

Acceptance criteria:
- [x] Create js/firebase.js with config
- [x] Initialize Firebase app, Realtime Database, Auth
- [x] Export db and auth references via FirebaseService

### TASK-006: Test Firebase read/write
- **Priority**: P0
- **Source**: openspec/TASK-006
- **Status**: complete

Acceptance criteria:
- [x] Write test document to Realtime Database
- [x] Read it back and log to console
- [x] Delete test document
- [x] Verify in Firebase Console

---

## Phase 2: Core Game Board

### TASK-011: Define line data structure
- **Priority**: P0
- **Source**: openspec/TASK-011
- **Status**: complete

Acceptance criteria:
- [x] Structure for 60 lines (30 horizontal + 30 vertical)
- [x] Line object: { row, col, direction, playerId } (in game.js)
- [x] getLineKey(row, col, direction) helper

### TASK-014: Define box data structure
- **Priority**: P0
- **Source**: openspec/TASK-014
- **Status**: complete

Acceptance criteria:
- [x] 5x5 grid of boxes
- [x] Box object: { row, col, ownerId, type } (supports special squares)
- [x] getBoxKey(row, col) helper

### TASK-015: Detect box completion
- **Priority**: P0
- **Source**: openspec/TASK-015
- **Status**: complete

Acceptance criteria:
- [x] Check adjacent boxes after each line draw (findCompletedBoxes)
- [x] Box complete when all 4 lines drawn (isBoxComplete)
- [x] Return list of newly completed boxes with special type

---

## Phase 3: Turn System

### TASK-018: Define player data structure
- **Priority**: P0
- **Source**: openspec/TASK-018
- **Status**: complete

Acceptance criteria:
- [x] Player object: { id, name, color, score, bankedTurns }
- [x] Support 2-4 players (Blue, Teal, Yellow, Mint)
- [x] Store in game state (Firebase + local)

### TASK-019: Implement turn management
- **Priority**: P0
- **Source**: openspec/TASK-019
- **Status**: complete

Acceptance criteria:
- [x] Track currentPlayerIndex
- [x] getCurrentPlayer() helper
- [x] advanceTurn() in handleLineDrawAttempt

### TASK-021: Implement extra turn on box completion
- **Priority**: P0
- **Source**: openspec/TASK-021
- **Status**: complete

Acceptance criteria:
- [x] If box completed (non-penalty), do NOT advance turn
- [x] Continue until line completes nothing
- [x] Then advance to next player

### TASK-022: Detect game over
- **Priority**: P0
- **Source**: openspec/TASK-022
- **Status**: complete

Acceptance criteria:
- [x] Game ends when all 25 boxes filled
- [x] Check in handleLineDrawAttempt
- [x] Set status to 'finished'

### TASK-024: Implement game restart
- **Priority**: P0
- **Source**: openspec/TASK-024
- **Status**: complete

Acceptance criteria:
- [x] "Play Again" cleans up session (GameService.cleanup)
- [x] Returns to menu for new game
- [x] Reset scores handled by new game creation

---

## Phase 4: Firebase Multiplayer

### TASK-025: Design Realtime Database game document schema
- **Priority**: P0
- **Source**: openspec/TASK-025
- **Status**: complete

Acceptance criteria:
- [x] Document structure matching proposal
- [x] Fields: code, status, hostId, players{}, lines{}, boxes{}, specialSquares{}
- [x] Write schema as comment in firebase.js (50+ line schema doc)

### TASK-026: Implement anonymous authentication
- **Priority**: P0
- **Source**: openspec/TASK-026
- **Status**: complete

Acceptance criteria:
- [x] Sign in anonymously on app load (LobbyService.init)
- [x] Store/retrieve user ID (FirebaseService.getUser)
- [x] Handle auth state changes

### TASK-027: Implement game creation
- **Priority**: P0
- **Source**: openspec/TASK-027
- **Status**: complete

Acceptance criteria:
- [x] Generate unique 6-character code (generateGameCode)
- [x] Create game document in Realtime Database
- [x] Set status: "waiting", add creator as first player
- [x] Return game ID and code

### TASK-028: Implement game code lookup
- **Priority**: P0
- **Source**: openspec/TASK-028
- **Status**: complete

Acceptance criteria:
- [x] Query Realtime Database for matching code
- [x] Handle: not found, already started, game full
- [x] Return game document if valid (findGameByCode)

### TASK-029: Implement player joining
- **Priority**: P0
- **Source**: openspec/TASK-029
- **Status**: complete

Acceptance criteria:
- [x] Add player to players object
- [x] Assign next available color
- [x] Update database document (joinGame)

### TASK-030: Set up real-time game listener
- **Priority**: P0
- **Source**: openspec/TASK-030
- **Status**: complete

Acceptance criteria:
- [x] Use onValue for game document (subscribeToGame)
- [x] Parse incoming state to local state (handleGameStateUpdate)
- [x] Trigger re-render on change

### TASK-031: Sync line draws to Database
- **Priority**: P0
- **Source**: openspec/TASK-031
- **Status**: complete

Acceptance criteria:
- [x] Write to Database on line draw (drawLine)
- [x] Use object key for lines (lines/row,col,dir)
- [x] Include playerIndex with line data

### TASK-032: Sync box completions to Database
- **Priority**: P0
- **Source**: openspec/TASK-032
- **Status**: complete

Acceptance criteria:
- [x] Update boxes object on completion
- [x] Update player scores
- [x] Update currentPlayerIndex (handleLineDrawAttempt)

### TASK-033: Implement turn validation
- **Priority**: P0
- **Source**: openspec/TASK-033
- **Status**: complete

Acceptance criteria:
- [x] Check if local player's turn (isMyTurn)
- [x] Reject input if not your turn
- [x] Show "Not your turn" feedback

### TASK-034: Handle state conflicts
- **Priority**: P0
- **Source**: openspec/TASK-034
- **Status**: complete

Acceptance criteria:
- [x] Trust Database over local state
- [x] Re-render from Database state (handleGameStateUpdate)
- [x] Prevent stale state issues

### TASK-035: Test two-browser multiplayer
- **Priority**: P0
- **Source**: openspec/TASK-035
- **Status**: blocked
- **Blocked by**: Firebase Anonymous Authentication not enabled in Console
- **Resolution**: Follow instructions in `docs/FIREBASE_AUTH_SETUP.md` to enable Anonymous auth in Firebase Console

Acceptance criteria:
- [ ] Open game in two browser tabs
- [ ] Verify moves sync in real-time
- [ ] Verify turn enforcement

---

## Phase 5: Lobby System

### TASK-037: Implement name persistence
- **Priority**: P0
- **Source**: openspec/TASK-037
- **Status**: complete

Acceptance criteria:
- [x] Save name to localStorage (LobbyService.saveName)
- [x] Load name on page load (LobbyService.getSavedName)
- [x] Require name before create/join

### TASK-039: Implement create game flow
- **Priority**: P0
- **Source**: openspec/TASK-039
- **Status**: complete

Acceptance criteria:
- [x] Create game doc on click (LobbyService.createGame)
- [x] Navigate to lobby
- [x] Show loading state ("Creating...")
- [x] Handle errors

### TASK-040: Implement join game flow
- **Priority**: P0
- **Source**: openspec/TASK-040
- **Status**: complete

Acceptance criteria:
- [x] Look up code, add player (LobbyService.joinGame)
- [x] Navigate to lobby
- [x] Validate code format
- [x] Show error if invalid

### TASK-041: Display real-time player list
- **Priority**: P0
- **Source**: openspec/TASK-041
- **Status**: complete

Acceptance criteria:
- [x] Subscribe to game document (subscribeLobbyUpdates)
- [x] Update player list on join/leave (updateLobby)
- [x] Show player colors

### TASK-042: Implement start game (host only)
- **Priority**: P0
- **Source**: openspec/TASK-042
- **Status**: complete

Acceptance criteria:
- [x] Only show button to host
- [x] Require 2+ players
- [x] Update status to "active" (startGame)
- [x] All clients transition to game

### TASK-043: Handle player leaving lobby
- **Priority**: P0
- **Source**: openspec/TASK-043
- **Status**: complete

Acceptance criteria:
- [x] Remove player from object (leaveGame)
- [x] Assign new host if needed
- [x] Delete game if host leaves while waiting

---

## Summary

| Status | Count |
|--------|-------|
| Pending | 0 |
| In Progress | 0 |
| Complete | 27 |
| Blocked | 1 |

---

## New Features Implemented (Beyond Original Tasks)

### Special Squares System
- Golden squares: Bank a bonus turn when completed
- Penalty squares: Forfeit turn on completion
- 1-2 of each type randomly placed per game
- Visual type included in box data for rendering

### 3-4 Player Support
- Extended player array from 2 to 4 players
- Color palette: Coral, Teal, Yellow, Mint
- Round-robin turn order (modulo playerCount)
- maxPlayers configuration per game

### Banked Turns System
- bankedTurns tracked per player
- useBankedTurn() function to consume a banked turn
- Golden square completion awards a banked turn

### Data Format for Pixel (Frontend)
**Lines**: `{ row, col, direction, ownerId }`
**Boxes**: `{ row, col, ownerId, type }` where type is 'normal', 'golden', or 'penalty'
**Special Squares**: `{ golden: ["row,col", ...], penalty: ["row,col", ...] }`
