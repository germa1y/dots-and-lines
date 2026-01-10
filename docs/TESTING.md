# Dots and Lines - Manual Testing Checklist

This document provides a comprehensive testing checklist for the Dots and Lines multiplayer game. Follow these steps to manually verify all game features are working correctly.

---

## Prerequisites

Before testing, ensure:
1. Firebase project is set up with Realtime Database enabled
2. Anonymous Authentication is enabled in Firebase Console
3. The application is served via a local server (not file://)
4. You have at least two browser windows/tabs available for multiplayer testing

---

## Known Issues / Blockers

### Firebase Authentication Must Be Enabled
- **Issue**: The game requires Anonymous Authentication to be enabled in Firebase Console
- **How to fix**: Go to Firebase Console > Authentication > Sign-in method > Enable "Anonymous"
- **Symptom if not enabled**: Console errors about authentication, unable to create or join games

### Test Mode Required for Realtime Database
- **Issue**: Realtime Database must be in test mode or have appropriate rules
- **How to fix**: Set database rules to allow read/write for testing
- **Symptom if not configured**: Permission denied errors in console

---

## 1. Menu Screen Tests

### 1.1 Name Input
- [ ] Name input field is visible on page load
- [ ] Previously saved name is pre-filled from localStorage
- [ ] Empty name prevents game creation (error message shown)
- [ ] Empty name prevents joining a game (error message shown)
- [ ] Name is saved to localStorage when entering a game

### 1.2 Create Game Button
- [ ] Button is visible and clickable
- [ ] Clicking shows "Creating..." loading state
- [ ] Successfully creates game and navigates to lobby
- [ ] Error is shown if Firebase connection fails

### 1.3 Join Game Button
- [ ] Button is visible alongside a code input field
- [ ] Code input accepts 6-character codes
- [ ] Invalid code format shows validation error
- [ ] Non-existent code shows "Game not found" error
- [ ] Code for already-started game shows appropriate error
- [ ] Code for full game shows "Game is full" error
- [ ] Valid code joins game and navigates to lobby

---

## 2. Lobby System Tests

### 2.1 Game Code Display
- [ ] 6-character game code is prominently displayed
- [ ] Code is large and easy to read/share
- [ ] Code can be selected for copying

### 2.2 Player List
- [ ] Host (creator) is shown in the player list
- [ ] Each player has their assigned color displayed
- [ ] Player colors are distinct (Coral, Teal, Yellow, Mint)
- [ ] New players appear in real-time when they join
- [ ] Players are removed from list when they leave

### 2.3 Start Game Button (Host Only)
- [ ] Start button is ONLY visible to the host
- [ ] Start button is disabled with fewer than 2 players
- [ ] Start button becomes enabled with 2+ players
- [ ] Clicking Start changes game status to "active"
- [ ] All connected clients transition to game screen

### 2.4 Leave Button
- [ ] Leave button is visible to all players
- [ ] Clicking Leave removes player from game
- [ ] Player is returned to menu screen
- [ ] If host leaves while waiting, game is deleted
- [ ] If host leaves, new host is assigned

### 2.5 Waiting Status
- [ ] "Waiting for players..." message is shown
- [ ] Status updates when game starts

---

## 3. Game Board Tests

### 3.1 Dot Grid Rendering
- [ ] 6x6 grid of dots is displayed (for 5x5 boxes)
- [ ] Dots are evenly spaced
- [ ] Dots are clearly visible filled circles
- [ ] Canvas scales appropriately on different screen sizes
- [ ] Canvas is sharp (correct pixel ratio handling)

### 3.2 Line Drawing - Click Method
- [ ] Clicking a dot ACTIVATES it with pulsating animation
- [ ] Activated dot shows current player's color
- [ ] Clicking an ADJACENT dot draws a line between them
- [ ] Line is drawn in the current player's color
- [ ] Clicking non-adjacent dot switches activation to new dot
- [ ] Clicking empty space deactivates current selection
- [ ] Cannot draw line where one already exists

### 3.3 Line Drawing - Drag Method
- [ ] Pressing and dragging from a dot shows a preview line
- [ ] Preview line follows cursor/touch position
- [ ] Line shows as dashed/semi-transparent when not snapped
- [ ] Line snaps to adjacent dot when close enough
- [ ] Snapped line shows as solid
- [ ] Releasing while snapped completes the line
- [ ] Releasing without snap cancels the action
- [ ] Works with both mouse and touch input

### 3.4 Box Completion
- [ ] Box fills with player's color when all 4 sides drawn
- [ ] Fill is semi-transparent (doesn't obscure lines)
- [ ] Fill is drawn behind the lines
- [ ] Player's score increments by 1

### 3.5 Special Squares - Golden
- [ ] Golden squares are visually distinct (special marking)
- [ ] Completing a golden square awards a banked turn
- [ ] Player still gets extra turn (like normal completion)

### 3.6 Special Squares - Penalty
- [ ] Penalty squares are visually distinct (special marking)
- [ ] Completing a penalty square forfeits the current turn
- [ ] Turn advances to next player (no extra turn)

---

## 4. Turn System Tests

### 4.1 Turn Indicator
- [ ] Current player is highlighted in scoreboard
- [ ] "Your turn" indicator is shown when it's your turn
- [ ] Turn indicator updates when turn changes
- [ ] Indicator correctly shows other player's turn

### 4.2 Turn Enforcement
- [ ] Cannot draw lines when it's not your turn
- [ ] "Not your turn" feedback is shown if attempted
- [ ] Turn advances after drawing a line (if no box completed)
- [ ] Turn does NOT advance if a box is completed (extra turn)
- [ ] Turn DOES advance after completing a penalty square

### 4.3 Extra Turns
- [ ] Completing a box grants another turn
- [ ] Can complete multiple boxes in one turn
- [ ] Only advances to next player when no boxes completed

### 4.4 Banked Turns (from Golden Squares)
- [ ] Banked turns are tracked per player
- [ ] Banked turn can be consumed (if UI for this exists)

---

## 5. Game Over Screen Tests

### 5.1 Trigger Condition
- [ ] Game ends when all 25 boxes are completed
- [ ] Game status changes to "finished"

### 5.2 Winner Display
- [ ] Winner's name is prominently displayed
- [ ] Winner is determined by highest score
- [ ] Tie case is handled appropriately

### 5.3 Final Scores
- [ ] All players' final scores are displayed
- [ ] Scores match the boxes completed by each player

### 5.4 Play Again Button
- [ ] "Play Again" button is visible
- [ ] Clicking cleans up the current session
- [ ] Player is returned to the menu screen
- [ ] Player can create or join a new game

---

## 6. Multiplayer Synchronization Tests

### 6.1 Setup for Multiplayer Testing
1. Open the game in Browser Window A
2. Create a game and note the code
3. Open the game in Browser Window B (or another device)
4. Join using the game code
5. Start the game from the host window

### 6.2 Real-Time Sync - Lines
- [ ] Line drawn in Window A appears in Window B immediately
- [ ] Line drawn in Window B appears in Window A immediately
- [ ] Lines appear in the correct player color
- [ ] Line positions are identical in both windows

### 6.3 Real-Time Sync - Boxes
- [ ] Box completion in one window shows in the other
- [ ] Box fill color matches completing player's color
- [ ] Score updates appear in both windows

### 6.4 Real-Time Sync - Turns
- [ ] Turn indicator updates in both windows simultaneously
- [ ] Both windows agree on whose turn it is
- [ ] Turn enforcement works across windows

### 6.5 Real-Time Sync - Game Over
- [ ] Both windows show game over when last box is filled
- [ ] Winner is the same in both windows
- [ ] Final scores match in both windows

### 6.6 State Conflict Resolution
- [ ] Firebase state is trusted over local state
- [ ] Rapid clicking doesn't cause desync
- [ ] Both clients remain in sync after many moves

---

## 7. Browser Console Checks

During testing, keep the browser console open (F12 > Console) and watch for:

### Expected Console Output
- Firebase initialization success message
- Anonymous authentication success with user ID
- Game state updates logged (optional debug logs)

### Error Indicators - Authentication
- `auth/operation-not-allowed` - Anonymous auth not enabled
- `auth/network-request-failed` - Network connectivity issue
- `permission-denied` - Firebase rules blocking access

### Error Indicators - Database
- `PERMISSION_DENIED` - Database rules not configured
- `Reference does not exist` - Invalid game code or deleted game
- Network timeout errors - Connectivity issues

### Error Indicators - Game Logic
- `Not your turn` messages when clicking out of turn
- Line already exists warnings
- Invalid move rejection messages

### Performance Checks
- No excessive re-rendering warnings
- No memory leak indicators
- Smooth 60fps during line preview/drag

---

## 8. Mobile-Specific Tests

### 8.1 Responsive Layout
- [ ] Menu screen is usable on mobile viewport
- [ ] Lobby screen is readable and buttons are tappable
- [ ] Game board scales to fit mobile screen
- [ ] Scores/turn indicator visible on mobile

### 8.2 Touch Input
- [ ] Touch to activate dot works
- [ ] Touch drag to draw line works
- [ ] No accidental scrolling during game interaction
- [ ] No text selection during drag operations

### 8.3 Orientation
- [ ] Portrait mode displays correctly
- [ ] Landscape mode displays correctly (if supported)

---

## 9. Edge Case Tests

### 9.1 Disconnection Handling
- [ ] Refresh page during game - can rejoin via code
- [ ] Close browser - other players can continue
- [ ] Network interruption - reconnects when restored

### 9.2 Rapid Actions
- [ ] Rapid clicking doesn't cause duplicate lines
- [ ] Rapid box completions are handled correctly
- [ ] No race conditions between players

### 9.3 Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Test Results Template

| Test Section | Passed | Failed | Notes |
|--------------|--------|--------|-------|
| 1. Menu Screen | | | |
| 2. Lobby System | | | |
| 3. Game Board | | | |
| 4. Turn System | | | |
| 5. Game Over | | | |
| 6. Multiplayer Sync | | | |
| 7. Console Checks | | | |
| 8. Mobile Tests | | | |
| 9. Edge Cases | | | |

---

## Quick Smoke Test

For rapid verification, complete this minimal test:

1. [ ] Open app in two browser windows
2. [ ] Create game in Window A, join in Window B
3. [ ] Start game (host in Window A)
4. [ ] Draw lines alternating between windows
5. [ ] Complete at least one box, verify score updates
6. [ ] Play until game ends
7. [ ] Verify winner display matches in both windows
8. [ ] Click Play Again and return to menu

If all smoke test steps pass, the core functionality is working.

---

*Last Updated: 2026-01-09*
