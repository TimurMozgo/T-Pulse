// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ХРАНИЛИЩЕ
// ==========================================
const tg = window.Telegram.WebApp;
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultDisplay = document.getElementById('result-display');
const timerDisplay = document.getElementById('timer-display'); 

// Балансы теперь будем приоритетно брать из n8n, localStorage оставляем как кэш
let tonBalance = parseFloat(localStorage.getItem('tonBalance')) || 0.00;
let starBalance = parseFloat(localStorage.getItem('starBalance')) || 100.0;
let xpBalance = parseFloat(localStorage.getItem('xpBalance')) || 0;
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;

let hasShield = localStorage.getItem('hasShield') === 'true' || false; 
let extraSpins = parseInt(localStorage.getItem('extraSpins')) || 0; 

const MAX_LEVEL = 10;
const SPIN_COST = 50.0; // Твоя цена в звездах
let currentRotation = 0; 
let isSpinning = false;
let lastSectorIndex = -1;
const images = {};
let lightAngleOffset = 0;

// ==========================================
// 2. КОНФИГУРАЦИЯ СЕКТОРОВ (ТОЛЬКО ВИЗУАЛ)
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

// winChance убран, так как рандом теперь на сервере
const sectors = [
    { id: 'crown', label: "KING Status", color: '#1a120b', glow: '#FFD700' },
    { id: 'mystery', label: "CHRONO Mystery", color: '#0b1a1a', glow: '#00CED1' },
    { id: 'fire', label: "BULL Run XP", color: '#1a0b0b', glow: '#FF4500' },
    { id: 'diamond', label: "DIAMOND Vault", color: '#0b1a0b', glow: '#32CD32' },
    { id: 'vortex', label: "VOID Boost", color: '#150b1a', glow: '#BF00FF' },
    { id: 'star', label: "STELLAR Jackpot", color: '#1a1a0b', glow: '#FFD700' },
    { id: 'bull', label: "BULLISH Rush", color: '#1a150b', glow: '#FFA500' },
    { id: 'clover', label: "LUCKY Inside", color: '#0b1a0b', glow: '#00FF00' },
    { id: 'hourglass', label: "CHRONO Shift", color: '#1a180b', glow: '#DAA520' },
    { id: 'phoenix', label: "SHIELD", color: '#0b121a', glow: '#FF00FF' },
    { id: 'wolf', label: "LIQUIDATION", color: '#050505', glow: '#FF0000' }
];

// ==========================================
// 3. ENGINE ОТРИСОВКИ
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
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, angle, angle + arc);
        let grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
        grad.addColorStop(0, '#0a0a0a'); 
        grad.addColorStop(1, '#111111'); 
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const distIcon = radius * 0.78; 
        if (images[sector.id] && images[sector.id].complete) {
            const img = images[sector.id];
            const imgSize = radius * 0.28; 
            ctx.save();
            ctx.translate(center + Math.cos(angle + arc/2) * distIcon, center + Math.sin(angle + arc/2) * distIcon);
            ctx.rotate(angle + arc/2 + Math.PI / 2); 
            ctx.shadowBlur = 15;
            ctx.shadowColor = sector.glow;
            ctx.drawImage(img, -imgSize/2, -imgSize/2, imgSize, imgSize);
            ctx.restore();
        }

        ctx.save();
        const distText = radius * 0.45; 
        ctx.translate(center + Math.cos(angle + arc/2) * distText, center + Math.sin(angle + arc/2) * distText);
        ctx.rotate(angle + arc/2); 
        const fontSize = Math.max(9, Math.floor(size / 38)); 
        ctx.font = `bold ${fontSize}px Montserrat, Arial`;
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.shadowBlur = 8;
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

    const lightRadius = center - 8; 
    const numberOfLights = 36; 
    const lightArc = (Math.PI * 2) / numberOfLights;
    ctx.save();
    for (let j = 0; j < numberOfLights; j++) {
        const angleL = j * lightArc;
        const xL = center + Math.cos(angleL) * lightRadius;
        const yL = center + Math.sin(angleL) * lightRadius;
        ctx.beginPath();
        ctx.arc(xL, yL, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = (j % 2 === 0) ? "#FFD700" : "white";
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    const innerRadius = radius * 0.22; 
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#050507";
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#00ced1"; 
    ctx.fill();
    ctx.strokeStyle = "#00ced1";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "white";
    const logoFontSize = Math.max(8, Math.floor(size / 40));
    ctx.font = `900 ${logoFontSize}px Montserrat`;
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
    const tonEl = document.getElementById('ton-balance');
    const levelEl = document.getElementById('user-level');
    const progressFill = document.getElementById('progress-fill');
    const xpText = document.getElementById('xp-text');

    if (starEl) starEl.innerText = starBalance.toFixed(1);
    if (tonEl) tonEl.innerText = tonBalance.toFixed(2);
    if (levelEl) levelEl.innerText = userLevel;
    
    // XP Прогресс
    let targetXP = userLevel * 100;
    if (progressFill && xpText) {
        progressFill.style.width = Math.min((xpBalance / targetXP) * 100, 100) + "%";
        xpText.innerText = `${Math.floor(xpBalance)} / ${targetXP} XP`;
    }

    localStorage.setItem('starBalance', starBalance);
    localStorage.setItem('tonBalance', tonBalance);
    localStorage.setItem('xpBalance', xpBalance);
    localStorage.setItem('userLevel', userLevel);

    if (extraSpins > 0) {
        spinBtn.innerText = `FREE SPIN (${extraSpins})`;
        spinBtn.style.boxShadow = "0 0 15px #00FF00";
    } else {
        spinBtn.innerText = "SPIN ⭐ 50";
        spinBtn.style.boxShadow = "";
    }
    drawWheel(); 
}

// ==========================================
// 5. SPIN И АНИМАЦИЯ (СЕРВЕРНАЯ ЛОГИКА)
// ==========================================
function handleReward(winner, serverData) {
    // Вся логика теперь берется из ответа n8n
    resultDisplay.innerText = winner.label;
    
    // Обновляем балансы напрямую из сервера
    if (serverData.newBalanceStars !== undefined) starBalance = serverData.newBalanceStars;
    if (serverData.newBalanceTon !== undefined) tonBalance = parseFloat(serverData.newBalanceTon);
    
    // Спецэффекты для конкретных ID
    if (winner.id === 'phoenix') hasShield = true;
    if (winner.id === 'wolf' && !hasShield) {
         resultDisplay.innerText = "ЛИКВИДАЦИЯ!";
    }

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI();
}

async function spin() {
    if (isSpinning) return;

    isSpinning = true;
    spinBtn.disabled = true;
    resultDisplay.innerText = "АНАЛИЗ РЫНКА...";

    try {
        const response = await fetch('https://tiktiok.xyz/webhook-test/T-Pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: tg.initDataUnsafe?.user?.id || "DEBUG_USER",
                username: tg.initDataUnsafe?.user?.username || "Player"
            })
        });

        if (!response.ok) throw new Error("Server Error");

        const data = await response.json();
        const winningIndex = data.winningIndex;

        // Настройка вращения
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
                handleReward(sectors[winningIndex], data);
            }
        }
        requestAnimationFrame(animate);

    } catch (err) {
        console.error("Ошибка сервера:", err);
        resultDisplay.innerText = "ОШИБКА СВЯЗИ";
        isSpinning = false;
        spinBtn.disabled = false;
    }
}

// ==========================================
// 6. ЗАПУСК
// ==========================================
window.onload = () => {
    if(tg.expand) tg.expand();
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
        images[key].onload = () => { if (++loaded === total) drawWheel(); };
        images[key].onerror = () => { if (++loaded === total) drawWheel(); };
    }
    drawWheel();
};

spinBtn.onclick = spin;