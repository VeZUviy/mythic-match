document.addEventListener('DOMContentLoaded', () => {
    // --- ЕЛЕМЕНТИ DOM ---
    const grid = document.querySelector('.grid');
    const scoreDisplay = document.getElementById('score');
    const scoreLabel = document.getElementById('score-label');
    const targetDisplay = document.getElementById('target-score');
    const levelDisplay = document.getElementById('current-level-display');
    const statusDisplay = document.getElementById('status-message');
    
    const startScreen = document.getElementById('start-screen');
    const gameUI = document.getElementById('game-ui');
    const storyModal = document.getElementById('story-modal');
    const winModal = document.getElementById('win-modal');

    const storyTitle = document.getElementById('story-title');
    const storyText = document.getElementById('story-text');
    const levelGoalText = document.getElementById('level-goal-text');
    const goalIcon = document.getElementById('goal-icon');

    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const claimBtn = document.getElementById('claim-btn');

    // --- ЗВУКОВИЙ РУШІЙ ---
    const Sound = {
        bgm: null,
        currentTrackIndex: -1,
        currentBiome: null, 
        currentPlaylist: [], 
        lastSFXTime: 0, 

        biomeCounts: {
            ice: 4,    
            jungle: 5, 
            iron: 5,   
            ruins: 3,  
            chaos: 3   
        },

        updateMusicContext: function(level) {
            let newBiome = 'ice';
            if (level <= 5) newBiome = 'ice';
            else if (level <= 10) newBiome = 'jungle';
            else if (level <= 15) newBiome = 'iron';
            else if (level <= 20) newBiome = 'ruins';
            else if (level <= 25) newBiome = 'chaos';
            else {
                const biomes = ['ice', 'jungle', 'iron', 'ruins', 'chaos'];
                newBiome = biomes[(level - 26) % 5];
            }

            if (this.currentBiome !== newBiome) {
                this.currentBiome = newBiome;
                this.generatePlaylist(newBiome);
                if (this.bgm && !this.bgm.paused) {
                    this.playNextTrack(); 
                }
            }
        },

        generatePlaylist: function(biome) {
            this.currentPlaylist = [];
            const count = this.biomeCounts[biome] || 3;
            for (let i = 1; i <= count; i++) {
                this.currentPlaylist.push(`sounds/${biome}/${biome}${i}.mp3`);
            }
        },

        playMusic: function() {
            if (!this.bgm || this.bgm.paused) this.playNextTrack();
        },

        playNextTrack: function() {
            if (this.currentPlaylist.length === 0) return;
            let nextIndex;
            if (this.currentPlaylist.length > 1) {
                do { nextIndex = Math.floor(Math.random() * this.currentPlaylist.length); } while (nextIndex === this.currentTrackIndex);
            } else { nextIndex = 0; }
            
            this.currentTrackIndex = nextIndex;
            const trackPath = this.currentPlaylist[nextIndex];

            if (this.bgm) { this.bgm.pause(); this.bgm.currentTime = 0; }

            this.bgm = new Audio(trackPath);
            this.bgm.volume = 0.2; 
            this.bgm.loop = false; 
            
            this.bgm.onended = () => { this.playNextTrack(); };
            this.bgm.onerror = (e) => { 
                console.warn("Music skipped:", trackPath); 
                this.currentPlaylist.splice(nextIndex, 1);
                if(this.currentPlaylist.length > 0) this.playNextTrack();
            };
            this.bgm.play().catch(e => console.log("Music autoplay blocked"));
        },

        playSFX: function(filename, volume = 0.5, force = false) {
            const now = Date.now();
            if (!force && (now - this.lastSFXTime < 80)) return;
            this.lastSFXTime = now;
            const audio = new Audio(`sounds/element/${filename}`);
            audio.volume = volume;
            audio.play().catch(e => {}); 
        },

        pompom: function() { this.playSFX('Soft_wool_pompom.mp3'); },
        gold: function() { this.playSFX('Tiny_metallic_ping.mp3'); },
        sand: function() { this.playSFX('Kinetic_sand_crumbli.mp3'); },
        pillow: function() { this.playSFX('Soft_velvet_cushion.mp3'); },
        jelly: function() { this.playSFX('Wet_squishy_jelly.mp3'); },
        paper: function() { this.playSFX('Crisp_craft_paper.mp3'); },
        glass: function() { this.playSFX('Glass_marble_hitting.mp3'); },
        honey: function() { this.playSFX('Sticky_honeycomb.mp3'); },
        water: function() { this.playSFX('Water_bubble_popping.mp3'); },
        iceCrack: function() { this.playSFX('Crunchy_ice_cracking.mp3', 0.8, true); },
        vineRustle: function() { this.playSFX('Crisp_craft_paper.mp3', 0.8, true); },
        chainBreak: function() { this.playSFX('Metal_chain_breaking.mp3', 0.7, true); },
        stoneHit: function() { this.playSFX('Soft_velvet_cushion.mp3', 1.0, true); }, 
        magic: function() { this.playSFX('Magical_chime.mp3', 0.7, true); }, 
        boom: function() { this.playSFX('Magical_chime.mp3', 0.9, true); },
        error: function() { this.playSFX('Soft_velvet_cushion.mp3', 0.3); }
    };

    function playSoundForItem(index) {
        switch(parseInt(index)) {
            case 0: Sound.pompom(); break;
            case 1: Sound.gold(); break;
            case 2: Sound.sand(); break;
            case 3: Sound.pillow(); break;
            case 4: Sound.jelly(); break;
            case 5: Sound.paper(); break;
            case 6: Sound.glass(); break;
            case 7: Sound.honey(); break;
            case 8: Sound.water(); break;
        }
    }

    // --- ДАНІ ГРИ ---
    const width = 8;
    const height = 12;
    const cells = [];
    const items = [
        'url(1000006409.png)', 'url(1000006410.png)', 'url(1000006411.png)',
        'url(1000006412.png)', 'url(1000006414.png)', 'url(1000006415.png)',
        'url(1000006416.png)', 'url(1000006417.png)', 'url(1000006418.png)' 
    ];

    let score = 0;
    let currentLevelIndex = 1; 
    let hintTimeout;
    let isPaused = false;
    let currentLevelData = {};
    let artifactsCollected = 0;

    // --- ГЕНЕРАТОР РІВНІВ ---
    function generateLevelData(level) {
        let data = {
            level: level,
            targetScore: 500 + (level * 250),
            targetArtifacts: 0,
            iceChance: 0, chainChance: 0, stoneChance: 0, vineChance: 0,
            mode: 'score', 
            storyTitle: `Рівень ${level}`,
            storyText: ""
        };

        let bgUrl = "";

        if (level <= 5) {
            bgUrl = "fone/story/ice.jpg";
            data.iceChance = 0.15 + (level * 0.02);
            if (level === 1) { data.storyTitle = "Розділ 1: Крижана Пустка"; data.storyText = "Ти опинилася у світі, скутому вічним холодом. <br><b>Лід (❄️)</b> блокує предмети."; } 
            else if (level === 5) { data.mode = 'artifact'; data.storyTitle = "Бос: Крижаний Вартовий"; data.storyText = "Знайди ключі!"; }
            else { data.storyText = "Холод пробирає до кісток."; }
        } else if (level <= 10) {
            bgUrl = "fone/story/jungle.jpg";
            data.vineChance = 0.15 + ((level - 5) * 0.03);
            if (level === 6) { data.storyTitle = "Розділ 2: Джунглі Забуття"; data.storyText = "Тепер шлях перегороджують <b>Ліани (🌿)</b>."; }
            else if (level === 10) { data.mode = 'artifact'; data.storyTitle = "Бос: Дух Лісу"; data.storyText = "Ліс не хоче тебе відпускати."; }
            else { data.storyText = "Ліани стають густішими."; }
        } else if (level <= 15) {
            bgUrl = "fone/story/iron.jpg";
            data.chainChance = 0.15 + ((level - 10) * 0.03);
            if (level === 11) { data.storyTitle = "Розділ 3: Залізний Каземат"; data.storyText = "Предмети скуті <b>Кайданами (⛓️)</b>."; }
            else if (level === 15) { data.mode = 'artifact'; data.storyTitle = "Бос: Наглядач"; data.storyText = "Твій єдиний шанс на втечу."; }
            else { data.storyText = "Гуркіт металу лунає звідусіль."; }
        } else if (level <= 20) {
            bgUrl = "fone/story/ruins.jpg";
            data.stoneChance = 0.1 + ((level - 15) * 0.02);
            if (level === 16) { data.storyTitle = "Розділ 4: Руїни Часу"; data.storyText = "<b>Камені</b> перекривають поле."; }
            else if (level === 20) { data.mode = 'artifact'; data.storyTitle = "Бос: Голем"; data.storyText = "Голем охороняє вихід."; }
            else { data.storyText = "Стіни осипаються."; }
        } else if (level <= 25) {
            bgUrl = "fone/story/chaos.jpg";
            data.iceChance = 0.05; data.vineChance = 0.05; data.chainChance = 0.05; data.stoneChance = 0.05;
            if (level === 21) { data.storyTitle = "Фінал: Серце Хаосу"; data.storyText = "Все змішалося в хаосі."; }
            else if (level === 25) { data.mode = 'artifact'; data.storyTitle = "Фінальний Бос"; data.storyText = "Врятуй цей світ!"; }
            else { data.storyText = "Хаос посилюється!"; }
        } else {
            let bgNum = ((level - 26) % 5) + 1;
            bgUrl = `fone/nonstory/${bgNum}.jpg`;
            data.storyTitle = "Безкінечні Мандри";
            data.storyText = "Мандри продовжуються.";
            data.iceChance = 0.05; data.vineChance = 0.05; data.chainChance = 0.05; data.stoneChance = 0.05;
            if (level % 5 === 0) data.mode = 'artifact'; 
        }

        if (data.mode === 'artifact' || (level > 25 && level % 5 === 0)) {
            data.mode = 'artifact';
            data.targetArtifacts = 1 + Math.floor(level / 10);
            data.storyText += `<br><br><b>Ціль:</b> Опусти ${data.targetArtifacts} Ключ(ів)!`;
            bgUrl = 'fone/boss.jpg';
        } else {
            data.mode = 'score';
            data.storyText += `<br><br><b>Ціль:</b> Набери ${data.targetScore} очок.`;
        }

        const bgLayer = document.getElementById('bg-layer');
        if (bgLayer) bgLayer.style.backgroundImage = `url('${bgUrl}')`;

        return data;
    }

    // --- МЕНЮ ---
    startBtn.addEventListener('click', () => { 
        try {
            Sound.updateMusicContext(currentLevelIndex); 
            Sound.playMusic(); 
            startScreen.classList.add('hidden'); 
            showLevelMenu(); 
        } catch(e) { alert("Error: " + e.message); }
    });
    
    resetBtn.addEventListener('click', () => { if(confirm("Скинути прогрес?")) { localStorage.removeItem('wonderrun_level'); location.reload(); } });
    
    nextLevelBtn.addEventListener('click', () => { 
        Sound.magic(); 
        storyModal.classList.add('hidden'); 
        gameUI.classList.remove('hidden'); 
        startLevel(); 
    });
    
    claimBtn.addEventListener('click', () => { 
        Sound.magic(); 
        winModal.classList.add('hidden'); 
        currentLevelIndex++; 
        localStorage.setItem('wonderrun_level', currentLevelIndex); 
        Sound.updateMusicContext(currentLevelIndex); 
        showLevelMenu(); 
    });

    function showLevelMenu() {
        currentLevelData = generateLevelData(currentLevelIndex);
        storyTitle.innerText = currentLevelData.storyTitle;
        storyText.innerHTML = currentLevelData.storyText;
        if (currentLevelData.mode === 'score') {
            goalIcon.innerText = "🎯";
            levelGoalText.innerText = `Ціль: ${currentLevelData.targetScore} очок`;
        } else {
            goalIcon.innerText = "🗝️";
            levelGoalText.innerText = `Зібрати: ${currentLevelData.targetArtifacts} Ключ(ів)`;
        }
        storyModal.classList.remove('hidden');
        gameUI.classList.add('hidden');
    }

    function startLevel() {
        score = 0;
        artifactsCollected = 0;
        scoreDisplay.innerText = score;
        levelDisplay.innerText = currentLevelIndex;
        if (currentLevelData.mode === 'score') {
            scoreLabel.innerText = "Очки:";
            targetDisplay.innerText = currentLevelData.targetScore;
        } else {
            scoreLabel.innerText = "Ключі:";
            targetDisplay.innerText = `${artifactsCollected} / ${currentLevelData.targetArtifacts}`;
        }
        createBoard();
        isPaused = false;
    }

    function createBoard() {
        grid.innerHTML = '';
        cells.length = 0;
        statusDisplay.innerText = '';
        
        for (let i = 0; i < width * height; i++) {
            const cell = document.createElement('div');
            cell.setAttribute('id', i);
            cell.classList.add('cell');
            
            const rand = Math.random();
            if (rand < currentLevelData.stoneChance) {
                cell.classList.add('stone');
                cell.setAttribute('data-type', 'stone');
            } else {
                let randomItem = Math.floor(Math.random() * items.length);
                cell.style.backgroundImage = items[randomItem];
                cell.setAttribute('data-item', randomItem);
                
                const effectRand = Math.random();
                if (effectRand < currentLevelData.iceChance) {
                    cell.classList.add('frozen');
                } else if (effectRand < currentLevelData.iceChance + currentLevelData.vineChance) {
                    cell.classList.add('vines');
                } else if (effectRand < currentLevelData.iceChance + currentLevelData.vineChance + currentLevelData.chainChance) {
                    cell.classList.add('chained');
                }
            }

            cell.addEventListener('mousedown', onDragStart);
            cell.addEventListener('touchstart', onDragStart, {passive: false});
            grid.appendChild(cell);
            cells.push(cell);
        }
        if (currentLevelData.mode === 'artifact') spawnArtifact();
        setTimeout(() => resolveMatches(true), 100);
        resetHintTimer();
    }

    function spawnArtifact() {
        let attempts = 0;
        while(attempts < 10) {
            let randIndex = Math.floor(Math.random() * width); 
            if (!cells[randIndex].classList.contains('stone')) {
                cells[randIndex].classList.remove('frozen', 'chained', 'vines');
                cells[randIndex].classList.add('artifact');
                cells[randIndex].setAttribute('data-type', 'artifact');
                cells[randIndex].style.backgroundImage = ''; 
                cells[randIndex].removeAttribute('data-item');
                break;
            }
            attempts++;
        }
    }

    // --- КЕРУВАННЯ ---
    let startX, startY, startId;
    
    function onDragStart(e) {
        if (isPaused) return;
        
        if (e.type === 'touchstart' && e.cancelable) e.preventDefault();

        let targetElement = e.currentTarget; 
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }

        if (!targetElement) return;
        startId = parseInt(targetElement.id);

        if (targetElement.classList.contains('stone')) { Sound.stoneHit(); return; }
        if (targetElement.classList.contains('frozen')) { targetElement.classList.add('shake-anim'); Sound.iceCrack(); setTimeout(() => targetElement.classList.remove('shake-anim'), 400); return; }
        if (targetElement.classList.contains('chained')) { targetElement.classList.add('shake-anim'); Sound.chainBreak(); setTimeout(() => targetElement.classList.remove('shake-anim'), 400); return; }
        if (targetElement.classList.contains('vines')) { targetElement.classList.add('shake-anim'); Sound.vineRustle(); setTimeout(() => targetElement.classList.remove('shake-anim'), 400); return; }

        let itemType = targetElement.getAttribute('data-item');
        if (itemType !== null) { playSoundForItem(itemType); }

        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchend', onDragEnd);
    }

    function onDragEnd(e) {
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchend', onDragEnd);
        if (isPaused) return;

        let endX, endY;
        if (e.type === 'touchend') {
            if (e.changedTouches.length > 0) { endX = e.changedTouches[0].clientX; endY = e.changedTouches[0].clientY; } else return;
        } else { endX = e.clientX; endY = e.clientY; }

        let diffX = endX - startX;
        let diffY = endY - startY;
        let targetId = startId;

        if (Math.abs(diffX) > Math.abs(diffY)) { 
            if (Math.abs(diffX) > 30) targetId += (diffX > 0 ? 1 : -1); 
        } else { 
            if (Math.abs(diffY) > 30) targetId += (diffY > 0 ? width : -width); 
        }

        if (targetId === startId) return;

        if (targetId >= 0 && targetId < width * height && isValidMove(startId, targetId)) {
            let targetCell = cells[targetId];
            if (targetCell.classList.contains('stone') || targetCell.classList.contains('frozen') || targetCell.classList.contains('chained') || targetCell.classList.contains('vines')) {
                targetCell.classList.add('shake-anim'); Sound.error(); setTimeout(() => targetCell.classList.remove('shake-anim'), 400); return;
            }
            swapItems(startId, targetId);
        }
    }

    function isValidMove(id1, id2) {
        if (id2 < 0 || id2 >= width * height) return false;
        let validMoves = [id1 - 1, id1 + 1, id1 - width, id1 + width];
        if (id1 % width === 0 && id2 === id1 - 1) return false;
        if ((id1 + 1) % width === 0 && id2 === id1 + 1) return false;
        return validMoves.includes(id2);
    }

    function swapItems(id1, id2) {
        clearHints();
        let cell1 = cells[id1];
        let cell2 = cells[id2];

        let type1 = cell1.getAttribute('data-type');
        let item1 = cell1.getAttribute('data-item');
        let bg1 = cell1.style.backgroundImage;
        let art1 = cell1.classList.contains('artifact');

        let type2 = cell2.getAttribute('data-type');
        let item2 = cell2.getAttribute('data-item');
        let bg2 = cell2.style.backgroundImage;
        let art2 = cell2.classList.contains('artifact');

        if(art2) cell1.classList.add('artifact'); else cell1.classList.remove('artifact');
        if(type2) cell1.setAttribute('data-type', type2); else cell1.removeAttribute('data-type');
        if(item2) cell1.setAttribute('data-item', item2); else cell1.removeAttribute('data-item');
        cell1.style.backgroundImage = bg2;

        if(art1) cell2.classList.add('artifact'); else cell2.classList.remove('artifact');
        if(type1) cell2.setAttribute('data-type', type1); else cell2.removeAttribute('data-type');
        if(item1) cell2.setAttribute('data-item', item1); else cell2.removeAttribute('data-item');
        cell2.style.backgroundImage = bg1;

        setTimeout(() => {
            if (checkMatches()) {
                resolveMatches();
            } else {
                if(art1) cell1.classList.add('artifact'); else cell1.classList.remove('artifact');
                if(item1) cell1.setAttribute('data-item', item1); else cell1.removeAttribute('data-item');
                cell1.style.backgroundImage = bg1;

                if(art2) cell2.classList.add('artifact'); else cell2.classList.remove('artifact');
                if(item2) cell2.setAttribute('data-item', item2); else cell2.removeAttribute('data-item');
                cell2.style.backgroundImage = bg2;
                
                Sound.error(); 
                resetHintTimer();
            }
        }, 200);
    }

    function checkMatches() {
        for (let i = 0; i < width * height; i++) {
            if (cells[i].classList.contains('artifact') || cells[i].classList.contains('stone')) continue;
            let t = cells[i].getAttribute('data-item');
            if (!t) continue;
            if (i % width < width - 2) {
                if (t === cells[i+1].getAttribute('data-item') && t === cells[i+2].getAttribute('data-item')) return true;
            }
            if (i < width * (height - 2)) {
                if (t === cells[i+width].getAttribute('data-item') && t === cells[i+width*2].getAttribute('data-item')) return true;
            }
            if (i % width < width - 1 && i < width * (height - 1)) {
                if (t === cells[i+1].getAttribute('data-item') &&
                    t === cells[i+width].getAttribute('data-item') &&
                    t === cells[i+width+1].getAttribute('data-item')) return true;
            }
        }
        return false;
    }

    function resolveMatches(isStart = false) {
        let matchedIndexes = new Set();
        let matchedTypes = new Set();
        let bonusActions = [];

        for (let i = 0; i < width * height; i++) {
            if (cells[i].classList.contains('artifact') || cells[i].classList.contains('stone')) continue;
            let t = cells[i].getAttribute('data-item');
            if (!t) continue;
            if (i % width < width - 2) {
                let matchLen = 1;
                while ((i + matchLen) % width !== 0 && cells[i+matchLen].getAttribute('data-item') === t && !cells[i+matchLen].classList.contains('stone')) { matchLen++; }
                if (matchLen >= 3) {
                    for(let k=0; k<matchLen; k++) matchedIndexes.add(i+k);
                    matchedTypes.add(t);
                    if (matchLen >= 4 && !isStart) bonusActions.push({type: 'row', index: i});
                    i += matchLen - 1;
                }
            }
        }
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height - 2; j++) {
                let idx = j * width + i;
                let t = cells[idx].getAttribute('data-item');
                if (!t || cells[idx].classList.contains('artifact') || cells[idx].classList.contains('stone')) continue;
                let matchLen = 1;
                while ((j + matchLen) < height && cells[(j+matchLen)*width + i].getAttribute('data-item') === t && !cells[(j+matchLen)*width + i].classList.contains('stone')) { matchLen++; }
                if (matchLen >= 3) {
                    for(let k=0; k<matchLen; k++) matchedIndexes.add((j+k)*width + i);
                    matchedTypes.add(t);
                    if (matchLen >= 4 && !isStart) bonusActions.push({type: 'col', index: i});
                    j += matchLen - 1;
                }
            }
        }
        for (let i = 0; i < width * height; i++) {
            if (i % width < width - 1 && i < width * (height - 1)) {
                let t = cells[i].getAttribute('data-item');
                if (t && !cells[i].classList.contains('stone') && !cells[i].classList.contains('artifact')) {
                    if (t === cells[i+1].getAttribute('data-item') &&
                        t === cells[i+width].getAttribute('data-item') &&
                        t === cells[i+width+1].getAttribute('data-item')) {
                            matchedIndexes.add(i); matchedIndexes.add(i+1); matchedIndexes.add(i+width); matchedIndexes.add(i+width+1); matchedTypes.add(t);
                    }
                }
            }
        }

        if (matchedIndexes.size > 0) {
            let iceBroken = false;
            let chainBroken = false;
            let vineBroken = false;
            
            matchedIndexes.forEach(index => {
                if (cells[index].classList.contains('frozen')) iceBroken = true;
                const neighbors = [index-1, index+1, index-width, index+width];
                neighbors.forEach(n => {
                    if (n >= 0 && n < width * height) {
                        if (Math.abs((n % width) - (index % width)) > 1 && Math.abs(n - index) === 1) return;
                        if (cells[n].classList.contains('chained')) chainBroken = true;
                        if (cells[n].classList.contains('vines')) vineBroken = true;
                    }
                });
            });

            if (!isStart) {
                if (bonusActions.length > 0) {
                    Sound.boom();
                } else if (chainBroken) {
                    Sound.chainBreak();
                } else if (vineBroken) {
                    Sound.vineRustle();
                } else if (iceBroken) {
                    Sound.iceCrack();
                } else {
                    if (matchedTypes.size > 0) {
                        const type = matchedTypes.values().next().value;
                        playSoundForItem(type);
                    }
                }
            }

            bonusActions.forEach(bonus => {
                if (bonus.type === 'row') {
                    let rowStart = Math.floor(bonus.index / width) * width;
                    for(let k=0; k<width; k++) matchedIndexes.add(rowStart + k);
                }
                if (bonus.type === 'col') {
                    for(let k=0; k<height; k++) matchedIndexes.add(k * width + bonus.index);
                }
            });

            matchedIndexes.forEach(index => {
                cells[index].style.backgroundImage = '';
                cells[index].removeAttribute('data-item');
                cells[index].classList.remove('frozen', 'chained', 'vines');

                const neighbors = [index-1, index+1, index-width, index+width];
                neighbors.forEach(n => {
                    if (n >= 0 && n < width * height) {
                        if (Math.abs((n % width) - (index % width)) > 1 && Math.abs(n - index) === 1) return;
                        if (cells[n].classList.contains('chained')) cells[n].classList.remove('chained');
                        if (cells[n].classList.contains('vines')) cells[n].classList.remove('vines');
                        if (cells[n].classList.contains('stone')) {
                            cells[n].classList.remove('stone'); 
                            cells[n].removeAttribute('data-type');
                        }
                    }
                });
            });

            if (!isStart) {
                score += matchedIndexes.size * 10;
                if (bonusActions.length > 0) score += 50;
                scoreDisplay.innerText = score;
                checkWin();
            }

            setTimeout(() => {
                let moved = moveDown();
                if (moved) {
                    let fallInterval = setInterval(() => {
                        let stillMoving = moveDown();
                        if (!stillMoving) {
                            clearInterval(fallInterval);
                            if (checkMatches()) resolveMatches(isStart);
                            else { 
                                resetHintTimer(); 
                                if (!isStart) { checkWin(); checkIfDeadlock(); }
                            }
                        }
                    }, 100);
                } else {
                    if (checkMatches()) resolveMatches(isStart);
                    else { 
                        resetHintTimer(); 
                        if (!isStart) { checkWin(); checkIfDeadlock(); }
                    }
                }
            }, 250);
        }
    }

    function moveDown() {
        let moved = false;
        for (let i = width * height - 1; i >= 0; i--) {
            if (cells[i].classList.contains('stone')) continue; 

            if (cells[i].style.backgroundImage === '' && !cells[i].classList.contains('artifact')) {
                if (i < width) {
                    let randomItem = Math.floor(Math.random() * items.length);
                    cells[i].style.backgroundImage = items[randomItem];
                    cells[i].setAttribute('data-item', randomItem);
                    cells[i].classList.remove('frozen', 'chained', 'vines', 'artifact');
                    moved = true;
                } else {
                    let above = i - width;
                    if (!cells[above].classList.contains('stone')) {
                        if (cells[above].style.backgroundImage !== '' || cells[above].classList.contains('artifact')) {
                            cells[i].style.backgroundImage = cells[above].style.backgroundImage;
                            let itemAttr = cells[above].getAttribute('data-item');
                            if(itemAttr) cells[i].setAttribute('data-item', itemAttr); else cells[i].removeAttribute('data-item');

                            if(cells[above].classList.contains('frozen')) cells[i].classList.add('frozen'); else cells[i].classList.remove('frozen');
                            if(cells[above].classList.contains('chained')) cells[i].classList.add('chained'); else cells[i].classList.remove('chained');
                            if(cells[above].classList.contains('vines')) cells[i].classList.add('vines'); else cells[i].classList.remove('vines');
                            
                            if(cells[above].classList.contains('artifact')) {
                                cells[i].classList.add('artifact');
                                cells[i].setAttribute('data-type', 'artifact');
                            } else {
                                cells[i].classList.remove('artifact');
                                cells[i].removeAttribute('data-type');
                            }

                            cells[above].style.backgroundImage = '';
                            cells[above].removeAttribute('data-item');
                            cells[above].classList.remove('frozen', 'chained', 'vines', 'artifact');
                            cells[above].removeAttribute('data-type');
                            moved = true;
                        }
                    }
                }
            }
        }
        
        for(let c = width * (height - 1); c < width * height; c++) {
            if(cells[c].classList.contains('artifact')) {
                Sound.magic();
                artifactsCollected++;
                cells[c].classList.remove('artifact');
                cells[c].removeAttribute('data-type');
                
                if (currentLevelData.mode === 'artifact') {
                    targetDisplay.innerText = `${artifactsCollected} / ${currentLevelData.targetArtifacts}`;
                    checkWin();
                }
                if (artifactsCollected < currentLevelData.targetArtifacts) {
                    setTimeout(spawnArtifact, 500);
                }
            }
        }
        return moved;
    }

    function checkWin() {
        if (isPaused) return;
        let win = false;
        if (currentLevelData.mode === 'score') {
            if (score >= currentLevelData.targetScore) win = true;
        } else if (currentLevelData.mode === 'artifact') {
            if (artifactsCollected >= currentLevelData.targetArtifacts) win = true;
        }

        if (win) {
            isPaused = true;
            Sound.magic();
            setTimeout(() => { winModal.classList.remove('hidden'); }, 500);
        }
    }
    
    // --- НОВА ФУНКЦІЯ: Перемішування без видалення ключів ---
    function shuffleBoard() {
        let moveableCells = [];
        let itemsToShuffle = [];

        cells.forEach(cell => {
            // Перевіряємо, чи клітинка заблокована АБО є артефактом
            const isFixed = cell.classList.contains('stone') ||
                            cell.classList.contains('frozen') ||
                            cell.classList.contains('chained') ||
                            cell.classList.contains('vines') ||
                            cell.classList.contains('artifact');

            if (!isFixed) {
                moveableCells.push(cell);
                itemsToShuffle.push(cell.getAttribute('data-item'));
            }
        });

        if (moveableCells.length === 0) return;

        // Перемішуємо масив (алгоритм Фішера-Єйтса)
        for (let i = itemsToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [itemsToShuffle[i], itemsToShuffle[j]] = [itemsToShuffle[j], itemsToShuffle[i]];
        }

        // Присвоюємо нові значення
        moveableCells.forEach((cell, index) => {
            const newItemIndex = itemsToShuffle[index];
            cell.setAttribute('data-item', newItemIndex);
            cell.style.backgroundImage = items[newItemIndex];
        });

        statusDisplay.innerText = "";
        resetHintTimer();
        
        // Перевіряємо, чи не виникли матчі випадково
        if (checkMatches()) {
            resolveMatches();
        }
    }

    // --- Оновлена функція DEADLOCK ---
    function checkIfDeadlock() {
        let possibleMove = false;
        for (let i = 0; i < width * height; i++) {
            if (cells[i].classList.contains('stone') || cells[i].classList.contains('frozen') || cells[i].classList.contains('chained') || cells[i].classList.contains('vines')) continue;
            let moves = [1, width];
            for (let m of moves) {
                let t = i+m;
                if (m === 1 && (i % width === width - 1)) continue;
                if(t<width*height && !cells[t].classList.contains('stone') && !cells[t].classList.contains('frozen') && !cells[t].classList.contains('chained') && !cells[t].classList.contains('vines')) {
                    swapData(i, t);
                    if (checkMatches()) possibleMove = true;
                    swapData(i, t);
                    if (possibleMove) return;
                }
            }
        }
        if (!possibleMove) {
            statusDisplay.innerText = "Немає ходів! Перемішуємо...";
            setTimeout(() => {
                shuffleBoard(); // ТУТ ВИКЛИК НОВОЇ ФУНКЦІЇ
            }, 1500);
        }
    }

    function resetHintTimer() { clearTimeout(hintTimeout); if(!isPaused) hintTimeout = setTimeout(showHint, 5000); }
    function clearHints() { cells.forEach(c => c.classList.remove('hint-base', 'hint-right', 'hint-left', 'hint-down', 'hint-up')); }
    
    function showHint() {
        if(isPaused) return;
        for(let i=0; i<width*height; i++) {
            if(cells[i].classList.contains('stone') || cells[i].classList.contains('frozen') || cells[i].classList.contains('chained') || cells[i].classList.contains('vines')) continue;
            let moves = [1, width]; 
            for(let m of moves) {
                let t = i+m;
                if (m === 1 && (i % width === width - 1)) continue; 
                if(t < width*height && !cells[t].classList.contains('stone') && !cells[t].classList.contains('frozen') && !cells[t].classList.contains('chained') && !cells[t].classList.contains('vines')) {
                    swapData(i, t);
                    if (checkMatches()) {
                        swapData(i, t);
                        cells[i].classList.add('hint-base');
                        cells[t].classList.add('hint-base');
                        if (m === 1) { cells[i].classList.add('hint-right'); cells[t].classList.add('hint-left'); } 
                        else { cells[i].classList.add('hint-down'); cells[t].classList.add('hint-up'); }
                        return;
                    }
                    swapData(i, t);
                }
            }
        }
    }

    function swapData(id1, id2) {
        let t1 = cells[id1].getAttribute('data-item');
        let t2 = cells[id2].getAttribute('data-item');
        cells[id1].setAttribute('data-item', t2);
        cells[id2].setAttribute('data-item', t1);
    }

    if (localStorage.getItem('wonderrun_level')) {
        currentLevelIndex = parseInt(localStorage.getItem('wonderrun_level'));
    }
});

