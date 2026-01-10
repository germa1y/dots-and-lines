# Tasks: Dots and Lines - Initial Implementation

## Overview

This task breakdown follows dependency order. Each phase delivers working, testable software.

**Total Tasks**: 78
**MVP Tasks (Phases 1-6)**: 42
**Estimated MVP Scope**: Playable 2-player game over internet

---

## Phase 1: Foundation
*Deliverable: Project skeleton with Firebase connected*

- [ ] TASK-001: Create project folder structure
  - Create `dots-and-lines/` with subdirectories: `css/`, `js/`, `assets/sprites/`, `assets/audio/`
  - Create empty placeholder files: `index.html`, `css/styles.css`, `js/app.js`

- [ ] TASK-002: Set up Firebase project
  - Create new project in Firebase Console
  - Enable Firestore database (start in test mode)
  - Enable Anonymous Authentication
  - Copy project config credentials

- [ ] TASK-003: Create base HTML structure
  - Set up `index.html` with viewport meta for mobile
  - Add Canvas element for game board
  - Add container divs for UI screens (menu, lobby, game, game-over)
  - Include Firebase SDK via CDN

- [ ] TASK-004: Implement mobile-first CSS foundation
  - Set up CSS reset and box-sizing
  - Create responsive canvas sizing (max 100vw, 60vh for game area)
  - Define CSS custom properties for player colors and theme
  - Style hidden/visible screen states

- [ ] TASK-005: Configure Firebase connection
  - Create `js/firebase.js` with Firebase config
  - Initialize Firebase app, Firestore, and Auth
  - Export db and auth references

- [ ] TASK-006: Test Firebase read/write
  - Write test document to Firestore
  - Read it back and log to console
  - Delete test document
  - Verify in Firebase Console

- [ ] TASK-007: Set up local development server
  - Install VS Code Live Server extension (or use `npx serve`)
  - Verify hot reload works
  - Test on localhost from phone (same network)

**Milestone**: Open index.html in browser, see "Firebase connected" in console

---

## Phase 2: Core Game Board (Local)
*Deliverable: Playable single-player dots & boxes on canvas*

- [ ] TASK-008: Implement Canvas setup and scaling
  - Get canvas context in `js/board.js`
  - Calculate pixel ratio for sharp rendering
  - Handle canvas resize on window resize
  - Clear and redraw function

- [ ] TASK-009: Define game constants and grid math
  - Define GRID_SIZE (5 boxes = 6 dots)
  - Calculate dot positions based on canvas size
  - Define DOT_RADIUS, LINE_WIDTH constants
  - Create helper: `getDotPosition(row, col)` → {x, y}

- [ ] TASK-010: Render dot grid
  - Draw 6×6 dots on canvas
  - Use consistent spacing for portrait layout
  - Dots should be visually distinct (filled circles)

- [ ] TASK-011: Define line data structure
  - Create structure for all possible lines (60 total: 30 horizontal + 30 vertical)
  - Each line: `{ row, col, direction: 'h'|'v', playerId: null }`
  - Helper: `getLineKey(row, col, direction)` → unique string

- [ ] TASK-012: Implement tap/click detection
  - Add touch and mouse event listeners to canvas
  - Convert screen coordinates to canvas coordinates
  - Determine which line (if any) was tapped
  - Helper: `getNearestLine(x, y)` → line or null

- [ ] TASK-013: Draw lines on tap
  - When valid line tapped, mark it as owned by current player
  - Render line in player's color
  - Ignore taps on already-drawn lines
  - Visual feedback: line appears immediately

- [ ] TASK-014: Define box data structure
  - Create 5×5 array of boxes
  - Each box: `{ row, col, ownerId: null, type: 'normal' }`
  - Helper: `getBoxLines(row, col)` → [top, right, bottom, left] line keys

- [ ] TASK-015: Detect box completion
  - After each line draw, check adjacent boxes
  - A box is complete when all 4 surrounding lines are drawn
  - Return list of newly completed boxes

- [ ] TASK-016: Fill completed boxes
  - When box completed, set ownerId to current player
  - Render filled rectangle in player's color (semi-transparent)
  - Draw fill behind lines, not over them

- [ ] TASK-017: Implement local score tracking
  - Track score per player in game state
  - Increment score when box completed
  - Display scores in simple HTML overlay

**Milestone**: Tap between dots to draw lines, boxes fill when completed

---

## Phase 3: Turn System (Local)
*Deliverable: Two-player hot-seat game with win detection*

- [ ] TASK-018: Define player data structure
  - Player object: `{ id, name, color, score, bankedTurns }`
  - Create 2 default players (Blue, Green)
  - Store in game state

- [ ] TASK-019: Implement turn management
  - Track `currentPlayerIndex` in game state
  - `getCurrentPlayer()` helper
  - `advanceTurn()` to move to next player

- [ ] TASK-020: Display current player indicator
  - Highlight current player in scoreboard UI
  - Show "Your turn" or player name prominently
  - Update on turn change

- [ ] TASK-021: Implement extra turn on box completion
  - If player completes 1+ boxes, do NOT advance turn
  - Player continues until they draw a line that completes nothing
  - Then advance to next player

- [ ] TASK-022: Detect game over
  - Game ends when all 25 boxes are filled
  - Helper: `isGameOver()` → boolean
  - Trigger game over flow

- [ ] TASK-023: Determine and display winner
  - Compare scores of all players
  - Handle tie case (multiple winners)
  - Show game over message with winner name

- [ ] TASK-024: Implement game restart
  - "Play Again" button resets all game state
  - Clear all lines and boxes
  - Reset scores to 0
  - Randomize who goes first (or alternate)

**Milestone**: Two players can take turns on same device, game ends with winner

---

## Phase 4: Firebase Multiplayer
*Deliverable: Game state syncs between two browsers*

- [ ] TASK-025: Design Firestore game document schema
  - Document structure matching proposal
  - Fields: code, status, hostId, players[], lines[], boxes[], etc.
  - Write schema as comment in firebase.js

- [ ] TASK-026: Implement anonymous authentication
  - Sign in anonymously on app load
  - Store/retrieve user ID
  - Handle auth state changes

- [ ] TASK-027: Implement game creation
  - Generate unique 6-character alphanumeric code
  - Create game document in Firestore
  - Set status: "waiting", add creator as first player
  - Return game ID and code

- [ ] TASK-028: Implement game code lookup
  - Query Firestore for game with matching code
  - Handle: not found, already started, game full
  - Return game document if valid

- [ ] TASK-029: Implement player joining
  - Add player to game's players array
  - Assign next available color
  - Update Firestore document

- [ ] TASK-030: Set up real-time game listener
  - Use `onSnapshot` to listen for game document changes
  - Parse incoming state into local game state
  - Trigger re-render on state change

- [ ] TASK-031: Sync line draws to Firestore
  - When local player draws line, write to Firestore
  - Use arrayUnion for lines array
  - Include playerId with line data

- [ ] TASK-032: Sync box completions to Firestore
  - Update boxes array when box completed
  - Update player scores
  - Update currentPlayerIndex

- [ ] TASK-033: Implement turn validation
  - Check if it's local player's turn before allowing draw
  - Reject input if not your turn
  - Show subtle "Not your turn" feedback

- [ ] TASK-034: Handle state conflicts
  - If local state differs from Firestore, trust Firestore
  - Re-render board from Firestore state
  - Prevent stale state issues

- [ ] TASK-035: Test two-browser multiplayer
  - Open game in two browser tabs/windows
  - Verify moves sync in real-time
  - Verify turn enforcement works

**Milestone**: Two browsers can play the same game in real-time

---

## Phase 5: Lobby System
*Deliverable: Create/join game flow with lobby screen*

- [ ] TASK-036: Create landing page UI
  - Name input field (pre-filled from localStorage if exists)
  - "Create Game" button
  - "Join Game" button + code input field
  - Simple, mobile-friendly layout

- [ ] TASK-037: Implement name persistence
  - Save player name to localStorage on entry
  - Load name on page load if exists
  - Require name before create/join

- [ ] TASK-038: Create lobby screen UI
  - Large, copyable game code display
  - List of joined players with colors
  - "Start Game" button (host only)
  - "Leave" button
  - "Waiting for players..." status

- [ ] TASK-039: Implement create game flow
  - On "Create Game" click: create game doc, navigate to lobby
  - Show loading state during creation
  - Handle errors gracefully

- [ ] TASK-040: Implement join game flow
  - On "Join Game" click: look up code, add player, navigate to lobby
  - Validate code format before querying
  - Show error if code invalid or game unavailable

- [ ] TASK-041: Display real-time player list
  - Subscribe to game document in lobby
  - Update player list as players join/leave
  - Show player colors next to names

- [ ] TASK-042: Implement start game (host only)
  - Only show "Start Game" button to host
  - Require at least 2 players
  - Update game status to "active"
  - All clients transition to game board

- [ ] TASK-043: Handle player leaving lobby
  - Remove player from players array on leave
  - If host leaves, assign new host (first remaining player)
  - If last player leaves, delete game document

- [ ] TASK-044: Implement screen transitions
  - Clean screen switching: menu → lobby → game → game-over
  - Hide/show appropriate containers
  - Maintain state during transitions

**Milestone**: Full create → join → lobby → play → game over flow works

---

## Phase 6: MVP Deployment
*Deliverable: Playable game accessible via public URL*

- [ ] TASK-045: Configure Firebase Hosting
  - Create `firebase.json` with hosting config
  - Set public directory
  - Configure single-page app rewrites (if needed)

- [ ] TASK-046: Deploy to Firebase Hosting
  - Run `firebase deploy --only hosting`
  - Verify deployment successful
  - Note the public URL

- [ ] TASK-047: Test on iPhone Safari
  - Open deployed URL on iPhone
  - Test full game flow
  - Check touch responsiveness
  - Note any iOS-specific issues

- [ ] TASK-048: Test on Android Chrome
  - Open deployed URL on Android device/emulator
  - Test full game flow
  - Check touch responsiveness
  - Note any Android-specific issues

- [ ] TASK-049: Test cross-device multiplayer
  - Create game on one device
  - Join on different device (phone + laptop, or two phones)
  - Play full game to completion
  - Verify real-time sync works

- [ ] TASK-050: Fix critical cross-browser issues
  - Address any blocking issues from testing
  - Ensure core gameplay works on all tested browsers

**Milestone**: Friends can play by visiting URL - MVP complete!

---

## Phase 7: Special Squares
*Deliverable: Golden and penalty square mechanics working*

- [ ] TASK-051: Add special square data to game state
  - Add `specialSquares: { golden: [], penalty: [] }` to game doc
  - Store positions at game creation time

- [ ] TASK-052: Implement random placement algorithm
  - Place 1-2 golden squares randomly
  - Place 1-2 penalty squares randomly
  - Constraints: not corners, penalty not adjacent to golden

- [ ] TASK-053: Render special square markers
  - Draw golden marker (yellow/gold icon) in box center
  - Draw penalty marker (red icon) in box center
  - Markers visible before box is completed

- [ ] TASK-054: Implement golden square completion logic
  - When golden box completed: increment player's bankedTurns
  - Player still gets normal extra turn
  - Update Firestore with bankedTurns

- [ ] TASK-055: Implement penalty square completion logic
  - When penalty box completed: immediately end turn
  - No extra turn granted (override normal behavior)
  - Player still gets the point

- [ ] TASK-056: Add banked turns UI
  - Display banked turn count next to player info
  - Visual indicator when player has banked turns

- [ ] TASK-057: Implement "Use Banked Turn" button
  - Show button when: player's turn would end AND they have banked turns
  - On click: decrement bankedTurns, allow another move
  - Alternative: "End Turn" button to pass without using

- [ ] TASK-058: Handle edge case - penalty + golden same move
  - If one line completes both penalty and golden boxes
  - Penalty wins (turn ends)
  - But golden turn is still banked
  - Both boxes scored

**Milestone**: Special squares add strategic depth to gameplay

---

## Phase 8: Game Polish
*Deliverable: 3-4 player support, robust error handling*

- [ ] TASK-059: Extend lobby for 3-4 players
  - Allow up to 4 players to join
  - Update UI to show 4 player slots
  - Host can start with 2, 3, or 4 players

- [ ] TASK-060: Assign colors dynamically
  - Color pool: Blue, Green, Purple, Orange
  - Assign in join order
  - Handle color display in all UI

- [ ] TASK-061: Update scoreboard for multiple players
  - Display all 3-4 player scores
  - Highlight current player
  - Responsive layout for more players

- [ ] TASK-062: Test 3-player game
  - Full game with 3 players
  - Verify turn rotation works correctly
  - Verify winner detection with 3 players

- [ ] TASK-063: Test 4-player game
  - Full game with 4 players
  - Verify UI doesn't break with 4 score displays
  - Verify all mechanics work

- [ ] TASK-064: Implement player disconnect detection
  - Detect when player stops sending heartbeats (or leaves page)
  - Set a disconnect timestamp in Firestore

- [ ] TASK-065: Implement turn timeout for disconnected player
  - If current player disconnected for 30+ seconds
  - Automatically skip to next player
  - Show notification to other players

- [ ] TASK-066: Implement host migration
  - If host disconnects, promote next player to host
  - Update hostId in Firestore
  - New host gets "Start Game" button if in lobby

- [ ] TASK-067: Add connection status indicator
  - Show connected/disconnected status in UI
  - Visual warning when connection lost
  - Auto-reconnect on network restore

- [ ] TASK-068: Implement "Play Again" for multiplayer
  - Create new game with same players
  - Auto-join all current players
  - New random special square positions

- [ ] TASK-069: Add leave game confirmation
  - Prompt before leaving active game
  - Warn that they'll forfeit
  - Clean exit from Firestore

**Milestone**: Robust multiplayer with 2-4 players, handles disconnects

---

## Phase 9: Visual Polish
*Deliverable: Pixel art aesthetic applied*

- [ ] TASK-070: Design and apply color palette
  - Define 16-32 color retro palette
  - Apply to all UI elements
  - Ensure contrast meets accessibility

- [ ] TASK-071: Create or source pixel art sprites
  - Dot sprite
  - Line sprites (or draw programmatically)
  - Golden/penalty markers
  - UI buttons and panels

- [ ] TASK-072: Integrate pixel font
  - Find/select pixel font (Google Fonts or custom)
  - Apply to all text elements
  - Ensure readability on mobile

- [ ] TASK-073: Apply pixel-perfect rendering
  - CSS `image-rendering: pixelated`
  - Canvas rendering with no anti-aliasing
  - Consistent pixel density

- [ ] TASK-074: Add visual feedback animations
  - Line draw animation (quick fade-in)
  - Box completion flash
  - Turn change indicator
  - CSS transitions for UI

**Milestone**: Game has cohesive retro pixel art look

---

## Phase 10: Audio
*Deliverable: Minimal sound effects enhance feedback*

- [ ] TASK-075: Set up audio system
  - Create audio manager in `js/audio.js`
  - Preload sound files
  - Handle audio context for mobile browsers

- [ ] TASK-076: Add gameplay sound effects
  - Line draw: subtle click/tap
  - Box complete: satisfying pop/chime
  - Game over: short fanfare

- [ ] TASK-077: Add UI sound effects
  - Button tap: light click
  - Turn change: subtle notification
  - Error: soft buzz

- [ ] TASK-078: Implement mute toggle
  - Mute button in settings/header
  - Persist preference in localStorage
  - Respect mute state for all sounds

**Milestone**: Audio feedback enhances game feel

---

## Phase 11: Security & Cleanup
*Deliverable: Production-ready Firestore rules*

- [ ] TASK-079: Write Firestore security rules
  - Only authenticated users can read/write
  - Players can only modify games they're in
  - Validate move is legal (line not taken, correct turn)
  - Prevent score manipulation

- [ ] TASK-080: Test security rules
  - Attempt invalid moves from console
  - Verify rules reject unauthorized writes
  - Test edge cases

- [ ] TASK-081: Implement game cleanup
  - On app load: query games older than 24 hours in "waiting" status
  - Delete stale games
  - Log cleanup activity

- [ ] TASK-082: Add rate limiting awareness
  - Track write frequency
  - Debounce rapid inputs if needed
  - Stay well within Firebase free tier

**Milestone**: Firestore secured, stale data cleaned up

---

## Deferred Tasks (Future Releases)

- [ ] TASK-D01: Add PWA manifest for "Add to Home Screen"
- [ ] TASK-D02: Implement random matchmaking queue
- [ ] TASK-D03: Add Google Sign-In for persistent accounts
- [ ] TASK-D04: Build leaderboard system
- [ ] TASK-D05: Add selectable grid sizes (3×3, 4×4, 5×5, 6×6)
- [ ] TASK-D06: Implement AI opponent for single player
- [ ] TASK-D07: Add spectator mode
- [ ] TASK-D08: Build game replay system
- [ ] TASK-D09: Custom shareable URLs (dotsandlines.app/ABC123)

---

## Summary

| Phase | Description | Tasks | Priority | Delivers |
|-------|-------------|-------|----------|----------|
| 1 | Foundation | 7 | P0 | Project skeleton, Firebase connected |
| 2 | Core Game Board | 10 | P0 | Local single-player gameplay |
| 3 | Turn System | 7 | P0 | Local two-player hot-seat |
| 4 | Firebase Multiplayer | 11 | P0 | Real-time sync between browsers |
| 5 | Lobby System | 9 | P0 | Create/join game flow |
| 6 | MVP Deployment | 6 | P0 | Public URL, cross-device tested |
| 7 | Special Squares | 8 | P1 | Golden/penalty mechanics |
| 8 | Game Polish | 11 | P1 | 3-4 players, disconnect handling |
| 9 | Visual Polish | 5 | P2 | Pixel art aesthetic |
| 10 | Audio | 4 | P2 | Sound effects |
| 11 | Security | 4 | P1 | Firestore rules, cleanup |
| **MVP Total** | Phases 1-6 | **50** | | |
| **Full Release** | Phases 1-11 | **82** | | |

## Recommended Sprint Plan

**Sprint 1: Local Playable Game**
- Phase 1: Foundation (7 tasks)
- Phase 2: Core Game Board (10 tasks)
- Phase 3: Turn System (7 tasks)
- *Deliverable*: Two players can play on same device

**Sprint 2: Online Multiplayer MVP**
- Phase 4: Firebase Multiplayer (11 tasks)
- Phase 5: Lobby System (9 tasks)
- Phase 6: Deployment (6 tasks)
- *Deliverable*: Friends can play via shared URL

**Sprint 3: Full Feature Set**
- Phase 7: Special Squares (8 tasks)
- Phase 8: Game Polish (11 tasks)
- Phase 11: Security (4 tasks)
- *Deliverable*: Complete game with all mechanics

**Sprint 4: Polish & Launch**
- Phase 9: Visual Polish (5 tasks)
- Phase 10: Audio (4 tasks)
- Final testing and bug fixes
- *Deliverable*: Polished, production-ready game
