// ステージクリア報酬システム
class StageRewardSystem {
    constructor() {
        this.playerBuffs = {
            maxHp: 0,           // 最大HP増加量
            attackPower: 1.0,   // 攻撃力倍率
            fireRate: 1.0,      // 連射速度倍率
            moveSpeed: 1.0,     // 移動速度倍率
            itemRange: 1.0      // アイテム吸引範囲倍率
        };

        this.rewardOptions = [
            {
                id: 'maxHp',
                name: '最大HP +20',
                icon: '❤️',
                description: '最大HPが20増加します',
                apply: () => {
                    this.playerBuffs.maxHp += 20;
                }
            },
            {
                id: 'attackPower',
                name: '攻撃力 +15%',
                icon: '⚔️',
                description: '攻撃力が15%増加します',
                apply: () => {
                    this.playerBuffs.attackPower *= 1.15;
                }
            },
            {
                id: 'fireRate',
                name: '連射速度 +20%',
                icon: '🔥',
                description: '連射速度が20%向上します',
                apply: () => {
                    this.playerBuffs.fireRate *= 1.2;
                }
            },
            {
                id: 'moveSpeed',
                name: '移動速度 +10%',
                icon: '⚡',
                description: '移動速度が10%増加します',
                apply: () => {
                    this.playerBuffs.moveSpeed *= 1.1;
                }
            },
            {
                id: 'itemRange',
                name: 'アイテム吸引範囲 +30%',
                icon: '🧲',
                description: 'アイテムの吸引範囲が30%拡大します',
                apply: () => {
                    this.playerBuffs.itemRange *= 1.3;
                }
            }
        ];
    }

    // ランダムに3つの報酬を選択
    getRandomRewards() {
        const shuffled = [...this.rewardOptions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    }

    // 報酬を適用
    applyReward(rewardId) {
        const reward = this.rewardOptions.find(r => r.id === rewardId);
        if (reward) {
            reward.apply();
            return true;
        }
        return false;
    }

    // 現在のバフ状態を取得
    getBuffs() {
        return { ...this.playerBuffs };
    }

    // バフをリセット
    resetBuffs() {
        this.playerBuffs = {
            maxHp: 0,
            attackPower: 1.0,
            fireRate: 1.0,
            moveSpeed: 1.0,
            itemRange: 1.0
        };
    }

    // HTMLモーダルを表示
    showRewardModal(onRewardSelected) {
        const modal = document.getElementById('rewardModal');
        const grid = document.getElementById('rewardGrid');
        grid.innerHTML = '';

        const rewards = this.getRandomRewards();

        rewards.forEach(reward => {
            const card = document.createElement('div');
            card.className = 'reward-card';
            card.onclick = () => {
                this.applyReward(reward.id);
                modal.style.display = 'none';
                if (onRewardSelected) {
                    onRewardSelected(reward);
                }
            };

            card.innerHTML = `
                <div class="reward-icon">${reward.icon}</div>
                <div class="reward-name">${reward.name}</div>
                <div class="reward-description">${reward.description}</div>
            `;

            grid.appendChild(card);
        });

        modal.style.display = 'flex';
    }

    // モーダルを閉じる
    closeRewardModal() {
        document.getElementById('rewardModal').style.display = 'none';
    }
}
