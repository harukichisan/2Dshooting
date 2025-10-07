// 永続通貨システム（コイン）
class CoinSystem {
    constructor() {
        this.coins = parseInt(localStorage.getItem('gameCoins') || '0');

        // アップグレード状態（各3段階または2段階）
        this.upgrades = {
            maxHp: parseInt(localStorage.getItem('upgrade_maxHp') || '0'),      // 0-3
            attackPower: parseInt(localStorage.getItem('upgrade_attackPower') || '0'),  // 0-3
            moveSpeed: parseInt(localStorage.getItem('upgrade_moveSpeed') || '0'),      // 0-3
            shield: parseInt(localStorage.getItem('upgrade_shield') || '0')             // 0-2
        };

        // アップグレード設定
        this.upgradeConfig = {
            maxHp: {
                name: 'HP増加',
                icon: '❤️',
                maxLevel: 3,
                costs: [100, 250, 500],
                bonuses: [20, 50, 100],
                description: (level) => level === 0 ? '初期HP +0' : `初期HP +${this.upgradeConfig.maxHp.bonuses[level - 1]}`
            },
            attackPower: {
                name: '攻撃力増加',
                icon: '⚔️',
                maxLevel: 3,
                costs: [150, 300, 600],
                bonuses: [1, 2, 3],
                description: (level) => level === 0 ? '攻撃力 +0' : `攻撃力 +${this.upgradeConfig.attackPower.bonuses[level - 1]}`
            },
            moveSpeed: {
                name: '移動速度増加',
                icon: '⚡',
                maxLevel: 3,
                costs: [120, 280, 550],
                bonuses: [1.1, 1.25, 1.5],
                description: (level) => level === 0 ? '移動速度 ×1.0' : `移動速度 ×${this.upgradeConfig.moveSpeed.bonuses[level - 1]}`
            },
            shield: {
                name: '開始時シールド',
                icon: '🛡️',
                maxLevel: 2,
                costs: [200, 500],
                bonuses: [10, 20],
                description: (level) => {
                    if (level === 0) return 'シールドなし';
                    return `開始時シールド${this.upgradeConfig.shield.bonuses[level - 1]}秒`;
                }
            }
        };
    }

    // コインを追加
    addCoins(amount) {
        this.coins += amount;
        this.saveCoins();
    }

    // コインを消費
    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            this.saveCoins();
            return true;
        }
        return false;
    }

    // 現在のコイン数を取得
    getCoins() {
        return this.coins;
    }

    // アップグレード購入
    purchaseUpgrade(upgradeId) {
        const currentLevel = this.upgrades[upgradeId];
        const config = this.upgradeConfig[upgradeId];

        // 最大レベルチェック
        if (currentLevel >= config.maxLevel) {
            return { success: false, reason: 'max_level' };
        }

        const cost = config.costs[currentLevel];

        // コイン不足チェック
        if (this.coins < cost) {
            return { success: false, reason: 'insufficient_coins' };
        }

        // 購入処理
        this.spendCoins(cost);
        this.upgrades[upgradeId]++;
        this.saveUpgrade(upgradeId);

        return {
            success: true,
            newLevel: this.upgrades[upgradeId],
            bonus: config.bonuses[currentLevel]
        };
    }

    // アップグレード情報を取得
    getUpgradeInfo(upgradeId) {
        const currentLevel = this.upgrades[upgradeId];
        const config = this.upgradeConfig[upgradeId];

        return {
            id: upgradeId,
            name: config.name,
            icon: config.icon,
            currentLevel: currentLevel,
            maxLevel: config.maxLevel,
            isMaxed: currentLevel >= config.maxLevel,
            nextCost: currentLevel < config.maxLevel ? config.costs[currentLevel] : null,
            currentBonus: currentLevel > 0 ? config.bonuses[currentLevel - 1] : 0,
            nextBonus: currentLevel < config.maxLevel ? config.bonuses[currentLevel] : null,
            description: config.description(currentLevel)
        };
    }

    // すべてのアップグレード情報を取得
    getAllUpgradesInfo() {
        return Object.keys(this.upgradeConfig).map(id => this.getUpgradeInfo(id));
    }

    // 現在のアップグレードボーナスを取得（ゲーム開始時に適用）
    getActiveUpgrades() {
        return {
            maxHp: this.upgrades.maxHp > 0 ? this.upgradeConfig.maxHp.bonuses[this.upgrades.maxHp - 1] : 0,
            attackPower: this.upgrades.attackPower > 0 ? this.upgradeConfig.attackPower.bonuses[this.upgrades.attackPower - 1] : 0,
            moveSpeed: this.upgrades.moveSpeed > 0 ? this.upgradeConfig.moveSpeed.bonuses[this.upgrades.moveSpeed - 1] : 1.0,
            shieldTime: this.upgrades.shield > 0 ? this.upgradeConfig.shield.bonuses[this.upgrades.shield - 1] : 0
        };
    }

    // コイン獲得計算（クリアまたは失敗時）
    calculateCoinsEarned(score, cleared) {
        const baseCoins = Math.floor(score / 100);
        const clearBonus = cleared ? 50 : 0;
        return baseCoins + clearBonus;
    }

    // データ保存
    saveCoins() {
        localStorage.setItem('gameCoins', this.coins.toString());
    }

    saveUpgrade(upgradeId) {
        localStorage.setItem(`upgrade_${upgradeId}`, this.upgrades[upgradeId].toString());
    }

    // アップグレードモーダルを表示
    showUpgradeModal() {
        const modal = document.getElementById('upgradeModal');
        if (!modal) return;

        this.updateUpgradeUI();
        modal.style.display = 'flex';
    }

    // アップグレードモーダルを閉じる
    closeUpgradeModal() {
        const modal = document.getElementById('upgradeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // アップグレードUIを更新
    updateUpgradeUI() {
        // コイン表示更新
        const coinDisplay = document.getElementById('coinDisplay');
        if (coinDisplay) {
            coinDisplay.textContent = this.coins;
        }

        // アップグレードカード更新
        const upgradesGrid = document.getElementById('upgradesGrid');
        if (!upgradesGrid) return;

        upgradesGrid.innerHTML = '';

        this.getAllUpgradesInfo().forEach(info => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            if (info.isMaxed) card.classList.add('maxed');

            const canAfford = !info.isMaxed && this.coins >= info.nextCost;

            card.innerHTML = `
                <div class="upgrade-icon">${info.icon}</div>
                <div class="upgrade-name">${info.name}</div>
                <div class="upgrade-level">Lv.${info.currentLevel}/${info.maxLevel}</div>
                <div class="upgrade-description">${info.description}</div>
                ${info.isMaxed
                    ? '<div class="upgrade-cost">MAX</div>'
                    : `<button class="upgrade-buy-btn ${canAfford ? '' : 'disabled'}"
                               onclick="coinSystem.buyUpgrade('${info.id}')"
                               ${canAfford ? '' : 'disabled'}>
                          ${info.nextCost} <span style="color: #ff0;">💰</span>
                       </button>`
                }
            `;

            upgradesGrid.appendChild(card);
        });
    }

    // アップグレード購入ボタンのハンドラー
    buyUpgrade(upgradeId) {
        const result = this.purchaseUpgrade(upgradeId);

        if (result.success) {
            // 購入成功
            this.updateUpgradeUI();
            this.showPurchaseEffect(upgradeId);
        } else if (result.reason === 'insufficient_coins') {
            alert('コインが足りません！');
        } else if (result.reason === 'max_level') {
            alert('最大レベルに達しています！');
        }
    }

    // 購入エフェクト表示
    showPurchaseEffect(upgradeId) {
        const config = this.upgradeConfig[upgradeId];
        // 簡単なアラート（後でアニメーションに変更可能）
        const info = this.getUpgradeInfo(upgradeId);
        console.log(`${config.icon} ${config.name} をレベル${info.currentLevel}にアップグレードしました！`);
    }

    // ヘッダーのコイン表示を更新
    updateHeaderCoinDisplay() {
        const headerCoinDisplay = document.getElementById('headerCoinsValue');
        if (headerCoinDisplay) {
            headerCoinDisplay.textContent = this.coins;
        }
    }
}
