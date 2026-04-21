// Функция для связи с n8n в тестовом режиме
async function fetchUserProgress() {
    // Берем ID из Телеграма, а если его нет (тест в браузере) — твой реальный ID
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "6750749768"; 
    
    // Твой ТЕСТОВЫЙ эндпоинт
    const webhookUrl = `https://tiktiok.xyz/webhook-test/get-stats?userId=${userId}`;

    try {
        console.log(`Аудитор: Запрашиваю данные для ID: ${userId}`);
        const response = await fetch(webhookUrl);
        
        if (!response.ok) {
            console.error("Аудитор: Сервер n8n не отвечает. Нажми 'Execute Workflow'!");
            return getDefaultTasks();
        }

        const data = await response.json();
        console.log("Аудитор: Получены данные:", data);

        return [
            { id: 't1', name: "Сделай 10 спинов", reward: "x2 BOOST", current: data.spins || 0, total: 10, type: "Progress" },
            { id: 't2', name: "Пригласи 1 друга", reward: "+2 SPINS", current: data.refs || 0, total: 1, type: "Referrals" },
            { id: 't3', name: "Пригласи 3 друзей", reward: "+5 SPINS", current: data.refs || 0, total: 3, type: "Referrals" }
        ];
    } catch (e) {
        console.error("Аудитор: Ошибка связи. Возможно, n8n не в режиме ожидания.", e);
        return getDefaultTasks();
    }
}

// Заглушка, если данных нет
function getDefaultTasks() {
    return [
        { id: 't1', name: "Сделай 10 спинов", reward: "x2 BOOST", current: 0, total: 10, type: "Progress" },
        { id: 't2', name: "Пригласи 1 друга", reward: "+2 SPINS", current: 0, total: 1, type: "Referrals" },
        { id: 't3', name: "Пригласи 3 друзей", reward: "+5 SPINS", current: 0, total: 3, type: "Referrals" }
    ];
}

// Рендер карточек (твоя проверенная логика)
async function renderTasks() {
    const container = document.getElementById('task-list');
    if (!container) return;

    const tasksData = await fetchUserProgress();

    const categories = {
        "Progress": "📈 ПРОГРЕСС",
        "Referrals": "👥 РЕФЕРАЛЫ"
    };

    let html = '';
    for (let cat in categories) {
        const filteredTasks = tasksData.filter(t => t.type === cat);
        if (filteredTasks.length > 0) {
            html += `<div class="category-group">
                        <div class="category-header">${categories[cat]}</div>`;
            
            filteredTasks.forEach(task => {
                const percent = Math.min((task.current / task.total) * 100, 100);
                html += `
                    <div class="task-card">
                        <div class="task-main">
                            <div class="task-text">
                                <p class="task-name">${task.name}</p>
                                <p class="task-reward">${task.reward}</p>
                            </div>
                            <div class="task-counter">${task.current}/${task.total}</div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${percent}%"></div>
                        </div>
                    </div>`;
            });
            html += `</div>`;
        }
    }
    container.innerHTML = html;
}

// Таймер
function startTimer() {
    const timerEl = document.getElementById('mission-timer');
    if (!timerEl) return;

    const nextUpdate = new Date();
    nextUpdate.setDate(nextUpdate.getDate() + (7 - nextUpdate.getDay()));
    nextUpdate.setHours(0, 0, 0, 0);

    function update() {
        const now = new Date();
        const diff = nextUpdate - now;
        if (diff <= 0) {
            timerEl.innerText = "ОБНОВЛЕНИЕ...";
            return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        timerEl.innerText = `${d}д ${h}ч ${m}м ${s}с`;
    }
    setInterval(update, 1000);
    update();
}

document.addEventListener("DOMContentLoaded", () => {
    renderTasks();
    startTimer();
});