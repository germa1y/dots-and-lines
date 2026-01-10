# Multiplayer

## ADDED Requirements

### Requirement: Game Creation
The system SHALL allow players to create new multiplayer games.

#### Scenario: Host creates game
- **WHEN** a player selects "Create Game" from the main menu
- **THEN** the system generates a unique 6-character game code
- **AND** creates a new game document in Firestore
- **AND** adds the creating player as the first player (host)
- **AND** transitions to the lobby screen

#### Scenario: Game code uniqueness
- **WHEN** generating a game code
- **THEN** the system verifies the code is not already in use
- **AND** uses alphanumeric characters for readability

### Requirement: Game Joining
The system SHALL allow players to join existing games via code.

#### Scenario: Player joins with valid code
- **WHEN** a player enters a valid game code
- **AND** the game is in "waiting" status
- **AND** fewer than 4 players have joined
- **THEN** the system adds the player to the game
- **AND** assigns them a unique color
- **AND** transitions to the lobby screen

#### Scenario: Invalid game code
- **WHEN** a player enters a game code that does not exist
- **THEN** the system displays an error message
- **AND** allows the player to try again

#### Scenario: Game already started
- **WHEN** a player enters a code for a game in "active" status
- **THEN** the system displays "Game already in progress"
- **AND** does not allow joining

#### Scenario: Game full
- **WHEN** a player enters a code for a game with 4 players
- **THEN** the system displays "Game is full"
- **AND** does not allow joining

### Requirement: Lobby Management
The system SHALL manage the pre-game lobby.

#### Scenario: Display players in lobby
- **WHEN** players are in the lobby
- **THEN** the system displays all joined players
- **AND** shows each player's name and assigned color

#### Scenario: Host starts game
- **WHEN** the host selects "Start Game"
- **AND** at least 2 players have joined
- **THEN** the system changes game status to "active"
- **AND** all clients transition to the game board

#### Scenario: Cannot start with one player
- **WHEN** only one player is in the lobby
- **THEN** the "Start Game" button is disabled
- **AND** displays "Waiting for players..."

#### Scenario: Player leaves lobby
- **WHEN** a player leaves the lobby before game starts
- **THEN** the system removes them from the player list
- **AND** updates all other clients

### Requirement: Real-time State Synchronization
The system SHALL synchronize game state across all clients in real-time.

#### Scenario: Line drawn syncs to all clients
- **WHEN** a player draws a line
- **THEN** the system writes the line to Firestore
- **AND** Firestore onSnapshot triggers on all connected browsers
- **AND** all clients render the new line within 500ms

#### Scenario: Box completion syncs
- **WHEN** a box is completed
- **THEN** all clients update the box ownership
- **AND** all clients update scores

#### Scenario: Turn change syncs
- **WHEN** the current player changes
- **THEN** all clients update the turn indicator

### Requirement: Turn Validation
The system SHALL prevent out-of-turn plays.

#### Scenario: Correct player makes move
- **WHEN** the current player draws a line
- **THEN** the system accepts and processes the move

#### Scenario: Wrong player attempts move
- **WHEN** a player who is not the current player attempts to draw a line
- **THEN** the system rejects the move
- **AND** does not write to Firestore

### Requirement: Disconnect Handling
The system SHALL handle player disconnections gracefully.

#### Scenario: Player disconnects mid-game
- **WHEN** a player disconnects during an active game
- **AND** it is their turn
- **THEN** the system waits for a timeout period (30 seconds)
- **AND** then skips their turn to the next player

#### Scenario: Player reconnects
- **WHEN** a disconnected player reconnects
- **AND** the game is still active
- **THEN** the system restores their view of the current game state

#### Scenario: Host disconnects
- **WHEN** the host player disconnects
- **AND** the game is in "waiting" or "active" status
- **THEN** the system assigns host role to the next player in order
- **AND** updates the hostId in Firestore
- **AND** notifies remaining players of host change
