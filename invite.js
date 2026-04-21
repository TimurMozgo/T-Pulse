// 1. Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
const botUsername = 'TinellPulsebot'; // Юзернейм твоего бота

// Элементы интерфейса из твоего HTML
const inviteInput = document.getElementById('node-link'); // Твой текстовый инпут
const copyBtn = document.getElementById('copy-btn');      // Твоя кнопка COPY
const shareBtn = document.querySelector('.connect-btn'); // Твоя большая кнопка ПОДКЛЮЧИТЬ
const refCountEl = document.getElementById('nodes-count'); // Счетчик активных подключений

// Данные пользователя
const user = tg.initDataUnsafe?.user;
const userId = user ? user.id : '777';
const fullInviteLink = `https://t.me/${botUsername}?start=${userId}`;

// 2. Логика генерации ссылки при загрузке
function initInvitePage() {
    tg.ready();
    tg.expand();

    if (inviteInput) {
        inviteInput.value = fullInviteLink;
    }

    // Загружаем статистику из n8n
    loadReferralStats();
}

// 3. Функция копирования (привязана к onclick в HTML и через слушатель для страховки)
function copyNodeLink() {
    if (!inviteInput) return;

    inviteInput.select();
    inviteInput.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(fullInviteLink).then(() => {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = 'DONE';
        copyBtn.style.color = '#00ced1'; // Твой бирюзовый неон
        
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.color = '';
        }, 2000);
    });
}

// 4. Функция Share (привязана к onclick="connectNewNode()")
function connectNewNode() {
    const shareText = `🚀 Подключайся к моей сети узлов в T-PULSE и качай XP вместе со мной!`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(fullInviteLink)}&text=${encodeURIComponent(shareText)}`;
    
    tg.openTelegramLink(shareUrl);
}

// 5. Запрос статистики из n8n (Аудитор проверяет узлы)
async function loadReferralStats() {
    if (!user) return;

    try {
        // ЗАМЕНИ НА СВОЙ РЕАЛЬНЫЙ WEBHOOK n8n
        const response = await fetch(`https://tiktiok.xyz/webhook/get-referrals?userId=${userId}`);
        const data = await response.json();

        // Обновляем количество узлов
        if (refCountEl) {
            refCountEl.innerText = data.count || 0;
        }

        // Если у тебя есть контейнер для списка узлов, можно отрисовать их тут
        const container = document.getElementById('nodes-container');
        if (container && data.referrals) {
            container.innerHTML = data.referrals.map(ref => `
                <div class="node-item">
                    <span>ID: ${ref.id}</span>
                    <span class="status-active">ONLINE</span>
                </div>
            `).join('');
        } else if (container) {
            container.innerHTML = '<div class="loading-nodes">Нет активных сигналов...</div>';
        }

    } catch (e) {
        console.error("Ошибка при загрузке рефералов:", e);
    }
}

// Назначаем функции глобально, чтобы onclick в HTML их видел
window.copyNodeLink = copyNodeLink;
window.connectNewNode = connectNewNode;

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', initInvitePage);