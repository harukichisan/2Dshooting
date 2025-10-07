// 統合実績システム - achievements.jsとsimple-achievements.jsを統合
// レアリティ定義
const RARITY_COLORS = {
    common: '#9e9e9e',
    uncommon: '#4caf50',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800'
};

const RARITY_NAMES = {
    common: 'コモン',
    uncommon: 'アンコモン',
    rare: 'レア',
    epic: 'エピック',
    legendary: 'レジェンダリー'
};

// 統合実績管理クラス
class UnifiedAchievementSystem {
    constructor() {
        // 累計統計
        this.stats = this.loadStats();

        // 難易度別記録
        this.difficultyRecords = this.loadDifficultyRecords();

        // アンロック済み実績
        this.unlockedAchievements = this.loadUnlockedAchievements();

        // 現在のゲームセッション統計
        this.currentGameStats = this.resetCurrentGameStats();

        // 実績定義
        this.achievements = this.initializeAchievements();
    }

    // ========== データ読み込み ==========

    loadStats() {
        const saved = localStorage.getItem('achievementStats');
        if (saved) return JSON.parse(saved);

        return {
            // 基本統計
            totalKills: 0,
            maxScore: 0,
            maxLevel: 0,
            maxCombo: 0,
            totalCombos: 0,
            totalPowerups: 0,
            totalDamageTaken: 0,
            totalDeaths: 0,
            totalPlaytimeSeconds: 0,
            gamesPlayed: 0,

            // 敵タイプ別
            redEnemyKills: 0,
            purpleEnemyKills: 0,
            yellowEnemyKills: 0,

            // パワーアップ別
            rapidKills: 0,
            threeWayKills: 0,
            shieldBlocks: 0,

            // 条件別スコア
            perfectStreakScore: 0,
            lowHpScore: 0,
            noDamageScore: 0,
            noPowerupScore: 0,
            comebackScore: 0,
            speedKill30s: 0,

            // 特殊フラグ
            reachedMultiplier10: false,
            allPowerupsInOneGame: false,
            survivedAt1HP: false,
            powerupRush: false
        };
    }

    loadDifficultyRecords() {
        const saved = localStorage.getItem('difficultyRecords');
        if (saved) return JSON.parse(saved);

        return {
            easy: { maxWave: 0, highScore: 0 },
            normal: { maxWave: 0, highScore: 0 },
            hard: { maxWave: 0, highScore: 0 }
        };
    }

    loadUnlockedAchievements() {
        const saved = localStorage.getItem('unlockedAchievements');
        return saved ? JSON.parse(saved) : [];
    }

    resetCurrentGameStats() {
        return {
            score: 0,
            level: 1,
            maxCombo: 0,
            killsThisGame: 0,
            powerupsThisGame: [],
            noPowerupUsed: true,
            perfectHP: true,
            noDamageTaken: true,
            startTime: Date.now(),
            lowestHP: 100,
            recoveredFrom20: false
        };
    }

    // ========== データ保存 ==========

    saveStats() {
        localStorage.setItem('achievementStats', JSON.stringify(this.stats));
    }

    saveDifficultyRecords() {
        localStorage.setItem('difficultyRecords', JSON.stringify(this.difficultyRecords));
    }

    saveUnlockedAchievements() {
        localStorage.setItem('unlockedAchievements', JSON.stringify(this.unlockedAchievements));
    }

    // ========== 実績定義 ==========

    initializeAchievements() {
        return [
            // ============ 基本プレイ系 ============
            {
                id: 'first_kill',
                name: '初撃破',
                description: '最初の敵を倒した',
                icon: '🎯',
                rarity: 'common',
                check: () => this.stats.totalKills >= 1
            },
            {
                id: 'kill_10',
                name: '駆け出しハンター',
                description: '累計10体の敵を撃破',
                icon: '🎖️',
                rarity: 'common',
                check: () => this.stats.totalKills >= 10
            },
            {
                id: 'kill_50',
                name: 'ハンター',
                description: '累計50体の敵を撃破',
                icon: '🎖️',
                rarity: 'common',
                check: () => this.stats.totalKills >= 50
            },
            {
                id: 'kill_100',
                name: 'ベテランハンター',
                description: '累計100体の敵を撃破',
                icon: '🏅',
                rarity: 'uncommon',
                check: () => this.stats.totalKills >= 100
            },
            {
                id: 'kill_300',
                name: 'エースハンター',
                description: '累計300体の敵を撃破',
                icon: '🏅',
                rarity: 'rare',
                check: () => this.stats.totalKills >= 300
            },
            {
                id: 'kill_500',
                name: 'マスターハンター',
                description: '累計500体の敵を撃破',
                icon: '🥇',
                rarity: 'rare',
                check: () => this.stats.totalKills >= 500
            },
            {
                id: 'kill_1000',
                name: '虐殺者',
                description: '累計1000体の敵を撃破',
                icon: '💀',
                rarity: 'epic',
                check: () => this.stats.totalKills >= 1000
            },
            {
                id: 'kill_2500',
                name: '伝説のハンター',
                description: '累計2500体の敵を撃破',
                icon: '⭐',
                rarity: 'legendary',
                check: () => this.stats.totalKills >= 2500
            },
            {
                id: 'kill_5000',
                name: '究極のハンター',
                description: '累計5000体の敵を撃破',
                icon: '👑',
                rarity: 'legendary',
                check: () => this.stats.totalKills >= 5000
            },

            // ============ スコア系 ============
            {
                id: 'score_100',
                name: 'スコア入門',
                description: 'スコア100点到達',
                icon: '⭐',
                rarity: 'common',
                check: () => this.stats.maxScore >= 100
            },
            {
                id: 'score_500',
                name: 'スコアノービス',
                description: 'スコア500点到達',
                icon: '⭐',
                rarity: 'common',
                check: () => this.stats.maxScore >= 500
            },
            {
                id: 'score_1000',
                name: 'スコアマスター',
                description: 'スコア1000点到達',
                icon: '🌟',
                rarity: 'uncommon',
                check: () => this.stats.maxScore >= 1000
            },
            {
                id: 'score_3000',
                name: 'スコアエキスパート',
                description: 'スコア3000点到達',
                icon: '🌟',
                rarity: 'rare',
                check: () => this.stats.maxScore >= 3000
            },
            {
                id: 'score_5000',
                name: 'スコアレジェンド',
                description: 'スコア5000点到達',
                icon: '💫',
                rarity: 'epic',
                check: () => this.stats.maxScore >= 5000
            },
            {
                id: 'score_10000',
                name: 'スコア神',
                description: 'スコア10000点到達',
                icon: '👑',
                rarity: 'legendary',
                check: () => this.stats.maxScore >= 10000
            },

            // ============ コンボ系 ============
            {
                id: 'combo_5',
                name: 'コンボ初心者',
                description: '5コンボを達成',
                icon: '🔥',
                rarity: 'common',
                check: () => this.stats.maxCombo >= 5
            },
            {
                id: 'combo_10',
                name: 'コンボマスター',
                description: '10コンボを達成',
                icon: '🔥',
                rarity: 'uncommon',
                check: () => this.stats.maxCombo >= 10
            },
            {
                id: 'combo_20',
                name: 'コンボエキスパート',
                description: '20コンボを達成',
                icon: '💥',
                rarity: 'rare',
                check: () => this.stats.maxCombo >= 20
            },
            {
                id: 'combo_30',
                name: 'コンボレジェンド',
                description: '30コンボを達成',
                icon: '💥',
                rarity: 'epic',
                check: () => this.stats.maxCombo >= 30
            },
            {
                id: 'combo_50',
                name: 'コンボ神',
                description: '50コンボを達成',
                icon: '⚡',
                rarity: 'legendary',
                check: () => this.stats.maxCombo >= 50
            },
            {
                id: 'multiplier_10',
                name: '倍率マスター',
                description: 'コンボ倍率×10を達成',
                icon: '✨',
                rarity: 'rare',
                check: () => this.stats.reachedMultiplier10 === true
            },

            // ============ レベル系 ============
            {
                id: 'level_5',
                name: 'レベル5の壁',
                description: 'レベル5に到達',
                icon: '📈',
                rarity: 'common',
                check: () => this.stats.maxLevel >= 5
            },
            {
                id: 'level_10',
                name: 'レベル10の壁',
                description: 'レベル10に到達',
                icon: '📈',
                rarity: 'uncommon',
                check: () => this.stats.maxLevel >= 10
            },
            {
                id: 'level_20',
                name: 'レベル20の壁',
                description: 'レベル20に到達',
                icon: '📊',
                rarity: 'rare',
                check: () => this.stats.maxLevel >= 20
            },

            // ============ パワーアップ系 ============
            {
                id: 'first_powerup',
                name: '初パワーアップ',
                description: '最初のパワーアップを取得',
                icon: '📦',
                rarity: 'common',
                check: () => this.stats.totalPowerups >= 1
            },
            {
                id: 'powerup_collector',
                name: 'パワーアップコレクター',
                description: '1ゲーム中に全種類のパワーアップを取得',
                icon: '🎁',
                rarity: 'uncommon',
                check: () => this.stats.allPowerupsInOneGame === true
            },
            {
                id: 'powerup_50',
                name: 'パワーアップマニア',
                description: '累計50個のパワーアップを取得',
                icon: '🎁',
                rarity: 'uncommon',
                check: () => this.stats.totalPowerups >= 50
            },
            {
                id: 'powerup_100',
                name: 'パワーアップ王',
                description: '累計100個のパワーアップを取得',
                icon: '👑',
                rarity: 'rare',
                check: () => this.stats.totalPowerups >= 100
            },
            {
                id: 'rapid_master',
                name: 'ラピッドファイヤー',
                description: 'RAPIDパワーアップ中に30体撃破（累積）',
                icon: '🔫',
                rarity: 'uncommon',
                check: () => this.stats.rapidKills >= 30
            },
            {
                id: '3way_master',
                name: '3WAYの使い手',
                description: '3WAYパワーアップで50体撃破（累積）',
                icon: '🔱',
                rarity: 'uncommon',
                check: () => this.stats.threeWayKills >= 50
            },
            {
                id: 'shield_master',
                name: '不死身',
                description: 'シールドで累計10回以上敵の攻撃を防ぐ',
                icon: '🛡️',
                rarity: 'uncommon',
                check: () => this.stats.shieldBlocks >= 10
            },
            {
                id: 'shield_legend',
                name: 'シールドレジェンド',
                description: 'シールドで累計50回以上敵の攻撃を防ぐ',
                icon: '🛡️',
                rarity: 'rare',
                check: () => this.stats.shieldBlocks >= 50
            },
            {
                id: 'powerup_rush',
                name: 'パワーアップラッシュ',
                description: '10秒以内に3個のパワーアップを取得',
                icon: '🌈',
                rarity: 'rare',
                check: () => this.stats.powerupRush === true
            },

            // ============ サバイバル・条件系 ============
            {
                id: 'perfect_streak',
                name: 'パーフェクトストリーク',
                description: 'HPを100に保ったまま500点獲得',
                icon: '💯',
                rarity: 'rare',
                check: () => this.stats.perfectStreakScore >= 500
            },
            {
                id: 'survivor',
                name: 'サバイバー',
                description: 'HP10以下で100点以上稼ぐ',
                icon: '💊',
                rarity: 'uncommon',
                check: () => this.stats.lowHpScore >= 100
            },
            {
                id: 'close_call',
                name: 'ギリギリセーフ',
                description: 'HP1で生き延びる',
                icon: '🩹',
                rarity: 'rare',
                check: () => this.stats.survivedAt1HP === true
            },
            {
                id: 'no_damage_300',
                name: 'ノーダメージ',
                description: 'ダメージを受けずに300点獲得',
                icon: '🏆',
                rarity: 'rare',
                check: () => this.stats.noDamageScore >= 300
            },
            {
                id: 'comeback',
                name: 'カムバック',
                description: 'HP20以下から回復して500点獲得',
                icon: '🔄',
                rarity: 'rare',
                check: () => this.stats.comebackScore >= 500
            },
            {
                id: 'no_powerup_500',
                name: 'ピュアリスト',
                description: 'パワーアップなしで500点獲得',
                icon: '⚪',
                rarity: 'epic',
                check: () => this.stats.noPowerupScore >= 500
            },
            {
                id: 'speed_kill',
                name: 'スピードキル',
                description: 'ゲーム開始30秒以内に10体撃破',
                icon: '⚡',
                rarity: 'uncommon',
                check: () => this.stats.speedKill30s >= 10
            },

            // ============ 敵タイプ別 ============
            {
                id: 'red_enemy_hunter',
                name: '赤い悪魔ハンター',
                description: '赤敵を50体撃破',
                icon: '🔴',
                rarity: 'common',
                check: () => this.stats.redEnemyKills >= 50
            },
            {
                id: 'purple_enemy_hunter',
                name: '紫の脅威ハンター',
                description: '紫敵を30体撃破',
                icon: '🟣',
                rarity: 'uncommon',
                check: () => this.stats.purpleEnemyKills >= 30
            },
            {
                id: 'yellow_enemy_hunter',
                name: '黄金の敵ハンター',
                description: '黄敵を20体撃破',
                icon: '🟡',
                rarity: 'rare',
                check: () => this.stats.yellowEnemyKills >= 20
            },

            // ============ プレイ時間系 ============
            {
                id: 'first_play',
                name: 'ようこそ！',
                description: 'ゲームを初めてプレイした',
                icon: '🎉',
                rarity: 'common',
                check: () => this.stats.gamesPlayed >= 1
            },
            {
                id: 'total_playtime_30min',
                name: '熱中プレイヤー',
                description: '累計プレイ時間30分',
                icon: '⏰',
                rarity: 'common',
                check: () => this.stats.totalPlaytimeSeconds >= 1800
            },
            {
                id: 'total_playtime_1hour',
                name: 'ヘビープレイヤー',
                description: '累計プレイ時間1時間',
                icon: '⏰',
                rarity: 'uncommon',
                check: () => this.stats.totalPlaytimeSeconds >= 3600
            },
            {
                id: 'total_playtime_3hours',
                name: '廃人',
                description: '累計プレイ時間3時間',
                icon: '🎮',
                rarity: 'rare',
                check: () => this.stats.totalPlaytimeSeconds >= 10800
            },
            {
                id: 'death_count_10',
                name: '不屈の戦士',
                description: '10回ゲームオーバーになっても諦めない',
                icon: '💪',
                rarity: 'uncommon',
                check: () => this.stats.totalDeaths >= 10
            },
            {
                id: 'tank',
                name: 'タンク',
                description: '累計500ダメージを受ける',
                icon: '🔩',
                rarity: 'uncommon',
                check: () => this.stats.totalDamageTaken >= 500
            },

            // ============ 難易度別Wave到達実績 ============
            {
                id: 'wave_5_easy',
                name: '駆け出し冒険者（イージー）',
                description: 'イージーでWave 5到達',
                icon: '🌟',
                rarity: 'common',
                check: () => this.difficultyRecords.easy.maxWave >= 5
            },
            {
                id: 'wave_5_normal',
                name: '駆け出し冒険者（ノーマル）',
                description: 'ノーマルでWave 5到達',
                icon: '🌟',
                rarity: 'common',
                check: () => this.difficultyRecords.normal.maxWave >= 5
            },
            {
                id: 'wave_5_hard',
                name: '駆け出し冒険者（ハード）',
                description: 'ハードでWave 5到達',
                icon: '🌟',
                rarity: 'uncommon',
                check: () => this.difficultyRecords.hard.maxWave >= 5
            },
            {
                id: 'wave_10_normal',
                name: '熟練冒険者（ノーマル）',
                description: 'ノーマルでWave 10到達',
                icon: '💎',
                rarity: 'uncommon',
                check: () => this.difficultyRecords.normal.maxWave >= 10
            },
            {
                id: 'wave_10_hard',
                name: '熟練冒険者（ハード）',
                description: 'ハードでWave 10到達',
                icon: '💎',
                rarity: 'rare',
                check: () => this.difficultyRecords.hard.maxWave >= 10
            }
        ];
    }

    // ========== 実績チェック ==========

    checkAchievements() {
        const newUnlocks = [];

        this.achievements.forEach(achievement => {
            if (!this.unlockedAchievements.includes(achievement.id)) {
                if (achievement.check()) {
                    this.unlockedAchievements.push(achievement.id);
                    newUnlocks.push(achievement);
                }
            }
        });

        if (newUnlocks.length > 0) {
            this.saveUnlockedAchievements();
        }

        return newUnlocks;
    }

    // ========== 難易度別記録更新 ==========

    updateDifficultyRecord(difficulty, wave, score) {
        const record = this.difficultyRecords[difficulty];
        let updated = false;

        if (wave > record.maxWave) {
            record.maxWave = wave;
            updated = true;
        }
        if (score > record.highScore) {
            record.highScore = score;
            updated = true;
        }

        if (updated) {
            this.saveDifficultyRecords();
        }

        return this.checkAchievements();
    }

    // ========== 進捗情報取得 ==========

    getProgress() {
        const total = this.achievements.length;
        const unlocked = this.unlockedAchievements.length;
        return {
            unlocked,
            total,
            percentage: Math.floor((unlocked / total) * 100)
        };
    }

    getAllAchievements() {
        return this.achievements.map(achievement => ({
            ...achievement,
            unlocked: this.unlockedAchievements.includes(achievement.id)
        }));
    }

    // ========== 統計情報取得（モーダル表示用） ==========

    getStats() {
        return {
            totalKills: this.stats.totalKills,
            clearRecords: { ...this.difficultyRecords },
            highScores: {
                easy: this.difficultyRecords.easy.highScore,
                normal: this.difficultyRecords.normal.highScore,
                hard: this.difficultyRecords.hard.highScore
            },
            totalAchievements: this.achievements.length,
            unlockedAchievements: this.unlockedAchievements.length,
            percentage: this.getProgress().percentage
        };
    }

    // ========== リセット機能 ==========

    resetAll() {
        if (confirm('全ての実績とスタッツをリセットしますか？')) {
            this.unlockedAchievements = [];
            this.stats = this.loadStats();
            this.difficultyRecords = this.loadDifficultyRecords();
            this.saveUnlockedAchievements();
            this.saveStats();
            this.saveDifficultyRecords();
            return true;
        }
        return false;
    }
}
