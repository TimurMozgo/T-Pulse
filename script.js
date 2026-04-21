// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ХРАНИЛИЩЕ
// ==========================================
const tg = window.Telegram.WebApp;
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultDisplay = document.getElementById('result-display');
const timerDisplay = document.getElementById('timer-display'); 

let tonBalance = parseFloat(localStorage.getItem('tonBalance')) || 0.00;
let starBalance = parseFloat(localStorage.getItem('starBalance')) || 100.0;
let xpBalance = parseFloat(localStorage.getItem('xpBalance')) || 0;
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;

let activeMultiplier = 1; 
let hasShield = localStorage.getItem('hasShield') === 'true' || false; 
let extraSpins = parseInt(localStorage.getItem('extraSpins')) || 0; 

const MAX_LEVEL = 10;
const SPIN_COST = 1.0;
let currentRotation = 0; 
let isSpinning = false;
let lastSectorIndex = -1;
const images = {};

// Переменные для анимации огней
let lightAngleOffset = 0; // Смещение для эффекта "бегущих огней"

// ==========================================
// 2. КОНФИГУРАЦИЯ СЕКТОРОВ
// ==========================================
const iconSources = {
    crown: './image/PNG (6).png',      
    mystery: './image/PNG (7).png',  
    fire: './image/PNG (8).png',        
    diamond: './image/PNG (9).png',  
    vortex: './image/PNG (10).png',    
    star: './image/PNG (11).png',        
    bull: './image/bull.png',        
    clover: './image/clover.png',    
    hourglass: './image/hourglass.png', 
    phoenix: './image/phoenix.png',  
    wolf: './image/wolf.png'         
};

const sectors = [
    { id: 'crown', label: "KING Status", color: '#1a120b', glow: '#FFD700', winChance: 3 },
    { id: 'mystery', label: "CHRONO Mystery", color: '#0b1a1a', glow: '#00CED1', winChance: 15 },
    { id: 'fire', label: "BULL Run XP", color: '#1a0b0b', glow: '#FF4500', winChance: 12 },
    { id: 'diamond', label: "DIAMOND Vault", color: '#0b1a0b', glow: '#32CD32', winChance: 12 },
    { id: 'vortex', label: "VOID Boost", color: '#150b1a', glow: '#BF00FF', winChance: 10 },
    { id: 'star', label: "STELLAR Jackpot", color: '#1a1a0b', glow: '#FFD700', winChance: 5 },
    { id: 'bull', label: "BULLISH Rush", color: '#1a150b', glow: '#FFA500', winChance: 10 },
    { id: 'clover', label: "LUCKY Inside", color: '#0b1a0b', glow: '#00FF00', winChance: 10 },
    { id: 'hourglass', label: "CHRONO Shift", color: '#1a180b', glow: '#DAA520', winChance: 8 },
    { id: 'phoenix', label: "SHIELD", color: '#0b121a', glow: '#FF00FF', winChance: 5 },
    { id: 'wolf', label: "LIQUIDATION", color: '#050505', glow: '#FF0000', winChance: 10 }
];

// ==========================================
// 3. ENGINE ОТРИСОВКИ (FIXED: BIGGER ICONS & TEXT)
// ==========================================
function drawWheel() {
    if (!canvas) return;
    
    const size = canvas.width; 
    const center = size / 2;
    const radius = center - 15; 

    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(0, 0, size, size);

    const arc = (Math.PI * 2) / sectors.length;

    sectors.forEach((sector, i) => {
        const angle = i * arc;
        ctx.save();
        
        // 1. Сектор
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, angle, angle + arc);
        let grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(1, sector.color);
        ctx.fillStyle = grad;
        ctx.fill();

        // 2. Иконки (отодвинуты к краю)
        const distIcon = radius * 0.82; 
        if (images[sector.id] && images[sector.id].complete) {
            const img = images[sector.id];
            const imgSize = radius * 0.35; 
            ctx.save();
            ctx.translate(center + Math.cos(angle + arc/2) * distIcon, center + Math.sin(angle + arc/2) * distIcon);
            ctx.rotate(angle + arc/2 + Math.PI / 2); 
            ctx.drawImage(img, -imgSize/2, -imgSize/2, imgSize, imgSize);
            ctx.restore();
        }

        // 3. Текст с переносом строки
        ctx.save();
        const distText = radius * 0.48; 
        ctx.translate(center + Math.cos(angle + arc/2) * distText, center + Math.sin(angle + arc/2) * distText);
        ctx.rotate(angle + arc/2); 
        
        const fontSize = Math.max(10, Math.floor(size / 35)); 
        ctx.font = `bold ${fontSize}px Montserrat, Arial`;
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.shadowBlur = 4;
        ctx.shadowColor = sector.glow;

        const words = sector.label.toUpperCase().split(' ');
        const lineHeight = fontSize + 2; 

        words.forEach((word, index) => {
            const yOffset = (index - (words.length - 1) / 2) * lineHeight;
            ctx.fillText(word, 0, yOffset);
        });
        ctx.restore();

        ctx.restore();
    });

    // --- БЕГУЩИЕ ОГНИ ---
    const lightRadius = center - 6; 
    const numberOfLights = 40; 
    const lightArc = (Math.PI * 2) / numberOfLights;

    ctx.save();
    for (let j = 0; j < numberOfLights; j++) {
        const angleL = j * lightArc + lightAngleOffset;
        const xL = center + Math.cos(angleL) * lightRadius;
        const yL = center + Math.sin(angleL) * lightRadius;
        
        ctx.beginPath();
        ctx.arc(xL, yL, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = (j % 3 === 0) ? "white" : "#FFD700";
        ctx.shadowBlur = (j % 3 === 0) ? 12 : 8;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
    }
    ctx.restore();

    // --- 4. ЦЕНТР TINELLPULSE (FIXED) ---
    ctx.save();
    // Сбрасываем матрицу, чтобы гарантированно рисовать в центре
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    
    const innerRadius = radius * 0.22; 
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#050507";
    ctx.shadowBlur = 20;
    ctx.shadowColor = hasShield ? "#00FF00" : "#00ced1";
    ctx.fill();
    
    // Ободок центра
    ctx.strokeStyle = hasShield ? "#00FF00" : "#00ced1";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Текст логотипа
    ctx.fillStyle = "white";
    const logoFontSize = Math.max(9, Math.floor(size / 38));
    ctx.font = `bold ${logoFontSize}px Montserrat`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TINELLPULSE", center, center);
    ctx.restore();
}

// ==========================================
// 4. ЛОГИКА И UI
// ==========================================
function updateUI() {
    const starEl = document.getElementById('star-balance');
    const levelEl = document.getElementById('user-level');
    const progressFill = document.getElementById('progress-fill');
    const xpText = document.getElementById('xp-text');

    let targetXP = userLevel * 100;
    while (xpBalance >= targetXP && userLevel < MAX_LEVEL) {
        xpBalance -= targetXP;
        userLevel++;
        targetXP = userLevel * 100;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }

    if (starEl) starEl.innerText = starBalance.toFixed(1);
    if (levelEl) levelEl.innerText = userLevel;
    if (progressFill && xpText) {
        progressFill.style.width = Math.min((xpBalance / targetXP) * 100, 100) + "%";
        xpText.innerText = `${Math.floor(xpBalance)} / ${targetXP} XP`;
    }

    localStorage.setItem('starBalance', starBalance);
    localStorage.setItem('xpBalance', xpBalance);
    localStorage.setItem('userLevel', userLevel);
    localStorage.setItem('hasShield', hasShield);
    localStorage.setItem('extraSpins', extraSpins);

    if (extraSpins > 0) {
        spinBtn.innerText = `FREE SPIN (${extraSpins})`;
        spinBtn.style.boxShadow = "0 0 15px #00FF00";
    } else {
        spinBtn.innerText = "SPIN ⭐ 1.0";
        spinBtn.style.boxShadow = "";
    }
    
    drawWheel(); 
}

// ==========================================
// 5. SPIN И АНИМАЦИЯ
// ==========================================
function handleReward(winner) {
    switch(winner.id) {
        case 'wolf':
            if (hasShield) {
                hasShield = false;
                resultDisplay.innerText = "ЩИТ СПАС ТЕБЯ!";
            } else {
                starBalance *= 0.5;
                resultDisplay.innerText = "ВОЛК ЗАБРАЛ 50%";
            }
            break;
        case 'crown':
            userLevel++;
            activeMultiplier = 2;
            resultDisplay.innerText = "KING: LVL UP & X2!";
            break;
        case 'bull':
            activeMultiplier = 2;
            resultDisplay.innerText = "BULLISH: X2 НАГРАДА!";
            break;
        case 'phoenix':
            hasShield = true;
            resultDisplay.innerText = "ФЕНИКС ДАЛ ЩИТ!";
            break;
        case 'clover':
            extraSpins += 2;
            resultDisplay.innerText = "+2 FREE SPINS";
            break;
        case 'star':
            starBalance += (50 * activeMultiplier);
            resultDisplay.innerText = `JACKPOT: ⭐ ${50 * activeMultiplier}`;
            break;
        case 'diamond':
            starBalance += (10 * activeMultiplier);
            resultDisplay.innerText = `LIQUIDITY: ⭐ ${10 * activeMultiplier}`;
            break;
        case 'fire':
            xpBalance += 500;
            resultDisplay.innerText = "+500 XP";
            break;
        case 'mystery':
            xpBalance += 200;
            resultDisplay.innerText = "ТАЙНЫЙ ПРИЗ: +200 XP";
            break;
        default:
            resultDisplay.innerText = winner.label;
    }

    if (winner.id === 'star' || winner.id === 'diamond') activeMultiplier = 1;
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI();
}

function spin() {
    if (isSpinning) return;
    if (starBalance < SPIN_COST && extraSpins <= 0) {
        resultDisplay.innerText = "МАЛО ⭐";
        return;
    }

    if (extraSpins > 0) extraSpins--; else starBalance -= SPIN_COST;

    updateUI();
    isSpinning = true;
    spinBtn.disabled = true;
    resultDisplay.innerText = "АНАЛИЗ РЫНКА...";

    const totalChance = sectors.reduce((s, sec) => s + sec.winChance, 0);
    let rand = Math.random() * totalChance;
    let cumulative = 0;
    let winningIndex = 0;

    for (let i = 0; i < sectors.length; i++) {
        cumulative += sectors[i].winChance;
        if (rand <= cumulative) {
            winningIndex = i;
            break;
        }
    }

    const sectorStep = (Math.PI * 2) / sectors.length;
    const extraFullTurns = Math.PI * 2 * 10; 
    const targetAngle = winningIndex * sectorStep + (sectorStep / 2);
    const stopAngle = (Math.PI * 1.5) - targetAngle;
    
    const startRotation = currentRotation;
    const finalRotation = startRotation + extraFullTurns + (stopAngle - (startRotation % (Math.PI * 2)));

    const duration = 5000;
    const startTime = performance.now();

    function animate(currentTime) {
        let progress = Math.min((currentTime - startTime) / duration, 1);
        let ease = 1 - Math.pow(1 - progress, 4);
        let rotation = startRotation + (finalRotation - startRotation) * ease;
        
        canvas.style.transform = `rotate(${rotation}rad)`;

        // --- ДОБАВЛЕНА АНИМАЦИЯ БЕГУЩИХ ОГНЕЙ ---
        // Огни бегут в обратную сторону от вращения колеса (эффект скорости)
        lightAngleOffset -= 0.05; 

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
            handleReward(sectors[winningIndex]);
            
            // Сбрасываем смещение огней, чтобы они не бежали вечно
            lightAngleOffset = 0; 
        }
    }
    requestAnimationFrame(animate);
}

// ==========================================
// 6. ЗАПУСК
// ==========================================
window.onload = () => {
    if(tg.expand) tg.expand();
    
    // Принудительно задаем размер канваса (под "весь экран")
    const containerSize = canvas.parentElement.offsetWidth || 350;
    canvas.width = containerSize;
    canvas.height = containerSize;

    updateUI(); 
    
    if (timerDisplay) timerDisplay.innerText = "TINELLPULSE CASINO ENGINE";

    let loaded = 0;
    const total = Object.keys(iconSources).length;
    
    for (let key in iconSources) {
        images[key] = new Image();
        images[key].src = iconSources[key];
        images[key].onload = () => {
            loaded++;
            if (loaded === total) drawWheel(); 
        };
        images[key].onerror = () => {
            loaded++;
            if (loaded === total) drawWheel();
        };
    }
    
    drawWheel();
};

spinBtn.onclick = spin;