class StartScreenProfile {
    constructor(storageKey = 'startScreenProfile') {
        this.storageKey = storageKey;
        this.clone = (value) => {
            if (typeof structuredClone === 'function') {
                return structuredClone(value);
            }
            return JSON.parse(JSON.stringify(value));
        };
        this.defaultData = {
            stats: {
                totalKills: 0,
                totalPlayTime: 0,
                totalGamesPlayed: 0,
                totalClears: { easy: 0, normal: 0, hard: 0 },
                highScores: { easy: 0, normal: 0, hard: 0 },
                maxWaves: { easy: 0, normal: 0, hard: 0 }
            },
            achievements: {
                unlocked: 0,
                total: 0
            },
            characters: {
                unlocked: ['fighter'],
                selected: 'fighter'
            },
            settings: {
                bgmVolume: 0.7,
                sfxVolume: 0.8,
                ambient: true,
                fullscreen: false,
                highParticles: true,
                reducedMotion: false,
                gamepad: false
            },
            lastSession: {
                difficulty: 'normal',
                character: 'fighter',
                bestRun: null
            }
        };
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return this.clone(this.defaultData);
            const parsed = JSON.parse(raw);
            return this.mergeWithDefault(parsed);
        } catch (error) {
            console.warn('StartScreenProfile: failed to parse stored data. Resetting to defaults.', error);
            return this.clone(this.defaultData);
        }
    }

    mergeWithDefault(partial) {
        const deepMerge = (target, source) => {
            for (const key of Object.keys(source)) {
                const sourceValue = source[key];
                if (Array.isArray(sourceValue)) {
                    target[key] = Array.isArray(target[key]) ? [...target[key]] : [];
                    sourceValue.forEach(item => {
                        if (!target[key].includes(item)) target[key].push(item);
                    });
                } else if (sourceValue && typeof sourceValue === 'object') {
                    target[key] = deepMerge(target[key] ? target[key] : {}, sourceValue);
                } else if (sourceValue !== undefined) {
                    target[key] = sourceValue;
                }
            }
            return target;
        };
        return deepMerge(this.clone(this.defaultData), partial || {});
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.save();
    }

    updateLastSession({ difficulty, character, summary }) {
        this.data.lastSession.difficulty = difficulty;
        this.data.lastSession.character = character;
        if (summary) {
            this.data.lastSession.bestRun = {
                score: summary.score,
                wave: summary.wave,
                time: summary.playTime,
                difficulty,
                character,
                timestamp: Date.now()
            };
        }
        this.save();
    }

    updateStats(statsUpdate) {
        const { stats } = this.data;
        stats.totalKills = statsUpdate.totalKills ?? stats.totalKills;
        stats.totalPlayTime = statsUpdate.totalPlayTime ?? stats.totalPlayTime;
        stats.totalGamesPlayed = statsUpdate.totalGamesPlayed ?? stats.totalGamesPlayed;
        if (statsUpdate.totalClears) {
            stats.totalClears = { ...stats.totalClears, ...statsUpdate.totalClears };
        }
        if (statsUpdate.highScores) {
            stats.highScores = { ...stats.highScores, ...statsUpdate.highScores };
        }
        if (statsUpdate.maxWaves) {
            stats.maxWaves = { ...stats.maxWaves, ...statsUpdate.maxWaves };
        }
        this.save();
    }

    syncWithAchievementManager(manager) {
        if (!manager) return;
        const progress = manager.getProgress();
        this.data.achievements.unlocked = progress.unlocked;
        this.data.achievements.total = progress.total;
        this.save();
    }

    ensureCharacterUnlocked(id) {
        if (!this.data.characters.unlocked.includes(id)) {
            this.data.characters.unlocked.push(id);
            this.save();
        }
    }

    setSelectedCharacter(id) {
        this.data.characters.selected = id;
        this.save();
    }
}

class StartScreenAudio {
    constructor(profile) {
        this.profile = profile;
        this.bgm = document.getElementById('bgmAudio');
        this.hover = document.getElementById('hoverAudio');
        this.click = document.getElementById('clickAudio');
        this.transition = document.getElementById('transitionAudio');
        this.ambient = document.getElementById('ambientAudio');
        this.tracks = [this.bgm, this.hover, this.click, this.transition, this.ambient].filter(Boolean);
        this.applySettings();
    }

    applySettings() {
        const { settings } = this.profile.data;
        if (this.bgm) {
            this.bgm.volume = settings.bgmVolume;
        }
        if (this.ambient) {
            this.ambient.volume = settings.ambient ? Math.min(settings.bgmVolume + 0.05, 1) : 0;
        }
        const sfxVolume = settings.sfxVolume;
        [this.hover, this.click, this.transition].forEach(audio => {
            if (audio) audio.volume = sfxVolume;
        });
    }

    playBgm() {
        if (!this.bgm) return;
        this.safePlay(this.bgm);
    }

    fadeOutBgm(duration = 800) {
        if (!this.bgm) return;
        const startVolume = this.bgm.volume;
        const start = performance.now();
        const step = timestamp => {
            const elapsed = timestamp - start;
            const ratio = Math.min(elapsed / duration, 1);
            this.bgm.volume = startVolume * (1 - ratio);
            if (ratio < 1) {
                requestAnimationFrame(step);
            } else {
                this.bgm.pause();
                this.applySettings();
            }
        };
        requestAnimationFrame(step);
    }

    playHover() {
        if (this.hover) this.safePlay(this.hover, true);
    }

    playClick() {
        if (this.click) this.safePlay(this.click, true);
    }

    playTransition() {
        if (this.transition) this.safePlay(this.transition, true);
    }

    playAmbient() {
        if (!this.ambient) return;
        const enabled = this.profile.data.settings.ambient;
        if (enabled) this.safePlay(this.ambient);
        else this.ambient.pause();
    }

    safePlay(audio, resetTime = false) {
        if (!audio) return;
        if (resetTime) audio.currentTime = 0;
        audio.play().catch(() => {
            /* ignore autoplay restrictions */
        });
    }
}

class StarfieldLayer {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.count = options.count;
        this.speed = options.speed;
        this.size = options.size;
        this.variant = options.variant || 'star';
        this.stars = [];
        this.resize();
        this.populate();
    }

    resize() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.canvas.clientWidth * dpr;
        this.canvas.height = this.canvas.clientHeight * dpr;
        this.ctx.scale(dpr, dpr);
    }

    populate() {
        if (!this.canvas) return;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.stars = Array.from({ length: this.count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * this.size + 0.5,
            speed: (Math.random() * 0.5 + 0.5) * this.speed,
            alpha: Math.random() * 0.6 + 0.3
        }));
    }

    update(delta, flicker = true) {
        if (!this.canvas) return;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        for (const star of this.stars) {
            star.y += star.speed * delta;
            if (star.y > height) {
                star.y = -star.size;
                star.x = Math.random() * width;
            }
            if (flicker) {
                star.alpha += (Math.random() - 0.5) * 0.03;
                star.alpha = Math.max(0.2, Math.min(0.9, star.alpha));
            }
        }
    }

    draw() {
        if (!this.canvas) return;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = '#ffffff';
        for (const star of this.stars) {
            this.ctx.globalAlpha = star.alpha;
            if (this.variant === 'streak') {
                this.ctx.fillRect(star.x, star.y, star.size * 0.8, star.size * 6);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;
    }
}

class Starfield {
    constructor({ far, mid, near, fx }) {
        this.layers = [];
        if (far) this.layers.push(new StarfieldLayer(far, { count: 180, speed: 0.015, size: 1.4 }));
        if (mid) this.layers.push(new StarfieldLayer(mid, { count: 120, speed: 0.05, size: 1.8 }));
        if (near) this.layers.push(new StarfieldLayer(near, { count: 90, speed: 0.12, size: 2.4 }));
        if (fx) this.layers.push(new StarfieldLayer(fx, { count: 35, speed: 0.38, size: 1.2, variant: 'streak' }));
        this.lastTime = performance.now();
        this.animationId = null;
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.layers.forEach(layer => layer.resize());
    }

    start() {
        const loop = time => {
            const delta = (time - this.lastTime) * 0.06;
            this.lastTime = time;
            this.layers.forEach(layer => {
                layer.update(delta);
                layer.draw();
            });
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    stop() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
}

const CHARACTER_DEFINITIONS = [
    {
        id: 'fighter',
        name: 'FIGHTER',
        icon: '🚀',
        description: 'バランスの取れた万能型。扱いやすく安定した性能。',
        stats: { attack: 0.7, defense: 0.6, speed: 0.8 },
        modifiers: { hp: 1.0, damage: 1.0, speed: 1.0, fireRate: 1.0 },
        unlockCondition: null
    },
    {
        id: 'bomber',
        name: 'BOMBER',
        icon: '💥',
        description: '重武装の火力特化。鈍重だが一撃必殺。',
        stats: { attack: 0.95, defense: 0.85, speed: 0.45 },
        modifiers: { hp: 1.25, damage: 1.4, speed: 0.85, fireRate: 0.8 },
        unlockCondition: { type: 'wave', difficulty: 'normal', value: 10, label: 'NORMALでWave10到達' }
    },
    {
        id: 'interceptor',
        name: 'INTERCEPTOR',
        icon: '🛸',
        description: '高機動の快速機。火力は低いが回避に優れる。',
        stats: { attack: 0.55, defense: 0.5, speed: 1.0 },
        modifiers: { hp: 0.85, damage: 0.85, speed: 1.25, fireRate: 1.25 },
        unlockCondition: { type: 'score', value: 150000, label: '累計スコア150,000' }
    },
    {
        id: 'sentinel',
        name: 'SENTINEL',
        icon: '🛰️',
        description: '防御型サポート機。シールドと支援能力に優れる。',
        stats: { attack: 0.6, defense: 1.0, speed: 0.6 },
        modifiers: { hp: 1.4, damage: 0.9, speed: 0.9, fireRate: 1.0 },
        unlockCondition: { type: 'clears', difficulty: 'hard', value: 1, label: 'HARDクリア' }
    }
];

class StartScreenUI {
    constructor(profile, audio) {
        this.profile = profile;
        this.audio = audio;
        this.root = document.getElementById('startScreen');
        this.gameLayer = document.getElementById('gameLayer');
        this.menuButtons = Array.from(this.root.querySelectorAll('.main-menu .menu-btn'));
        this.panels = new Map();
        this.currentPanel = null;
        this.currentMenuIndex = 0;
        this.selectedDifficulty = null;
        this.selectedCharacter = profile.data.characters.selected;
        this.starfield = new Starfield({
            far: document.getElementById('starfieldLayerFar'),
            mid: document.getElementById('starfieldLayerMid'),
            near: document.getElementById('starfieldLayerNear'),
            fx: document.getElementById('starfieldLayerFx')
        });
        this.characterGrid = this.root.querySelector('#characterGrid');
        this.characterDetail = {
            name: document.getElementById('characterName'),
            description: document.getElementById('characterDescription'),
            attack: document.getElementById('statAttack'),
            defense: document.getElementById('statDefense'),
            speed: document.getElementById('statSpeed'),
            unlockState: document.getElementById('characterUnlockState'),
            selectedDifficulty: document.getElementById('characterSelectedDifficulty'),
            launchButton: this.root.querySelector('[data-action="launchGame"]')
        };
        this.difficultyContinueButton = this.root.querySelector('[data-action="goToCharacter"]');
        if (this.difficultyContinueButton) this.difficultyContinueButton.disabled = true;
        this.panelInfo = document.getElementById('difficultyInfo');
        this.bindPanels();
        this.attachMenuEvents();
        this.attachPanelEvents();
        this.attachKeyboardEvents();
        this.attachSettingsEvents();
        this.starfield.start();
        this.audio.playAmbient();
        setTimeout(() => this.audio.playBgm(), 300);
        this.renderMenuState();
        this.renderCharacterGrid();
        this.syncWithSystems();
    }

    bindPanels() {
        const panelIds = [
            'difficultySelectScreen',
            'characterSelectScreen',
            'statisticsScreen',
            'achievementsScreen',
            'highScoresScreen',
            'settingsScreen',
            'howToPlayScreen',
            'creditsScreen',
            'exitScreen'
        ];
        panelIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) this.panels.set(id, el);
        });
    }

    attachMenuEvents() {
        this.menuButtons.forEach((button, index) => {
            button.addEventListener('mouseenter', () => {
                this.currentMenuIndex = index;
                this.audio.playHover();
                this.highlightMenu();
            });
            button.addEventListener('focus', () => {
                this.currentMenuIndex = index;
                this.highlightMenu();
            });
            button.addEventListener('click', () => this.handleMenuAction(button));
        });
    }

    attachPanelEvents() {
        this.root.querySelectorAll('[data-back]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.back;
                if (target === 'main') this.closePanel();
                else this.openPanel(target);
                this.audio.playClick();
            });
        });
        this.root.querySelectorAll('[data-action="confirmDifficulty"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDifficulty(btn.dataset.difficulty);
            });
        });
        this.root.querySelectorAll('[data-action="confirmExit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.audio.playTransition();
                if (typeof window.returnToMenuFromGame === 'function') {
                    window.returnToMenuFromGame({ viaExit: true });
                }
                this.closePanel();
            });
        });
        if (this.difficultyContinueButton) {
            this.difficultyContinueButton.addEventListener('click', () => {
                if (this.selectedDifficulty) {
                    this.openPanel('characterSelectScreen');
                    this.audio.playTransition();
                    this.characterDetail.selectedDifficulty.textContent = this.selectedDifficulty.toUpperCase();
                }
            });
        }
        if (this.characterDetail.launchButton) {
            this.characterDetail.launchButton.addEventListener('click', () => this.launchGame());
        }
    }

    attachKeyboardEvents() {
        window.addEventListener('keydown', event => {
            if (!this.isVisible()) return;
            const activePanel = this.getActivePanelId();
            if (!activePanel) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    this.moveMenu(1);
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    this.moveMenu(-1);
                } else if (event.key === 'Enter') {
                    event.preventDefault();
                    const button = this.menuButtons[this.currentMenuIndex];
                    if (button) {
                        button.click();
                        this.audio.playClick();
                    }
                }
            } else {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.audio.playClick();
                    const panel = this.panels.get(activePanel);
                    const back = panel?.querySelector('[data-back]');
                    if (back) back.click();
                    else this.closePanel();
                }
            }
        });
    }

    attachSettingsEvents() {
        const bgmSlider = document.getElementById('bgmVolume');
        const sfxSlider = document.getElementById('sfxVolume');
        const ambientToggle = document.getElementById('ambientToggle');
        const fullscreenToggle = document.getElementById('fullscreenToggle');
        const highParticlesToggle = document.getElementById('highParticlesToggle');
        const reducedMotionToggle = document.getElementById('reducedMotionToggle');
        const gamepadToggle = document.getElementById('gamepadToggle');
        const saveButton = this.root.querySelector('[data-action="saveSettings"]');
        const resetButton = this.root.querySelector('[data-action="resetSettings"]');

        const applyFormValues = () => {
            const settings = this.profile.data.settings;
            if (bgmSlider) settings.bgmVolume = parseFloat(bgmSlider.value);
            if (sfxSlider) settings.sfxVolume = parseFloat(sfxSlider.value);
            if (ambientToggle) settings.ambient = ambientToggle.checked;
            if (fullscreenToggle) settings.fullscreen = fullscreenToggle.checked;
            if (highParticlesToggle) settings.highParticles = highParticlesToggle.checked;
            if (reducedMotionToggle) settings.reducedMotion = reducedMotionToggle.checked;
            if (gamepadToggle) settings.gamepad = gamepadToggle.checked;
            this.profile.updateSettings(settings);
            this.audio.applySettings();
            this.audio.playClick();
            if (settings.fullscreen) {
                document.documentElement.requestFullscreen?.().catch(() => {});
            } else if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {});
            }
        };

        const populateForm = () => {
            const settings = this.profile.data.settings;
            if (bgmSlider) bgmSlider.value = settings.bgmVolume;
            if (sfxSlider) sfxSlider.value = settings.sfxVolume;
            if (ambientToggle) ambientToggle.checked = settings.ambient;
            if (fullscreenToggle) fullscreenToggle.checked = settings.fullscreen;
            if (highParticlesToggle) highParticlesToggle.checked = settings.highParticles;
            if (reducedMotionToggle) reducedMotionToggle.checked = settings.reducedMotion;
            if (gamepadToggle) gamepadToggle.checked = settings.gamepad;
        };

        populateForm();

        if (saveButton) saveButton.addEventListener('click', applyFormValues);
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.profile.data.settings = this.profile.clone(this.profile.defaultData.settings);
                this.profile.save();
                populateForm();
                this.audio.applySettings();
                this.audio.playClick();
            });
        }
    }

    handleMenuAction(button) {
        const action = button.dataset.action;
        const panel = button.dataset.panel;
        this.audio.playClick();
        if (action === 'start') {
            this.openPanel('difficultySelectScreen');
            return;
        }
        if (panel) {
            this.openPanel(panel);
        }
    }

    moveMenu(direction) {
        this.currentMenuIndex = (this.currentMenuIndex + direction + this.menuButtons.length) % this.menuButtons.length;
        this.highlightMenu();
    }

    highlightMenu() {
        this.menuButtons.forEach((btn, idx) => {
            if (idx === this.currentMenuIndex) {
                btn.classList.add('active');
                btn.focus({ preventScroll: true });
            } else {
                btn.classList.remove('active');
            }
        });
    }

    openPanel(id) {
        this.menuButtons.forEach(btn => btn.classList.remove('active'));
        this.panels.forEach(panel => panel.setAttribute('aria-hidden', 'true'));
        const panel = this.panels.get(id);
        if (panel) {
            panel.setAttribute('aria-hidden', 'false');
            this.currentPanel = id;
            this.audio.playTransition();
            if (id === 'statisticsScreen') this.renderStatistics();
            if (id === 'achievementsScreen') this.renderAchievements();
            if (id === 'highScoresScreen') this.renderHighScores();
            if (id === 'difficultySelectScreen') {
                const preset = this.profile.data.lastSession.difficulty || 'normal';
                this.selectDifficulty(preset);
            }
            if (id === 'characterSelectScreen') {
                this.renderCharacterGrid();
                this.characterDetail.launchButton.disabled = !(this.selectedDifficulty && this.selectedCharacter);
            }
        }
    }

    closePanel() {
        this.panels.forEach(panel => panel.setAttribute('aria-hidden', 'true'));
        this.currentPanel = null;
        this.renderMenuState();
    }

    getActivePanelId() {
        return this.currentPanel;
    }

    isVisible() {
        return !this.root.classList.contains('hidden');
    }

    renderMenuState() {
        const { lastSession, achievements } = this.profile.data;
        const diffLabel = lastSession.difficulty?.toUpperCase?.() || 'NORMAL';
        const charLabel = lastSession.character?.toUpperCase?.() || 'FIGHTER';
        const diffEl = document.getElementById('profileLastDifficulty');
        const charEl = document.getElementById('profileLastCharacter');
        if (diffEl) diffEl.textContent = diffLabel;
        if (charEl) charEl.textContent = charLabel;
        const previewKills = document.getElementById('previewTotalKills');
        const previewTime = document.getElementById('previewPlayTime');
        const previewAchievements = document.getElementById('previewAchievements');
        const stats = this.profile.data.stats;
        if (previewKills) previewKills.textContent = stats.totalKills.toLocaleString();
        if (previewTime) previewTime.textContent = this.formatTime(stats.totalPlayTime);
        if (previewAchievements) previewAchievements.textContent = `${achievements.unlocked}/${achievements.total}`;
        this.highlightMenu();
    }

    renderStatistics() {
        const stats = this.profile.data.stats;
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        };
        setText('statTotalKills', stats.totalKills);
        setText('statPlayTime', this.formatTime(stats.totalPlayTime));
        setText('statGamesPlayed', stats.totalGamesPlayed);
        const totalClears = Object.values(stats.totalClears).reduce((a, b) => a + (b || 0), 0);
        setText('statClears', totalClears);
        setText('statScoreEasy', stats.highScores.easy);
        setText('statWaveEasy', stats.maxWaves.easy);
        setText('statScoreNormal', stats.highScores.normal);
        setText('statWaveNormal', stats.maxWaves.normal);
        setText('statScoreHard', stats.highScores.hard);
        setText('statWaveHard', stats.maxWaves.hard);
    }

    renderAchievements() {
        if (!window.achievementManager) return;
        const achievements = achievementManager.getAllAchievements();
        const progress = achievementManager.getProgress();
        const categories = {
            kills: document.getElementById('achievementGridKills'),
            waves: document.getElementById('achievementGridWaves'),
            scores: document.getElementById('achievementGridScores'),
            special: document.getElementById('achievementGridSpecial')
        };
        const categorize = achievement => {
            if (achievement.id.startsWith('kill_')) return 'kills';
            if (achievement.id.startsWith('wave_')) return 'waves';
            if (achievement.id.startsWith('score_')) return 'scores';
            return 'special';
        };
        Object.values(categories).forEach(container => {
            if (container) container.innerHTML = '';
        });
        const legendaryCount = achievements.filter(a => a.rarity === 'legendary' && a.unlocked).length;
        const fill = document.querySelector('.progress-fill');
        const text = document.getElementById('achievementProgressText');
        const count = document.getElementById('achievementProgressCount');
        const legendary = document.getElementById('legendaryCount');
        if (fill) {
            const circleLength = 339.292; // 2πr with r=54
            const offset = circleLength * (1 - progress.percentage / 100);
            fill.style.strokeDasharray = circleLength;
            fill.style.strokeDashoffset = offset;
        }
        if (text) text.textContent = `${progress.percentage}%`;
        if (count) count.textContent = `${progress.unlocked}/${progress.total}`;
        if (legendary) legendary.textContent = legendaryCount;
        achievements.forEach(achievement => {
            const category = categories[categorize(achievement)];
            if (!category) return;
            const card = document.createElement('div');
            card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            const title = document.createElement('div');
            title.className = 'achievement-title';
            title.textContent = `${achievement.icon} ${achievement.name}`;
            const desc = document.createElement('div');
            desc.className = 'achievement-desc';
            desc.textContent = achievement.unlocked ? achievement.description : '???';
            card.appendChild(title);
            card.appendChild(desc);
            category.appendChild(card);
        });
    }

    renderHighScores() {
        const stats = this.profile.data.stats;
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value.toLocaleString();
        };
        setText('highScoreEasy', stats.highScores.easy);
        setText('highWaveEasy', stats.maxWaves.easy);
        setText('highScoreNormal', stats.highScores.normal);
        setText('highWaveNormal', stats.maxWaves.normal);
        setText('highScoreHard', stats.highScores.hard);
        setText('highWaveHard', stats.maxWaves.hard);
        const summary = document.getElementById('bestRunSummary');
        if (summary) {
            const run = this.profile.data.lastSession.bestRun;
            if (run) {
                summary.innerHTML = `最終プレイ: <strong>${run.score.toLocaleString()} pts</strong> / Wave ${run.wave} / ${this.formatTime(run.time)}<br>Difficulty: ${run.difficulty.toUpperCase()} · Ship: ${run.character.toUpperCase()}`;
            } else {
                summary.textContent = 'プレイ履歴がまだありません。まずはミッションを開始しましょう。';
            }
        }
    }

    selectDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;
        this.panelInfo.textContent = `選択中: ${difficulty.toUpperCase()}`;
        if (this.difficultyContinueButton) this.difficultyContinueButton.disabled = false;
        if (this.characterDetail.selectedDifficulty) {
            this.characterDetail.selectedDifficulty.textContent = difficulty.toUpperCase();
        }
        if (this.characterDetail.launchButton) {
            const character = CHARACTER_DEFINITIONS.find(c => c.id === this.selectedCharacter);
            const unlocked = character ? this.isCharacterUnlocked(character, this.profile.data.stats) : false;
            this.characterDetail.launchButton.disabled = !(unlocked && this.selectedCharacter);
        }
        this.root.querySelectorAll('.difficulty-card').forEach(card => {
            card.classList.toggle('active', card.dataset.difficulty === difficulty);
        });
        this.audio.playHover();
    }

    renderCharacterGrid() {
        if (!this.characterGrid) return;
        this.characterGrid.innerHTML = '';
        const stats = this.profile.data.stats;
        CHARACTER_DEFINITIONS.forEach(character => {
            const unlocked = this.isCharacterUnlocked(character, stats);
            if (unlocked) this.profile.ensureCharacterUnlocked(character.id);
            const card = document.createElement('div');
            card.className = `character-card ${character.id === this.selectedCharacter ? 'selected' : ''} ${unlocked ? '' : 'locked'}`.trim();
            card.dataset.character = character.id;
            const preview = document.createElement('div');
            preview.className = 'ship-preview';
            preview.textContent = character.icon;
            const name = document.createElement('h4');
            name.textContent = character.name;
            const desc = document.createElement('p');
            desc.textContent = character.description;
            card.appendChild(preview);
            card.appendChild(name);
            card.appendChild(desc);
            if (!unlocked && character.unlockCondition) {
                const lock = document.createElement('div');
                lock.className = 'unlock-condition';
                lock.textContent = character.unlockCondition.label;
                card.appendChild(lock);
            }
            card.addEventListener('click', () => {
                if (!unlocked) {
                    this.audio.playHover();
                    return;
                }
                this.selectedCharacter = character.id;
                this.profile.setSelectedCharacter(character.id);
                this.profile.save();
                this.updateCharacterDetail(character, unlocked);
                this.characterGrid.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.audio.playClick();
            });
            this.characterGrid.appendChild(card);
            if (character.id === this.selectedCharacter) {
                this.updateCharacterDetail(character, unlocked);
            }
        });
    }

    updateCharacterDetail(character, unlocked) {
        if (!character) return;
        this.characterDetail.name.textContent = character.name;
        this.characterDetail.description.textContent = character.description;
        this.characterDetail.attack.style.width = `${character.stats.attack * 100}%`;
        this.characterDetail.defense.style.width = `${character.stats.defense * 100}%`;
        this.characterDetail.speed.style.width = `${character.stats.speed * 100}%`;
        this.characterDetail.unlockState.textContent = unlocked ? 'UNLOCKED' : 'LOCKED';
        if (this.characterDetail.launchButton) {
            this.characterDetail.launchButton.disabled = !(this.selectedDifficulty && unlocked);
        }
    }

    isCharacterUnlocked(character, stats) {
        if (!character.unlockCondition) return true;
        const { type, value, difficulty } = character.unlockCondition;
        if (type === 'wave') {
            const diff = difficulty || 'normal';
            return (stats.maxWaves[diff] || 0) >= value;
        }
        if (type === 'score') {
            const totalHighScore = Math.max(...Object.values(stats.highScores));
            return totalHighScore >= value;
        }
        if (type === 'clears') {
            const diff = difficulty || 'normal';
            return (stats.totalClears[diff] || 0) >= value;
        }
        return false;
    }

    launchGame() {
        if (!this.selectedDifficulty || !this.selectedCharacter) return;
        this.audio.playTransition();
        this.audio.fadeOutBgm();
        this.profile.updateLastSession({ difficulty: this.selectedDifficulty, character: this.selectedCharacter });
        this.profile.save();
        if (typeof window.startGameFromMenu === 'function') {
            window.startGameFromMenu({
                difficulty: this.selectedDifficulty,
                character: this.selectedCharacter,
                modifiers: this.getCharacterModifiers(this.selectedCharacter)
            });
        }
        this.hide();
    }

    getCharacterModifiers(characterId) {
        const character = CHARACTER_DEFINITIONS.find(c => c.id === characterId);
        return character?.modifiers || CHARACTER_DEFINITIONS[0].modifiers;
    }

    hide() {
        this.root.classList.add('hidden');
        this.gameLayer.classList.remove('hidden');
    }

    show() {
        this.root.classList.remove('hidden');
        this.gameLayer.classList.add('hidden');
        this.audio.applySettings();
        this.audio.playAmbient();
        this.audio.playBgm();
        this.renderMenuState();
    }

    syncWithSystems() {
        if (window.achievementManager) {
            this.profile.syncWithAchievementManager(window.achievementManager);
        }
        if (window.gameStatsSystem && gameStatsSystem.getPersistentStats) {
            const persistent = gameStatsSystem.getPersistentStats();
            if (persistent) this.profile.updateStats(persistent);
        }
        this.renderMenuState();
    }

    recordSession(summary) {
        if (!summary) return;
        this.profile.updateStats({
            totalKills: summary.totalKills,
            totalPlayTime: summary.totalPlayTime,
            totalGamesPlayed: summary.totalGamesPlayed,
            totalClears: summary.totalClears,
            highScores: summary.highScores,
            maxWaves: summary.maxWaves
        });
        this.profile.updateLastSession({
            difficulty: summary.difficulty,
            character: summary.character,
            summary
        });
        this.renderMenuState();
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor((milliseconds || 0) / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
    }
}

function initializeStartScreen() {
    const profile = new StartScreenProfile();
    const audio = new StartScreenAudio(profile);
    const ui = new StartScreenUI(profile, audio);
    window.startScreen = ui;
    return ui;
}

document.addEventListener('DOMContentLoaded', () => {
    initializeStartScreen();
});
