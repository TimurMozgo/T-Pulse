const tg = window.Telegram.WebApp;
tg.expand();

// СЮДА ВСТАВЬ ССЫЛКУ НА СВОЙ ВЕБХУК В n8n
const N8N_LEADERBOARD_URL = 'https://твой-n8n-webhook.com/get-leaders';

/**
 * Инициализация
 */
async function initLeaderboard() {
    setupCurrentUser();
    await refreshLeaderboard();
    setupHaptics();

    // === ПУЛЬТ УПРАВЛЕНИЯ ТАЙМЕРОМ ===
    
    // Чтобы ВКЛЮЧИТЬ таймер — убери "//" в начале следующей строки:
    // activateTimer(); 
}

function activateTimer() {
    const block = document.getElementById('timer-block');
    if (block) {
        // 1. ОЧИЩАЕМ старую дату, чтобы таймер всегда начинался заново
        localStorage.removeItem('seasonEndTime'); 
        
        // 2. Показываем блок
        block.style.display = 'inline-block'; 
        
        // 3. Запускаем отсчет на свежие 7 дней
        startSeasonTimer(7); 
        
        console.log("Таймер обновлен на 7 дней! 🦾");
    }
}

/**
 * Логика таймера (запоминает дату окончания)
 */
function startSeasonTimer(days) {
    const timerElement = document.getElementById("main-timer");
    if (!timerElement) return;

    // Проверяем, есть ли уже сохраненная дата окончания в памяти
    let endTime = localStorage.getItem('seasonEndTime');

    if (!endTime) {
        // Если зашли первый раз — фиксируем дату финиша (сейчас + 7 дней)
        endTime = new Date().getTime() + (days * 24 * 60 * 60 * 1000);
        localStorage.setItem('seasonEndTime', endTime);
    }

    const timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance <= 0) {
            clearInterval(timerInterval);
            timerElement.innerHTML = "СЕЗОН ОКОНЧЕН";
            return;
        }

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        // Выводим в формате "7д 12ч 30м 15с"
        timerElement.innerHTML = `${d}д ${h}ч ${m}м ${s}с`;
    }, 1000);
}

/**
 * Получение данных из n8n (Твой Аудитор)
 */
async function refreshLeaderboard() {
    const listContainer = document.getElementById('leaderboard-list');
    if (!listContainer) return;

    try {
        const response = await fetch(N8N_LEADERBOARD_URL);
        
        if (!response.ok) throw new Error('Нет ответа');
        
        const realLeaders = await response.json();

        if (realLeaders && realLeaders.length > 0) {
            renderList(realLeaders);
        } else {
            listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#8e8e93; font-weight:700;">Список пуст. Стань первым! 🚀</div>';
        }

    } catch (error) {
        console.error("Ошибка загрузки:", error);
        listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#ff4b4b; font-weight:700;">Ошибка связи ❌</div>';
    }
}

/**
 * Отрисовка списка
 */
function renderList(data) {
    const listContainer = document.getElementById('leaderboard-list');
    
    listContainer.innerHTML = data.map((player, index) => {
        const rank = index + 1;
        const topClass = rank <= 3 ? `top-${rank}` : '';
        
        return `
            <div class="player-card ${topClass}">
                <div class="rank-badge">${rank}</div>
                <div class="player-info">
                    <span class="player-name">${player.username || 'Аноним'}</span>
                </div>
                <div class="player-reward">${rank <= 3 ? '🎁' : '—'}</div>
                <div class="player-score">${formatScore(player.xp)}</div>
            </div>
        `;
    }).join('');
}

/**
 * Данные текущего юзера (внизу)
 */
function setupCurrentUser() {
    const user = tg.initDataUnsafe?.user;
    const nameElement = document.querySelector('.user-label');
    const pointsElement = document.querySelector('.user-points');

    if (user && nameElement) {
        nameElement.innerText = user.first_name || user.username || "Трейдер";
    }

    const myXp = localStorage.getItem('userXP') || "0";
    if (pointsElement) pointsElement.innerText = formatScore(myXp);
}

/**
 * Красивые числа (1.5M, 10K и т.д.)
 */
function formatScore(score) {
    const num = parseInt(score);
    if (isNaN(num)) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Тактильная отдача
 */
function setupHaptics() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        });
    });
}

// Погнали!
document.addEventListener('DOMContentLoaded', initLeaderboard);

