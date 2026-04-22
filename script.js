// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ХРАНИЛИЩЕ
// ==========================================
const tg = window.Telegram.WebApp;
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultDisplay = document.getElementById('result-display');
const timerDisplay = document.getElementById('timer-display'); 

// Балансы берем из localStorage ТОЛЬКО как временный кэш до первого ответа сервера
let tonBalance = parseFloat(localStorage.getItem('tonBalance')) || 0.00;
let starBalance = parseFloat(localStorage.getItem('starBalance')) || 0.0; // Сбросил в 0, чтобы не было "левых" цифр
let xpBalance = parseFloat(localStorage.getItem('xpBalance')) || 0;
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;

const SPIN_COST = 50.0;
let currentRotation = 0; 
let isSpinning = false;
let lastSectorIndex = -1;
const images = {};

// ==========================================
// 2. КОНФИГУРАЦИЯ СЕКТОРОВ
// ==========================================
const iconSources = {
    crown: './image/PNG (6).png', mystery: './image/PNG (7).png', fire: './image/PNG (8).png',
    diamond: './image/PNG (9).png', vortex: './image/PNG (10).png', star: './image/PNG (11).png',
    bull: './image/bull.png', clover: './image/clover.png', hourglass: './image/hourglass.png', 
    phoenix: './image/phoenix.png', wolf: './image/wolf.png'
};

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
// 3. ENGINE ОТРИСОВКИ (Фикс свечения)
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
        
        // Иконки
        const distIcon = radius * 0.75; 
        if (images[sector.id] && images[sector.id].complete) {
            const img = images[sector.id];
            const imgSize = radius * 0.25; 
            ctx.save();
            ctx.translate(center + Math.cos(angle + arc/2) * distIcon, center + Math.sin(angle + arc/2) * distIcon);
            ctx.rotate(angle + arc/2 + Math.PI / 2); 
            ctx.shadowBlur = 10; // Уменьшил блюр, чтобы не было "зеленки"
            ctx.shadowColor = sector.glow;
            ctx.drawImage(img, -imgSize/2, -imgSize/2, imgSize, imgSize);
            ctx.restore();
        }

        // Текст
        ctx.save();
        const distText = radius * 0.45; 
        ctx.translate(center + Math.cos(angle + arc/2) * distText, center + Math.sin(angle + arc/2) * distText);
        ctx.rotate(angle + arc/2); 
        ctx.font = `bold ${Math.floor(size / 40)}px Montserrat`;
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText(sector.label.toUpperCase(), 0, 0);
        ctx.restore();
        ctx.restore();
    });

    // Центральный круг
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#050507";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ced1"; 
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "900 10px Montserrat";
    ctx.textAlign = "center";
    ctx.fillText("TINELL", center, center - 5);
    ctx.fillText("PULSE", center, center + 10);
    ctx.restore();
}

// ==========================================
// 4. ЛОГИКА ОБНОВЛЕНИЯ
// ==========================================
function updateUI() {
    const starEl = document.getElementById('star-balance');
    const tonEl = document.getElementById('ton-balance');

    if (starEl) starEl.innerText = starBalance.toFixed(1);
    if (tonEl) tonEl.innerText = tonBalance.toFixed(2);

    localStorage.setItem('starBalance', starBalance);
    localStorage.setItem('tonBalance', tonBalance);
}

async function spin() {
    if (isSpinning) return;
    isSpinning = true;
    spinBtn.disabled = true;
    resultDisplay.innerText = "СВЯЗЬ С СЕРВЕРОМ...";

    try {
        // ТВОЙ ВЕБХУК
        const response = await fetch('https://tiktiok.xyz/webhook-test/T-Pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: tg.initDataUnsafe?.user?.id || "6750749768", // Твой ID для теста
                username: tg.initDataUnsafe?.user?.username || "tinellton"
            })
        });

        if (!response.ok) throw new Error("n8n Offline");

        const data = await response.json();
        
        // ПРОВЕРКА: Если n8n прислал ошибку внутри
        if (data.winningIndex === undefined) {
             throw new Error("Invalid Data from Server");
        }

        const winningIndex = data.winningIndex;
        const sectorStep = (Math.PI * 2) / sectors.length;
        const extraTurns = Math.PI * 2 * 8; 
        const targetAngle = (Math.PI * 1.5) - (winningIndex * sectorStep + (sectorStep / 2));
        const finalRotation = currentRotation + extraTurns + (targetAngle - (currentRotation % (Math.PI * 2)));

        const duration = 5000;
        const startTime = performance.now();

        function animate(currentTime) {
            let progress = Math.min((currentTime - startTime) / duration, 1);
            let ease = 1 - Math.pow(1 - progress, 4);
            let rotation = currentRotation + (finalRotation - currentRotation) * ease;
            canvas.style.transform = `rotate(${rotation}rad)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                currentRotation = rotation;
                isSpinning = false;
                spinBtn.disabled = false;
                
                // Обновляем баланс из данных n8n
                starBalance = parseFloat(data.newBalanceStars || starBalance);
                tonBalance = parseFloat(data.newBalanceTon || tonBalance);
                resultDisplay.innerText = sectors[winningIndex].label;
                updateUI();
                if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            }
        }
        requestAnimationFrame(animate);

    } catch (err) {
        console.error(err);
        resultDisplay.innerText = "ОШИБКА АУДИТОРА";
        isSpinning = false;
        spinBtn.disabled = false;
        tg.showAlert("Сервер n8n не ответил. Проверь узел Google Sheets!");
    }
}

// ==========================================
// 5. ЗАПУСК
// ==========================================
window.onload = () => {
    if(tg.expand) tg.expand();
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.width;
    
    // Загрузка картинок
    let loaded = 0;
    const total = Object.keys(iconSources).length;
    for (let key in iconSources) {
        images[key] = new Image();
        images[key].src = iconSources[key];
        images[key].onload = () => { if (++loaded === total) drawWheel(); };
    }
    updateUI();
};

spinBtn.onclick = spin;