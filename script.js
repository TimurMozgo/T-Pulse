// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ХРАНИЛИЩЕ
// ==========================================
const tg = window.Telegram.WebApp;
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultDisplay = document.getElementById('result-display');
const timerDisplay = document.getElementById('timer-display'); 

// Балансы (ТОЛЬКО TON И XP)
let tonBalance = parseFloat(localStorage.getItem('tonBalance')) || 0.00;
let xpBalance = parseFloat(localStorage.getItem('xpBalance')) || 0;
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;
let hasShield = localStorage.getItem('hasShield') === 'true' || false; 
let extraSpins = parseInt(localStorage.getItem('extraSpins')) || 0; 

const MAX_LEVEL = 100;

// --- СИСТЕМА СТАВОК (ПАКЕТЫ TON) ---
const BET_LEVELS = [0.1, 1.0, 10.0, 100.0];
let currentBetIndex = 0; // Начинаем с 0.1 TON

function getCurrentBet() {
    return BET_LEVELS[currentBetIndex];
}

// Можешь повесить эту функцию на отдельную кнопку "Изменить ставку"
function nextBet() {
    currentBetIndex = (currentBetIndex + 1) % BET_LEVELS.length;
    updateUI(); 
}
// -----------------------------------

let currentRotation = 0; 
let isSpinning = false;
let lastSectorIndex = -1;
const images = {};
let lightAngleOffset = 0;

// ==========================================
// 2. КОНФИГУРАЦИЯ СЕКТОРОВ
// ==========================================
const iconSources = {
    zero: './image/zero.png', // Теперь ID и ключ совпадают
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
    // ИСПРАВЛЕНО: id теперь 'zero', чтобы подтянулась картинка из iconSources
    { id: 'zero', label: "VOID (Zero)", color: '#000000', glow: '#BF00FF' }, 
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
// 3. ENGINE ОТРИСОВКИ (БЕЗ ИЗМЕНЕНИЙ)
// ==========================================
function drawWheel() {
    if (!canvas) return;
    const size = canvas.width; 
    const center = size / 2;
    const radius = center - 15; 
    
    // Сбрасываем и чистим холст
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(0, 0, size, size);
    
    // ==========================================
    // НАЧАЛО БЛОКА ВРАЩЕНИЯ (КРУТЯТСЯ ТОЛЬКО СЕКТОРА)
    // ==========================================
    ctx.save(); 
    ctx.translate(center, center);
    ctx.rotate(currentRotation); 
    ctx.translate(-center, -center);

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
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
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
    });

    ctx.restore(); 
    // ==========================================
    // КОНЕЦ БЛОКА ВРАЩЕНИЯ
    // ВСЁ, ЧТО НИЖЕ, БУДЕТ СТОЯТЬ НЕПОДВИЖНО
    // ==========================================

    // --- ЛАМПОЧКИ ---
    const lightRadius = center - 8; 
    const numberOfLights = 36; 
    const lightArc = (Math.PI * 2) / numberOfLights;
    
    ctx.save();
    for (let j = 0; j < numberOfLights; j++) {
        const angleL = j * lightArc + lightAngleOffset;
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

    // --- ЦЕНТРАЛЬНЫЙ ЛОГОТИП ---
    ctx.save();
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
// 4. ЛОГИКА UI
// ==========================================
function updateUI() {
    const tonEl = document.getElementById('ton-balance');
    const levelEl = document.getElementById('user-level');
    const progressFill = document.getElementById('progress-fill');
    const xpText = document.getElementById('xp-text');

    if (tonEl) tonEl.innerText = tonBalance.toFixed(2);
    if (levelEl) levelEl.innerText = userLevel;
    
    let targetXP = userLevel * 100;
    if (progressFill && xpText) {
        progressFill.style.width = Math.min((xpBalance / targetXP) * 100, 100) + "%";
        xpText.innerText = `${Math.floor(xpBalance)} / ${targetXP} XP`;
    }

    localStorage.setItem('tonBalance', tonBalance);
    localStorage.setItem('xpBalance', xpBalance);
    localStorage.setItem('userLevel', userLevel);

    if (extraSpins > 0) {
        spinBtn.innerText = `FREE SPIN (${extraSpins})`;
        spinBtn.style.boxShadow = "0 0 15px #00FF00";
        spinBtn.style.opacity = "1";
    } else {
        spinBtn.innerText = `SPIN 💎 ${getCurrentBet()}`;
        spinBtn.style.boxShadow = "";
        
        // Тускнеет, если не хватает денег
        if (tonBalance < getCurrentBet()) {
            spinBtn.style.opacity = "0.5";
        } else {
            spinBtn.style.opacity = "1";
        }
    }
    drawWheel(); 
}

// ==========================================
// 5. ЛОГИКА НАГРАДЫ И АНИМАЦИИ
// ==========================================
function handleReward(winner, serverData) {
    resultDisplay.innerText = winner.label;
    
    if (serverData.newBalanceTon !== undefined) tonBalance = parseFloat(serverData.newBalanceTon);
    
    setTimeout(() => {
        tg.showAlert(`🎰 ТВОЙ ПРИЗ: ${winner.label}\n\nБаланс обновлен! 💎`);
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        updateUI();
    }, 500); 
}

async function spin() {
    if (isSpinning) return;
    
    const currentBet = getCurrentBet();
    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.style.opacity = "0.5";
    resultDisplay.innerText = "АУДИТОР ПРОВЕРЯЕТ...";

    // --- 1. ЗАПУСКАЕМ ВРАЩЕНИЕ СРАЗУ (ПРЕДЗАГРУЗКА) ---
    const sectorStep = (Math.PI * 2) / sectors.length;
    let startRotation = currentRotation;
    let duration = 6000; // Увеличим время для ожидания ответа
    let startTime = performance.now();
    let finalRotation = startRotation + (Math.PI * 2 * 15); // Предварительно 15 кругов
    let serverResponded = false;
    let winningIndex = null;
    let serverData = null;

    function animate(currentTime) {
        let progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Если сервер ответил, используем плавный easeOut, если нет - крутим линейно
        let ease = serverResponded ? 1 - Math.pow(1 - progress, 4) : progress; 
        
        currentRotation = startRotation + (finalRotation - startRotation) * ease;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.style.opacity = "1";
            if (winningIndex !== null) {
                currentRotation = finalRotation % (Math.PI * 2);
                handleReward(sectors[winningIndex], serverData);
            } else {
                resultDisplay.innerText = "СБОЙ СВЯЗИ (TIMEOUT)";
            }
        }
    }
    requestAnimationFrame(animate);

    // --- 2. ПАРАЛЛЕЛЬНО ЗАПРАШИВАЕМ N8N ---
    try {
        const userId = (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) || "6750749768";
        const response = await fetch('https://tiktiok.xyz/webhook-test/T-Pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, betAmount: currentBet })
        });

        const data = await response.json();
        console.log("N8N ответил:", data);

        // Достаем индекс (либо из winningIndex, либо из Winner Label)
        let idx = parseInt(data.winningIndex);
        if (isNaN(idx)) {
            const label = data["Winner Label"] || data.label;
            idx = sectors.findIndex(s => s.label === label);
        }

        if (idx !== -1 && !isNaN(idx)) {
            winningIndex = idx;
            serverData = data;
            
            // КОРРЕКТИРУЕМ ФИНАЛЬНУЮ ТОЧКУ НА ЛЕТУ
            const stopAngle = (Math.PI * 1.5) - (winningIndex * sectorStep) - (sectorStep / 2);
            // Пересчитываем finalRotation, чтобы попасть точно в сектор
            finalRotation = currentRotation + (Math.PI * 2 * 4) + (stopAngle - (currentRotation % (Math.PI * 2)));
            duration = (performance.now() - startTime) + 3000; // Даем еще 3 сек на плавный стоп
            serverResponded = true; 
        } else {
            throw new Error("Неверный формат данных от n8n");
        }

    } catch (err) {
        console.error("Ошибка:", err);
        // В случае ошибки просто стопаем где получится через пару секунд
        serverResponded = true;
        duration = (performance.now() - startTime) + 1000;
        resultDisplay.innerText = "ОШИБКА АУДИТОРА";
    }
}

// ==========================================
// 6. ЗАПУСК
// ==========================================
window.onload = () => {
    if(tg.expand) tg.expand();
    
    const dpr = window.devicePixelRatio || 2;
    const containerSize = canvas.parentElement.offsetWidth || 350;
    canvas.width = containerSize * dpr;
    canvas.height = containerSize * dpr;
    canvas.style.width = containerSize + 'px';
    canvas.style.height = containerSize + 'px';
    ctx.scale(dpr, dpr);

    updateUI(); 

    let loaded = 0;
    const total = Object.keys(iconSources).length;
    for (let key in iconSources) {
        images[key] = new Image();
        images[key].src = iconSources[key];
        images[key].onload = () => { 
            if (++loaded === total) drawWheel(); 
        };
        images[key].onerror = () => { 
            if (++loaded === total) drawWheel(); 
        };
    }
};

spinBtn.onclick = spin;