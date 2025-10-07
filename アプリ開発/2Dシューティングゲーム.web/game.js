const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 統合実績マネージャーの初期化
const achievementManager = new UnifiedAchievementSystem();
let notificationQueue = [];
let showingNotification = false;

// オーディオ参照
const playerHitAudioEl = document.getElementById('playerHitAudio');
const enemyExplosionAudioEl = document.getElementById('enemyExplosionAudio');
const shootAudioEl = document.getElementById('shootAudio');

function playAudioClip(audioEl, volume = 1) {
    if (!audioEl) return;
    const clip = audioEl.cloneNode();
    clip.volume = volume;
    clip.play().catch(() => {});
}

function playPlayerHitSound() {
    playAudioClip(playerHitAudioEl, 0.8);
}

function playEnemyExplosionSound() {
    playAudioClip(enemyExplosionAudioEl, 0.8);
}

function playShootSound() {
    playAudioClip(shootAudioEl, 0.6);
}

function shakeCamera(durationFrames = 12, magnitude = 6) {
    cameraShakeTime = Math.max(cameraShakeTime, durationFrames);
    cameraShakeMagnitude = Math.max(cameraShakeMagnitude, magnitude);
}

function updateCameraShake() {
    if (cameraShakeTime > 0) {
        cameraShakeTime--;
        cameraShakeOffsetX = (Math.random() - 0.5) * cameraShakeMagnitude;
        cameraShakeOffsetY = (Math.random() - 0.5) * cameraShakeMagnitude;
        if (cameraShakeTime === 0) {
            cameraShakeMagnitude = 0;
        }
    } else {
        cameraShakeOffsetX = 0;
        cameraShakeOffsetY = 0;
    }
}

function spawnExplosion(x, y, size = 40) {
    explosions.push({
        x,
        y,
        radius: size,
        life: 0,
        duration: 18
    });
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const ex = explosions[i];
        ex.life++;
        if (ex.life > ex.duration) {
            explosions.splice(i, 1);
        }
    }
}

function drawExplosions() {
    explosions.forEach(ex => {
        const progress = ex.life / ex.duration;
        const alpha = 1 - progress;
        const radius = ex.radius * (0.5 + progress);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 180, 80, ${0.6 * alpha})`;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function triggerPlayerHitFeedback() {
    player.hitFlashTimer = 12;
    shakeCamera(10, 8);
    playPlayerHitSound();
}

// Waveシステムの初期化
const waveManager = new WaveManager();
let currentBoss = null;
let bossBullets = [];

// 難易度システムの初期化
const difficultyManager = new DifficultyManager();

// 報酬システムの初期化
const rewardSystem = new StageRewardSystem();

// コインシステムの初期化
const coinSystem = new CoinSystem();

// ゲーム統計システムの初期化
const gameStatsSystem = new GameStatsSystem();

// プレイヤー標準値
const PLAYER_BASE_HP = 100;
const PLAYER_BASE_SPEED = 5;
const PLAYER_BASE_SHOOT_DELAY = 200;

let currentCharacterId = 'fighter';
let currentCharacterModifiers = {
    hp: 1,
    damage: 1,
    speed: 1,
    fireRate: 1
};

function setCharacterLoadout(modifiers = {}) {
    currentCharacterModifiers = {
        hp: Math.max(0.5, modifiers.hp || 1),
        damage: Math.max(0.5, modifiers.damage || 1),
        speed: Math.max(0.5, modifiers.speed || 1),
        fireRate: Math.max(0.5, modifiers.fireRate || 1)
    };
    player.baseSpeed = PLAYER_BASE_SPEED * currentCharacterModifiers.speed;
    player.baseShootDelay = Math.max(80, Math.floor(PLAYER_BASE_SHOOT_DELAY / currentCharacterModifiers.fireRate));
}

// 難易度変更関数
function changeDifficulty(difficulty) {
    difficultyManager.setDifficulty(difficulty);
    updateDifficultyUI();

    // 統計システムの難易度を更新
    gameStatsSystem.updateDifficulty(difficulty);

    // ゲームをリセット
    if (gameRunning || document.getElementById('gameOver').style.display === 'block') {
        restart();
    }
}

// 報酬バフを適用
function applyRewardBuffs() {
    const buffs = rewardSystem.getBuffs();
    const upgrades = coinSystem.getActiveUpgrades();

    // 最大HPバフを適用（報酬 + アップグレード）
    const baseMaxHp = Math.floor(difficultyManager.adjustPlayerHp(PLAYER_BASE_HP) * currentCharacterModifiers.hp);
    maxHp = baseMaxHp + buffs.maxHp + upgrades.maxHp;
    hp = Math.min(hp, maxHp);
    document.getElementById('hp').textContent = hp;

    // 攻撃力バフを適用（報酬 + アップグレード）
    const baseDamage = 1 * buffs.attackPower * currentCharacterModifiers.damage;
    bulletDamage = Math.max(1, Math.round(baseDamage + upgrades.attackPower));

    // 連射速度バフを適用
    const baseDelay = player.baseShootDelay;
    player.shootDelay = Math.max(60, Math.floor(baseDelay / buffs.fireRate));
    if (player.powerupType === 'rapid') {
        player.shootDelay = Math.floor(100 / buffs.fireRate);
    }

    // 移動速度バフを適用（報酬 × アップグレード）
    player.speed = player.baseSpeed * buffs.moveSpeed * upgrades.moveSpeed;

    // アイテム吸引範囲バフを適用
    itemMagnetRange = 50 * buffs.itemRange;
}

// 難易度UI更新
function updateDifficultyUI() {
    const diff = difficultyManager.getDifficulty();
    const config = difficultyManager.getConfig();

    // ボタンのアクティブ状態を更新
    document.getElementById('diffEasy').classList.remove('active');
    document.getElementById('diffNormal').classList.remove('active');
    document.getElementById('diffHard').classList.remove('active');
    document.getElementById('diff' + diff.charAt(0).toUpperCase() + diff.slice(1)).classList.add('active');

    // 難易度表示を更新
    document.getElementById('currentDifficulty').textContent = config.displayName;
    document.getElementById('currentDifficulty').style.color = config.color;
    document.getElementById('currentDifficulty').style.textShadow = `0 0 10px ${config.color}`;
}

// ゲーム状態
let gameRunning = false;
let gameSessionActive = false;
let score = 0;
let hp = 100;
let maxHp = 100;
let level = 1;
let gameFrame = 0;
let highScore = localStorage.getItem('shootingGameHighScore') || 0;
let gameStartTime = Date.now();
let powerupGetTimes = [];

// コンボシステム
let comboCount = 0;
let comboTimer = 0;
const comboTimeout = 180; // 3秒（60fps × 3）
let comboMultiplier = 1;

// 敵スポーン制御
const MIN_ACTIVE_ENEMIES = 3;
const MAX_SIMULTANEOUS_SPAWN = 3;
const LAST_ENEMY_THRESHOLD = 2;
let lastEnemyPhaseActive = false;

// カメラシェイク & 演出
let cameraShakeTime = 0;
let cameraShakeMagnitude = 0;
let cameraShakeOffsetX = 0;
let cameraShakeOffsetY = 0;
const explosions = [];

// プレイヤー画像の読み込み
const playerImage = new Image();
playerImage.src = 'assets/player.png';

// 敵機画像の読み込み
const enemyImage = new Image();
enemyImage.src = 'assets/enemy.png';

// プレイヤー
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    speed: PLAYER_BASE_SPEED,
    baseSpeed: PLAYER_BASE_SPEED,
    color: '#0ff',
    powerupType: 'normal',
    shieldActive: false,
    powerupTimer: 0,
    shootDelay: PLAYER_BASE_SHOOT_DELAY,
    baseShootDelay: PLAYER_BASE_SHOOT_DELAY,
    image: playerImage,
    hitFlashTimer: 0
};

// 弾丸
let bullets = [];
let bulletSpeed = 8;
let bulletDamage = 1;
let canShoot = true;
let itemMagnetRange = 50; // アイテム吸引範囲

// 敵
let enemies = [];
let enemySpawnTimer = 0;
const enemySpawnRate = 60;

// パワーアップアイテム
let powerups = [];
const powerupTypes = [
    { type: 'rapid', color: '#f00', label: 'RAPID' },
    { type: '3way', color: '#00f', label: '3WAY' },
    { type: 'shield', color: '#0f0', label: 'SHIELD' }
];

// 星（背景）
let stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: Math.random() * 2 + 1,
        size: Math.random() * 2
    });
}

// キー入力
// ハイスコア表示の初期化
document.getElementById('highScore').textContent = highScore;

const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (window.startScreen && window.startScreen.isVisible()) {
        keys[e.key] = false;
        return;
    }
    if (e.key === ' ' && canShoot && gameRunning) {
        shoot();
        canShoot = false;
        setTimeout(() => canShoot = true, player.shootDelay);
    }
    if (e.key === 'r' || e.key === 'R') {
        if (gameSessionActive && !gameRunning) restart();
    }
    if (e.key === 'a' || e.key === 'A') {
        openAchievementModal();
    }
    if (e.key === 'Escape') {
        if (gameSessionActive) {
            e.preventDefault();
            returnToMenuFromGame({ viaEscape: true });
        }
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 射撃
function shoot() {
    // 射撃音を再生
    playShootSound();

    // 統計記録
    gameStatsSystem.recordShotFired();

    if (player.powerupType === '3way') {
        // 3方向に弾を発射（3発分を記録）
        gameStatsSystem.recordShotFired();
        gameStatsSystem.recordShotFired();
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            color: '#ff0',
            vx: 0,
            vy: -bulletSpeed
        });
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            color: '#ff0',
            vx: -3,
            vy: -bulletSpeed
        });
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            color: '#ff0',
            vx: 3,
            vy: -bulletSpeed
        });
    } else {
        // 通常弾
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            color: '#ff0',
            vx: 0,
            vy: -bulletSpeed
        });
    }
}

// パワーアップアイテムのスポーン
function spawnPowerup(x, y) {
    const powerup = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    powerups.push({
        x: x,
        y: y,
        width: 20,
        height: 20,
        type: powerup.type,
        color: powerup.color,
        label: powerup.label,
        speed: 2
    });
}

// パワーアップ効果を適用
function applyPowerup(type) {
    achievementManager.currentGameStats.noPowerupUsed = false;
    achievementManager.stats.totalPowerups++;

    // 統計記録
    gameStatsSystem.recordPowerup();

    // パワーアップラッシュチェック
    const now = Date.now();
    powerupGetTimes.push(now);
    powerupGetTimes = powerupGetTimes.filter(t => now - t < 10000);
    if (powerupGetTimes.length >= 3) {
        achievementManager.stats.powerupRush = true;
    }

    // 全種類のパワーアップを取得したかチェック
    if (!achievementManager.currentGameStats.powerupsThisGame.includes(type)) {
        achievementManager.currentGameStats.powerupsThisGame.push(type);
        if (achievementManager.currentGameStats.powerupsThisGame.length === 3) {
            achievementManager.stats.allPowerupsInOneGame = true;
        }
    }

    achievementManager.saveStats();

    if (type === 'rapid') {
        player.powerupType = 'rapid';
        const buffs = rewardSystem.getBuffs();
        player.shootDelay = Math.floor(100 / buffs.fireRate);
        player.powerupTimer = 600; // 10秒間（60fps × 10）
    } else if (type === '3way') {
        player.powerupType = '3way';
        const buffs = rewardSystem.getBuffs();
        player.shootDelay = Math.floor(200 / buffs.fireRate);
        player.powerupTimer = 600;
    } else if (type === 'shield') {
        player.shieldActive = true;
        const oldHp = hp;
        hp = Math.min(maxHp, hp + 30); // HP回復（最大値まで）
        document.getElementById('hp').textContent = hp;
        player.powerupTimer = 600;

        // カムバックチェック
        if (oldHp <= 20 && hp > 20) {
            achievementManager.currentGameStats.recoveredFrom20 = true;
        }
    }

    checkAchievements();
}

function showLastEnemyBanner() {
    const banner = document.getElementById('lastEnemyBanner');
    if (!banner) return;
    banner.style.display = 'block';
}

function hideLastEnemyBanner() {
    const banner = document.getElementById('lastEnemyBanner');
    if (!banner) return;
    banner.style.display = 'none';
}

function applyLastEnemyBuff(enemy) {
    if (enemy.isLastEnemy) return;
    enemy.isLastEnemy = true;
    const bonusHp = Math.ceil(enemy.baseHp * 0.5);
    enemy.maxHp = Math.ceil(enemy.baseHp * 1.5);
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + bonusHp);
    enemy.speed = enemy.baseSpeed * 1.2;
    enemy.points = Math.floor(enemy.basePoints * 1.5);
    enemy.color = '#ff7ab8';
}

function enterLastEnemyPhase() {
    if (lastEnemyPhaseActive) return;
    lastEnemyPhaseActive = true;
    enemies.forEach(applyLastEnemyBuff);
    showLastEnemyBanner();
}

function exitLastEnemyPhase() {
    if (!lastEnemyPhaseActive) return;
    lastEnemyPhaseActive = false;
    hideLastEnemyBanner();
    enemies.forEach(enemy => {
        if (!enemy.isLastEnemy) return;
        enemy.isLastEnemy = false;
        enemy.maxHp = enemy.baseHp;
        enemy.hp = Math.min(enemy.hp, enemy.baseHp);
        enemy.speed = enemy.baseSpeed;
        enemy.points = enemy.basePoints;
        enemy.color = enemy.baseColor;
    });
}

function spawnEnemiesBatch(count, { totalTarget, kills }) {
    const shouldBuff = (totalTarget - kills) <= LAST_ENEMY_THRESHOLD;
    for (let i = 0; i < count; i++) {
        spawnEnemy({ isLastEnemy: shouldBuff });
    }
}

// 敵スポーン
function spawnEnemy(options = {}) {
    const waveConfig = waveManager.getWaveConfig(waveManager.currentWave);
    const allowedTypes = waveConfig.enemyTypes || ['red'];

    // 難易度による敵数の補正はWaveConfigで行う

    const baseTypeMap = {
        'red': { width: 30, height: 30, hp: 1, speed: 2, color: '#f00', points: 10 },
        'purple': { width: 40, height: 40, hp: 3, speed: 1.5, color: '#f0f', points: 30 },
        'yellow': { width: 50, height: 50, hp: 5, speed: 1, color: '#ff0', points: 50 },
        'elite': { width: 45, height: 45, hp: 8, speed: 2.5, color: '#0ff', points: 80 }
    };

    // 難易度補正を適用
    const typeMap = {};
    for (const [key, value] of Object.entries(baseTypeMap)) {
        typeMap[key] = {
            ...value,
            hp: difficultyManager.adjustEnemyHp(value.hp),
            points: difficultyManager.adjustScore(value.points)
        };
    }

    const typeKey = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
    const type = typeMap[typeKey];

    const enemy = {
        x: Math.random() * (canvas.width - type.width),
        y: -type.height,
        width: type.width,
        height: type.height,
        hp: type.hp,
        maxHp: type.hp,
        baseHp: type.hp,
        speed: type.speed + (waveManager.currentWave * 0.1),
        baseSpeed: type.speed + (waveManager.currentWave * 0.1),
        color: type.color,
        baseColor: type.color,
        points: type.points,
        basePoints: type.points,
        movePattern: Math.floor(Math.random() * 3)
    };

    if (options.isLastEnemy || lastEnemyPhaseActive) {
        applyLastEnemyBuff(enemy);
    }

    enemies.push(enemy);
}

// ボススポーン
function spawnBoss() {
    const waveConfig = waveManager.getWaveConfig(waveManager.currentWave);
    const bossConfig = waveConfig.bossType;

    // 難易度補正を適用
    const adjustedBossConfig = {
        ...bossConfig,
        hp: difficultyManager.adjustBossHp(bossConfig.hp),
        points: difficultyManager.adjustScore(bossConfig.points)
    };

    currentBoss = new Boss(adjustedBossConfig, canvas.width, canvas.height);

    // ボス警告表示
    const warning = document.getElementById('bossWarning');
    warning.style.display = 'block';
    setTimeout(() => {
        warning.style.display = 'none';
    }, 3000);
}

// 衝突判定
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 更新
function update() {
    if (!gameRunning) return;

    gameFrame++;

    updateCameraShake();
    updateExplosions();
    if (player.hitFlashTimer > 0) {
        player.hitFlashTimer--;
    }

    // Waveシステムの更新
    waveManager.update();
    const waveProgress = waveManager.getProgress();

    // 統計記録：Wave更新
    gameStatsSystem.updateWave(waveProgress.wave);

    // Wave表示の更新
    if (waveProgress.state === 'preparing') {
        const waveDisplay = document.getElementById('waveDisplay');
        const waveNumber = document.getElementById('waveNumber');
        const waveProgressText = document.getElementById('waveProgress');

        waveDisplay.style.display = 'block';
        if (waveProgress.isBossWave) {
            waveNumber.textContent = `WAVE ${waveProgress.wave} - BOSS WAVE`;
            waveNumber.style.color = '#f00';
        } else {
            waveNumber.textContent = `WAVE ${waveProgress.wave}`;
            waveNumber.style.color = '#0ff';
        }
        waveProgressText.textContent = 'GET READY!';

        // 準備時間が終わったらspawning状態に移行
        if (waveManager.waveTimer <= 0) {
            waveManager.waveState = 'spawning';
            const nextConfig = waveManager.getWaveConfig(waveManager.currentWave);
            if (nextConfig.type === 'boss') {
                spawnBoss();
                waveManager.waveState = 'fighting';
            }
        }
    } else if (waveProgress.state === 'spawning' || waveProgress.state === 'fighting') {
        const waveDisplay = document.getElementById('waveDisplay');
        const waveProgressText = document.getElementById('waveProgress');
        waveDisplay.style.display = 'block';
        waveProgressText.textContent = `${waveProgress.killed} / ${waveProgress.total}`;
    } else if (waveProgress.state === 'completed') {
        document.getElementById('waveDisplay').style.display = 'none';
        exitLastEnemyPhase();

        // ステージクリア報酬を表示
        gameRunning = false;
        rewardSystem.showRewardModal((selectedReward) => {
            // 報酬を適用してゲームを再開
            applyRewardBuffs();
            waveManager.nextWave();
            gameRunning = true;
        });
    }

    // プレイヤー移動
    if (keys['ArrowLeft'] || keys['a']) {
        player.x = Math.max(0, player.x - player.speed);
    }
    if (keys['ArrowRight'] || keys['d']) {
        player.x = Math.min(canvas.width - player.width, player.x + player.speed);
    }

    // コンボタイマーの更新
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) {
            // コンボリセット
            comboCount = 0;
            comboMultiplier = 1;
            document.getElementById('comboDisplay').style.display = 'none';
        }
    }

    // 星の更新
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    // 弾丸の更新
    bullets = bullets.filter(bullet => {
        bullet.x += bullet.vx || 0;
        bullet.y += bullet.vy || -bulletSpeed;
        return bullet.y > -bullet.height && bullet.x > -bullet.width && bullet.x < canvas.width;
    });

    // 敵のスポーン（通常Wave時のみ）
    if ((waveProgress.state === 'spawning' || waveProgress.state === 'fighting') && !currentBoss) {
        const totalRemainingOverall = waveProgress.total - waveProgress.killed;

        if (totalRemainingOverall <= LAST_ENEMY_THRESHOLD) {
            enterLastEnemyPhase();
        } else if (lastEnemyPhaseActive) {
            exitLastEnemyPhase();
        }

        const remainingToSpawn = waveProgress.total - (waveProgress.killed + enemies.length);
        const waveConfig = waveManager.getWaveConfig(waveManager.currentWave);

        if (remainingToSpawn > 0) {
            const targetActive = Math.min(MIN_ACTIVE_ENEMIES, totalRemainingOverall);
            const deficit = targetActive - enemies.length;

            if (deficit > 0) {
                const spawnCount = Math.min(Math.max(deficit, 1), remainingToSpawn, MAX_SIMULTANEOUS_SPAWN);
                spawnEnemiesBatch(spawnCount, { totalTarget: waveProgress.total, kills: waveProgress.killed });
                enemySpawnTimer = 0;
            } else {
                enemySpawnTimer++;
                if (enemySpawnTimer > waveConfig.spawnRate) {
                    const spawnCount = Math.min(MAX_SIMULTANEOUS_SPAWN, remainingToSpawn);
                    spawnEnemiesBatch(spawnCount, { totalTarget: waveProgress.total, kills: waveProgress.killed });
                    enemySpawnTimer = 0;
                }
            }
        } else if (enemies.length === 0 && lastEnemyPhaseActive) {
            exitLastEnemyPhase();
        }
    }

    // ボスの更新
    if (currentBoss) {
        currentBoss.update(gameFrame);

        // ボスの弾発射（プレイヤー座標を渡す）
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const newBullets = currentBoss.shoot(playerCenterX, playerCenterY);
        if (newBullets) {
            bossBullets.push(...newBullets);
        }

        // ボスの弾の更新
        bossBullets = bossBullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // プレイヤーとの衝突
            if (checkCollision(player, bullet)) {
                // ボスの弾のダメージを使用（シールドで軽減）
                const bulletDamage = bullet.damage || 20;
                const damage = player.shieldActive ? Math.floor(bulletDamage * 0.5) : bulletDamage;
                if (player.shieldActive) {
                    achievementManager.stats.shieldBlocks++;
                }
                hp -= damage;
                achievementManager.stats.totalDamageTaken += damage;
                gameStatsSystem.recordDamage(damage, true);
                gameStatsSystem.recordHP(hp);
                document.getElementById('hp').textContent = hp;
                triggerPlayerHitFeedback();
                if (hp <= 0) {
                    gameOver();
                }
                return false;
            }

            return bullet.y < canvas.height && bullet.x > 0 && bullet.x < canvas.width;
        });

        // プレイヤーの弾とボスの衝突
        bullets = bullets.filter(bullet => {
            if (checkCollision(bullet, currentBoss)) {
                if (currentBoss.takeDamage(bulletDamage)) {
                    if (currentBoss.isDead()) {
                        // ボススコアは既に難易度補正済み
                        score += currentBoss.points;
                        achievementManager.stats.totalKills++;
                        waveManager.onEnemyKilled();
                        document.getElementById('score').textContent = score;

                        // ハイスコア更新
                        if (score > highScore) {
                            highScore = score;
                            localStorage.setItem('shootingGameHighScore', highScore);
                            document.getElementById('highScore').textContent = highScore;
                        }

                        currentBoss = null;
                        bossBullets = [];
                        checkAchievements();
                    }
                }
                return false;
            }
            return true;
        });
    }

    // 敵の更新
    enemies = enemies.filter(enemy => {
        enemy.y += enemy.speed;

        // 移動パターン
        if (enemy.movePattern === 1) {
            enemy.x += Math.sin(gameFrame * 0.05) * 2;
        } else if (enemy.movePattern === 2) {
            enemy.x += Math.cos(gameFrame * 0.03) * 1.5;
        }

        enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));

        // プレイヤーとの衝突
        if (checkCollision(player, enemy)) {
            const damage = player.shieldActive ? 5 : 10; // シールド時はダメージ半減

            // シールドブロック記録
            if (player.shieldActive) {
                achievementManager.stats.shieldBlocks++;
            }

            hp -= damage;
            achievementManager.stats.totalDamageTaken += damage;
            achievementManager.currentGameStats.noDamageTaken = false;
            if (hp < 100) {
                achievementManager.currentGameStats.perfectHP = false;
            }

            // 統計記録
            gameStatsSystem.recordDamage(damage, true);
            gameStatsSystem.recordHP(hp);

            // 最低HP記録
            if (hp < achievementManager.currentGameStats.lowestHP) {
                achievementManager.currentGameStats.lowestHP = hp;
            }

            // HP1で生き延びる
            if (hp === 1) {
                achievementManager.stats.survivedAt1HP = true;
            }

            document.getElementById('hp').textContent = hp;
            triggerPlayerHitFeedback();
            if (hp <= 0) {
                gameOver();
            }
            checkAchievements();
            return false;
        }

        return enemy.y < canvas.height;
    });

    // パワーアップアイテムの更新
    powerups = powerups.filter(powerup => {
        powerup.y += powerup.speed;

        // アイテム吸引（マグネット効果）
        const dx = player.x + player.width / 2 - (powerup.x + powerup.width / 2);
        const dy = player.y + player.height / 2 - (powerup.y + powerup.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < itemMagnetRange) {
            const pullSpeed = 4;
            powerup.x += (dx / distance) * pullSpeed;
            powerup.y += (dy / distance) * pullSpeed;
        }

        // プレイヤーとの衝突判定
        if (checkCollision(player, powerup)) {
            applyPowerup(powerup.type);
            return false;
        }

        return powerup.y < canvas.height;
    });

    // パワーアップタイマーの更新
    if (player.powerupTimer > 0) {
        player.powerupTimer--;
        if (player.powerupTimer === 0) {
            // パワーアップ効果を解除
            if (player.powerupType !== 'normal') {
                player.powerupType = 'normal';
                const buffs = rewardSystem.getBuffs();
                player.shootDelay = Math.floor(200 / buffs.fireRate);
            }
            player.shieldActive = false;
        }
    }

    // 弾丸と敵の衝突
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemy.hp -= bulletDamage;
                bullets.splice(bulletIndex, 1);

                if (enemy.hp <= 0) {
                    // 実績：敵撃破
                    achievementManager.stats.totalKills++;
                    achievementManager.currentGameStats.killsThisGame++;
                    achievementManager.stats.totalCombos++;

                    // 統計記録
                    gameStatsSystem.recordKill();
                    gameStatsSystem.recordDamage(bulletDamage, false);

                    // Wave進行
                    waveManager.onEnemyKilled();

                    // 敵タイプ別撃破数
                    if (enemy.color === '#f00') achievementManager.stats.redEnemyKills++;
                    else if (enemy.color === '#f0f') achievementManager.stats.purpleEnemyKills++;
                    else if (enemy.color === '#ff0') achievementManager.stats.yellowEnemyKills++;

                    // パワーアップ別撃破数
                    if (player.powerupType === 'rapid') achievementManager.stats.rapidKills++;
                    else if (player.powerupType === '3way') achievementManager.stats.threeWayKills++;

                    // スピードキル（30秒以内）
                    if (Date.now() - gameStartTime < 30000) {
                        achievementManager.stats.speedKill30s = achievementManager.currentGameStats.killsThisGame;
                    }

                    // コンボシステム
                    comboCount++;
                    comboTimer = comboTimeout;

                    // コンボ倍率の計算 (2, 3, 5, 8, 10...)
                    if (comboCount >= 10) {
                        comboMultiplier = 10;
                        achievementManager.stats.reachedMultiplier10 = true;
                    } else if (comboCount >= 7) {
                        comboMultiplier = 8;
                    } else if (comboCount >= 5) {
                        comboMultiplier = 5;
                    } else if (comboCount >= 3) {
                        comboMultiplier = 3;
                    } else if (comboCount >= 2) {
                        comboMultiplier = 2;
                    } else {
                        comboMultiplier = 1;
                    }

                    // 最大コンボ記録
                    if (comboCount > achievementManager.stats.maxCombo) {
                        achievementManager.stats.maxCombo = comboCount;
                    }
                    if (comboCount > achievementManager.currentGameStats.maxCombo) {
                        achievementManager.currentGameStats.maxCombo = comboCount;
                    }

                    // 統計記録
                    gameStatsSystem.recordCombo(comboCount);

                    // コンボ表示の更新
                    if (comboCount > 1) {
                        document.getElementById('comboDisplay').style.display = 'block';
                        document.getElementById('combo').textContent = comboCount;
                        document.getElementById('multiplier').textContent = comboMultiplier;
                    }

                    // スコア加算（コンボ倍率適用、難易度補正済み）
                    const earnedPoints = enemy.points * comboMultiplier;
                    score += earnedPoints;
                    achievementManager.currentGameStats.score = score;
                    gameStatsSystem.updateScore(score);
                    document.getElementById('score').textContent = score;

                    // ハイスコア更新
                    if (score > highScore) {
                        highScore = score;
                        localStorage.setItem('shootingGameHighScore', highScore);
                        document.getElementById('highScore').textContent = highScore;
                    }

                    // 各種スコア実績チェック
                    if (score > achievementManager.stats.maxScore) {
                        achievementManager.stats.maxScore = score;
                    }
                    if (achievementManager.currentGameStats.perfectHP && score >= 500) {
                        achievementManager.stats.perfectStreakScore = score;
                    }
                    if (hp <= 10) {
                        achievementManager.stats.lowHpScore = Math.max(achievementManager.stats.lowHpScore, score);
                    }
                    if (achievementManager.currentGameStats.noDamageTaken) {
                        achievementManager.stats.noDamageScore = Math.max(achievementManager.stats.noDamageScore, score);
                    }
                    if (achievementManager.currentGameStats.noPowerupUsed) {
                        achievementManager.stats.noPowerupScore = Math.max(achievementManager.stats.noPowerupScore, score);
                    }
                    if (achievementManager.currentGameStats.recoveredFrom20 && score >= 500) {
                        achievementManager.stats.comebackScore = Math.max(achievementManager.stats.comebackScore, score);
                    }

                    // パワーアップアイテムをドロップ（難易度に応じた確率）
                    if (difficultyManager.shouldDropItem(0.3)) {
                        spawnPowerup(enemy.x + enemy.width / 2 - 10, enemy.y);
                    }

                    spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, Math.max(enemy.width, enemy.height));
                    playEnemyExplosionSound();

                    enemies.splice(enemyIndex, 1);

                    // レベルアップ
                    if (score > level * 100) {
                        level++;
                        achievementManager.currentGameStats.level = level;
                        if (level > achievementManager.stats.maxLevel) {
                            achievementManager.stats.maxLevel = level;
                        }
                    }

                    checkAchievements();
                }
            }
        });
    });
}

// 描画
function draw() {
    ctx.save();
    ctx.translate(cameraShakeOffsetX, cameraShakeOffsetY);

    // 背景
    ctx.fillStyle = '#000';
    ctx.fillRect(-cameraShakeOffsetX, -cameraShakeOffsetY, canvas.width, canvas.height);

    // 星
    stars.forEach(star => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // プレイヤー
    if (player.image.complete) {
        ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
    } else {
        // 画像読み込み中は四角形を表示
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.width, player.height);
    }

    if (player.hitFlashTimer > 0) {
        const alpha = player.hitFlashTimer / 12;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 120, 120, ${0.6 * alpha})`;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.restore();
    }

    // シールドエフェクト
    if (player.shieldActive) {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 弾丸
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    drawExplosions();

    // 敵
    enemies.forEach(enemy => {
        if (enemyImage.complete) {
            ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            // 画像読み込み中は四角形を表示
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }

        // HPバー
        if (enemy.hp < enemy.maxHp) {
            const barWidth = enemy.width;
            const barHeight = 4;
            ctx.fillStyle = '#f00';
            ctx.fillRect(enemy.x, enemy.y - 8, barWidth, barHeight);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(enemy.x, enemy.y - 8, barWidth * (enemy.hp / enemy.maxHp), barHeight);
        }
    });

    // パワーアップアイテムの描画
    powerups.forEach(powerup => {
        ctx.fillStyle = powerup.color;
        ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(powerup.x, powerup.y, powerup.width, powerup.height);

        // ラベル表示
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(powerup.label, powerup.x + powerup.width / 2, powerup.y + powerup.height / 2 + 3);
        ctx.textAlign = 'left';
    });

    // ボスの描画
    if (currentBoss) {
        // ボス本体
        ctx.fillStyle = currentBoss.color;
        ctx.fillRect(currentBoss.x, currentBoss.y, currentBoss.width, currentBoss.height);
        ctx.strokeStyle = currentBoss.invulnerable ? '#fff' : '#000';
        ctx.lineWidth = currentBoss.invulnerable ? 4 : 3;
        ctx.strokeRect(currentBoss.x, currentBoss.y, currentBoss.width, currentBoss.height);

        // 無敵時のエフェクト
        if (currentBoss.invulnerable) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(currentBoss.x - 5, currentBoss.y - 5, currentBoss.width + 10, currentBoss.height + 10);
            ctx.setLineDash([]);
        }

        // ボス名表示
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(currentBoss.name, currentBoss.x + currentBoss.width / 2, currentBoss.y - 30);

        // HPバー
        const barWidth = currentBoss.width;
        const barHeight = 8;
        const hpRatio = currentBoss.hp / currentBoss.maxHp;

        ctx.fillStyle = '#333';
        ctx.fillRect(currentBoss.x, currentBoss.y - 20, barWidth, barHeight);

        // HPの色（残量に応じて変化）
        if (hpRatio > 0.5) {
            ctx.fillStyle = '#0f0';
        } else if (hpRatio > 0.25) {
            ctx.fillStyle = '#ff0';
        } else {
            ctx.fillStyle = '#f00';
        }
        ctx.fillRect(currentBoss.x, currentBoss.y - 20, barWidth * hpRatio, barHeight);

        // HP数値表示
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Courier New"';
        ctx.fillText(`${currentBoss.hp}/${currentBoss.maxHp}`, currentBoss.x + currentBoss.width / 2, currentBoss.y - 8);
        ctx.textAlign = 'left';

        // フェーズ2の表示
        if (currentBoss.phase === 2) {
            ctx.fillStyle = '#f00';
            ctx.font = 'bold 12px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('PHASE 2', currentBoss.x + currentBoss.width / 2, currentBoss.y + currentBoss.height + 15);
            ctx.textAlign = 'left';
        }
    }

    // ボスの弾の描画
    bossBullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    ctx.restore();

    // レベル・Wave表示
    ctx.fillStyle = '#0f0';
    ctx.font = '16px "Courier New"';
    const waveProgress = waveManager.getProgress();
    ctx.fillText(`WAVE ${waveProgress.wave}`, 10, canvas.height - 10);

    // パワーアップ状���表示
    if (player.powerupType !== 'normal' || player.shieldActive) {
        ctx.fillStyle = '#ff0';
        ctx.font = '14px "Courier New"';
        let statusText = '';
        if (player.powerupType === 'rapid') statusText = 'RAPID FIRE';
        else if (player.powerupType === '3way') statusText = '3-WAY';
        if (player.shieldActive) statusText += (statusText ? ' + ' : '') + 'SHIELD';

        const timeLeft = Math.ceil(player.powerupTimer / 60);
        ctx.fillText(`${statusText} (${timeLeft}s)`, 10, 30);
    }

    // コンボ表示（画面中央上部）
    if (comboCount > 1) {
        ctx.save();
        ctx.fillStyle = '#ff0';
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 3;
        ctx.font = 'bold 36px "Courier New"';
        ctx.textAlign = 'center';

        const comboText = `${comboCount} COMBO!`;
        const multiplierText = `×${comboMultiplier}`;

        // コンボテキストに枠線
        ctx.strokeText(comboText, canvas.width / 2, 80);
        ctx.fillText(comboText, canvas.width / 2, 80);

        // 倍率テキスト
        ctx.font = 'bold 24px "Courier New"';
        ctx.strokeText(multiplierText, canvas.width / 2, 110);
        ctx.fillText(multiplierText, canvas.width / 2, 110);

        // タイマーバー
        const barWidth = 200;
        const barHeight = 8;
        const barX = canvas.width / 2 - barWidth / 2;
        const barY = 120;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#ff0';
        const timeRatio = comboTimer / comboTimeout;
        ctx.fillRect(barX, barY, barWidth * timeRatio, barHeight);

        ctx.restore();
    }
}

// ゲームオーバー
function gameOver() {
    gameRunning = false;
    exitLastEnemyPhase();
    document.getElementById('gameOver').style.display = 'block';

    // プレイ時間を記録
    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    achievementManager.stats.totalPlaytimeSeconds += playTime;
    achievementManager.stats.totalDeaths++;
    achievementManager.stats.gamesPlayed++;

    // 難易度別記録を更新
    const currentDifficulty = difficultyManager.getDifficulty();
    const waveCleared = waveManager.currentWave;
    if (score > achievementManager.stats.maxScore) {
        achievementManager.stats.maxScore = score;
    }
    achievementManager.updateDifficultyRecord(currentDifficulty, waveCleared - 1, score);

    // プレイ統計を表示
    setTimeout(() => {
        gameStatsSystem.showGameOverStats();
    }, 500);

    // コイン獲得（ゲームオーバー時は少量）
    const coinsEarned = coinSystem.calculateCoinsEarned(score, false);
    coinSystem.addCoins(coinsEarned);
    coinSystem.updateHeaderCoinDisplay();

    // コイン獲得の表示
    if (coinsEarned > 0) {
        console.log(`💰 ${coinsEarned} コイン獲得！`);
    }

    achievementManager.saveStats();
    checkAchievements();
}

// リスタート
function restart() {
    gameRunning = true;
    gameSessionActive = true;
    score = 0;

    exitLastEnemyPhase();

    const currentDifficulty = difficultyManager.getDifficulty();
    gameStatsSystem.startNewGame(currentDifficulty, currentCharacterId);

    const upgrades = coinSystem.getActiveUpgrades();
    const baseHp = Math.floor(difficultyManager.adjustPlayerHp(PLAYER_BASE_HP) * currentCharacterModifiers.hp);
    hp = baseHp + upgrades.maxHp;
    maxHp = hp;

    bulletSpeed = difficultyManager.adjustBulletSpeed(8);
    const baseDamage = 1 * currentCharacterModifiers.damage;
    bulletDamage = Math.max(1, Math.round(baseDamage + upgrades.attackPower));
    itemMagnetRange = 50;
    level = 1;
    gameFrame = 0;
    comboCount = 0;
    comboTimer = 0;
    comboMultiplier = 1;
    player.x = canvas.width / 2;
    player.speed = player.baseSpeed * upgrades.moveSpeed;
    player.powerupType = 'normal';
    player.shieldActive = upgrades.shieldTime > 0;
    player.powerupTimer = upgrades.shieldTime * 60; // 秒をフレームに変換
    player.shootDelay = player.baseShootDelay;
    bullets = [];
    enemies = [];
    powerups = [];
    bossBullets = [];
    currentBoss = null;
    enemySpawnTimer = 0;
    gameStartTime = Date.now();
    powerupGetTimes = [];

    // 報酬システムをリセット
    rewardSystem.resetBuffs();

    // Waveシステムのリセット
    waveManager.currentWave = 1;
    waveManager.enemiesInWave = 0;
    waveManager.enemiesKilledInWave = 0;
    waveManager.waveState = 'preparing';
    waveManager.waveTimer = 0;
    waveManager.startWave();

    document.getElementById('score').textContent = score;
    document.getElementById('hp').textContent = hp;
    document.getElementById('comboDisplay').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('waveDisplay').style.display = 'none';
    document.getElementById('bossWarning').style.display = 'none';

    // 現在のゲーム統計リセット
    achievementManager.currentGameStats = achievementManager.resetCurrentGameStats();
    coinSystem.updateHeaderCoinDisplay();
}

// 実績チェック
function checkAchievements() {
    const newAchievements = achievementManager.checkAchievements();
    if (newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
            notificationQueue.push(achievement);
        });
        showNextNotification();
        updateAchievementButton();
    }
    achievementManager.saveStats();
}

// 実績通知表示
function showNextNotification() {
    if (showingNotification || notificationQueue.length === 0) return;

    showingNotification = true;
    const achievement = notificationQueue.shift();
    const notification = document.getElementById('achievementNotification');
    notification.querySelector('.title').textContent = `${achievement.icon} ${achievement.name}`;
    notification.querySelector('.description').textContent = achievement.description;
    notification.style.display = 'block';
    const rarityColor = RARITY_COLORS[achievement.rarity] || 'rgba(0, 229, 255, 0.6)';
    notification.style.borderColor = rarityColor;
    notification.style.boxShadow = `0 22px 40px ${rarityColor}55`;

    setTimeout(() => {
        notification.style.display = 'none';
        notification.style.borderColor = '';
        notification.style.boxShadow = '';
        showingNotification = false;
        showNextNotification();
    }, 4000);
}

// 実績ボタン更新
function updateAchievementButton() {
    const progress = achievementManager.getProgress();
    const badge = document.getElementById('achievementBadge');
    if (badge) {
        badge.textContent = `${progress.unlocked}/${progress.total}`;
    }
    const button = document.getElementById('achievementButton');
    if (button) {
        button.setAttribute('title', `実績 (${progress.unlocked}/${progress.total})`);
    }
}

// 実績モーダル開く
function openAchievementModal() {
    const modal = document.getElementById('achievementModal');
    const progress = achievementManager.getProgress();

    // 進捗バー更新
    document.getElementById('progressFill').style.width = `${progress.percentage}%`;
    document.getElementById('progressText').textContent = `${progress.unlocked}/${progress.total} (${progress.percentage}%)`;

    // 実績グリッド作成
    const grid = document.getElementById('achievementGrid');
    grid.innerHTML = '';

    const achievements = achievementManager.getAllAchievements();
    achievements.forEach(achievement => {
        const card = document.createElement('div');
        card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`;

        const rarityBadge = document.createElement('div');
        rarityBadge.className = 'achievement-rarity';
        rarityBadge.textContent = RARITY_NAMES[achievement.rarity];
        rarityBadge.style.backgroundColor = RARITY_COLORS[achievement.rarity];
        rarityBadge.style.color = achievement.rarity === 'common' ? '#000' : '#fff';

        const icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.textContent = achievement.icon;

        const name = document.createElement('div');
        name.className = 'achievement-name';
        name.textContent = achievement.name;

        const description = document.createElement('div');
        description.className = 'achievement-description';
        description.textContent = achievement.unlocked ? achievement.description : '???';

        card.appendChild(rarityBadge);
        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(description);
        grid.appendChild(card);
    });

    modal.style.display = 'block';
}

// 実績モーダル閉じる
function closeAchievementModal(event) {
    if (!event || event.target.id === 'achievementModal') {
        document.getElementById('achievementModal').style.display = 'none';
    }
}

// シンプルアチーブメントモーダル開く（統合版）
function openSimpleAchievementsModal() {
    const modal = document.getElementById('simpleAchievementsModal');
    const stats = achievementManager.getStats();

    // 統計表示
    document.getElementById('totalKillsDisplay').textContent = stats.totalKills;
    document.getElementById('achievementProgress').textContent =
        `${stats.unlockedAchievements}/${stats.totalAchievements} (${stats.percentage}%)`;

    // 難易度別記録
    document.getElementById('clearEasy').textContent = stats.clearRecords.easy.maxWave;
    document.getElementById('scoreEasy').textContent = stats.highScores.easy;
    document.getElementById('clearNormal').textContent = stats.clearRecords.normal.maxWave;
    document.getElementById('scoreNormal').textContent = stats.highScores.normal;
    document.getElementById('clearHard').textContent = stats.clearRecords.hard.maxWave;
    document.getElementById('scoreHard').textContent = stats.highScores.hard;

    // 撃破数マイルストーン（フィルター）
    const killAchievements = achievementManager.getAllAchievements().filter(a =>
        a.id.startsWith('kill_') && !a.id.includes('red') && !a.id.includes('purple') && !a.id.includes('yellow')
    );
    const killMilestonesList = document.getElementById('killMilestonesList');
    killMilestonesList.innerHTML = '';
    killAchievements.forEach(achievement => {
        const item = document.createElement('div');
        item.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.unlocked ? achievement.description : '???'}</div>
            </div>
        `;
        killMilestonesList.appendChild(item);
    });

    // Waveクリアアチーブメント（フィルター）
    const waveAchievements = achievementManager.getAllAchievements().filter(a => a.id.startsWith('wave_'));
    const clearAchievementsList = document.getElementById('clearAchievementsList');
    clearAchievementsList.innerHTML = '';
    waveAchievements.forEach(achievement => {
        const item = document.createElement('div');
        item.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.unlocked ? achievement.description : '???'}</div>
            </div>
        `;
        clearAchievementsList.appendChild(item);
    });

    // スコアアチーブメント（フィルター）
    const scoreAchievements = achievementManager.getAllAchievements().filter(a => a.id.startsWith('score_'));
    const scoreAchievementsList = document.getElementById('scoreAchievementsList');
    scoreAchievementsList.innerHTML = '';
    scoreAchievements.forEach(achievement => {
        const item = document.createElement('div');
        item.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.unlocked ? achievement.description : '???'}</div>
            </div>
        `;
        scoreAchievementsList.appendChild(item);
    });

    modal.style.display = 'flex';
}

// シンプルアチーブメントモーダル閉じる
function closeSimpleAchievementsModal() {
    document.getElementById('simpleAchievementsModal').style.display = 'none';
}

function startGameFromMenu({ difficulty, character, modifiers } = {}) {
    if (difficulty) {
        difficultyManager.setDifficulty(difficulty);
        gameStatsSystem.updateDifficulty(difficulty);
    }
    if (character) {
        currentCharacterId = character;
    }
    if (modifiers) {
        setCharacterLoadout(modifiers);
    } else {
        setCharacterLoadout(currentCharacterModifiers);
    }
    updateDifficultyUI();
    Object.keys(keys).forEach(key => keys[key] = false);

    // スタート画面を非表示にしてゲーム画面を表示
    if (window.startScreen) {
        window.startScreen.hide();
        window.startScreen.syncWithSystems?.();
    }

    restart();
}

function returnToMenuFromGame(options = {}) {
    gameRunning = false;
    gameSessionActive = false;
    exitLastEnemyPhase();
    Object.keys(keys).forEach(key => keys[key] = false);
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('waveDisplay').style.display = 'none';
    document.getElementById('bossWarning').style.display = 'none';
    const rewardModal = document.getElementById('rewardModal');
    if (rewardModal) rewardModal.style.display = 'none';
    const upgradeModal = document.getElementById('upgradeModal');
    if (upgradeModal) upgradeModal.style.display = 'none';
    const simpleModal = document.getElementById('simpleAchievementsModal');
    if (simpleModal) simpleModal.style.display = 'none';
    rewardSystem.resetBuffs();
    if (window.startScreen) {
        window.startScreen.show();
        window.startScreen.syncWithSystems?.();
    }
}

window.startGameFromMenu = startGameFromMenu;
window.returnToMenuFromGame = returnToMenuFromGame;

// ゲームループ
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 初期化
function initGame() {
    setCharacterLoadout(currentCharacterModifiers);
    const upgrades = coinSystem.getActiveUpgrades();
    const baseHp = Math.floor(difficultyManager.adjustPlayerHp(PLAYER_BASE_HP) * currentCharacterModifiers.hp);
    hp = baseHp + upgrades.maxHp;
    maxHp = hp;
    bulletSpeed = difficultyManager.adjustBulletSpeed(8);
    bulletDamage = 1;
    player.speed = player.baseSpeed * upgrades.moveSpeed;
    player.shootDelay = player.baseShootDelay;
    document.getElementById('hp').textContent = hp;
    document.getElementById('score').textContent = score;
    coinSystem.updateHeaderCoinDisplay();
}

updateAchievementButton();
updateDifficultyUI();
initGame();
gameLoop();
