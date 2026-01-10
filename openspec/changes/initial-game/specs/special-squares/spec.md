# Special Squares

## ADDED Requirements

### Requirement: Special Square Placement
The system SHALL place golden and penalty squares randomly at game start.

#### Scenario: Golden squares placed
- **WHEN** a new game is created
- **THEN** the system randomly places 1-2 golden squares on the board
- **AND** golden squares are not placed in corner positions
- **AND** positions are stored in the game state

#### Scenario: Penalty squares placed
- **WHEN** a new game is created
- **THEN** the system randomly places 1-2 penalty squares on the board
- **AND** penalty squares are not adjacent to golden squares
- **AND** penalty squares are not placed in corner positions
- **AND** positions are stored in the game state

#### Scenario: Special squares visible
- **WHEN** the game board is displayed
- **THEN** golden squares show a gold/yellow marker in their center
- **AND** penalty squares show a red marker in their center
- **AND** markers are visible before the box is completed

### Requirement: Golden Square Completion
The system SHALL award a banked bonus turn when a golden square is completed.

#### Scenario: Player completes golden square
- **WHEN** a player completes a golden square
- **THEN** the player's banked turns counter increases by 1
- **AND** the player receives the normal +1 point
- **AND** the player receives the normal extra turn (for completing a box)
- **AND** the golden marker is replaced by the player's fill color

#### Scenario: Banked turns accumulate
- **WHEN** a player completes multiple golden squares
- **THEN** the banked turns stack (can hold multiple)

### Requirement: Penalty Square Completion
The system SHALL forfeit the player's turn when a penalty square is completed.

#### Scenario: Player completes penalty square
- **WHEN** a player completes a penalty square
- **THEN** the player receives the normal +1 point
- **BUT** the player's turn immediately ends
- **AND** no extra turn is granted (despite completing a box)
- **AND** the penalty marker is replaced by the player's fill color

#### Scenario: Penalty overrides extra turn (normal square)
- **WHEN** a player completes both a penalty square and a normal square in one move
- **THEN** the penalty effect takes precedence
- **AND** the player's turn ends immediately
- **AND** both boxes are scored (+2 points)

#### Scenario: Penalty with golden square
- **WHEN** a player completes both a penalty square and a golden square in one move
- **THEN** the penalty effect takes precedence (turn ends)
- **BUT** the golden square still banks a bonus turn
- **AND** both boxes are scored (+2 points)

### Requirement: Banked Turn Usage
The system SHALL allow players to use banked bonus turns.

#### Scenario: Using a banked turn
- **WHEN** it is a player's turn
- **AND** the player has one or more banked turns
- **AND** the player would normally end their turn (no box completed)
- **THEN** the player may choose to use a banked turn
- **AND** continue playing

#### Scenario: Banked turn UI
- **WHEN** a player has banked turns
- **THEN** the UI displays the banked turn count
- **AND** shows a "Use Banked Turn" button when applicable

#### Scenario: End turn without using banked turns
- **WHEN** a player has banked turns
- **AND** their normal turn is ending
- **THEN** the player may choose "End Turn" to pass without using banked turns
- **AND** the banked turns remain for future use

#### Scenario: Banked turn consumed
- **WHEN** a player uses a banked turn
- **THEN** the banked turn counter decreases by 1
- **AND** the player may draw another line
