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
    { label: "🌟 JACKPOT", value: "JACKPOT", visualWeight: 1, winChance: 0.5, type: 'epic' }, 
    { label: "30 XP", value: "30", visualWeight: 1, winChance: 15, type: 'common' },
    { label: "📜 СВИТОК", value: "SCROLL", visualWeight: 1, winChance: 8, type: 'rare_scroll' },
    { label: "10 ЗВЕЗД", value: "10_STARS", visualWeight: 1, winChance: 2, type: 'stars' },
    { label: "⚠️ ПОТЕРЯ 55%", value: "55%", visualWeight: 1, winChance: 10, type: 'danger' },
    { label: "20 XP", value: "20", visualWeight: 1, winChance: 20, type: 'common' },
    { label: "📜 СВИТОК", value: "SCROLL", visualWeight: 1, winChance: 8, type: 'rare_scroll' },
    { label: "3 ЗВЕЗДЫ", value: "3_STARS", visualWeight: 1, winChance: 5, type: 'stars' },
    { label: "💀 ЛИКВИДАЦИЯ", value: "FULL", visualWeight: 1, winChance: 5, type: 'liquis' },
    { label: "50 XP", value: "50", visualWeight: 1, winChance: 10, type: 'common' },
    { label: "🎭 МАСКА", value: "AMULET", visualWeight: 1, winChance: 3, type: 'rare_amulet' },
    { label: "1 ЗВЕЗДА", value: "1_STAR", visualWeight: 1, winChance: 13.5, type: 'stars' }
];

function drawWheel() {
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 5;
    let startAngle = 0;
    const totalVisualWeight = sectors.reduce((sum, s) => sum + s.visualWeight, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sectors.forEach((s, i) => {
        const arc = (s.visualWeight / totalVisualWeight) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + arc);
        let gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        if (s.type === 'liquis' || s.type === 'danger') {
            gradient.addColorStop(0, '#ff4b2b'); gradient.addColorStop(1, '#000000');
        } else if (s.type === 'epic') {
            gradient.addColorStop(0, '#FFF9C4'); gradient.addColorStop(1, '#F9A825');
        } else if (s.type === 'stars') {
            gradient.addColorStop(0, '#E0F7FA'); gradient.addColorStop(1, '#00B8D4');
        } else if (s.type === 'rare_scroll' || s.type === 'rare_amulet') {
            gradient.addColorStop(0, '#81D4FA'); gradient.addColorStop(1, '#01579B');
        } else {
            const hue = 260 + (i * 10); 
            gradient.addColorStop(0, `hsl(${hue}, 70%, 70%)`);
            gradient.addColorStop(1, `hsl(${hue}, 80%, 30%)`);
        }
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Arial";
        ctx.fillText(s.label, radius - 15, 5);
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

    const totalVisualWeight = sectors.reduce((sum, s) => sum + s.visualWeight, 0);
    let targetVisualStart = 0;
    for (let i = 0; i < winningIndex; i++) {
        targetVisualStart += (sectors[i].visualWeight / totalVisualWeight) * 2 * Math.PI;
    }
    let targetVisualArc = (sectors[winningIndex].visualWeight / totalVisualWeight) * 2 * Math.PI;
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
        canvas.style.transform = `rotate(${currentAngle}rad)`;
        spinBtn.style.transform = `translate(-50%, -50%) rotate(${currentAngle}rad)`;
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
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
        }
        hasInsurance = false; 
    }

    if (type === 'liquis') {
        tonBalance = 0; 
        label = "💀 ЛИКВИДАЦИЯ: -100%";
        document.querySelector('.app-container').classList.add('shake-anim');
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    } else if (type === 'danger') {
        const amountToLose = tonBalance * 0.55;
        tonBalance -= amountToLose;
        label = `⚠️ ПОТЕРЯ: -${amountToLose.toFixed(2)} TON`;
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
    } else if (type === 'stars' || type === 'epic') {
        starBalance += winValue;
        label = `🎉 ВЫИГРАНО: ${winValue} ⭐`;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
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