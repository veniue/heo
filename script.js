document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const dice = document.getElementById('dice');
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const messageDisplay = document.getElementById('message');

    const CELL_SIZE = 40; // 每个格子的大小 (px)
    const BOARD_DIMENSION = 15; // 棋盘是 15x15 的格子

    let currentPlayer = 1; // 1 或 2
    let diceValue = 0;
    let gameStarted = false;

    // 棋子状态：
    // position: -1 表示在基地，0 到 path.length-1 表示在主路径，
    //           'H0' 到 'H5' 表示在回家路径 (H0是入口，H5是终点)
    // inBase: true/false
    // inHomePath: true/false
    // homePathIndex: -1 或 0-5
    const tokens = {
        1: [ // Player 1 (Red)
            { id: 'p1-token0', element: document.getElementById('p1-token0'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 },
            { id: 'p1-token1', element: document.getElementById('p1-token1'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 },
            { id: 'p1-token2', element: document.getElementById('p1-token2'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 },
            { id: 'p1-token3', element: document.getElementById('p1-token3'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 }
        ],
        2: [ // Player 2 (Green)
            { id: 'p2-token0', element: document.getElementById('p2-token0'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 },
            { id: 'p2-token1', element: document.getElementById('p2-token1'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 },
            { id: 'p2-token2', element: document.getElementById('p2-token2'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 },
            { id: 'p2-token3', element: document.getElementById('p2-token3'), position: -1, inBase: true, inHomePath: false, homePathIndex: -1 }
        ]
    };

    // --- 棋盘路径定义 ---
    // 飞行棋路径比较复杂，这里定义一个简化的15x15网格路径
    // 每个对象 {row, col} 代表一个格子在棋盘网格中的坐标 (0-based)

    // 主路径 (简化版，螺旋状或环状)
    // 这是一个示例路径，实际飞行棋路径会更复杂
    const mainPath = [];
    // 从 (6,0) 开始，顺时针走一圈
    for (let c = 0; c < 6; c++) mainPath.push({ row: 6, col: c }); // (6,0) -> (6,5)
    for (let r = 6; r >= 0; r--) mainPath.push({ row: r, col: 6 }); // (6,6) -> (0,6)
    for (let c = 6; c < 9; c++) mainPath.push({ row: 0, col: c }); // (0,6) -> (0,8)
    for (let r = 0; r < 6; r++) mainPath.push({ row: r, col: 8 }); // (0,8) -> (5,8)
    for (let c = 8; c < 15; c++) mainPath.push({ row: 6, col: c }); // (6,8) -> (6,14)
    for (let r = 6; r < 9; r++) mainPath.push({ row: r, col: 14 }); // (6,14) -> (8,14)
    for (let c = 14; c > 8; c--) mainPath.push({ row: 8, col: c }); // (8,14) -> (8,9)
    for (let r = 8; r < 15; r++) mainPath.push({ row: r, col: 8 }); // (8,8) -> (14,8)
    for (let c = 8; c > 6; c--) mainPath.push({ row: 14, col: c }); // (14,8) -> (14,7)
    for (let r = 14; r > 8; r--) mainPath.push({ row: r, col: 6 }); // (14,6) -> (9,6)
    for (let c = 6; c > 0; c--) mainPath.push({ row: 8, col: c }); // (8,6) -> (8,1)
    for (let r = 8; r > 6; r--) mainPath.push({ row: r, col: 0 }); // (8,0) -> (7,0)

    // 玩家1 (红色) 的起点和回家路径
    const player1StartMainPathIndex = mainPath.findIndex(p => p.row === 7 && p.col === 0); // 玩家1进入主路径的格子
    const player1HomeEntryMainPathIndex = mainPath.findIndex(p => p.row === 7 && p.col === 1); // 玩家1从主路径进入回家路径的格子 (简化为入口旁)
    const player1HomePath = [
        { row: 7, col: 1 }, // 实际飞行棋是单独的格子，这里简化为路径上的格子
        { row: 7, col: 2 },
        { row: 7, col: 3 },
        { row: 7, col: 4 },
        { row: 7, col: 5 },
        { row: 7, col: 6 } // 终点
    ];

    // 玩家2 (绿色) 的起点和回家路径
    const player2StartMainPathIndex = mainPath.findIndex(p => p.row === 7 && p.col === 14); // 玩家2进入主路径的格子
    const player2HomeEntryMainPathIndex = mainPath.findIndex(p => p.row === 7 && p.col === 13); // 玩家2从主路径进入回家路径的格子
    const player2HomePath = [
        { row: 7, col: 13 },
        { row: 7, col: 12 },
        { row: 7, col: 11 },
        { row: 7, col: 10 },
        { row: 7, col: 9 },
        { row: 7, col: 8 } // 终点
    ];

    // 棋盘中心格子作为最终大本营
    const finalHomeSquare = { row: 7, col: 7 };

    // 定义安全格子 (这里简化为只有起点是安全区)
    const safeSquares = [
        player1StartMainPathIndex,
        player2StartMainPathIndex
        // 可以添加更多安全格子 (比如飞行棋的星格)
    ];

    // --- 辅助函数 ---

    // 根据行和列获取格子元素
    function getSquareElement(row, col) {
        return document.getElementById(`square-${row}-${col}`);
    }

    // 更新棋子在DOM中的位置
    function updateTokenDOMPosition(tokenElement, row, col) {
        tokenElement.style.left = `${col * CELL_SIZE + (CELL_SIZE - tokenElement.offsetWidth) / 2}px`;
        tokenElement.style.top = `${row * CELL_SIZE + (CELL_SIZE - tokenElement.offsetHeight) / 2}px`;
    }

    // 将棋子送回基地
    function sendTokenToBase(player, tokenIndex) {
        const token = tokens[player][tokenIndex];
        token.position = -1;
        token.inBase = true;
        token.inHomePath = false;
        token.homePathIndex = -1;
        // 将棋子放回其基地区域
        const baseElement = document.getElementById(`player${player}-base`);
        baseElement.appendChild(token.element); // 重新添加到基地，CSS会处理其位置
        token.element.style.left = 'auto'; // 清除绝对定位
        token.element.style.top = 'auto';
        token.element.classList.remove('movable'); // 移除高亮
        showMessage(`玩家${player}的棋子被送回基地了！`);
    }

    // 检查是否可以吃子
    function checkCapture(targetPosition, movingTokenPlayer, movingTokenIndex) {
        for (let player = 1; player <= 2; player++) {
            if (player === movingTokenPlayer) continue; // 不检查自己的棋子

            for (let i = 0; i < tokens[player].length; i++) {
                const opponentToken = tokens[player][i];
                // 如果对手棋子在主路径上，且位置相同，且不是安全区
                if (!opponentToken.inBase && !opponentToken.inHomePath && opponentToken.position === targetPosition) {
                    if (!safeSquares.includes(targetPosition)) { // 假设只有起点是安全区
                        sendTokenToBase(player, i);
                        return true; // 发生了吃子
                    }
                }
            }
        }
        return false;
    }

    // 检查是否所有棋子都回家了
    function checkWin(player) {
        return tokens[player].every(token => token.inHomePath && token.homePathIndex === playerHomePath[player].length - 1);
    }

    // 切换玩家
    function switchPlayer() {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        showMessage(`玩家${currentPlayer}的回合，掷骰子！`);
        rollDiceBtn.disabled = false;
        highlightMovableTokens(); // 清除上一回合的高亮
    }

    // 显示信息
    function showMessage(msg) {
        messageDisplay.textContent = msg;
    }

    // 高亮可移动的棋子
    function highlightMovableTokens() {
        tokens[1].forEach(t => t.element.classList.remove('movable'));
        tokens[2].forEach(t => t.element.classList.remove('movable'));

        let anyMovable = false;
        tokens[currentPlayer].forEach(token => {
            if (token.inBase && diceValue === 6) {
                token.element.classList.add('movable');
                anyMovable = true;
            } else if (!token.inBase && !token.inHomePath) { // 在主路径上
                const newPos = token.position + diceValue;
                if (currentPlayer === 1 && newPos >= player1HomeEntryMainPathIndex && token.position < player1HomeEntryMainPathIndex) {
                    // 如果进入回家路径
                    if (newPos - player1HomeEntryMainPathIndex < player1HomePath.length) {
                         token.element.classList.add('movable');
                         anyMovable = true;
                    }
                } else if (currentPlayer === 2 && newPos >= player2HomeEntryMainPathIndex && token.position < player2HomeEntryMainPathIndex) {
                     // 如果进入回家路径
                    if (newPos - player2HomeEntryMainPathIndex < player2HomePath.length) {
                         token.element.classList.add('movable');
                         anyMovable = true;
                    }
                }
                else if (newPos < mainPath.length) { // 还在主路径上
                    token.element.classList.add('movable');
                    anyMovable = true;
                }
            } else if (token.inHomePath) { // 在回家路径上
                if (token.homePathIndex + diceValue < playerHomePath[currentPlayer].length) {
                    token.element.classList.add('movable');
                    anyMovable = true;
                }
            }
        });

        if (!anyMovable && diceValue > 0) { // 如果掷了骰子但没棋子可走
            showMessage(`玩家${currentPlayer}没有可移动的棋子。`);
            setTimeout(switchPlayer, 1500); // 1.5秒后切换玩家
        }
    }


    // 移动棋子逻辑
    function moveToken(token) {
        let moved = false;
        let captureOccurred = false;
        let enteredHomePath = false;
        let reachedFinalHome = false;

        // 1. 如果棋子在基地，且掷出6点
        if (token.inBase && diceValue === 6) {
            token.inBase = false;
            token.position = (currentPlayer === 1) ? player1StartMainPathIndex : player2StartMainPathIndex;
            const startSquare = mainPath[token.position];
            updateTokenDOMPosition(token.element, startSquare.row, startSquare.col);
            showMessage(`玩家${currentPlayer}的棋子出来了！`);
            moved = true;
            captureOccurred = checkCapture(token.position, currentPlayer, tokens[currentPlayer].indexOf(token)); // 检查起点是否吃子
        }
        // 2. 如果棋子在主路径上
        else if (!token.inBase && !token.inHomePath) {
            const currentPathIndex = token.position;
            const newPathIndex = currentPathIndex + diceValue;

            // 检查是否进入回家路径
            const homeEntryIndex = (currentPlayer === 1) ? player1HomeEntryMainPathIndex : player2HomeEntryMainPathIndex;
            const playerHomePathRef = (currentPlayer === 1) ? player1HomePath : player2HomePath;

            if (newPathIndex >= homeEntryIndex && currentPathIndex < homeEntryIndex) {
                // 进入回家路径
                const stepsIntoHomePath = newPathIndex - homeEntryIndex;
                if (stepsIntoHomePath < playerHomePathRef.length) {
                    token.inHomePath = true;
                    token.homePathIndex = stepsIntoHomePath;
                    const targetSquare = playerHomePathRef[token.homePathIndex];
                    updateTokenDOMPosition(token.element, targetSquare.row, targetSquare.col);
                    showMessage(`玩家${currentPlayer}的棋子进入回家路径！`);
                    moved = true;
                    enteredHomePath = true;
                    if (token.homePathIndex === playerHomePathRef.length - 1) {
                        reachedFinalHome = true;
                    }
                } else {
                    // 超出回家路径，不能移动
                    showMessage(`玩家${currentPlayer}的棋子超出回家路径，无法移动。`);
                    return; // 无法移动，不切换回合
                }
            } else if (newPathIndex < mainPath.length) {
                // 还在主路径上
                token.position = newPathIndex;
                const targetSquare = mainPath[token.position];
                updateTokenDOMPosition(token.element, targetSquare.row, targetSquare.col);
                showMessage(`玩家${currentPlayer}的棋子前进了${diceValue}步。`);
                moved = true;
                captureOccurred = checkCapture(token.position, currentPlayer, tokens[currentPlayer].indexOf(token));
            } else {
                // 超出主路径，不能移动 (除非是进入回家路径的情况，已处理)
                showMessage(`玩家${currentPlayer}的棋子超出主路径，无法移动。`);
                return; // 无法移动，不切换回合
            }
        }
        // 3. 如果棋子在回家路径上
        else if (token.inHomePath) {
            const playerHomePathRef = (currentPlayer === 1) ? player1HomePath : player2HomePath;
            const newHomePathIndex = token.homePathIndex + diceValue;

            if (newHomePathIndex < playerHomePathRef.length) {
                token.homePathIndex = newHomePathIndex;
                const targetSquare = playerHomePathRef[token.homePathIndex];
                updateTokenDOMPosition(token.element, targetSquare.row, targetSquare.col);
                showMessage(`玩家${currentPlayer}的棋子在回家路径前进了${diceValue}步。`);
                moved = true;
                if (token.homePathIndex === playerHomePathRef.length - 1) {
                    reachedFinalHome = true;
                }
            } else {
                showMessage(`玩家${currentPlayer}的棋子超出回家路径，无法移动。`);
                return; // 无法移动，不切换回合
            }
        }

        // 移动后处理
        if (moved) {
            token.element.classList.remove('movable'); // 移除高亮

            if (checkWin(currentPlayer)) {
                showMessage(`恭喜玩家${currentPlayer}赢得比赛！`);
                rollDiceBtn.disabled = true;
                gameStarted = false;
                return;
            }

            // 如果掷出6点，或发生了吃子，则当前玩家继续回合
            if (diceValue === 6 || captureOccurred) {
                showMessage(`玩家${currentPlayer}掷出6点或吃子，再掷一次！`);
                rollDiceBtn.disabled = false;
                diceValue = 0; // 重置骰子值
                dice.textContent = '?';
            } else {
                setTimeout(switchPlayer, 1000); // 1秒后切换玩家
            }
        }
    }


    // 掷骰子
    function rollDice() {
        if (!gameStarted) {
            gameStarted = true;
            showMessage(`玩家${currentPlayer}的回合，掷骰子！`);
        }

        rollDiceBtn.disabled = true; // 禁用按钮直到棋子移动
        diceValue = Math.floor(Math.random() * 6) + 1;
        dice.textContent = diceValue;
        showMessage(`玩家${currentPlayer}掷出了 ${diceValue} 点！`);

        highlightMovableTokens();
    }

    // 棋子点击事件
    gameBoard.addEventListener('click', (event) => {
        const clickedTokenElement = event.target.closest('.token');
        if (clickedTokenElement && clickedTokenElement.classList.contains('movable')) {
            const player = parseInt(clickedTokenElement.dataset.player);
            const tokenIndex = parseInt(clickedTokenElement.dataset.token);

            if (player === currentPlayer && diceValue > 0) {
                moveToken(tokens[player][tokenIndex]);
            }
        }
    });

    // --- 棋盘初始化 ---
    function createBoard() {
        for (let r = 0; r < BOARD_DIMENSION; r++) {
            for (let c = 0; c < BOARD_DIMENSION; c++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.id = `square-${r}-${c}`;
                gameBoard.appendChild(square);

                // 标记特殊区域（简化版）
                if (r < 6 && c < 6) { // 玩家1基地附近
                    square.classList.add('start-zone', 'player1');
                } else if (r > 8 && c > 8) { // 玩家2基地附近
                    square.classList.add('start-zone', 'player2');
                } else if (r === 7 && c >= 1 && c <= 6) { // 玩家1回家路径
                    square.classList.add('home-path', 'player1');
                } else if (r === 7 && c >= 8 && c <= 13) { // 玩家2回家路径
                    square.classList.add('home-path', 'player2');
                } else if (r === finalHomeSquare.row && c === finalHomeSquare.col) {
                    square.classList.add('final-home');
                }

                // 标记主路径格子
                if (mainPath.some(p => p.row === r && p.col === c)) {
                    square.classList.add('path-square');
                }
            }
        }
    }

    // 初始化游戏
    function initializeGame() {
        createBoard();
        // 将棋子放置在各自的基地
        tokens[1].forEach(token => sendTokenToBase(1, tokens[1].indexOf(token)));
        tokens[2].forEach(token => sendTokenToBase(2, tokens[2].indexOf(token)));

        rollDiceBtn.addEventListener('click', rollDice);
        showMessage(`玩家${currentPlayer}的回合，掷骰子！`);
    }

    // 定义玩家回家路径的引用，方便获取
    const playerHomePath = {
        1: player1HomePath,
        2: player2HomePath
    };

    initializeGame();
});
