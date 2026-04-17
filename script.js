const tg = window.Telegram.WebApp;
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultDisplay = document.getElementById('result-display');

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let tonBalance = parseFloat(localStorage.getItem('tonBalance')) || 10000.0; 
let starBalance = parseFloat(localStorage.getItem('starBalance')) || 100.0;
let xpBalance = parseFloat(localStorage.getItem('xpBalance')) || 0; 
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1; // Сохраняем уровень
const MAX_LEVEL = 10; // Лимит уровней
let hasInsurance = false; 

const SPIN_COST = 1.0;
const INSURANCE_COST = 10;

// Функция динамического порога: lvl 1 = 100, lvl 2 = 200 и т.д.
function getTargetXP(lvl) {
    return lvl * 100;
}

let currentAngle = 0;
let isSpinning = false;
let currentWinner = null;

const sectors = [
    { label: "🌟 JACKPOT", value: "500", winChance: 0.5, type: 'epic', color: '#FFDB58' }, // 0: Mustard (Верх)
    { label: "10 XP", value: "10", winChance: 10, type: 'common', color: '#4a148c' },
    { label: "5 ЗВЕЗД", value: "5", winChance: 6, type: 'stars', color: '#00bcd4' },
    { label: "15 XP", value: "15", winChance: 10, type: 'common', color: '#6a1b9a' },
    { label: "📜 СВИТОК", value: "SCROLL", winChance: 5, type: 'rare_scroll', color: '#0288d1' },
    { label: "20 XP", value: "20", winChance: 10, type: 'common', color: '#7b1fa2' },
    { label: "30 XP", value: "30", winChance: 8, type: 'common', color: '#8e24aa' },
    { label: "1 ЗВЕЗДА", value: "1", winChance: 10, type: 'stars', color: '#00acc1' },
    
    { label: "💀 LIKVID", value: "FULL", winChance: 1, type: 'liquis', color: '#050505' },   // 8: Black (120°)
    { label: "25 XP", value: "25", winChance: 10, type: 'common', color: '#9c27b0' },
    { label: "🎭 МАСКА", value: "AMULET", winChance: 2, type: 'rare_amulet', color: '#039be5' },
    { label: "10 XP", value: "10", winChance: 10, type: 'common', color: '#ab47bc' },
    { label: "📜 СВИТОК", value: "SCROLL", winChance: 5, type: 'rare_scroll', color: '#03a9f4' },
    { label: "20 XP", value: "20", winChance: 10, type: 'common', color: '#ba68c8' },
    { label: "3 ЗВЕЗДЫ", value: "3", winChance: 6, type: 'stars', color: '#26c6da' },
    { label: "40 XP", value: "40", winChance: 8, type: 'common', color: '#ce93d8' },

    { label: "⚠️ -55%", value: "55%", winChance: 2, type: 'danger', color: '#CE2029' },    // 16: Fire Engine (240°)
    { label: "15 XP", value: "15", winChance: 10, type: 'common', color: '#e1bee7' },
    { label: "📜 СВИТОК", value: "SCROLL", winChance: 5, type: 'rare_scroll', color: '#29b6f6' },
    { label: "50 XP", value: "50", winChance: 5, type: 'common', color: '#4a148c' },
    { label: "5 ЗВЕЗД", value: "5", winChance: 5, type: 'stars', color: '#00bcd4' },
    { label: "10 XP", value: "10", winChance: 10, type: 'common', color: '#6a1b9a' },
    { label: "20 XP", value: "20", winChance: 10, type: 'common', color: '#7b1fa2' },
    { label: "30 XP", value: "30", winChance: 5, type: 'common', color: '#0288d1' }
];

function drawWheel() {
    if (!canvas) return;
    
    // Устанавливаем реальное разрешение
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;
    let startAngle = 0;
    
    // ИСПРАВЛЕНО: Добавлен предохранитель || 1
    const totalVisualWeight = sectors.reduce((sum, s) => sum + (s.visualWeight || 1), 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sectors.forEach((s, i) => {
        // ИСПРАВЛЕНО: Добавлен предохранитель || 1
        const weight = s.visualWeight || 1;
        const arc = (weight / totalVisualWeight) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + arc);
        
        // ЦВЕТА
        let fillStyle = "#1a1a1a";
        if (s.color) {
            fillStyle = s.color;
        } else if (s.type === 'stars') {
            fillStyle = '#00B8D4';
        } else if (s.type === 'common') {
            fillStyle = i % 2 === 0 ? '#222' : '#333';
        }

        ctx.fillStyle = fillStyle;
        
        // Свечение для Джекпота
        ctx.save(); // Сохраняем состояние для тени
        if (s.type === 'epic') {
            ctx.shadowBlur = 20;
            ctx.shadowColor = s.color;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.restore(); // Возвращаем состояние без тени, чтобы не тормозило

        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // ТЕКСТ
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = "right";
        
        if (s.color === '#FFDB58') ctx.fillStyle = "#000"; 
        else if (s.color === '#050505') ctx.fillStyle = "#ff0000"; 
        else ctx.fillStyle = "#fff";

        ctx.font = "bold 9px Arial"; // Чуть меньше шрифт для 24 секторов
        ctx.fillText(s.label, radius - 10, 4);
        ctx.restore();

        startAngle += arc;
    });
}

function updateUI() {
    const tonEl = document.getElementById('ton-balance');
    const starEl = document.getElementById('star-balance');
    const progressFill = document.getElementById('progress-fill');
    const xpText = document.getElementById('xp-text');
    const levelEl = document.getElementById('user-level'); // ID для текста "LEVEL X"

    // --- ЛОГИКА ПЕРЕХОДА УРОВНЯ ---
    let currentTarget = getTargetXP(userLevel);
    while (xpBalance >= currentTarget && userLevel < MAX_LEVEL) {
        xpBalance -= currentTarget;
        userLevel += 1;
        currentTarget = getTargetXP(userLevel);
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }

    // Если достигнут максимум
    if (userLevel >= MAX_LEVEL) xpBalance = currentTarget;

    // Отрисовка
    if (tonEl) tonEl.innerText = tonBalance.toFixed(2);
    if (starEl) starEl.innerText = Math.floor(starBalance);
    if (levelEl) levelEl.innerText = userLevel >= MAX_LEVEL ? "MAX" : userLevel;
    
    if (progressFill && xpText) {
        const percentage = Math.min((xpBalance / currentTarget) * 100, 100);
        progressFill.style.width = percentage + "%";
        xpText.innerText = `${Math.floor(xpBalance)} / ${currentTarget} XP`;
    }
    
    localStorage.setItem('tonBalance', tonBalance.toString());
    localStorage.setItem('starBalance', starBalance.toString());
    localStorage.setItem('xpBalance', xpBalance.toString());
    localStorage.setItem('userLevel', userLevel.toString());
    
    if (hasInsurance) {
        spinBtn.style.boxShadow = "0 0 20px #00ff00";
        spinBtn.style.border = "1px solid #00ff00";
    } else {
        spinBtn.style.boxShadow = "0 0 15px #bc13fe";
        spinBtn.style.border = "none";
    }
}

function buyInsurance() {
    if (isSpinning) return;
    if (starBalance >= INSURANCE_COST) {
        starBalance -= INSURANCE_COST;
        hasInsurance = true;
        updateUI();
        resultDisplay.innerText = "🛡️ ЗАЩИТА АКТИВНА";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } else {
        resultDisplay.innerText = "НУЖНО 10 ⭐";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }
}

function spin() {
    if (isSpinning) return;
    if (tonBalance < SPIN_COST) {
        resultDisplay.innerText = "ПОПОЛНИТЕ БАЛАНС";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    tonBalance -= SPIN_COST;
    updateUI();
    isSpinning = true;
    spinBtn.disabled = true;
    resultDisplay.innerText = "АНАЛИЗ РЫНКА...";
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    const totalWinChance = sectors.reduce((sum, s) => sum + s.winChance, 0);
    let rand = Math.random() * totalWinChance;
    let cumulativeChance = 0;
    let winningIndex = 0;
    for (let i = 0; i < sectors.length; i++) {
        cumulativeChance += sectors[i].winChance;
        if (rand <= cumulativeChance) {
            winningIndex = i;
            currentWinner = sectors[i];
            break;
        }
    }

    // ИСПРАВЛЕНО: Добавил || 1, чтобы не было деления на 0
    const totalVisualWeight = sectors.reduce((sum, s) => sum + (s.visualWeight || 1), 0);
    let targetVisualStart = 0;
    for (let i = 0; i < winningIndex; i++) {
        targetVisualStart += ((sectors[i].visualWeight || 1) / totalVisualWeight) * 2 * Math.PI;
    }
    
    let targetVisualArc = ((sectors[winningIndex].visualWeight || 1) / totalVisualWeight) * 2 * Math.PI;
    let targetLocalAngle = targetVisualStart + (targetVisualArc / 2);
    let baseRotation = -Math.PI / 2 - targetLocalAngle;
    
    while (baseRotation < 0) baseRotation += 2 * Math.PI;
    let currentMod = currentAngle % (2 * Math.PI);
    let extraRotation = baseRotation - currentMod;
    if (extraRotation < 0) extraRotation += 2 * Math.PI;

    const spins = 7;
    const duration = 4000;
    const startValue = currentAngle;
    const endValue = currentAngle + extraRotation + (spins * 2 * Math.PI);
    const startTime = performance.now();

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        
        currentAngle = startValue + (endValue - startValue) * easeOut;
        
        // ВАЖНО: Убедись, что в CSS у #wheel-canvas НЕТ transition: transform
        canvas.style.transform = `rotate(${currentAngle}rad)`;
        
        // Кнопка крутится вместе с колесом, а в конце сбрасывается
        spinBtn.style.transform = `translate(-50%, -50%) rotate(${currentAngle}rad)`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Остановка
            spinBtn.style.transform = `translate(-50%, -50%) rotate(0deg)`;
            finishSpin();
        }
    }
    requestAnimationFrame(animate);
}

function finishSpin() {
    isSpinning = false;
    spinBtn.disabled = false;
    spinBtn.style.transform = `translate(-50%, -50%) rotate(0deg)`;

    let type = currentWinner.type;
    let label = currentWinner.label;
    const winValue = parseFloat(currentWinner.value) || 0; 

    let usedInsuranceThisTurn = hasInsurance;
    if (hasInsurance) {
        if (type === 'liquis' || type === 'danger') {
            type = 'safe';
            label = "🛡️ СТРАХОВКА СПАСЛА!";
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            // Зеленое конфетти, если спасла страховка
            if (typeof confetti === 'function') {
                confetti({ particleCount: 40, colors: ['#00ff00'], spread: 50, origin: { y: 0.7 } });
            }
        }
        hasInsurance = false; 
    }

    if (type === 'liquis') {
        tonBalance = 0; 
        label = "💀 ЛИКВИДАЦИЯ: -100%";
        document.querySelector('.app-container').classList.add('shake-anim');
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        
        // ЗАПУСК ЧЕРЕПОВ
        startEmojiRain('💀'); 

    } else if (type === 'danger') {
        const amountToLose = tonBalance * 0.55;
        tonBalance -= amountToLose;
        label = `⚠️ ПОТЕРЯ: -${amountToLose.toFixed(2)} TON`;
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
        
        // ЗАПУСК ГРАФИКОВ ВНИЗ
        startEmojiRain('📉');

    } else if (type === 'stars' || type === 'epic') {
        starBalance += winValue;
        label = `🎉 ВЫИГРАНО: ${winValue} ⭐`;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        // ЗАПУСК КОНФЕТТИ (если джекпот или звезды)
        if (typeof confetti === 'function') {
            confetti({ 
                particleCount: 150, 
                spread: 70, 
                origin: { y: 0.6 }, 
                colors: type === 'epic' ? ['#FFDB58', '#FFA500', '#FFFFFF'] : ['#00B8D4', '#FFFFFF']
            });
        }

    } else if (type === 'common') {
        xpBalance += winValue; 
        label = `⚡ +${winValue} XP ПОЛУЧЕНО`;
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    } else if (type === 'rare_scroll' || type === 'rare_amulet') {
        label = `🎁 ПРИЗ: ${currentWinner.label}`;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }

    updateUI(); 
    resultDisplay.innerText = label;
    resultDisplay.style.color = (type === 'liquis' || type === 'danger') ? "#ff0000" : "#00B8D4";
    updateHistory(label, type);
    sendToAuditor(label, type, winValue, usedInsuranceThisTurn); 
    
    setTimeout(() => {
        const container = document.querySelector('.app-container');
        if(container) container.classList.remove('shake-anim');
    }, 500);
}

// Эту функцию добавь ВНЕ finishSpin, в самый низ файла
function startEmojiRain(emoji) {
    for (let i = 0; i < 30; i++) {
        const el = document.createElement('div');
        el.className = 'emoji-rain-item'; // Добавим класс для контроля
        el.innerText = emoji;
        el.style.cssText = `
            position: fixed;
            top: -50px;
            left: ${Math.random() * 100}vw;
            font-size: ${Math.random() * 20 + 20}px;
            z-index: 1000;
            pointer-events: none;
            transition: transform ${Math.random() * 2 + 1.5}s linear, opacity 2s;
        `;
        document.body.appendChild(el);

        setTimeout(() => {
            el.style.transform = `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`;
            el.style.opacity = '0';
        }, 50);

        setTimeout(() => el.remove(), 3500);
    }
}

function updateHistory(label, type) {
    const list = document.getElementById('history-list');
    if (!list) return;
    const entry = document.createElement('div');
    entry.style.padding = "5px 0";
    entry.style.borderBottom = "1px solid #222";
    entry.style.fontSize = "12px";
    
    let color = "#bc13fe";
    if (type === 'liquis' || type === 'danger') color = "#ff0000";

    // Добавляем уровень в историю
    const lvlTag = `<span style="color: #888">[LVL ${userLevel}]</span>`;
    entry.innerHTML = `<span style="color: ${color}">●</span> ${lvlTag} ${label}`;
    
    list.prepend(entry);
    if (list.children.length > 6) list.lastChild.remove();
}

function sendToAuditor(label, type, winValue, insUsed) {
    const user = tg.initDataUnsafe?.user || {};
    const data = {
        userId: user.id || "ID_UNKNOWN",
        username: user.username ? `@${user.username}` : "Anonymous",
        action: "SPIN",
        userLevel: userLevel, // Шлем текущий уровень
        result: label,
        resultType: type,
        winAmount: winValue || 0,
        tonBalance: tonBalance.toFixed(2),
        starBalance: Math.floor(starBalance),
        xpBalance: Math.floor(xpBalance), 
        insuranceUsed: insUsed ? "Да" : "Нет",
        timestamp: new Date().toLocaleString("ru-RU")
    };
    fetch('https://tiktiok.xyz/webhook-test/T-Pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(e => console.error(e));
}

window.onload = () => {
    if(tg.expand) tg.expand();
    drawWheel();
    updateUI(); 
};

spinBtn.addEventListener('click', spin);
const insBtn = document.getElementById('ins-btn');
if(insBtn) insBtn.addEventListener('click', buyInsurance);

// --- ЗВУКОВОЙ ДВИЖОК ---
const sounds = {
    // Короткий механический щелчок для секторов
    tick: new Audio('https://www.soundjay.com/buttons/button-50.mp3'), 
    // Праздничный звук для выигрыша
    win: new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3'),
    // Звук ошибки/потери для ликвидации
    loss: new Audio('https://www.soundjay.com/buttons/button-10.mp3')
};

// Громкость (сделай чуть тише, чтобы не оглушало)
sounds.tick.volume = 0.3;
sounds.win.volume = 0.5;
sounds.loss.volume = 0.5;

function playSound(name) {
    if (sounds[name]) {
        sounds[name].currentTime = 0; 
        sounds[name].play().catch(e => console.log("Звук заблокирован до клика"));
    }
}