const MAX_SLOTS = 15;

// Пример данных, которые потом прилетят из n8n
const myItems = [
    { id: 1, name: "Кристалл", img: "https://cdn-icons-png.flaticon.com/512/616/616490.png" },
    { id: 2, name: "Меч", img: "https://cdn-icons-png.flaticon.com/512/1065/1065545.png" }
];

function initInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = ''; // Чистим

    for (let i = 0; i < MAX_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.classList.add('slot');

        if (myItems[i]) {
            // Если предмет есть в данных
            slot.classList.add('filled');
            slot.innerHTML = `<img src="${myItems[i].img}" alt="${myItems[i].name}">`;
        } else {
            // Пустой слот
            slot.classList.add('empty');
            slot.innerHTML = `<span style="opacity: 0.1; font-size: 20px;">?</span>`;
        }
        
        grid.appendChild(slot);
    }

    document.getElementById('item-count').innerText = `${myItems.length}/${MAX_SLOTS}`;
}

// Запускаем при загрузке
window.onload = initInventory;