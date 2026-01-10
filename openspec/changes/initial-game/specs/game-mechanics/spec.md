# Game Mechanics

## ADDED Requirements

### Requirement: Game Board Rendering
The system SHALL render a 5×5 grid of boxes (6×6 dots) in portrait orientation.

#### Scenario: Initial board display
- **WHEN** a game starts
- **THEN** the system displays 36 dots arranged in a 6×6 grid
- **AND** no lines are drawn between dots
- **AND** all 25 potential boxes are empty

#### Scenario: Dots are tappable targets
- **WHEN** a player taps between two adjacent dots (horizontal or vertical)
- **THEN** the system detects the intended line
- **AND** provides visual feedback for the tap target

### Requirement: Line Drawing
The system SHALL allow players to draw lines between adjacent dots.

#### Scenario: Valid line placement
- **WHEN** a player taps between two horizontally or vertically adjacent dots
- **AND** no line exists between those dots
- **THEN** the system draws a line in the current player's color
- **AND** records the line ownership

#### Scenario: Invalid line placement (already exists)
- **WHEN** a player taps between two dots that already have a line
- **THEN** the system ignores the tap
- **AND** no change occurs to the game state

#### Scenario: Invalid line placement (diagonal)
- **WHEN** a player taps between two diagonally adjacent dots
- **THEN** the system ignores the tap
- **AND** no line is drawn

### Requirement: Box Completion Detection
The system SHALL detect when a box is completed by the fourth surrounding line.

#### Scenario: Box completed
- **WHEN** a player draws a line
- **AND** that line completes the fourth side of a box
- **THEN** the system marks that box as owned by the current player
- **AND** fills the box with the player's color
- **AND** increments the player's score by 1

#### Scenario: Multiple boxes completed
- **WHEN** a player draws a line that completes two adjacent boxes
- **THEN** the system awards both boxes to the current player
- **AND** increments the player's score by 2

### Requirement: Turn Management
The system SHALL manage turn order among 2-4 players.

#### Scenario: Normal turn progression
- **WHEN** a player draws a line that does not complete any box
- **THEN** the turn passes to the next player in round-robin order

#### Scenario: Extra turn on box completion
- **WHEN** a player draws a line that completes one or more boxes
- **THEN** the same player continues their turn
- **AND** may draw another line

#### Scenario: Current player indication
- **WHEN** a game is in progress
- **THEN** the UI clearly highlights whose turn it is
- **AND** displays all player scores

### Requirement: Game Over Detection
The system SHALL detect when the game ends.

#### Scenario: All boxes filled
- **WHEN** all 25 boxes have been completed
- **THEN** the system ends the game
- **AND** determines the winner (highest score)
- **AND** displays the game over screen

#### Scenario: Tie game
- **WHEN** the game ends
- **AND** two or more players have the same highest score
- **THEN** the system declares a tie among those players
