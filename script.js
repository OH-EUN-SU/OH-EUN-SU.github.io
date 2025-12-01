document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('sudoku-board');
    const difficultySelect = document.getElementById('difficulty');
    const newGameBtn = document.getElementById('new-game-btn');
    const resetBtn = document.getElementById('reset-btn');
    const checkBtn = document.getElementById('check-btn');
    const eraseBtn = document.getElementById('erase-btn');
    const noteBtn = document.getElementById('note-btn');
    const hintBtn = document.getElementById('hint-btn');
    const messageElement = document.getElementById('message');
    const numBtns = document.querySelectorAll('.num-btn');
    const countsContainer = document.getElementById('number-counts');

    let board = [];
    let solution = [];
    let notes = []; // Array of Sets to store notes for each cell
    let selectedCell = null;
    let isNoteMode = false;
    let hintsRemaining = 3;
    let hintCells = new Set();

    // Initialize game
    initGame();

    newGameBtn.addEventListener('click', initGame);
    resetBtn.addEventListener('click', resetGame);
    checkBtn.addEventListener('click', checkSolution);
    hintBtn.addEventListener('click', useHint);

    noteBtn.addEventListener('click', () => {
        isNoteMode = !isNoteMode;
        noteBtn.textContent = isNoteMode ? 'Note: On' : 'Note: Off';
        noteBtn.classList.toggle('active');

        if (!isNoteMode) {
            // Clear all notes when turning off note mode
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    notes[i][j].clear();
                }
            }

            // Re-render all cells to remove note visuals
            document.querySelectorAll('.cell').forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                renderNotes(cell, row, col);
            });
        }
    });

    eraseBtn.addEventListener('click', () => {
        if (selectedCell && !selectedCell.classList.contains('initial')) {
            const row = parseInt(selectedCell.dataset.row);
            const col = parseInt(selectedCell.dataset.col);

            selectedCell.textContent = '';
            selectedCell.classList.remove('user-input', 'error');
            notes[row][col].clear(); // Clear notes too
            renderNotes(selectedCell, row, col);
            updateBoardState();
            updateNumberCounts();
        }
    });

    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (selectedCell && !selectedCell.classList.contains('initial')) {
                fillCell(btn.dataset.num);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;

        if (e.key >= '1' && e.key <= '9') {
            if (!selectedCell.classList.contains('initial')) {
                fillCell(e.key);
            }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            if (!selectedCell.classList.contains('initial')) {
                const row = parseInt(selectedCell.dataset.row);
                const col = parseInt(selectedCell.dataset.col);

                selectedCell.textContent = '';
                selectedCell.classList.remove('user-input', 'error');
                notes[row][col].clear();
                renderNotes(selectedCell, row, col);
                updateBoardState();
                updateNumberCounts();
            }
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            moveSelection(e.key);
        }
    });

    function initGame() {
        const difficulty = difficultySelect.value;
        generateSudoku(difficulty);

        hintsRemaining = 3;
        hintCells = new Set();

        resetGame();
    }

    function resetGame() {
        // Initialize empty notes for 9x9 grid
        notes = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));

        renderBoard();
        updateNumberCounts();
        messageElement.textContent = '';
        messageElement.style.color = 'inherit';

        updateHintButton();

        selectedCell = null;
        if (isNoteMode) {
            isNoteMode = false;
            noteBtn.textContent = 'Note: Off';
            noteBtn.classList.remove('active');
        }
    }

    function updateHintButton() {
        hintBtn.textContent = `Hint (${hintsRemaining})`;
        hintBtn.disabled = hintsRemaining === 0;
    }

    function useHint() {
        if (hintsRemaining <= 0) return;

        let targetCell = null;

        // 1. Try to use selected cell if it's empty or incorrect
        if (selectedCell && !selectedCell.classList.contains('initial')) {
            const row = parseInt(selectedCell.dataset.row);
            const col = parseInt(selectedCell.dataset.col);
            const currentVal = parseInt(selectedCell.textContent);

            if (!currentVal || currentVal !== solution[row][col]) {
                targetCell = selectedCell;
            }
        }

        // 2. If no valid selected cell, find a random empty/incorrect cell
        if (!targetCell) {
            const emptyCells = [];
            document.querySelectorAll('.cell').forEach(cell => {
                if (cell.classList.contains('initial')) return;

                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                const val = parseInt(cell.textContent);

                if (!val || val !== solution[row][col]) {
                    emptyCells.push(cell);
                }
            });

            if (emptyCells.length > 0) {
                targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            }
        }

        if (targetCell) {
            const row = parseInt(targetCell.dataset.row);
            const col = parseInt(targetCell.dataset.col);
            const correctNum = solution[row][col];

            // Fill the cell
            targetCell.textContent = correctNum;
            targetCell.classList.remove('error', 'user-input');
            targetCell.classList.add('initial', 'hint-cell'); // Add hint-cell class 

            // Update board state so it persists on reset
            board[row][col] = correctNum;
            hintCells.add(`${row}-${col}`);

            // Clear notes
            notes[row][col].clear();
            renderNotes(targetCell, row, col);

            // Update state
            hintsRemaining--;
            updateHintButton();
            updateNumberCounts();

            // Highlight
            selectCell(targetCell);
        }
    }

    function generateSudoku(difficulty) {
        // 1. Generate a full valid board
        solution = Array(9).fill().map(() => Array(9).fill(0));
        fillDiagonal();
        solveSudoku(solution);

        // 2. Remove numbers based on difficulty
        board = JSON.parse(JSON.stringify(solution));
        let attempts = 5;
        switch (difficulty) {
            case 'easy': attempts = 30; break;
            case 'medium': attempts = 45; break;
            case 'hard': attempts = 55; break;
        }

        while (attempts > 0) {
            let row = Math.floor(Math.random() * 9);
            let col = Math.floor(Math.random() * 9);
            while (board[row][col] === 0) {
                row = Math.floor(Math.random() * 9);
                col = Math.floor(Math.random() * 9);
            }
            board[row][col] = 0;
            attempts--;
        }
    }

    function fillDiagonal() {
        for (let i = 0; i < 9; i = i + 3) {
            fillBox(i, i);
        }
    }

    function fillBox(row, col) {
        let num;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                do {
                    num = Math.floor(Math.random() * 9) + 1;
                } while (!isSafeInBox(row, col, num, solution));
                solution[row + i][col + j] = num;
            }
        }
    }

    function isSafeInBox(rowStart, colStart, num, currentBoard) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (currentBoard[rowStart + i][colStart + j] === num) {
                    return false;
                }
            }
        }
        return true;
    }

    function isSafe(row, col, num, currentBoard) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (currentBoard[row][x] === num) return false;
        }
        // Check col
        for (let x = 0; x < 9; x++) {
            if (currentBoard[x][col] === num) return false;
        }
        // Check box
        let startRow = row - row % 3;
        let startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (currentBoard[i + startRow][j + startCol] === num) return false;
            }
        }
        return true;
    }

    function solveSudoku(currentBoard) {
        let row = -1;
        let col = -1;
        let isEmpty = true;
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (currentBoard[i][j] === 0) {
                    row = i;
                    col = j;
                    isEmpty = false;
                    break;
                }
            }
            if (!isEmpty) break;
        }

        if (isEmpty) return true;

        for (let num = 1; num <= 9; num++) {
            if (isSafe(row, col, num, currentBoard)) {
                currentBoard[row][col] = num;
                if (solveSudoku(currentBoard)) return true;
                currentBoard[row][col] = 0;
            }
        }
        return false;
    }

    function renderBoard() {
        boardElement.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = i;
                cell.dataset.col = j;

                // Add border classes for visual grouping
                if ((j + 1) % 3 === 0 && j < 8) cell.classList.add('border-right');
                if ((i + 1) % 3 === 0 && i < 8) cell.classList.add('border-bottom');

                if (board[i][j] !== 0) {
                    cell.textContent = board[i][j];
                    cell.classList.add('initial');
                    if (hintCells.has(`${i}-${j}`)) {
                        cell.classList.add('hint-cell');
                    }
                }

                cell.addEventListener('click', () => selectCell(cell));
                boardElement.appendChild(cell);
            }
        }
    }

    function selectCell(cell) {
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }

        // Clear previous highlights
        document.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('related', 'same-num');
        });

        selectedCell = cell;
        selectedCell.classList.add('selected');

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Get the actual value, ignoring notes
        let val = null;
        if (!cell.querySelector('.note-grid')) {
            const text = cell.textContent.trim();
            if (text.length === 1 && text >= '1' && text <= '9') {
                val = text;
            }
        }

        // Highlight related row, col, box
        document.querySelectorAll('.cell').forEach(c => {
            const r = parseInt(c.dataset.row);
            const co = parseInt(c.dataset.col);

            if (r === row || co === col ||
                (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(co / 3) === Math.floor(col / 3))) {
                c.classList.add('related');
            }

            // Highlight same number
            if (val) {
                // Check if this cell has the same value (ignoring notes)
                if (!c.querySelector('.note-grid')) {
                    const cText = c.textContent.trim();
                    if (cText === val) {
                        c.classList.add('same-num');
                    }
                }
            }
        });
    }

    function clearHintHighlights() {
        document.querySelectorAll('.hint-cell').forEach(cell => {
            cell.classList.remove('hint-cell');
        });
    }

    function fillCell(num) {
        clearHintHighlights();
        if (!selectedCell) return;

        const row = parseInt(selectedCell.dataset.row);
        const col = parseInt(selectedCell.dataset.col);

        if (isNoteMode) {
            // Toggle note
            if (notes[row][col].has(num)) {
                notes[row][col].delete(num);
            } else {
                notes[row][col].add(num);
            }

            // If cell has a main number, clear it
            if (selectedCell.textContent && !selectedCell.querySelector('.note-grid')) {
                selectedCell.textContent = '';
                selectedCell.classList.remove('user-input', 'error');
            }
            renderNotes(selectedCell, row, col);
        } else {
            // Normal mode
            selectedCell.textContent = num;
            selectedCell.classList.add('user-input');
            selectedCell.classList.remove('error');

            // Clear notes for this cell when a number is placed
            notes[row][col].clear();

            // Remove any note grid if present
            const noteGrid = selectedCell.querySelector('.note-grid');
            if (noteGrid) noteGrid.remove();

            // Update highlights for new number
            selectCell(selectedCell);
            updateNumberCounts();
        }
    }

    function renderNotes(cell, row, col) {
        // If cell has a main number (and it's not our note grid), don't show notes
        if (cell.childNodes.length === 1 && cell.childNodes[0].nodeType === Node.TEXT_NODE && cell.textContent.trim() !== '') {
            return;
        }

        cell.innerHTML = ''; // Clear cell

        const currentNotes = notes[row][col];
        if (currentNotes.size === 0) return;

        const noteGrid = document.createElement('div');
        noteGrid.classList.add('note-grid');

        for (let i = 1; i <= 9; i++) {
            const noteNum = document.createElement('div');
            noteNum.classList.add('note-num');
            if (currentNotes.has(i.toString())) {
                noteNum.textContent = i;
            }
            noteGrid.appendChild(noteNum);
        }
        cell.appendChild(noteGrid);
    }

    function moveSelection(key) {
        if (!selectedCell) return;
        let row = parseInt(selectedCell.dataset.row);
        let col = parseInt(selectedCell.dataset.col);

        if (key === 'ArrowUp') row = Math.max(0, row - 1);
        if (key === 'ArrowDown') row = Math.min(8, row + 1);
        if (key === 'ArrowLeft') col = Math.max(0, col - 1);
        if (key === 'ArrowRight') col = Math.min(8, col + 1);

        const nextCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (nextCell) {
            selectCell(nextCell);
        }
    }

    function updateBoardState() {
        // Just re-trigger highlight if needed
        if (selectedCell) selectCell(selectedCell);
    }

    function updateNumberCounts() {
        const counts = Array(10).fill(0); // Index 1-9 used
        const cells = document.querySelectorAll('.cell');

        cells.forEach(cell => {
            if (cell.childNodes.length === 1 && cell.childNodes[0].nodeType === Node.TEXT_NODE) {
                const val = parseInt(cell.textContent);
                if (val >= 1 && val <= 9) {
                    counts[val]++;
                }
            }
        });

        if (!countsContainer) return;
        countsContainer.innerHTML = '';

        for (let i = 1; i <= 9; i++) {
            const item = document.createElement('div');
            item.classList.add('count-item');
            if (counts[i] >= 9) item.classList.add('complete');
            if (counts[i] > 9) item.classList.add('exceeded');

            const numSpan = document.createElement('div');
            numSpan.classList.add('num');
            numSpan.textContent = i;

            const countSpan = document.createElement('div');
            countSpan.classList.add('count');
            countSpan.textContent = `${counts[i]}/9`;

            item.appendChild(numSpan);
            item.appendChild(countSpan);
            countsContainer.appendChild(item);
        }

        // Highlight cells on board if count exceeded
        cells.forEach(cell => {
            const hasNoteGrid = cell.querySelector('.note-grid');
            if (!hasNoteGrid) {
                const text = cell.textContent.trim();
                if (text.length === 1 && text >= '1' && text <= '9') {
                    const val = parseInt(text);
                    if (counts[val] > 9) {
                        cell.classList.add('limit-exceeded');
                    } else {
                        cell.classList.remove('limit-exceeded');
                    }
                    return;
                }
            }
            cell.classList.remove('limit-exceeded');
        });
    }


    function checkSolution() {
        let isCorrect = true;
        let isComplete = true;
        const cells = document.querySelectorAll('.cell');

        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            // Check if cell has a main number (ignore notes)
            let val = null;
            const hasNoteGrid = cell.querySelector('.note-grid');
            if (!hasNoteGrid) {
                const text = cell.textContent.trim();
                if (text.length === 1 && text >= '1' && text <= '9') {
                    val = parseInt(text);
                }
            }

            if (!val) {
                isComplete = false;
                return;
            }

            if (val !== solution[row][col]) {
                isCorrect = false;
                if (!cell.classList.contains('initial')) {
                    cell.classList.add('error');
                }
            } else {
                cell.classList.remove('error');
            }
        });

        if (isComplete && isCorrect) {
            messageElement.textContent = 'Congratulations! You solved it!';
            messageElement.style.color = '#27ae60';
            triggerFireworks();
        } else if (!isCorrect) {
            messageElement.textContent = 'Some numbers are incorrect. Keep trying!';
            messageElement.style.color = '#e74c3c';
        } else {
            messageElement.textContent = 'The board is not full yet.';
            messageElement.style.color = '#e67e22';
        }
    }

    function triggerFireworks() {
        var duration = 5 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        var interval = setInterval(function () {
            var timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            var particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
});
