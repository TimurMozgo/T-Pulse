localStorage.clear(); // Эта команда СНЕСЕТ старую память при первой загрузке

const tg = window.Telegram.WebApp;
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultDisplay = document.getElementById('result-display');

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (С ПАМЯТЬЮ) ---
let tonBalance = parseFloat(localStorage.getItem('tonBalance')) || 10000.0; 
let starBalance = parseFloat(localStorage.getItem('starBalance')) || 100.0;
let hasInsurance = false; 
const SPIN_COST = 1.0;
const INSURANCE_COST = 10;

let currentAngle = 0;
let isSpinning = false;
let currentWinner = null;

// --- СЕКТОРА ---
const sectors = [
    { label: "ЛИКВИДАЦИЯ", value: "FULL", visualWeight: 0.6, winChance: 10, type: 'liquis' }, 
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 10, type: 'empty' },
    { label: "1 ЗВЕЗДА", value: "1", visualWeight: 2.0, winChance: 5, type: 'common' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 10, type: 'empty' },
    { label: "3 ЗВЕЗДЫ", value: "3", visualWeight: 1.5, winChance: 3, type: 'common' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 5, type: 'empty' },
    { label: "15 ЗВЕЗД", value: "15", visualWeight: 1.0, winChance: 0.4, type: 'rare' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 5, type: 'empty' },
    { label: "1 ЗВЕЗДА", value: "1", visualWeight: 2.0, winChance: 3, type: 'common' },
    { label: "100 ЗВЕЗД", value: "100", visualWeight: 0.5, winChance: 0.1, type: 'jackpot' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 5, type: 'empty' },
    { label: "5 ЗВЕЗД", value: "5", visualWeight: 1.2, winChance: 1, type: 'rare' },
    { label: "ПРОИГРЫШ", value: "55%", visualWeight: 0.8, winChance: 30, type: 'danger' }, 
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 5, type: 'empty' },
    { label: "1 ЗВЕЗДА", value: "1", visualWeight: 2.0, winChance: 2, type: 'common' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 3, type: 'empty' },
    { label: "3 ЗВЕЗДЫ", value: "3", visualWeight: 1.5, winChance: 1, type: 'common' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 1, type: 'empty' },
    { label: "БОНУС x2", value: "x2", visualWeight: 1.0, winChance: 0.1, type: 'rare' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 0.5, type: 'empty' },
    { label: "1 ЗВЕЗДА", value: "1", visualWeight: 2.0, winChance: 0.5, type: 'common' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 0.3, type: 'empty' },
    { label: "5 ЗВЕЗД", value: "5", visualWeight: 1.2, winChance: 0.1, type: 'rare' },
    { label: "ПУСТО", value: "0", visualWeight: 2.5, winChance: 0.1, type: 'empty' }
];

// --- ОТРИСОВКА ---
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
        
        // --- СОЗДАЕМ ГРАДИЕНТ ДЛЯ КАЖДОЙ КОЛОНКИ ---
        let gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        
        if (s.type === 'liquis') {
            gradient.addColorStop(0, '#330000'); // Черно-красный градиент смерти
            gradient.addColorStop(1, '#000000');
        } else if (s.type === 'danger') {
            gradient.addColorStop(0, '#ff5f6d'); // Яркий красный взрыв
            gradient.addColorStop(1, '#ff0000');
        } else if (s.type === 'jackpot') {
            gradient.addColorStop(0, '#fff9c4'); // Золотой перелив
            gradient.addColorStop(0.5, '#ffcc00');
            gradient.addColorStop(1, '#ff8c00');
        } else if (s.type === 'rare') {
            gradient.addColorStop(0, '#ff8c00'); // Сочный оранжевый
            gradient.addColorStop(1, '#e65100');
        } else if (s.type === 'empty') {
            // Чередуем темные сектора для объема
            if (i % 2 === 0) {
                gradient.addColorStop(0, '#222');
                gradient.addColorStop(1, '#0f0f0f');
            } else {
                gradient.addColorStop(0, '#1a1a1a');
                gradient.addColorStop(1, '#050505');
            }
        } else {
            // Обычные призы (common) - сделаем их ярко-белыми с серым краем
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#cccccc');
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Обводка секторов (сделаем её оранжевой и полупрозрачной)
        ctx.strokeStyle = "rgba(255, 140, 0, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- ТЕКСТ ВНУТРИ ---
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = "right";
        
        // Цвет текста подбираем под фон колонки
        if (s.type === 'liquis' || s.type === 'empty') {
            ctx.fillStyle = "#fff"; 
        } else {
            ctx.fillStyle = "#000"; 
        }
        
        ctx.font = "bold 13px Arial"; // Чуть-чуть увеличил для читаемости
        ctx.fillText(s.label, radius - 15, 5);
        ctx.restore();

        startAngle += arc;
    });
}

// --- ИНТЕРФЕЙС ---
function updateUI() {
    const tonEl = document.getElementById('ton-balance');
    const starEl = document.getElementById('star-balance');
    
    if (tonEl) {
        tonEl.innerText = tonBalance.toFixed(2);
    }
    if (starEl) {
        starEl.innerText = Math.floor(starBalance);
    }
    
    localStorage.setItem('tonBalance', tonBalance.toString());
    localStorage.setItem('starBalance', starBalance.toString());
    
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

// --- ЛОГИКА ИГРЫ ---
function spin() {
    if (isSpinning) return;
    
    if (tonBalance < SPIN_COST) {
        resultDisplay.innerText = "ПОПОЛНИТЕ БАЛАНС";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    // Списание за прокрут происходит СРАЗУ для честности интерфейса
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
        if (progress < 1) requestAnimationFrame(animate);
        else finishSpin();
    }
    requestAnimationFrame(animate);
}

function finishSpin() {
    isSpinning = false;
    spinBtn.disabled = false;

    let type = currentWinner.type;
    let label = currentWinner.label;

    // --- ПРОВЕРКА СТРАХОВКИ ---
    if (hasInsurance) {
        if (type === 'liquis' || type === 'danger') {
            type = 'empty';
            label = "🛡️ СТРАХОВКА СПАСЛА!";
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }
        hasInsurance = false; 
    }

    // --- ЖЕСТКИЙ РАСЧЕТ ИТОГА ---
    if (type === 'liquis') {
        tonBalance = 0; 
        label = "💀 ЛИКВИДАЦИЯ: -100%";
        document.querySelector('.app-container').classList.add('shake-anim');
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');

    } else if (type === 'danger') {
        // Берем 55% от ТОГО, ЧТО ОСТАЛОСЬ после вычета SPIN_COST
        const amountToLose = tonBalance * 0.55;
        tonBalance -= amountToLose;
        label = `⚠️ ПОТЕРЯ: -${amountToLose.toFixed(2)} TON (55%)`;
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');

    } else if (type !== 'empty') {
        const winValue = parseFloat(currentWinner.value) || 0;
        starBalance += winValue;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }

    // ОБНОВЛЯЕМ ЭКРАН И ПАМЯТЬ ПОСЛЕ РАСЧЕТА
    updateUI(); 
    
    resultDisplay.innerText = label;
    resultDisplay.style.color = (type === 'liquis' || type === 'danger') ? "#ff0000" : "#bc13fe";
    
    updateHistory(label, type);
    
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
    if (type === 'empty') color = "#555";

    entry.innerHTML = `<span style="color: ${color}">●</span> ${label}`;
    list.prepend(entry);
    if (list.children.length > 6) list.lastChild.remove();
}

// --- ОТПРАВКА ДАННЫХ В n8n ---
function sendToAuditor(label, type, winValue) {
    const user = tg.initDataUnsafe?.user || {};
    
    const data = {
        userId: user.id || "ID_UNKNOWN",
        username: user.username ? `@${user.username}` : "Anonymous",
        action: "SPIN",
        result: label, // Что выпало (например, "1 ЗВЕЗДА")
        resultType: type, // Категория (rare, liquis и т.д.)
        winAmount: winValue || 0, // Сколько звезд упало
        tonBalance: tonBalance.toFixed(2), // Остаток TON
        starBalance: Math.floor(starBalance), // Остаток Звезд
        insuranceUsed: hasInsurance ? "Да" : "Нет",
        timestamp: new Date().toLocaleString("ru-RU")
    };

    // Твой URL вебхука
    fetch('https://tiktiok.xyz/webhook-test/T-Pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => console.log('Аудитор: Данные записаны'))
    .catch(error => console.error('Аудитор: Ошибка связи', error));
}

// --- ЗАПУСК ---
window.onload = () => {
    if(tg.expand) tg.expand();
    drawWheel();
    updateUI(); 
};

spinBtn.addEventListener('click', spin);
const insBtn = document.getElementById('ins-btn');
if(insBtn) insBtn.addEventListener('click', buyInsurance);
