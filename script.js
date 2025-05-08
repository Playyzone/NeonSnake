const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const images = {
    snake: new Image(),
    food: new Image()
};
images.snake.src = 'images/snake.png';
images.food.src = 'images/food.png';

const sounds = {
    eat: new Audio('sounds/eat.mp3'),
    gameover: new Audio('sounds/gameover.mp3')
};

let snake = [];
let food = {};
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop;
let gameSpeed = 300;
let currentLevel = 'EASY';
let isPaused = false;
let gameStarted = false;
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let lastUpdateTime = 0;

// Improved touch controls
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 30;

function initCanvasSize() {
    const header = document.querySelector('.game-header');
    const headerHeight = header.offsetHeight;
    const maxWidth = Math.min(600, window.innerWidth - 40);
    const maxHeight = Math.min(500, window.innerHeight - headerHeight - 100);
    
    const size = Math.min(maxWidth, maxHeight);
    canvas.width = Math.floor(size / gridSize) * gridSize;
    canvas.height = Math.floor(size / gridSize) * gridSize;
}

function initGame() {
    initCanvasSize();
    
    const startX = Math.floor(canvas.width / gridSize / 4);
    const startY = Math.floor(canvas.height / gridSize / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];
    
    placeFood();
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    document.getElementById('score').textContent = '0';
    document.getElementById('high-score').textContent = highScore;
    gameStarted = true;
    isPaused = false;
    document.getElementById('pause-button').style.display = 'block';
    document.getElementById('pause-button').textContent = '⏸ PAUSE';
}

function placeFood() {
    const gridWidth = canvas.width / gridSize;
    const gridHeight = canvas.height / gridSize;
    
    food = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight)
    };
    
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            return placeFood();
        }
    }
}

function gameLoop(timestamp) {
    if (!isPaused && gameStarted) {
        const deltaTime = timestamp - lastUpdateTime;
        if (deltaTime >= 1000/gameSpeed) {
            gameUpdate();
            lastUpdateTime = timestamp;
        }
        requestAnimationFrame(gameLoop);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function gameUpdate() {
    const head = { ...snake[0] };
    direction = nextDirection;
    
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    
    const gridWidth = canvas.width / gridSize;
    const gridHeight = canvas.height / gridSize;
    
    if (head.x < 0 || head.x >= gridWidth || 
        head.y < 0 || head.y >= gridHeight ||
        snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        return gameOver();
    }
    
    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        playSound(sounds.eat);
        score += 10;
        document.getElementById('score').textContent = score;
        
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            document.getElementById('high-score').textContent = highScore;
        }
        
        placeFood();
    } else {
        snake.pop();
    }
    
    drawGame();
}

function drawGrid() {
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-color');
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawGame() {
    ctx.fillStyle = '#0a001f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    
    snake.forEach((segment, index) => {
        ctx.save();
        ctx.translate(segment.x * gridSize + gridSize/2, segment.y * gridSize + gridSize/2);
        if (index === 0) {
            switch(direction) {
                case 'up': ctx.rotate(-Math.PI/2); break;
                case 'down': ctx.rotate(Math.PI/2); break;
                case 'left': ctx.rotate(Math.PI); break;
            }
        }
        ctx.drawImage(images.snake, -gridSize/2, -gridSize/2, gridSize, gridSize);
        ctx.restore();
    });
    
    ctx.drawImage(images.food, food.x * gridSize, food.y * gridSize, gridSize, gridSize);
}

function gameOver() {
    playSound(sounds.gameover);
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-high-score').textContent = highScore;
    showScreen('game-over-screen');
    gameStarted = false;
    document.getElementById('pause-button').style.display = 'none';
}

function showScreen(screenId) {
    document.querySelectorAll('.game-overlay').forEach(el => {
        el.style.display = 'none';
    });
    document.getElementById(screenId).style.display = 'flex';
}

function playSound(sound) {
    if (!soundEnabled) return;
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Sound error:", e));
}

function updateSoundUI() {
    const soundState = soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF';
    document.querySelectorAll('[id^="sound-toggle"]').forEach(btn => {
        btn.textContent = soundState;
    });
}

function updateLevelIndicator(level) {
    currentLevel = level;
    document.getElementById('level-indicator').textContent = level;
    document.querySelectorAll('.level-button').forEach(btn => {
        if (btn.dataset.level === level) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// Mobile button handler
function handleButtonClick(button, handler) {
    button.addEventListener('click', handler);
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handler(e);
    }, { passive: false });
}

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameStarted || isPaused) return;
    
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
        nextDirection = dx > 0 && direction !== 'left' ? 'right' : 
                      dx < 0 && direction !== 'right' ? 'left' : direction;
    } 
    else if (Math.abs(dy) > minSwipeDistance) {
        nextDirection = dy > 0 && direction !== 'up' ? 'down' : 
                      dy < 0 && direction !== 'down' ? 'up' : direction;
    }
}, { passive: false });

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Setup all buttons with proper mobile handling
    handleButtonClick(document.querySelector('.start-button'), () => {
        initGame();
        showScreen('game-canvas');
        lastUpdateTime = performance.now();
        requestAnimationFrame(gameLoop);
    });

    handleButtonClick(document.querySelector('.levels-button'), () => {
        showScreen('level-select-screen');
    });

    document.querySelectorAll('.level-button').forEach(btn => {
        handleButtonClick(btn, () => {
            gameSpeed = parseInt(btn.dataset.speed);
            updateLevelIndicator(btn.dataset.level);
        });
    });

    document.querySelectorAll('.back-button').forEach(btn => {
        handleButtonClick(btn, () => {
            showScreen('main-menu');
        });
    });

    document.querySelectorAll('.restart-button').forEach(btn => {
        handleButtonClick(btn, () => {
            initGame();
            showScreen('game-canvas');
            lastUpdateTime = performance.now();
            requestAnimationFrame(gameLoop);
        });
    });

    document.querySelectorAll('.home-button').forEach(btn => {
        handleButtonClick(btn, () => {
            showScreen('main-menu');
        });
    });

    handleButtonClick(document.getElementById('resume-button'), () => {
        isPaused = false;
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('pause-button').textContent = '⏸ PAUSE';
    });

    handleButtonClick(document.getElementById('pause-button'), () => {
        isPaused = !isPaused;
        document.getElementById('pause-button').textContent = 
            isPaused ? '▶ RESUME' : '⏸ PAUSE';
        document.getElementById('pause-menu').style.display = 
            isPaused ? 'flex' : 'none';
    });

    document.querySelectorAll('[id^="sound-toggle"]').forEach(btn => {
        handleButtonClick(btn, () => {
            soundEnabled = !soundEnabled;
            localStorage.setItem('soundEnabled', soundEnabled);
            updateSoundUI();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (gameStarted) {
                document.getElementById('pause-button').click();
            }
        }
        if (!gameStarted || isPaused) return;
        const key = e.key.replace('Arrow', '').toLowerCase();
        const validMoves = {
            up: 'down',
            down: 'up',
            left: 'right',
            right: 'left'
        };
        if (validMoves[key] && direction !== validMoves[key]) {
            nextDirection = key;
        }
    });

    window.addEventListener('resize', () => {
        initCanvasSize();
        if (gameStarted) {
            initGame();
            drawGame();
        }
    });

    updateSoundUI();
    updateLevelIndicator(currentLevel);
    showScreen('main-menu');
});
