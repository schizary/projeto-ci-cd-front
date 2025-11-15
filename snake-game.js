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

    // Focar canvas para capturar teclas
    focusCanvas();

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
    // Fundo estilo slither.io - gradiente suave verde/azul
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#98D8C8');
    gradient.addColorStop(1, '#A8E6CF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar comida - estilo slither.io (círculo com brilho)
    const foodX = gameState.food.x * gridSize + gridSize / 2;
    const foodY = gameState.food.y * gridSize + gridSize / 2;
    const foodRadius = gridSize / 2 - 2;
    
    // Brilho externo
    const foodGradient = ctx.createRadialGradient(foodX, foodY, 0, foodX, foodY, foodRadius * 1.5);
    foodGradient.addColorStop(0, 'rgba(255, 100, 100, 0.6)');
    foodGradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
    ctx.fillStyle = foodGradient;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Comida principal
    const foodMainGradient = ctx.createRadialGradient(foodX - 3, foodY - 3, 0, foodX, foodY, foodRadius);
    foodMainGradient.addColorStop(0, '#FF6B6B');
    foodMainGradient.addColorStop(0.7, '#FF5252');
    foodMainGradient.addColorStop(1, '#E53935');
    ctx.fillStyle = foodMainGradient;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Brilho na comida
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(foodX - 2, foodY - 2, foodRadius / 3, 0, Math.PI * 2);
    ctx.fill();

    // Desenhar cobra - estilo slither.io com gradiente suave
    gameState.snake.forEach((segment, index) => {
        const segmentX = segment.x * gridSize + gridSize / 2;
        const segmentY = segment.y * gridSize + gridSize / 2;
        const radius = gridSize / 2 - 1;
        
        // Gradiente para cada segmento
        const snakeGradient = ctx.createRadialGradient(
            segmentX - radius / 3, 
            segmentY - radius / 3, 
            0,
            segmentX, 
            segmentY, 
            radius
        );
        
        if (index === 0) {
            // Cabeça - mais brilhante e maior
            const headRadius = radius + 1;
            snakeGradient.addColorStop(0, '#4ECDC4');
            snakeGradient.addColorStop(0.5, '#44A08D');
            snakeGradient.addColorStop(1, '#2E7D5A');
            
            // Sombra da cabeça
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(segmentX + 2, segmentY + 2, headRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Cabeça principal
            ctx.fillStyle = snakeGradient;
            ctx.beginPath();
            ctx.arc(segmentX, segmentY, headRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Brilho na cabeça
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(segmentX - 2, segmentY - 2, headRadius / 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Corpo - gradiente mais escuro
            const bodyAlpha = Math.max(0.6, 1 - (index / gameState.snake.length) * 0.3);
            snakeGradient.addColorStop(0, `rgba(78, 205, 196, ${bodyAlpha})`);
            snakeGradient.addColorStop(0.5, `rgba(68, 160, 141, ${bodyAlpha})`);
            snakeGradient.addColorStop(1, `rgba(46, 125, 90, ${bodyAlpha})`);
            
            // Sombra do corpo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.arc(segmentX + 1, segmentY + 1, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Corpo principal
            ctx.fillStyle = snakeGradient;
            ctx.beginPath();
            ctx.arc(segmentX, segmentY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Mostrar mensagem de pausa
    if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.strokeText('PAUSADO', canvas.width / 2, canvas.height / 2);
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

    // Mostrar game over - estilo melhorado
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texto com sombra
    ctx.fillStyle = 'white';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#2E7D5A';
    ctx.lineWidth = 4;
    ctx.strokeText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.font = 'bold 28px Arial';
    ctx.strokeText(`Pontuação: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText(`Pontuação: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20);
}

// Controles do teclado
document.addEventListener('keydown', (e) => {
    const key = e.key;
    
    // Prevenir scroll quando usar setas ou espaço
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(key)) {
        e.preventDefault();
    }

    // Pausar/continuar com espaço
    if (key === ' ' || key === 'Space') {
        if (gameState.gameLoop && !gameState.isGameOver) {
            pauseGame();
        }
        return;
    }

    if (gameState.isPaused || gameState.isGameOver) {
        return;
    }

    switch(key) {
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

// Focar no canvas quando o jogo iniciar para capturar teclas
function focusCanvas() {
    canvas.focus();
    canvas.setAttribute('tabindex', '0');
}

// Inicializar
draw();
focusCanvas();

// Focar canvas quando clicar nele
canvas.addEventListener('click', focusCanvas);

