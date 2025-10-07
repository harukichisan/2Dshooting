// 難易度システム
const DIFFICULTY_CONFIG = {
    easy: {
        name: 'Easy',
        displayName: 'イージー',
        enemyHpMultiplier: 0.6,      // 敵HP -40%
        bulletSpeedMultiplier: 0.75,  // 弾速 -25%
        playerHpMultiplier: 1.5,      // プレイヤーHP +50%
        itemDropMultiplier: 2.0,      // アイテムドロップ率 +100%
        scoreMultiplier: 0.5,         // スコア倍率 x0.5
        color: '#4caf50'
    },
    normal: {
        name: 'Normal',
        displayName: 'ノーマル',
        enemyHpMultiplier: 1.0,
        bulletSpeedMultiplier: 1.0,
        playerHpMultiplier: 1.0,
        itemDropMultiplier: 1.0,
        scoreMultiplier: 1.0,
        color: '#2196f3'
    },
    hard: {
        name: 'Hard',
        displayName: 'ハード',
        enemyHpMultiplier: 1.8,       // 敵HP +80%
        bulletSpeedMultiplier: 1.4,   // 弾速 +40%
        playerHpMultiplier: 1.0,      // プレイヤーHP 標準
        enemyCountMultiplier: 1.3,    // 敵の数 +30%
        itemDropMultiplier: 0.7,      // アイテムドロップ率 -30%
        scoreMultiplier: 2.0,         // スコア倍率 x2.0
        color: '#f44336'
    }
};

class DifficultyManager {
    constructor() {
        this.currentDifficulty = this.loadDifficulty();
    }

    loadDifficulty() {
        const saved = localStorage.getItem('gameDifficulty');
        return saved || 'normal';
    }

    saveDifficulty() {
        localStorage.setItem('gameDifficulty', this.currentDifficulty);
    }

    setDifficulty(difficulty) {
        if (DIFFICULTY_CONFIG[difficulty]) {
            this.currentDifficulty = difficulty;
            this.saveDifficulty();
            return true;
        }
        return false;
    }

    getDifficulty() {
        return this.currentDifficulty;
    }

    getConfig() {
        return DIFFICULTY_CONFIG[this.currentDifficulty];
    }

    // 敵のHPを難易度に応じて調整
    adjustEnemyHp(baseHp) {
        const config = this.getConfig();
        return Math.ceil(baseHp * config.enemyHpMultiplier);
    }

    // 弾速を難易度に応じて調整
    adjustBulletSpeed(baseSpeed) {
        const config = this.getConfig();
        return baseSpeed * config.bulletSpeedMultiplier;
    }

    // プレイヤーHPを難易度に応じて調整
    adjustPlayerHp(baseHp) {
        const config = this.getConfig();
        const multiplier = config.playerHpMultiplier || 1.0;
        return Math.ceil(baseHp * multiplier);
    }

    // 敵の数を難易度に応じて調整
    adjustEnemyCount(baseCount) {
        const config = this.getConfig();
        const multiplier = config.enemyCountMultiplier || 1.0;
        return Math.ceil(baseCount * multiplier);
    }

    // アイテムドロップ率を難易度に応じて調整
    shouldDropItem(baseRate) {
        const config = this.getConfig();
        const adjustedRate = baseRate * config.itemDropMultiplier;
        return Math.random() < adjustedRate;
    }

    // スコアを難易度に応じて調整
    adjustScore(baseScore) {
        const config = this.getConfig();
        return Math.floor(baseScore * config.scoreMultiplier);
    }

    // ボスHPを難易度に応じて調整
    adjustBossHp(baseHp) {
        const config = this.getConfig();
        return Math.ceil(baseHp * config.enemyHpMultiplier);
    }
}
