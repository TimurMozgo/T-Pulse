const tg = window.Telegram.WebApp;
tg.expand();

// Данные лидеров (в будущем это будет fetch от твоего n8n)
const leadersData = [
    { name: "Do***on", score: "5.3M", rank: 1, prize: "🎁" },
    { name: "CryptoKing", score: "4.1M", rank: 2, prize: "🎁" },
    { name: "Sharky", score: "2.8M", rank: 3, prize: "🎁" },
    { name: "Wolf_Trade", score: "1.9M", rank: 4, prize: "—" },
    { name: "Bullish_Boy", score: "1.2M", rank: 5, prize: "—" },
    { name: "MoonWalker", score: "850K", rank: 6, prize: "—" },
    { name: "TineLL_Fan", score: "400K", rank: 7, prize: "—" }
];

function initLeaderboard() {
    const listContainer = document.getElementById('leaderboard-list');
    if (!listContainer) return;

    // Очищаем и заполняем
    listContainer.innerHTML = leadersData.map(player => `
        <div class="player-card ${player.rank <= 3 ? 'top-' + player.rank : ''}">
            <div class="rank-badge">${player.rank}</div>
            <div class="player-info">
                <span class="player-name">${player.name}</span>
            </div>
            <div class="player-reward">${player.prize}</div>
            <div class="player-score">${player.score}</div>
        </div>
    `).join('');

    // Устанавливаем твои очки (подтяни из localStorage или n8n)
    const myXp = localStorage.getItem('userXP') || "0";
    document.querySelector('.user-points').innerText = myXp;
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', initLeaderboard);