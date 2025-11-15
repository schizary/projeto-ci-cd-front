// Configuração
const BACKEND_URL = 'https://projeto-ci-cd-back-k57p.onrender.com';

// Estado do jogo
let currentUser = null;
let gameState = {
    snake: [{ x: 10, y: 10 }],
    direction: { x: 1, y: 0 },
    food: { x: 15, y: 15 },
    score: 0,
    gameLoop: null,
    isPaused: false,
    isGameOver: false
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Event Listeners
document.getElementById('registerForm').addEventListener('submit', handleRegister);
document.getElementById('loginForm').addEventListener('submit', handleLogin);

// Funções de autenticação
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Registro realizado com sucesso! Faça login para jogar.', 'success');
            document.getElementById('registerForm').reset();
        } else {
            showMessage(data.error || 'Erro ao registrar', 'error');
        }
    } catch (error) {
        showMessage('Erro de conexão: ' + error.message, 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showMessage(`Bem-vindo, ${currentUser.username}!`, 'success');
            document.getElementById('currentUsername').textContent = currentUser.username;
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('userInfo').style.display = 'flex';
            document.getElementById('gameSection').style.display = 'block';
            
            await loadUserBestScore();
            await loadLeaderboard();
        } else {
            showMessage(data.error || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        showMessage('Erro de conexão: ' + error.message, 'error');
    }
}

function logout() {
    currentUser = null;
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('gameSection').style.display = 'none';
    resetGame();
}

async function loadUserBestScore() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${BACKEND_URL}/api/users/${currentUser.id}/best-score`);
        const data = await response.json();

        if (data.success && data.bestScore) {
            document.getElementById('userBestScore').textContent = data.bestScore.score;
        } else {
            document.getElementById('userBestScore').textContent = '0';
        }
    } catch (error) {
        console.error('Erro ao carregar melhor pontuação:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/leaderboard?limit=10`);
        const data = await response.json();

        if (data.success) {
            const leaderboardList = document.getElementById('leaderboardList');
            
            if (data.leaderboard.length === 0) {
                leaderboardList.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma pontuação ainda</p>';
                return;
            }

            leaderboardList.innerHTML = data.leaderboard.map(entry => `
                <div class="leaderboard-item rank-${entry.rank}">
                    <div>
                        <span class="rank">#${entry.rank}</span>
                        <strong>${entry.username}</strong>
                    </div>
                    <div style="font-weight: bold; color: #667eea;">${entry.score}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar leaderboard:', error);
        document.getElementById('leaderboardList').innerHTML = '<p style="color: red;">Erro ao carregar leaderboard</p>';
    }
}

// Funções do jogo
function startGame() {
    if (gameState.gameLoop) return;

    gameState.isPaused = false;
    gameState.isGameOver = false;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;

    gameState.gameLoop = setInterval(() => {
        if (!gameState.isPaused && !gameState.isGameOver) {
            update();
            draw();
        }
    }, 100);
}

function pauseGame() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pauseBtn').textContent = gameState.isPaused ? 'Continuar' : 'Pausar';
}

function resetGame() {
    clearInterval(gameState.gameLoop);
    gameState.gameLoop = null;
    gameState.snake = [{ x: 10, y: 10 }];
    gameState.direction = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.food = generateFood();
    
    document.getElementById('currentScore').textContent = '0';
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pausar';
    
    draw();
}

function generateFood() {
    let food;
    do {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (gameState.snake.some(segment => segment.x === food.x && segment.y === food.y));
    
    return food;
}

function update() {
    const head = {
        x: gameState.snake[0].x + gameState.direction.x,
        y: gameState.snake[0].y + gameState.direction.y
    };

    // Verificar colisão com parede
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }

    // Verificar colisão com corpo
    if (gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    gameState.snake.unshift(head);

    // Verificar se comeu a comida
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        gameState.score += 10;
        document.getElementById('currentScore').textContent = gameState.score;
        gameState.food = generateFood();
    } else {
        gameState.snake.pop();
    }
}

function draw() {
    // Limpar canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar grade
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // Desenhar comida
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(
        gameState.food.x * gridSize + 2,
        gameState.food.y * gridSize + 2,
        gridSize - 4,
        gridSize - 4
    );

    // Desenhar cobra
    gameState.snake.forEach((segment, index) => {
        if (index === 0) {
            // Cabeça
            ctx.fillStyle = '#2ecc71';
        } else {
            // Corpo
            ctx.fillStyle = '#27ae60';
        }
        ctx.fillRect(
            segment.x * gridSize + 2,
            segment.y * gridSize + 2,
            gridSize - 4,
            gridSize - 4
        );
    });

    // Mostrar mensagem de pausa
    if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSADO', canvas.width / 2, canvas.height / 2);
    }
}

async function gameOver() {
    gameState.isGameOver = true;
    clearInterval(gameState.gameLoop);
    gameState.gameLoop = null;
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;

    // Salvar pontuação
    if (currentUser && gameState.score > 0) {
        try {
            await fetch(`${BACKEND_URL}/api/scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    username: currentUser.username,
                    score: gameState.score
                })
            });

            await loadUserBestScore();
            await loadLeaderboard();
            showMessage(`Pontuação de ${gameState.score} salva!`, 'success');
        } catch (error) {
            console.error('Erro ao salvar pontuação:', error);
            showMessage('Erro ao salvar pontuação', 'error');
        }
    }

    // Mostrar game over
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '24px Arial';
    ctx.fillText(`Pontuação: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20);
}

// Controles do teclado
document.addEventListener('keydown', (e) => {
    if (gameState.isPaused || gameState.isGameOver) return;

    switch(e.key) {
        case 'ArrowUp':
            if (gameState.direction.y === 0) {
                gameState.direction = { x: 0, y: -1 };
            }
            break;
        case 'ArrowDown':
            if (gameState.direction.y === 0) {
                gameState.direction = { x: 0, y: 1 };
            }
            break;
        case 'ArrowLeft':
            if (gameState.direction.x === 0) {
                gameState.direction = { x: -1, y: 0 };
            }
            break;
        case 'ArrowRight':
            if (gameState.direction.x === 0) {
                gameState.direction = { x: 1, y: 0 };
            }
            break;
    }
});

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Inicializar
draw();

