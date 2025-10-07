// ゲーム統計システム - ゲームオーバー時にプレイ統計を表示
class GameStatsSystem {
    constructor() {
        this.currentSessionStats = this.resetSessionStats();
        this.storageKey = 'startScreenStats';
        this.persistentStats = this.loadPersistentStats();
        this.latestSummary = null;
    }

    // セッション統計のリセット
    resetSessionStats() {
        return {
            startTime: Date.now(),
            endTime: null,
            score: 0,
            waveReached: 1,
            kills: 0,
            maxCombo: 0,
            powerupsCollected: 0,
            shotsFired: 0,
            accuracy: 0,
            damageDealt: 0,
            damageTaken: 0,
            highestHP: 100,
            lowestHP: 100,
            difficulty: 'normal',
            character: 'fighter'
        };
    }

    loadPersistentStats() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) {
                return {
                    totalKills: 0,
                    totalPlayTime: 0,
                    totalGamesPlayed: 0,
                    totalClears: { easy: 0, normal: 0, hard: 0 },
                    highScores: { easy: 0, normal: 0, hard: 0 },
                    maxWaves: { easy: 0, normal: 0, hard: 0 }
                };
            }
            const parsed = JSON.parse(raw);
            return {
                totalKills: parsed.totalKills ?? 0,
                totalPlayTime: parsed.totalPlayTime ?? 0,
                totalGamesPlayed: parsed.totalGamesPlayed ?? 0,
                totalClears: {
                    easy: parsed.totalClears?.easy ?? 0,
                    normal: parsed.totalClears?.normal ?? 0,
                    hard: parsed.totalClears?.hard ?? 0
                },
                highScores: {
                    easy: parsed.highScores?.easy ?? 0,
                    normal: parsed.highScores?.normal ?? 0,
                    hard: parsed.highScores?.hard ?? 0
                },
                maxWaves: {
                    easy: parsed.maxWaves?.easy ?? 0,
                    normal: parsed.maxWaves?.normal ?? 0,
                    hard: parsed.maxWaves?.hard ?? 0
                }
            };
        } catch (error) {
            console.warn('GameStatsSystem: failed to load persistent stats', error);
            localStorage.removeItem(this.storageKey);
            return this.loadPersistentStats();
        }
    }

    savePersistentStats() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.persistentStats));
    }

    // プレイ統計を記録
    recordShotFired() {
        this.currentSessionStats.shotsFired++;
    }

    recordKill() {
        this.currentSessionStats.kills++;
    }

    recordPowerup() {
        this.currentSessionStats.powerupsCollected++;
    }

    recordCombo(combo) {
        if (combo > this.currentSessionStats.maxCombo) {
            this.currentSessionStats.maxCombo = combo;
        }
    }

    recordDamage(damage, isPlayerDamage = false) {
        if (isPlayerDamage) {
            this.currentSessionStats.damageTaken += damage;
        } else {
            this.currentSessionStats.damageDealt += damage;
        }
    }

    recordHP(currentHP) {
        if (currentHP > this.currentSessionStats.highestHP) {
            this.currentSessionStats.highestHP = currentHP;
        }
        if (currentHP < this.currentSessionStats.lowestHP) {
            this.currentSessionStats.lowestHP = currentHP;
        }
    }

    updateScore(score) {
        this.currentSessionStats.score = score;
    }

    updateWave(wave) {
        this.currentSessionStats.waveReached = wave;
    }

    updateDifficulty(difficulty) {
        this.currentSessionStats.difficulty = difficulty;
    }

    // ゲームオーバー時の統計表示
    showGameOverStats() {
        this.currentSessionStats.endTime = Date.now();

        const playTimeSeconds = Math.floor((this.currentSessionStats.endTime - this.currentSessionStats.startTime) / 1000);
        const minutes = Math.floor(playTimeSeconds / 60);
        const seconds = playTimeSeconds % 60;

        const accuracy = this.currentSessionStats.shotsFired > 0
            ? Math.floor((this.currentSessionStats.kills / this.currentSessionStats.shotsFired) * 100)
            : 0;

        const difficultyNames = {
            easy: 'イージー',
            normal: 'ノーマル',
            hard: 'ハード'
        };

        const sessionSummary = this.persistCurrentSession({ cleared: false });
        if (window.startScreen && window.startScreen.recordSession) {
            window.startScreen.recordSession(sessionSummary);
        }

        const rating = this.calculateRating();

        const modalHTML = `
            <div id="gameStatsModal" class="stats-modal">
                <div class="stats-content">
                    <div class="stats-header">
                        <h2>GAME OVER</h2>
                        <div class="stats-subtitle">プレイ統計</div>
                    </div>

                    <div class="stats-rating">
                        <div class="rating-icon">${rating.icon}</div>
                        <div class="rating-rank">${rating.rank}</div>
                        <div class="rating-message">${rating.message}</div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">スコア</div>
                            <div class="stat-value">${this.currentSessionStats.score.toLocaleString()}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">到達Wave</div>
                            <div class="stat-value">Wave ${this.currentSessionStats.waveReached}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">撃破数</div>
                            <div class="stat-value">${this.currentSessionStats.kills}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">最大コンボ</div>
                            <div class="stat-value">${this.currentSessionStats.maxCombo}</div>
                        </div>
                    </div>

                    <div class="stats-list">
                        <div class="list-item"><span class="list-label">プレイ時間</span><span class="list-value">${minutes}分 ${seconds}秒</span></div>
                        <div class="list-item"><span class="list-label">難易度</span><span class="list-value">${difficultyNames[this.currentSessionStats.difficulty]}</span></div>
                        <div class="list-item"><span class="list-label">パワーアップ取得</span><span class="list-value">${this.currentSessionStats.powerupsCollected}個</span></div>
                        <div class="list-item"><span class="list-label">発射弾数</span><span class="list-value">${this.currentSessionStats.shotsFired}発</span></div>
                        <div class="list-item"><span class="list-label">命中率</span><span class="list-value">${accuracy}%</span></div>
                        <div class="list-item"><span class="list-label">与えたダメージ / 受けたダメージ</span><span class="list-value">${this.currentSessionStats.damageDealt} / ${this.currentSessionStats.damageTaken}</span></div>
                        <div class="list-item"><span class="list-label">最高HP / 最低HP</span><span class="list-value">${this.currentSessionStats.highestHP} / ${this.currentSessionStats.lowestHP}</span></div>
                    </div>

                    <div class="stats-actions">
                        <button class="stats-close" onclick="gameStatsSystem.closeStatsModal()">閉じる</button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('gameStatsModal');
        if (existingModal) {
            existingModal.remove();
        }
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // モーダルを閉じる
    closeStatsModal() {
        const modal = document.getElementById('gameStatsModal');
        if (modal) {
            modal.remove();
        }
    }

    // 新しいゲーム開始時
    startNewGame(difficulty, character = 'fighter') {
        this.currentSessionStats = this.resetSessionStats();
        this.currentSessionStats.difficulty = difficulty;
        this.currentSessionStats.character = character;
    }

    persistCurrentSession({ cleared = false } = {}) {
        const session = this.currentSessionStats;
        const duration = (session.endTime || Date.now()) - session.startTime;

        this.persistentStats.totalKills += session.kills;
        this.persistentStats.totalPlayTime += duration;
        this.persistentStats.totalGamesPlayed += 1;

        const diff = session.difficulty || 'normal';
        if (cleared) {
            this.persistentStats.totalClears[diff] = (this.persistentStats.totalClears[diff] || 0) + 1;
        }

        if (session.score > (this.persistentStats.highScores[diff] || 0)) {
            this.persistentStats.highScores[diff] = session.score;
        }
        if (session.waveReached > (this.persistentStats.maxWaves[diff] || 0)) {
            this.persistentStats.maxWaves[diff] = session.waveReached;
        }

        this.savePersistentStats();

        const summary = {
            totalKills: this.persistentStats.totalKills,
            totalPlayTime: this.persistentStats.totalPlayTime,
            totalGamesPlayed: this.persistentStats.totalGamesPlayed,
            totalClears: { ...this.persistentStats.totalClears },
            highScores: { ...this.persistentStats.highScores },
            maxWaves: { ...this.persistentStats.maxWaves },
            difficulty: session.difficulty,
            character: session.character,
            score: session.score,
            wave: session.waveReached,
            playTime: duration,
            cleared
        };
        this.latestSummary = summary;
        return summary;
    }

    markClear(difficulty) {
        this.persistentStats.totalClears[difficulty] = (this.persistentStats.totalClears[difficulty] || 0) + 1;
        this.savePersistentStats();
    }

    getPersistentStats() {
        return {
            totalKills: this.persistentStats.totalKills,
            totalPlayTime: this.persistentStats.totalPlayTime,
            totalGamesPlayed: this.persistentStats.totalGamesPlayed,
            totalClears: { ...this.persistentStats.totalClears },
            highScores: { ...this.persistentStats.highScores },
            maxWaves: { ...this.persistentStats.maxWaves }
        };
    }
}
