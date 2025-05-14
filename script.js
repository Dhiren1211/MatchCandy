// Game configuration
const config = {
    boardSize: 8,
    candyTypes: ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍒', '🍑'],
    initialMoves: 25,
    soundEnabled: true,
    specialTypes: {
        BOMB: '💣',
        HORIZONTAL_LAUNCHER: '➡️',
        VERTICAL_LAUNCHER: '⬇️'
    }
};

// Game state
let state = {
    board: [],
    selectedTile: null,
    score: 0,
    moves: config.initialMoves,
    level: 1,
    goal: 1000,
    mission: "Score 1000 points in 25 moves!",
    isAnimating: false,
    swapInProgress: false
};

// DOM elements
const elements = {
    board: document.getElementById('board'),
    level: document.getElementById('level'),
    moves: document.getElementById('moves'),
    score: document.getElementById('score'),
    goal: document.getElementById('goal'),
    missionText: document.getElementById('mission-text'),
    progressBar: document.getElementById('progress-bar'),
    levelCompleteModal: document.getElementById('level-complete'),
    levelFailedModal: document.getElementById('level-failed'),
    finalScore: document.getElementById('final-score'),
    movesLeft: document.getElementById('moves-left'),
    nextLevelBtn: document.getElementById('next-level-btn'),
    retryBtn: document.getElementById('retry-btn'),
    hintBtn: document.getElementById('hint-btn'),
    soundBtn: document.getElementById('sound-btn'),
    swapSound: document.getElementById('swap-sound'),
    matchSound: document.getElementById('match-sound'),
    winSound: document.getElementById('win-sound'),
    loseSound: document.getElementById('lose-sound'),
    bombSound: document.getElementById('bomb-sound'),
    launcherSound: document.getElementById('launcher-sound')
};

// Level data
const levels = [
    {
        level: 1,
        moves: 25,
        goal: 1000,
        mission: "Score 1000 points in 25 moves!",
        candyTypes: ['🍎', '🍊', '🍋', '🍇', '🍉']
    },
    {
        level: 2,
        moves: 20,
        goal: 1500,
        mission: "Score 1500 points in 20 moves!",
        candyTypes: ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓']
    },
    {
        level: 3,
        moves: 15,
        goal: 2000,
        mission: "Score 2000 points in 15 moves!",
        candyTypes: ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍒']
    }
];

// Initialize the game
function init() {
    createBoard();
    setupEventListeners();
    updateUI();
}

// Create the game board
function createBoard() {
    elements.board.innerHTML = '';
    state.board = [];

    // Create board array
    for (let row = 0; row < config.boardSize; row++) {
        state.board[row] = [];
        for (let col = 0; col < config.boardSize; col++) {
            // Get random candy type from current level's available types
            const levelData = levels.find(l => l.level === state.level);
            const candyTypes = levelData ? levelData.candyTypes : config.candyTypes;
            const randomType = candyTypes[Math.floor(Math.random() * candyTypes.length)];

            state.board[row][col] = {
                type: randomType,
                element: null,
                special: null
            };

            console.log(`Candy at (${row}, ${col}): ${randomType}`); // Debugging log
        }
    }

    // Remove initial matches
    while (findMatches().length > 0) {
        for (const match of findMatches()) {
            const { row, col } = match;
            const levelData = levels.find(l => l.level === state.level);
            const candyTypes = levelData ? levelData.candyTypes : config.candyTypes;
            state.board[row][col].type = candyTypes[Math.floor(Math.random() * candyTypes.length)];
            state.board[row][col].special = null;
        }
    }

    // Create DOM elements
    for (let row = 0; row < config.boardSize; row++) {
        for (let col = 0; col < config.boardSize; col++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.row = row;
            tile.dataset.col = col;

            tile.addEventListener('click', () => handleTileClick(row, col));

            elements.board.appendChild(tile);
            state.board[row][col].element = tile;

            // Update tile appearance after assigning the element
            updateTileAppearance(row, col);
        }
    }
}

// Update tile appearance based on its type and special status
function updateTileAppearance(row, col) {
    const tile = state.board[row][col].element;
    if (!tile) return;

    tile.textContent = state.board[row][col].special || state.board[row][col].type;
    console.log(`Updating tile at (${row}, ${col}): ${tile.textContent}`); // Debugging log

    // Reset classes
    tile.className = 'tile';
    if (state.board[row][col].special === config.specialTypes.BOMB) {
        tile.classList.add('special-bomb');
    } else if (
        state.board[row][col].special === config.specialTypes.HORIZONTAL_LAUNCHER ||
        state.board[row][col].special === config.specialTypes.VERTICAL_LAUNCHER
    ) {
        tile.classList.add('special-launcher');
    }
}

// Set up event listeners
function setupEventListeners() {
    elements.nextLevelBtn.addEventListener('click', loadNextLevel);
    elements.retryBtn.addEventListener('click', retryLevel);
    elements.hintBtn.addEventListener('click', showHint);
    elements.soundBtn.addEventListener('click', toggleSound);
}

// Handle tile click
function handleTileClick(row, col) {
    if (state.isAnimating || state.swapInProgress) return;

    const tile = state.board[row][col].element;

    // If no tile is selected, select this one
    if (!state.selectedTile) {
        state.selectedTile = { row, col };
        tile.classList.add('selected');
        return;
    }

    // If clicking the same tile, deselect it
    if (state.selectedTile.row === row && state.selectedTile.col === col) {
        state.selectedTile = null;
        tile.classList.remove('selected');
        return;
    }

    // Check if tiles are adjacent
    const isAdjacent =
        (Math.abs(state.selectedTile.row - row) === 1 && state.selectedTile.col === col) ||
        (Math.abs(state.selectedTile.col - col) === 1 && state.selectedTile.row === row);

    if (!isAdjacent) {
        // Deselect previous tile
        state.board[state.selectedTile.row][state.selectedTile.col].element.classList.remove('selected');
        // Select new tile
        state.selectedTile = { row, col };
        tile.classList.add('selected');
        return;
    }

    // Swap tiles
    swapTiles(state.selectedTile.row, state.selectedTile.col, row, col);

    // Deselect tiles
    state.board[state.selectedTile.row][state.selectedTile.col].element.classList.remove('selected');
    state.selectedTile = null;
}

// Swap two tiles with animation
function swapTiles(row1, col1, row2, col2) {
    if (state.swapInProgress) return;
    state.swapInProgress = true;

    // Play swap sound
    if (config.soundEnabled) {
        elements.swapSound.currentTime = 0;
        elements.swapSound.play();
    }

    const tile1 = state.board[row1][col1].element;
    const tile2 = state.board[row2][col2].element;

    // Calculate swap direction
    const directionX = col2 - col1;
    const directionY = row2 - row1;

    // Animate swap
    tile1.style.transform = `translate(${directionX * 100}%, ${directionY * 100}%)`;
    tile2.style.transform = `translate(${-directionX * 100}%, ${-directionY * 100}%)`;

    // After animation completes
    setTimeout(() => {
        // Swap in the board array
        const tempType = state.board[row1][col1].type;
        const tempSpecial = state.board[row1][col1].special;

        state.board[row1][col1].type = state.board[row2][col2].type;
        state.board[row1][col1].special = state.board[row2][col2].special;

        state.board[row2][col2].type = tempType;
        state.board[row2][col2].special = tempSpecial;

        // Reset transforms
        tile1.style.transform = '';
        tile2.style.transform = '';

        // Update tile appearances
        updateTileAppearance(row1, col1);
        updateTileAppearance(row2, col2);

        // Check for matches after swap
        const matches = findMatches();

        if (matches.length > 0) {
            processMatches(matches);
            state.moves--;
            updateUI();

            if (state.score >= state.goal) {
                setTimeout(completeLevel, 1000);
            } else if (state.moves <= 0) {
                setTimeout(failLevel, 1000);
            }
        } else {
            // No matches, swap back with animation
            tile1.style.transform = `translate(${-directionX * 100}%, ${-directionY * 100}%)`;
            tile2.style.transform = `translate(${directionX * 100}%, ${directionY * 100}%)`;

            setTimeout(() => {
                // Swap back in the board array
                const tempType = state.board[row1][col1].type;
                const tempSpecial = state.board[row1][col1].special;

                state.board[row1][col1].type = state.board[row2][col2].type;
                state.board[row1][col1].special = state.board[row2][col2].special;

                state.board[row2][col2].type = tempType;
                state.board[row2][col2].special = tempSpecial;

                // Reset transforms
                tile1.style.transform = '';
                tile2.style.transform = '';

                // Update tile appearances
                updateTileAppearance(row1, col1);
                updateTileAppearance(row2, col2);

                state.swapInProgress = false;
            }, 300);
        }
    }, 300);
}

// Find all matches on the board
function findMatches() {
    const matches = [];

    // Check horizontal matches
    for (let row = 0; row < config.boardSize; row++) {
        for (let col = 0; col < config.boardSize - 2; col++) {
            const type = state.board[row][col].type;
            if (!type) continue;

            if (type === state.board[row][col + 1].type &&
                type === state.board[row][col + 2].type) {

                // Check for longer matches (4, 5, etc.)
                let matchLength = 3;
                while (col + matchLength < config.boardSize &&
                    state.board[row][col + matchLength].type === type) {
                    matchLength++;
                }

                // Add all tiles in the match
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row, col: col + i });
                }

                col += matchLength - 1;
            }
        }
    }

    // Check vertical matches
    for (let col = 0; col < config.boardSize; col++) {
        for (let row = 0; row < config.boardSize - 2; row++) {
            const type = state.board[row][col].type;
            if (!type) continue;

            if (type === state.board[row + 1][col].type &&
                type === state.board[row + 2][col].type) {

                // Check for longer matches (4, 5, etc.)
                let matchLength = 3;
                while (row + matchLength < config.boardSize &&
                    state.board[row + matchLength][col].type === type) {
                    matchLength++;
                }

                // Add all tiles in the match
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row: row + i, col });
                }

                row += matchLength - 1;
            }
        }
    }

    // Remove duplicates
    const uniqueMatches = [];
    const seen = new Set();

    for (const match of matches) {
        const key = `${match.row},${match.col}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMatches.push(match);
        }
    }

    return uniqueMatches;
}

// Process matches (remove tiles, calculate score, create special candies)
function processMatches(matches) {
    // Play match sound
    if (config.soundEnabled) {
        elements.matchSound.currentTime = 0;
        elements.matchSound.play();
    }

    // Group matches by type to find match lengths
    const matchesByType = {};
    matches.forEach(({ row, col }) => {
        const type = state.board[row][col].type;
        if (!matchesByType[type]) matchesByType[type] = [];
        matchesByType[type].push({ row, col });
    });

    // Create special candies for larger matches
    Object.entries(matchesByType).forEach(([type, typeMatches]) => {
        if (typeMatches.length >= 5) {
            // Create bomb for 5+ matches
            const middleMatch = typeMatches[Math.floor(typeMatches.length / 2)];
            state.board[middleMatch.row][middleMatch.col].special = config.specialTypes.BOMB;
            state.board[middleMatch.row][middleMatch.col].type = type;
        } else if (typeMatches.length === 4) {
            // Create launcher for 4 matches
            // Check if horizontal or vertical match
            const first = typeMatches[0];
            const second = typeMatches[1];

            if (first.row === second.row) {
                // Horizontal match
                state.board[first.row][first.col].special = config.specialTypes.HORIZONTAL_LAUNCHER;
            } else {
                // Vertical match
                state.board[first.row][first.col].special = config.specialTypes.VERTICAL_LAUNCHER;
            }
            state.board[first.row][first.col].type = type;
        }
    });

    // Mark matched tiles for removal (except those that became special)
    for (const { row, col } of matches) {
        if (!state.board[row][col].special) {
            const tile = state.board[row][col].element;
            tile.classList.add('matched');
        } else {
            // Update appearance for new special candies
            updateTileAppearance(row, col);
        }
    }

    // Calculate score
    const baseScore = 100;
    const multiplier = Math.floor(matches.length / 3);
    const scoreGain = baseScore * multiplier * multiplier;
    state.score += scoreGain;

    // Remove matched tiles after animation
    setTimeout(() => {
        // Process special candies first
        const specialCandies = [];

        for (let row = 0; row < config.boardSize; row++) {
            for (let col = 0; col < config.boardSize; col++) {
                if (state.board[row][col].special) {
                    specialCandies.push({ row, col, special: state.board[row][col].special });
                }
            }
        }

        // Clear all matched tiles (non-special)
        for (const { row, col } of matches) {
            if (!state.board[row][col].special) {
                state.board[row][col].type = null;
                state.board[row][col].special = null;
                const tile = state.board[row][col].element;
                tile.textContent = '';
                tile.classList.remove('matched');
            }
        }

        // Process special candies
        if (specialCandies.length > 0) {
            processSpecialCandies(specialCandies);
        } else {
            dropTiles();
        }
    }, 400);
}

// Process special candies (bombs and launchers)
function processSpecialCandies(specialCandies) {
    state.isAnimating = true;

    // Process each special candy with delay between them
    specialCandies.forEach(({ row, col, special }, index) => {
        setTimeout(() => {
            const tile = state.board[row][col].element;

            if (special === config.specialTypes.BOMB) {
                // Play bomb sound
                if (config.soundEnabled) {
                    elements.bombSound.currentTime = 0;
                    elements.bombSound.play();
                }

                // Create explosion effect
                const explosion = document.createElement('div');
                explosion.className = 'bomb-explosion';
                tile.appendChild(explosion);

                // Remove bomb
                state.board[row][col].type = null;
                state.board[row][col].special = null;
                tile.textContent = '';

                // Remove explosion after animation
                setTimeout(() => {
                    tile.removeChild(explosion);
                }, 500);

                // Destroy surrounding tiles (3x3 area)
                const affectedTiles = [];
                for (let r = Math.max(0, row - 1); r <= Math.min(config.boardSize - 1, row + 1); r++) {
                    for (let c = Math.max(0, col - 1); c <= Math.min(config.boardSize - 1, col + 1); c++) {
                        if (state.board[r][c].type) {
                            affectedTiles.push({ row: r, col: c });
                            state.board[r][c].type = null;
                            state.board[r][c].special = null;
                            state.board[r][c].element.textContent = '';
                        }
                    }
                }

                // Add score for destroyed tiles
                state.score += affectedTiles.length * 50;
                updateUI();

            } else if (special === config.specialTypes.HORIZONTAL_LAUNCHER ||
                special === config.specialTypes.VERTICAL_LAUNCHER) {
                // Play launcher sound
                if (config.soundEnabled) {
                    elements.launcherSound.currentTime = 0;
                    elements.launcherSound.play();
                }

                // Create beam effect
                const beam = document.createElement('div');
                beam.className = `launcher-beam ${special === config.specialTypes.HORIZONTAL_LAUNCHER ? 'horizontal-beam' : 'vertical-beam'}`;
                tile.appendChild(beam);

                // Remove launcher
                state.board[row][col].type = null;
                state.board[row][col].special = null;
                tile.textContent = '';

                // Remove beam after animation
                setTimeout(() => {
                    tile.removeChild(beam);
                }, 500);

                // Destroy entire row or column
                const affectedTiles = [];
                if (special === config.specialTypes.HORIZONTAL_LAUNCHER) {
                    // Destroy entire row
                    for (let c = 0; c < config.boardSize; c++) {
                        if (state.board[row][c].type) {
                            affectedTiles.push({ row, col: c });
                            state.board[row][c].type = null;
                            state.board[row][c].special = null;
                            state.board[row][c].element.textContent = '';
                        }
                    }
                } else {
                    // Destroy entire column
                    for (let r = 0; r < config.boardSize; r++) {
                        if (state.board[r][col].type) {
                            affectedTiles.push({ row: r, col });
                            state.board[r][col].type = null;
                            state.board[r][col].special = null;
                            state.board[r][col].element.textContent = '';
                        }
                    }
                }

                // Add score for destroyed tiles
                state.score += affectedTiles.length * 30;
                updateUI();
            }

            // After last special candy is processed, drop tiles
            if (index === specialCandies.length - 1) {
                setTimeout(() => {
                    dropTiles();
                }, 500);
            }
        }, index * 300);
    });
}

// Drop tiles to fill empty spaces
function dropTiles() {
    // Move tiles down
    for (let col = 0; col < config.boardSize; col++) {
        let emptyRow = config.boardSize - 1;

        for (let row = config.boardSize - 1; row >= 0; row--) {
            if (state.board[row][col].type !== null) {
                if (row !== emptyRow) {
                    // Move tile down
                    state.board[emptyRow][col].type = state.board[row][col].type;
                    state.board[emptyRow][col].special = state.board[row][col].special;
                    state.board[row][col].type = null;
                    state.board[row][col].special = null;

                    // Update DOM with animation
                    updateTileAppearance(emptyRow, col);
                    state.board[emptyRow][col].element.classList.add('falling');

                    setTimeout(() => {
                        state.board[emptyRow][col].element.classList.remove('falling');
                    }, 500);
                }
                emptyRow--;
            }
        }

        // Fill empty spaces at the top with new candies
        for (let row = emptyRow; row >= 0; row--) {
            const levelData = levels.find(l => l.level === state.level);
            const candyTypes = levelData ? levelData.candyTypes : config.candyTypes;
            state.board[row][col].type = candyTypes[Math.floor(Math.random() * candyTypes.length)];
            state.board[row][col].special = null;

            // Update DOM with animation
            updateTileAppearance(row, col);
            state.board[row][col].element.classList.add('falling');

            setTimeout(() => {
                state.board[row][col].element.classList.remove('falling');
            }, 500);
        }
    }

    // Check for new matches after dropping
    setTimeout(() => {
        const newMatches = findMatches();

        if (newMatches.length > 0) {
            processMatches(newMatches);
        } else {
            state.isAnimating = false;
            state.swapInProgress = false;

            if (state.score >= state.goal) {
                completeLevel();
            } else if (state.moves <= 0) {
                failLevel();
            }
        }
    }, 500);
}

// Update UI elements
function updateUI() {
    elements.level.textContent = state.level;
    elements.moves.textContent = state.moves;
    elements.score.textContent = state.score;
    elements.goal.textContent = state.goal;

    // Update progress bar
    const progress = Math.min(state.score / state.goal * 100, 100);
    elements.progressBar.style.width = `${progress}%`;
}

// Complete the current level
function completeLevel() {
    if (config.soundEnabled) {
        elements.winSound.currentTime = 0;
        elements.winSound.play();
    }

    state.isAnimating = true;
    elements.finalScore.textContent = state.score;
    elements.movesLeft.textContent = state.moves;
    elements.levelCompleteModal.classList.add('active');

    // Prepare for the next level
  elements.nextLevelBtn.addEventListener('click', () => {
    state.level++;
    const nextLevel = levels.find(l => l.level === state.level);
    if (nextLevel) {
        state.moves = nextLevel.moves;
        state.goal = nextLevel.goal;
        state.mission = nextLevel.mission;
        state.score = 0;
        state.isAnimating = false;
        state.swapInProgress = false;
        elements.levelCompleteModal.classList.remove('active');
        state.level = nextLevel.level;
        state.goal = nextLevel.goal;
        init();
    } else {
        alert('Congratulations! You have completed all levels!');
        elements.levelCompleteModal.classList.remove('active');
        state.level = 1;
    }
});

}
window.onload = init;