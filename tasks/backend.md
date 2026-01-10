# Backend Tasks

Firebase, Firestore, Authentication, data synchronization, and game state management.

---

## Phase 1: Foundation

### TASK-002: Set up Firebase project
- **Priority**: P0
- **Source**: openspec/TASK-002
- **Status**: pending

Acceptance criteria:
- [ ] Create new project in Firebase Console
- [ ] Enable Firestore database (test mode)
- [ ] Enable Anonymous Authentication
- [ ] Copy project config credentials

### TASK-005: Configure Firebase connection
- **Priority**: P0
- **Source**: openspec/TASK-005
- **Status**: pending

Acceptance criteria:
- [ ] Create js/firebase.js with config
- [ ] Initialize Firebase app, Firestore, Auth
- [ ] Export db and auth references

### TASK-006: Test Firebase read/write
- **Priority**: P0
- **Source**: openspec/TASK-006
- **Status**: pending

Acceptance criteria:
- [ ] Write test document to Firestore
- [ ] Read it back and log to console
- [ ] Delete test document
- [ ] Verify in Firebase Console

---

## Phase 2: Core Game Board

### TASK-011: Define line data structure
- **Priority**: P0
- **Source**: openspec/TASK-011
- **Status**: pending

Acceptance criteria:
- [ ] Structure for 60 lines (30 horizontal + 30 vertical)
- [ ] Line object: { row, col, direction, playerId }
- [ ] getLineKey(row, col, direction) helper

### TASK-014: Define box data structure
- **Priority**: P0
- **Source**: openspec/TASK-014
- **Status**: pending

Acceptance criteria:
- [ ] 5×5 array of boxes
- [ ] Box object: { row, col, ownerId, type }
- [ ] getBoxLines(row, col) helper

### TASK-015: Detect box completion
- **Priority**: P0
- **Source**: openspec/TASK-015
- **Status**: pending

Acceptance criteria:
- [ ] Check adjacent boxes after each line draw
- [ ] Box complete when all 4 lines drawn
- [ ] Return list of newly completed boxes

---

## Phase 3: Turn System

### TASK-018: Define player data structure
- **Priority**: P0
- **Source**: openspec/TASK-018
- **Status**: pending

Acceptance criteria:
- [ ] Player object: { id, name, color, score, bankedTurns }
- [ ] Create 2 default players (Blue, Green)
- [ ] Store in game state

### TASK-019: Implement turn management
- **Priority**: P0
- **Source**: openspec/TASK-019
- **Status**: pending

Acceptance criteria:
- [ ] Track currentPlayerIndex
- [ ] getCurrentPlayer() helper
- [ ] advanceTurn() function

### TASK-021: Implement extra turn on box completion
- **Priority**: P0
- **Source**: openspec/TASK-021
- **Status**: pending

Acceptance criteria:
- [ ] If box completed, do NOT advance turn
- [ ] Continue until line completes nothing
- [ ] Then advance to next player

### TASK-022: Detect game over
- **Priority**: P0
- **Source**: openspec/TASK-022
- **Status**: pending

Acceptance criteria:
- [ ] Game ends when all 25 boxes filled
- [ ] isGameOver() helper
- [ ] Trigger game over flow

### TASK-024: Implement game restart
- **Priority**: P0
- **Source**: openspec/TASK-024
- **Status**: pending

Acceptance criteria:
- [ ] "Play Again" resets all state
- [ ] Clear lines and boxes
- [ ] Reset scores to 0

---

## Phase 4: Firebase Multiplayer

### TASK-025: Design Firestore game document schema
- **Priority**: P0
- **Source**: openspec/TASK-025
- **Status**: pending

Acceptance criteria:
- [ ] Document structure matching proposal
- [ ] Fields: code, status, hostId, players[], lines[], boxes[]
- [ ] Write schema as comment in firebase.js

### TASK-026: Implement anonymous authentication
- **Priority**: P0
- **Source**: openspec/TASK-026
- **Status**: pending

Acceptance criteria:
- [ ] Sign in anonymously on app load
- [ ] Store/retrieve user ID
- [ ] Handle auth state changes

### TASK-027: Implement game creation
- **Priority**: P0
- **Source**: openspec/TASK-027
- **Status**: pending

Acceptance criteria:
- [ ] Generate unique 6-character code
- [ ] Create game document in Firestore
- [ ] Set status: "waiting", add creator as first player
- [ ] Return game ID and code

### TASK-028: Implement game code lookup
- **Priority**: P0
- **Source**: openspec/TASK-028
- **Status**: pending

Acceptance criteria:
- [ ] Query Firestore for matching code
- [ ] Handle: not found, already started, game full
- [ ] Return game document if valid

### TASK-029: Implement player joining
- **Priority**: P0
- **Source**: openspec/TASK-029
- **Status**: pending

Acceptance criteria:
- [ ] Add player to players array
- [ ] Assign next available color
- [ ] Update Firestore document

### TASK-030: Set up real-time game listener
- **Priority**: P0
- **Source**: openspec/TASK-030
- **Status**: pending

Acceptance criteria:
- [ ] Use onSnapshot for game document
- [ ] Parse incoming state to local state
- [ ] Trigger re-render on change

### TASK-031: Sync line draws to Firestore
- **Priority**: P0
- **Source**: openspec/TASK-031
- **Status**: pending

Acceptance criteria:
- [ ] Write to Firestore on line draw
- [ ] Use arrayUnion for lines array
- [ ] Include playerId with line data

### TASK-032: Sync box completions to Firestore
- **Priority**: P0
- **Source**: openspec/TASK-032
- **Status**: pending

Acceptance criteria:
- [ ] Update boxes array on completion
- [ ] Update player scores
- [ ] Update currentPlayerIndex

### TASK-033: Implement turn validation
- **Priority**: P0
- **Source**: openspec/TASK-033
- **Status**: pending

Acceptance criteria:
- [ ] Check if local player's turn
- [ ] Reject input if not your turn
- [ ] Show "Not your turn" feedback

### TASK-034: Handle state conflicts
- **Priority**: P0
- **Source**: openspec/TASK-034
- **Status**: pending

Acceptance criteria:
- [ ] Trust Firestore over local state
- [ ] Re-render from Firestore state
- [ ] Prevent stale state issues

### TASK-035: Test two-browser multiplayer
- **Priority**: P0
- **Source**: openspec/TASK-035
- **Status**: pending

Acceptance criteria:
- [ ] Open game in two browser tabs
- [ ] Verify moves sync in real-time
- [ ] Verify turn enforcement

---

## Phase 5: Lobby System

### TASK-037: Implement name persistence
- **Priority**: P0
- **Source**: openspec/TASK-037
- **Status**: pending

Acceptance criteria:
- [ ] Save name to localStorage
- [ ] Load name on page load
- [ ] Require name before create/join

### TASK-039: Implement create game flow
- **Priority**: P0
- **Source**: openspec/TASK-039
- **Status**: pending

Acceptance criteria:
- [ ] Create game doc on click
- [ ] Navigate to lobby
- [ ] Show loading state
- [ ] Handle errors

### TASK-040: Implement join game flow
- **Priority**: P0
- **Source**: openspec/TASK-040
- **Status**: pending

Acceptance criteria:
- [ ] Look up code, add player
- [ ] Navigate to lobby
- [ ] Validate code format
- [ ] Show error if invalid

### TASK-041: Display real-time player list
- **Priority**: P0
- **Source**: openspec/TASK-041
- **Status**: pending

Acceptance criteria:
- [ ] Subscribe to game document
- [ ] Update player list on join/leave
- [ ] Show player colors

### TASK-042: Implement start game (host only)
- **Priority**: P0
- **Source**: openspec/TASK-042
- **Status**: pending

Acceptance criteria:
- [ ] Only show button to host
- [ ] Require 2+ players
- [ ] Update status to "active"
- [ ] All clients transition to game

### TASK-043: Handle player leaving lobby
- **Priority**: P0
- **Source**: openspec/TASK-043
- **Status**: pending

Acceptance criteria:
- [ ] Remove player from array
- [ ] Assign new host if needed
- [ ] Delete game if last player

---

## Summary

| Status | Count |
|--------|-------|
| Pending | 28 |
| In Progress | 0 |
| Complete | 0 |
| Blocked | 0 |
