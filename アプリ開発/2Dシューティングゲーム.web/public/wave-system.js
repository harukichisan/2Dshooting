// Waveシステム
class WaveManager {
    constructor() {
        this.currentWave = 1;
        this.enemiesInWave = 0;
        this.enemiesKilledInWave = 0;
        this.waveState = 'preparing'; // 'preparing', 'spawning', 'fighting', 'boss', 'completed'
        this.waveTimer = 0;
        this.bossActive = false;
    }

    // Wave設定を取得
    getWaveConfig(wave) {
        const isBossWave = wave % 5 === 0;

        if (isBossWave) {
            return {
                type: 'boss',
                enemyCount: 1,
                spawnRate: 60,
                bossType: this.getBossType(wave)
            };
        }

        // 通常Wave
        const baseEnemies = 10 + (wave - 1) * 3;
        return {
            type: 'normal',
            enemyCount: baseEnemies,
            spawnRate: Math.max(30, 60 - wave * 2),
            enemyTypes: this.getEnemyTypesForWave(wave)
        };
    }

    // Waveに応じた敵タイプを決定
    getEnemyTypesForWave(wave) {
        if (wave <= 2) {
            return ['red'];
        } else if (wave <= 4) {
            return ['red', 'purple'];
        } else if (wave <= 7) {
            return ['red', 'purple', 'yellow'];
        } else {
            return ['red', 'purple', 'yellow', 'elite'];
        }
    }

    // ボスタイプを取得
    getBossType(wave) {
        const bossLevel = Math.floor(wave / 5);

        const bossTypes = [
            {
                name: 'デストロイヤー',
                hp: 300,
                color: '#ff0000',
                width: 80,
                height: 80,
                speed: 0.5,
                points: 500,
                patterns: ['straight', 'zigzag'],
                shootPatterns: ['spread', 'homing', 'radial'],
                shootRate: 70,
                bulletDamage: 30
            },
            {
                name: 'アサルトドローン',
                hp: 500,
                color: '#ff00ff',
                width: 90,
                height: 90,
                speed: 0.8,
                points: 800,
                patterns: ['circle', 'rush'],
                shootPatterns: ['spiral', 'radial', 'curtain'],
                shootRate: 60,
                bulletDamage: 35
            },
            {
                name: 'タイタン',
                hp: 800,
                color: '#ffff00',
                width: 100,
                height: 100,
                speed: 0.4,
                points: 1200,
                patterns: ['teleport', 'shield'],
                shootPatterns: ['laser', 'radial', 'spread', 'curtain'],
                shootRate: 100,
                bulletDamage: 40
            }
        ];

        const index = Math.min(bossLevel - 1, bossTypes.length - 1);
        const boss = { ...bossTypes[index] };

        // レベルに応じてステータス強化
        const multiplier = 1 + (bossLevel - 1) * 0.3;
        boss.hp = Math.floor(boss.hp * multiplier);
        boss.points = Math.floor(boss.points * multiplier);

        return boss;
    }

    // Wave開始
    startWave() {
        this.enemiesKilledInWave = 0;
        this.waveState = 'preparing';
        this.waveTimer = 120; // 2秒の準備時間

        const config = this.getWaveConfig(this.currentWave);
        const diffMgr = typeof globalThis !== 'undefined' ? globalThis.difficultyManager : null;
        const adjustedTotal = diffMgr
            ? diffMgr.adjustEnemyCount(config.enemyCount)
            : config.enemyCount;
        this.enemiesInWave = adjustedTotal;

        return config;
    }

    // Wave更新
    update() {
        if (this.waveState === 'preparing') {
            this.waveTimer--;
            if (this.waveTimer <= 0) {
                this.waveState = 'spawning';
            }
        }
    }

    // 敵撃破時
    onEnemyKilled() {
        this.enemiesKilledInWave++;

        if (this.enemiesKilledInWave >= this.enemiesInWave) {
            this.waveState = 'completed';
        }
    }

    // 次のWaveへ
    nextWave() {
        this.currentWave++;
        this.waveState = 'preparing';
        this.waveTimer = 180; // 3秒の準備時間
        return this.startWave();
    }

    // Waveの進行状況を取得
    getProgress() {
        return {
            wave: this.currentWave,
            killed: this.enemiesKilledInWave,
            total: this.enemiesInWave,
            state: this.waveState,
            isBossWave: this.currentWave % 5 === 0
        };
    }
}

// ボスクラス
class Boss {
    constructor(config, canvasWidth, canvasHeight) {
        this.name = config.name;
        this.x = canvasWidth / 2 - config.width / 2;
        this.y = -config.height;
        this.width = config.width;
        this.height = config.height;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.color = config.color;
        this.speed = config.speed;
        this.baseSpeed = config.speed; // 基本速度を保存
        this.points = config.points;
        this.patterns = config.patterns;
        this.shootPatterns = config.shootPatterns; // 複数パターンに対応
        this.shootRate = config.shootRate;
        this.baseShootRate = config.shootRate; // 基本発射レートを保存
        this.bulletDamage = config.bulletDamage; // ダメージを保存
        this.shootTimer = 0;
        this.currentPattern = 0;
        this.patternTimer = 0;
        this.phase = 1;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.specialAttackCounter = 0; // フェーズ3の特殊攻撃用
    }

    // ボス更新
    update(gameFrame) {
        // 登場演出
        if (this.y < 50) {
            this.y += 1;
            return;
        }

        // 無敵時間
        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // 移動パターン
        this.patternTimer++;
        const pattern = this.patterns[this.currentPattern];

        if (pattern === 'straight') {
            this.x += Math.sin(gameFrame * 0.02) * 3;
        } else if (pattern === 'zigzag') {
            this.x += Math.sin(gameFrame * 0.05) * 5;
            this.y += Math.cos(gameFrame * 0.05) * 2;
        } else if (pattern === 'circle') {
            const radius = 100;
            this.x = this.canvasWidth / 2 + Math.cos(gameFrame * 0.03) * radius - this.width / 2;
            this.y = 100 + Math.sin(gameFrame * 0.03) * 50;
        } else if (pattern === 'rush') {
            if (this.patternTimer % 180 === 0) {
                this.targetY = Math.random() * 200 + 50;
            }
            if (this.targetY) {
                this.y += (this.targetY - this.y) * 0.05;
            }
        } else if (pattern === 'teleport') {
            if (this.patternTimer % 240 === 0) {
                this.x = Math.random() * (this.canvasWidth - this.width);
                this.invulnerable = true;
                this.invulnerableTimer = 30;
            }
        } else if (pattern === 'shield') {
            if (this.patternTimer % 300 === 0) {
                this.invulnerable = true;
                this.invulnerableTimer = 120;
            }
        }

        // パターン切り替え
        if (this.patternTimer > 300) {
            this.currentPattern = (this.currentPattern + 1) % this.patterns.length;
            this.patternTimer = 0;
        }

        // 画面内に収める
        this.x = Math.max(0, Math.min(this.canvasWidth - this.width, this.x));
        this.y = Math.max(0, Math.min(200, this.y));

        // フェーズ変更（3段階）
        const hpPercent = this.hp / this.maxHp;

        if (hpPercent <= 0.33 && this.phase === 2) {
            // フェーズ3: HP 33%-0%（攻撃速度2倍、移動速度2倍）
            this.phase = 3;
            this.shootRate = Math.floor(this.baseShootRate * 0.5);
            this.speed = this.baseSpeed * 2;
        } else if (hpPercent <= 0.66 && this.phase === 1) {
            // フェーズ2: HP 66%-33%（攻撃速度1.5倍、移動速度1.5倍）
            this.phase = 2;
            this.shootRate = Math.floor(this.baseShootRate * 0.67);
            this.speed = this.baseSpeed * 1.5;
        }

        // 弾発射
        this.shootTimer++;
    }

    // ボスの弾を生成（プレイヤー座標を受け取る）
    shoot(playerX, playerY) {
        if (this.shootTimer < this.shootRate) return null;

        this.shootTimer = 0;
        const bullets = [];
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height;

        // フェーズ3の特殊攻撃判定
        if (this.phase === 3) {
            this.specialAttackCounter++;

            // 30%の確率で全パターン同時発射
            if (Math.random() < 0.3) {
                this.shootPatterns.forEach(pattern => {
                    bullets.push(...this._executePattern(pattern, centerX, centerY, playerX, playerY));
                });
                return bullets;
            }

            // 20%の確率で超高速連射モード（次の2フレームも発射）
            if (Math.random() < 0.2) {
                this.shootTimer = this.shootRate - 3;
            }
        }

        // フェーズに応じたパターン選択
        let patterns = [];
        if (this.phase === 1) {
            // フェーズ1: 基本パターン1つ
            patterns = [this.shootPatterns[Math.floor(Math.random() * this.shootPatterns.length)]];
        } else if (this.phase === 2) {
            // フェーズ2: ランダムに2パターン
            patterns = [
                this.shootPatterns[Math.floor(Math.random() * this.shootPatterns.length)],
                this.shootPatterns[Math.floor(Math.random() * this.shootPatterns.length)]
            ];
        } else {
            // フェーズ3: ランダムに3パターン
            patterns = [
                this.shootPatterns[Math.floor(Math.random() * this.shootPatterns.length)],
                this.shootPatterns[Math.floor(Math.random() * this.shootPatterns.length)],
                this.shootPatterns[Math.floor(Math.random() * this.shootPatterns.length)]
            ];
        }

        // 選択したパターンを実行
        patterns.forEach(pattern => {
            bullets.push(...this._executePattern(pattern, centerX, centerY, playerX, playerY));
        });

        return bullets;
    }

    // 攻撃パターンを実行
    _executePattern(pattern, centerX, centerY, playerX, playerY) {
        const bullets = [];

        if (pattern === 'spread') {
            // 扇状に5発
            for (let i = -2; i <= 2; i++) {
                bullets.push({
                    x: centerX - 3,
                    y: centerY,
                    width: 6,
                    height: 12,
                    color: '#ff0000',
                    vx: i * 2,
                    vy: 4,
                    isBoss: true,
                    damage: this.bulletDamage
                });
            }
        } else if (pattern === 'spiral') {
            // 螺旋状に8発
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + this.shootTimer * 0.1;
                bullets.push({
                    x: centerX - 3,
                    y: centerY,
                    width: 6,
                    height: 12,
                    color: '#ff00ff',
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3 + 2,
                    isBoss: true,
                    damage: this.bulletDamage
                });
            }
        } else if (pattern === 'laser') {
            // レーザー（太い弾）
            bullets.push({
                x: centerX - 5,
                y: centerY,
                width: 10,
                height: 30,
                color: '#ffff00',
                vx: 0,
                vy: 6,
                isBoss: true,
                damage: this.bulletDamage
            });
        } else if (pattern === 'radial') {
            // 全方位弾幕（12方向に放射状の弾）
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                bullets.push({
                    x: centerX - 3,
                    y: centerY,
                    width: 6,
                    height: 12,
                    color: '#ff6600',
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4,
                    isBoss: true,
                    damage: this.bulletDamage
                });
            }
        } else if (pattern === 'homing') {
            // 追尾弾（プレイヤー方向への追尾弾）
            const dx = playerX - centerX;
            const dy = playerY - centerY;
            const angle = Math.atan2(dy, dx);
            bullets.push({
                x: centerX - 4,
                y: centerY,
                width: 8,
                height: 8,
                color: '#ff0099',
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                isBoss: true,
                damage: this.bulletDamage
            });
        } else if (pattern === 'curtain') {
            // 弾幕カーテン（横一列に並んだ弾）
            for (let i = 0; i < 10; i++) {
                bullets.push({
                    x: (this.canvasWidth / 10) * i,
                    y: centerY,
                    width: 6,
                    height: 12,
                    color: '#00ffff',
                    vx: 0,
                    vy: 3,
                    isBoss: true,
                    damage: this.bulletDamage
                });
            }
        }

        return bullets;
    }

    // ダメージを受ける
    takeDamage(damage) {
        if (this.invulnerable) return false;
        this.hp -= damage;
        return true;
    }

    // ボスが倒されたか
    isDead() {
        return this.hp <= 0;
    }
}
