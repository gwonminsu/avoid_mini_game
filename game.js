const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 캔버스 크기 설정
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 게임 상태에 새로운 변수들 추가
let gameState = {
    score: 0,
    baseScore: 0,
    comboScore: 0,
    lives: 3,
    gameOver: false,
    canRoll: true,
    isRolling: false,
    hitEffect: 0,
    deathRotation: 0,
    soulY: 0,
    isDying: false,
    rollAngle: 0,
    idleAnimation: 0,
    idleDirection: 1,
    isInvincible: false,
    combo: 0,
    lastComboTimeout: null,
    processedObstacles: new Set()
};

// 플레이어 설정
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 50,
    height: 50,
    speed: 7,
    direction: 1,
    frame: 0,
    frameCount: 8,
    isMoving: false
};

// 장애물 배열
let obstacles = [];

// 이미지 로드
const playerImg = new Image();
playerImg.src = 'data:image/png;base64,/* 귀여운 캐릭터 이미지 base64 */';

const playerWalkImg = new Image();
playerWalkImg.src = 'data:image/png;base64,/* 걷는 애니메이션 스프라이트 base64 */';

const playerRollImg = new Image();
playerRollImg.src = 'data:image/png;base64,/* 구르기 애니메이션 스프라이트 base64 */';

const playerDeadImg = new Image();
playerDeadImg.src = 'data:image/png;base64,/* 죽는 애니메이션 스프라이트 base64 */';

// 키보드 입력 처리
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ' && gameState.canRoll) {
        startRoll();
    }
});
document.addEventListener('keyup', e => keys[e.key] = false);

// 구르기 UI 업데이트 함수
function updateCooldownUI(state, progress = 0) {
    const cooldownText = document.getElementById('cooldownText');
    const cooldownBar = document.getElementById('cooldownBar');

    if (state === 'rolling') {
        cooldownText.textContent = '[스페이스바] 구르기 중!';
        cooldownBar.style.width = '100%';
    } else if (state === 'cooling') {
        cooldownText.textContent = `[스페이스바] 쿨타임 (${Math.round(progress * 100)}%)`;
        cooldownBar.style.width = `${progress * 100}%`;
    } else if (state === 'ready') {
        cooldownText.textContent = '[스페이스바] 구르기 (준비완료)';
        cooldownBar.style.width = '100%';
    }
}

// 구르기 스킬
function startRoll() {
    if (!gameState.canRoll || gameState.isRolling) return;
    
    gameState.isRolling = true;
    gameState.canRoll = false;
    gameState.processedObstacles.clear();
    
    const rollDuration = 500;
    const cooldownDuration = 3000;

    updateCooldownUI('rolling');
    
    // 구르기 종료
    const rollTimeout = setTimeout(() => {
        if (gameState.isRolling) {  // 상태 확인
            gameState.isRolling = false;
            gameState.processedObstacles.clear();
            updateCooldownUI('cooling', 0);
        }
    }, rollDuration);
    
    // 쿨다운 진행
    const cooldownInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / cooldownDuration;

        if (progress >= 1) {
            clearInterval(cooldownInterval);
            gameState.canRoll = true;
            // 쿨다운 완료 시 UI 업데이트
            updateCooldownUI('ready');
        } else {
            // 쿨다운 진행 중 UI 업데이트
            updateCooldownUI('cooling', progress);
        }
    }, 100);
    
    // 쿨다운 시작 시간 기록
    const startTime = Date.now();
}

// 장애물 생성 함수 수정
function createObstacle() {
    obstacles.push({
        x: Math.random() * (canvas.width - 30),
        y: -20,
        width: 30,
        height: 30,
        speed: 3 + Math.floor(gameState.baseScore/2000) // 속도 증가율
    });
}

// 충돌 감지
function checkCollision(obstacle) {
    if (player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y < obstacle.y + obstacle.height &&
        player.y + player.height > obstacle.y) {
        
        // 무적 상태 통합 체크
        if (gameState.isRolling || gameState.isInvincible) {
            if (gameState.isRolling && !gameState.processedObstacles.has(obstacle)) {
                gameState.processedObstacles.add(obstacle);
                createMissText(player.x + player.width/2, player.y);
                addCombo();
            }
            return false;
        }
        
        // 피격 처리
        if (!gameState.isDying && !gameState.isInvincible) {  // 무적 상태 체크
            gameState.combo = 0;
            gameState.lives--;
            
            triggerHitEffect();
            removeHeart();
            
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
                gameState.isDying = true;
                startDeathAnimation();
                setTimeout(() => {
                    showGameOver();
                }, 1000);
            }
        }
        return true;
    }
    return false;
}

function startDeathAnimation() {
    let rotationSpeed = 5;
    let soulSpeed = 2;
    
    function animate() {
        if (gameState.deathRotation < 90) {
            gameState.deathRotation += rotationSpeed;
        }
        gameState.soulY += soulSpeed;
        
        if (gameState.soulY < 100) { // 영혼이 충분히 올라갈 때까지 계속
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// 회복 아이템 클래스
class HealItem {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = 4; // 장애물보다 좀 더 빨리 떨어지게
    }

    update() {
        this.y += this.speed;
        return this.y > this.canvas.height;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        // 흰색 배경
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.rect(-12, -12, 24, 24);
        ctx.fill();
        
        // 초록색 십자가
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(-8, -2, 16, 4); // 가로 막대
        ctx.fillRect(-2, -8, 4, 16); // 세로 막대
        
        ctx.restore();
    }

    checkCollision(player) {
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }
}

let healItems = [];

// 게임 업데이트
function update() {
    if (gameState.gameOver) return;
    
    // 기본 점수 증가
    gameState.baseScore = (gameState.baseScore || 0) + 1;
    gameState.score = gameState.baseScore + (gameState.comboScore || 0);
    document.getElementById('score').textContent = `점수: ${gameState.score}`;
    
    // 피격 효과 감소
    if (gameState.hitEffect > 0) {
        gameState.hitEffect -= 5;
    }

    // 플레이어 이동
    if (keys['ArrowLeft']) {
        player.x = Math.max(0, player.x - player.speed);
        player.direction = -1;
        player.isMoving = true;
    } else if (keys['ArrowRight']) {
        player.x = Math.min(canvas.width - player.width, player.x + player.speed);
        player.direction = 1;
        player.isMoving = true;
    } else {
        player.isMoving = false;
    }

    // 대기 상태 애니메이션
    if (!gameState.isRolling && !player.isMoving) {
        gameState.idleAnimation += 0.02 * gameState.idleDirection;
        if (gameState.idleAnimation > 1) {
            gameState.idleDirection = -1;
        } else if (gameState.idleAnimation < 0) {
            gameState.idleDirection = 1;
        }
    }

    // 구르기 애니메이션
    if (gameState.isRolling) {
        const rollSpeed = 20;
        if (keys['ArrowRight']) {
            gameState.rollAngle += rollSpeed;
            player.direction = 1;
        } else if (keys['ArrowLeft']) {
            gameState.rollAngle -= rollSpeed;
            player.direction = -1;
        } else {
            gameState.rollAngle += rollSpeed * player.direction;
        }
    } else {
        gameState.rollAngle = 0;
    }

    // 장애물 생성 확률을 점수에 따라 미세하게 증가 (최대 10%까지)
    const baseSpawnRate = 0.02;  // 기본 생성 확률 2%
    const scoreMultiplier = Math.min(0.08, gameState.baseScore / 50000); // 최대 8%까지 추가 (총 10%)
    if (Math.random() < (baseSpawnRate + scoreMultiplier)) {
        createObstacle();
    }
    
    obstacles = obstacles.filter(obstacle => {
        obstacle.y += obstacle.speed;
        
        if (checkCollision(obstacle)) {
            return false;
        }
        
        return obstacle.y < canvas.height;
    });

    // 회복 아이템 생성 (0.05% 확률)
    if (Math.random() < 0.0005) {
        healItems.push(new HealItem(canvas));
    }
    
    // 회복 아이템 업데이트
    healItems = healItems.filter(item => {
        if (item.checkCollision(player)) {
            if (gameState.lives < 3) {  // 최대 생명력 제한
                gameState.lives++;
                initializeHearts();  // 하트 UI 업데이트
                
                // 회복 효과음 또는 시각 효과 추가 가능
            }
            return false;
        }
        return !item.update();
    });
}

// 게임 렌더링
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 게임오버시 흑백 효과
    if (gameState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 장애물 그리기
    ctx.fillStyle = '#8B4513';
    obstacles.forEach(obstacle => {
        ctx.beginPath();
        ctx.arc(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, 
            obstacle.width/2, 0, Math.PI * 2);
        ctx.fill();
    });

    // 회복 아이템 그리기
    healItems.forEach(item => item.draw(ctx));

    // 캐릭터 그리기
    drawCharacter(player.x, player.y);
}

// 게임 오버 처리
function showGameOver() {
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOverModal').style.display = 'block';
}

// 게임 재시작
function restartGame() {
    // 진행 중인 모든 타이머 정리
    clearAllGameTimers();
    
    gameState = {
        score: 0,
        baseScore: 0,
        comboScore: 0,
        lives: 3,
        gameOver: false,
        canRoll: true,
        isRolling: false,
        hitEffect: 0,
        deathRotation: 0,
        soulY: 0,
        isDying: false,
        rollAngle: 0,
        idleAnimation: 0,
        idleDirection: 1,
        isInvincible: false,
        combo: 0,
        lastComboTimeout: null,
        processedObstacles: new Set()
    };
    
    // UI 초기화
    initializeHearts();
    updateCooldownUI('ready');
    
    obstacles = [];
    player.x = canvas.width / 2;
    document.getElementById('score').textContent = `점수: ${gameState.score}`;
    document.getElementById('gameOverModal').style.display = 'none';
    healItems = [];
}

// 게임 루프
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// 캐릭터 그리기 함수 수정
function drawCharacter(x, y, color = '#FFB6C1') {
    let drawX = x;
    let drawY = y;

    // 피격 효과
    if (gameState.hitEffect > 0) {
        const intensity = gameState.hitEffect / 100;
        color = `rgb(255,${Math.floor(182 * (1-intensity))},${Math.floor(193 * (1-intensity))})`;
        drawX += Math.random() * 4 * intensity - 2 * intensity;
        drawY += Math.random() * 4 * intensity - 2 * intensity;
    }

    ctx.save();
    ctx.translate(drawX + player.width/2, drawY + player.height/2);
    
    // 구르기 회전
    if (gameState.isRolling) {
        gameState.rollAngle += 15 * player.direction;
        ctx.rotate(gameState.rollAngle * Math.PI / 180);
    }
    
    // 죽음 회전
    if (gameState.isDying) {
        ctx.rotate(gameState.deathRotation * Math.PI / 180);
    }

    // 몸체
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(0, 0, player.width/2, 0, Math.PI * 2);
    ctx.fill();

    // 무적 상태일 때 파란 테두리 추가
    if (gameState.isInvincible) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.stroke();  // 현재 경로(몸체)에 테두리 추가
    }

    // 대기 상태 얼굴 움직임
    let faceOffset = 0;
    if (!gameState.isRolling && !player.isMoving) {
        faceOffset = Math.sin(gameState.idleAnimation * Math.PI) * 5;
    }

    // 눈
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-10, -5 + faceOffset, 8, 0, Math.PI * 2);
    ctx.arc(10, -5 + faceOffset, 8, 0, Math.PI * 2);
    ctx.fill();

    // 눈동자
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-10, -5 + faceOffset, 4, 0, Math.PI * 2);
    ctx.arc(10, -5 + faceOffset, 4, 0, Math.PI * 2);
    ctx.fill();

    // 입 (strokeStyle을 검정색으로 변경)
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, 8 + faceOffset, 6, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    // 죽음 효과 - 영혼
    if (gameState.isDying) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(x + player.width/2, y + player.height/2 - gameState.soulY);
        
        // 영혼 그리기
        ctx.fillStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.arc(0, 0, player.width/2 * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // 영혼 눈
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(-8, -3, 6, 0, Math.PI * 2);
        ctx.arc(8, -3, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 피격 효과 함수
function triggerHitEffect() {
    gameState.hitEffect = 100;
    gameState.isInvincible = true;
    
    const hitTimer = setInterval(() => {
        if (gameState.hitEffect > 0) {
            gameState.hitEffect -= 5;
        }
    }, 16);
    
    const invincibilityTimer = setTimeout(() => {
        gameState.isInvincible = false;
        clearInterval(hitTimer);
    }, 1000);  // 1초간 무적
    
    // 게임오버시 타이머 정리
    if (gameState.gameOver) {
        clearInterval(hitTimer);
        clearTimeout(invincibilityTimer);
    }
}

// 하트 UI 초기화 함수 수정
function initializeHearts() {
    const container = document.getElementById('livesContainer');
    container.innerHTML = ''; // 기존 하트 모두 제거
    
    for (let i = 0; i < gameState.lives; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.innerHTML = `
            <div class="heart-half left"></div>
            <div class="heart-half right"></div>
        `;
        container.appendChild(heart);
    }
}

// 하트 제거 애니메이션
function removeHeart() {
    const hearts = document.querySelectorAll('.heart');
    if (hearts.length > 0 && hearts.length > gameState.lives) {  // 실제 생명력과 UI 동기화 체크
        const lastHeart = hearts[hearts.length - 1];
        lastHeart.classList.add('breaking');
        
        setTimeout(() => {
            if (lastHeart.parentNode) {
                lastHeart.remove();
                // UI와 실제 생명력 재확인
                const currentHearts = document.querySelectorAll('.heart');
                if (currentHearts.length !== gameState.lives) {
                    initializeHearts(); // 불일치시 하트 UI 재초기화
                }
            }
        }, 500);
    }
}

// 게임 상태 초기화
function restartGame() {
    gameState = {
        score: 0,
        baseScore: 0,
        comboScore: 0,
        lives: 3,
        gameOver: false,
        canRoll: true,
        isRolling: false,
        hitEffect: 0,
        deathRotation: 0,
        soulY: 0,
        isDying: false,
        rollAngle: 0,
        idleAnimation: 0,
        idleDirection: 1,
        isInvincible: false,
        combo: 0,
        lastComboTimeout: null,
        processedObstacles: new Set()
    };
    
    // UI 초기화
    const container = document.getElementById('livesContainer');
    container.innerHTML = ''; // 기존 하트 완전 제거
    initializeHearts(); // 새로 생성
    
    obstacles = [];
    player.x = canvas.width / 2;
    document.getElementById('score').textContent = `점수: ${gameState.score}`;
    document.getElementById('gameOverModal').style.display = 'none';
    healItems = [];
}

// 게임 초기화 시 하트 생성
window.addEventListener('load', () => {
    initializeHearts();
    gameLoop();
});

// Miss 텍스트 생성 함수
function createMissText(x, y) {
    const missText = document.createElement('div');
    missText.className = 'miss-text';
    missText.textContent = 'Miss!!';
    missText.style.left = `${x}px`;
    missText.style.top = `${y}px`;
    document.body.appendChild(missText);

    // 애니메이션
    let opacity = 1;
    let scale = 1;
    let yPos = y;
    
    const animate = () => {
        opacity -= 0.02;
        scale -= 0.01;
        yPos -= 0.5;
        
        missText.style.opacity = opacity;
        missText.style.transform = `scale(${scale})`;
        missText.style.top = `${yPos}px`;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            missText.remove();
        }
    };
    
    requestAnimationFrame(animate);
}

// 콤보 시스템 함수
function addCombo() {
    // 콤보 증가
    gameState.combo++;
    const comboPoints = 500 * gameState.combo;
    
    // 점수 업데이트 (기본 점수와 콤보 점수 분리)
    gameState.comboScore = (gameState.comboScore || 0) + comboPoints;
    gameState.score = (gameState.baseScore || 0) + gameState.comboScore;
    
    // 이전 콤보 텍스트 제거
    const existingCombo = document.querySelector('.combo-text');
    if (existingCombo) {
        existingCombo.remove();
    }
    
    // 새 콤보 텍스트 생성
    const comboText = document.createElement('div');
    comboText.className = 'combo-text';
    comboText.textContent = `${gameState.combo}Combo! +${comboPoints}`;
    document.body.appendChild(comboText);
    
    // 이전 타이머 취소
    if (gameState.lastComboTimeout) {
        clearTimeout(gameState.lastComboTimeout);
    }
    
    // 애니메이션 적용
    requestAnimationFrame(() => {
        comboText.style.opacity = '1';
        comboText.style.transform = 'scale(1)';
    });
    
    // 1초 후 제거
    gameState.lastComboTimeout = setTimeout(() => {
        comboText.style.opacity = '0';
        comboText.style.transform = 'scale(0)';
        setTimeout(() => {
            if (comboText.parentNode) {
                comboText.remove();
            }
        }, 300);
    }, 1000);
}
