// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ХРАНИЛИЩЕ
// ==========================================
const tg = window.Telegram.WebApp;
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultDisplay = document.getElementById('result-display');

let tonBalance = parseFloat(localStorage.getItem('tonBalance')) || 0.00;
let starBalance = parseFloat(localStorage.getItem('starBalance')) || 100.0;
let xpBalance = parseFloat(localStorage.getItem('xpBalance')) || 0;
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;
const MAX_LEVEL = 10;
let hasInsurance = false;

const SPIN_COST = 1.0;
const INSURANCE_COST = 10;

let currentRotation = 0; 
let isSpinning = false;
let currentWinner = null;
let lastSectorIndex = -1;
const images = {};

// ==========================================
// 2. КОНФИГУРАЦИЯ СЕКТОРОВ (ТЕМНЫЙ СТИЛЬ)
// ==========================================
const iconSources = {
    bull: './image/bull.png',
    clover: './image/clover.png',
    hourglass: './image/hourglass.png',
    phoenix: './image/phoenix.png',
    wolf: './image/wolf.png'
};

// Тёмные, глубокие цвета как на скрине
const sectors = [
    { label: "BULL", color: '#1a120b', glow: '#FF8C00', icon: 'bull', winChance: 20 },
    { label: "CLOVER", color: '#0b1a0b', glow: '#32CD32', icon: 'clover', winChance: 20 },
    { label: "TIME", color: '#1a160b', glow: '#DAA520', icon: 'hourglass', winChance: 20 },
    { label: "PHOENIX", color: '#0b1a1a', glow: '#00CED1', icon: 'phoenix', winChance: 20 },
    { label: "WOLF", color: '#0b121a', glow: '#1E90FF', icon: 'wolf', winChance: 20 }
];

// ==========================================
// 3. ОБНОВЛЕННЫЙ ENGINE (БЕЗ БЛЮРА НА ИКОНКАХ)
// ==========================================
function drawWheel() {
    if (!canvas) return;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 40;

    ctx.clearRect(0, 0, size, size);
    const arc = (Math.PI * 2) / sectors.length;

    sectors.forEach((sector, i) => {
        const angle = i * arc;
        
        ctx.save();
        
        // 1. Рисуем темный сектор
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, angle, angle + arc);
        
        // Градиент для эффекта глубины
        let grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(1, sector.color);
        
        ctx.fillStyle = grad;
        ctx.fill();

        // 2. Тонкая светящаяся полоска по краю сектора
        ctx.beginPath();
        ctx.arc(center, center, radius, angle, angle + arc);
        ctx.strokeStyle = sector.glow;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // 3. ОТРИСОВКА ИКОНКИ (БОЛЬШАЯ И ЧЕТКАЯ)
        if (images[sector.icon] && images[sector.icon].complete) {
            const img = images[sector.icon];
            const imgSize = radius * 0.45; // Увеличили размер до 55% от радиуса
            const dist = radius * 0.65;  // Позиция от центра

            ctx.save();
            ctx.translate(
                center + Math.cos(angle + arc/2) * dist,
                center + Math.sin(angle + arc/2) * dist
            );
            
            // Поворот иконки к центру
            ctx.rotate(angle + arc/2 + Math.PI / 2);
            
            // ВАЖНО: Сбрасываем тени и блюр перед отрисовкой самой картинки
            ctx.shadowBlur = 0; 
            ctx.shadowColor = 'transparent';
            
            // Рисуем картинку
            ctx.drawImage(img, -imgSize/2, -imgSize/2, imgSize, imgSize);
            ctx.restore();
        }
        
        ctx.restore();
    });

    // 4. ЦЕНТРАЛЬНЫЙ КРУГ (TINELLPULSE)
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 65, 0, Math.PI * 2);
    ctx.fillStyle = "#050507";
    ctx.shadowBlur = 40;
    ctx.shadowColor = "#00ced1";
    ctx.fill();
    
    ctx.strokeStyle = "#00ced1";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Текст в центре
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Montserrat";
    ctx.textAlign = "center";
    ctx.shadowBlur = 0;
    ctx.fillText("TINELLPULSE", center, center + 5);
    ctx.restore();

    // 5. ВНЕШНЯЯ РАМКА
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 15, 0, Math.PI * 2);
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 20;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(center, center, radius + 25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201, 108, 235, 0.2)"; // Едва заметный неоновый ореол
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// ==========================================
// 4. ЛОГИКА UI И SPIN (БЕЗ ИЗМЕНЕНИЙ)
// ==========================================
function updateUI() {
    const tonEl = document.getElementById('ton-balance');
    const starEl = document.getElementById('star-balance');
    const progressFill = document.getElementById('progress-fill');
    const xpText = document.getElementById('xp-text');
    const levelEl = document.getElementById('user-level');

    let targetXP = userLevel * 100;
    while (xpBalance >= targetXP && userLevel < MAX_LEVEL) {
        xpBalance -= targetXP;
        userLevel++;
        targetXP = userLevel * 100;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }

    if (tonEl) tonEl.innerText = tonBalance.toFixed(2);
    if (starEl) starEl.innerText = Math.floor(starBalance);
    if (levelEl) levelEl.innerText = userLevel;
    
    if (progressFill && xpText) {
        progressFill.style.width = Math.min((xpBalance / targetXP) * 100, 100) + "%";
        xpText.innerText = `${Math.floor(xpBalance)} / ${targetXP} XP`;
    }

    localStorage.setItem('tonBalance', tonBalance);
    localStorage.setItem('starBalance', starBalance);
    localStorage.setItem('xpBalance', xpBalance);
    localStorage.setItem('userLevel', userLevel);
}

function spin() {
    if (isSpinning) return;
    if (starBalance < SPIN_COST) {
        resultDisplay.innerText = "НУЖНО ⭐ 1.0";
        return;
    }

    starBalance -= SPIN_COST;
    updateUI();
    isSpinning = true;
    spinBtn.disabled = true;
    resultDisplay.innerText = "АНАЛИЗ...";

    const totalChance = sectors.reduce((s, sec) => s + sec.winChance, 0);
    let rand = Math.random() * totalChance;
    let cumulative = 0;
    let winningIndex = 0;

    for (let i = 0; i < sectors.length; i++) {
        cumulative += sectors[i].winChance;
        if (rand <= cumulative) {
            winningIndex = i;
            currentWinner = sectors[i];
            break;
        }
    }

    const sectorStep = (Math.PI * 2) / sectors.length;
    const extraSpins = Math.PI * 2 * 12; 
    const targetAngle = winningIndex * sectorStep + (sectorStep / 2);
    const stopAngle = (Math.PI * 1.5) - targetAngle;
    
    const startRotation = currentRotation;
    const finalRotation = startRotation + extraSpins + (stopAngle - (startRotation % (Math.PI * 2)));

    const duration = 6000;
    const startTime = performance.now();

    function animate(now) {
        let progress = Math.min((now - startTime) / duration, 1);
        let ease = 1 - Math.pow(1 - progress, 5); // Очень плавное торможение
        let rotation = startRotation + (finalRotation - startRotation) * ease;
        
        canvas.style.transform = `rotate(${rotation}rad)`;

        const currentSecIdx = Math.floor(((rotation % (Math.PI * 2)) / sectorStep));
        if (currentSecIdx !== lastSectorIndex) {
            lastSectorIndex = currentSecIdx;
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            currentRotation = rotation;
            isSpinning = false;
            spinBtn.disabled = false;
            finishSpin();
        }
    }
    requestAnimationFrame(animate);
}

function finishSpin() {
    resultDisplay.innerText = currentWinner.label;
    resultDisplay.style.color = currentWinner.glow;
    if (currentWinner.label === "CLOVER") xpBalance += 100;
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI();
}

// ==========================================
// 5. ЗАПУСК
// ==========================================
window.onload = () => {
    if(tg.expand) tg.expand();
    
    const size = canvas.offsetWidth;
    canvas.width = size
    canvas.height = size 

    let loaded = 0;
    const total = Object.keys(iconSources).length;
    for (let key in iconSources) {
        images[key] = new Image();
        images[key].src = iconSources[key];
        images[key].onload = () => {
            loaded++;
            if (loaded === total) {
                drawWheel();
                updateUI();
            }
        };
    }
};

spinBtn.addEventListener('click', spin);