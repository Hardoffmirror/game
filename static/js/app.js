// Глобальная переменная для хранения данных билда
let buildData = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();

    // Закрытие модального окна по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeItemModal();
        }
    });
});

// Настройка слушателей событий
function setupEventListeners() {
    const parseBtn = document.getElementById('parseBtn');
    const buildCodeInput = document.getElementById('buildCode');

    parseBtn.addEventListener('click', parseBuild);

    // Позволяем парсить по Ctrl+Enter
    buildCodeInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            parseBuild();
        }
    });

    // Настройка вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
}

// Парсинг билда
async function parseBuild() {
    const buildCode = document.getElementById('buildCode').value.trim();
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    // Скрываем предыдущие результаты и ошибки
    errorDiv.style.display = 'none';
    resultsDiv.style.display = 'none';

    if (!buildCode) {
        showError('Пожалуйста, введите код билда');
        return;
    }

    // Показываем загрузку
    loadingDiv.style.display = 'block';

    try {
        const response = await fetch('/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ build_code: buildCode })
        });

        const data = await response.json();

        if (data.success) {
            buildData = data.data;
            displayResults();
            resultsDiv.style.display = 'block';
        } else {
            showError(data.error || 'Произошла ошибка при парсинге');
        }
    } catch (error) {
        showError('Ошибка соединения с сервером: ' + error.message);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Показать ошибку
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Отобразить результаты
function displayResults() {
    displayBuildInfo();
    displayItems();
    displaySkills();
    displayTree();
    displayConfig();
    displayNotes();

    // Показываем первую вкладку
    switchTab('overview');
}

// Переключение вкладок
function switchTab(tabName) {
    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Добавляем активный класс к выбранной вкладке
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Отображение информации о билде
function displayBuildInfo() {
    const info = buildData.build_info;
    document.getElementById('className').textContent = info.className;
    document.getElementById('ascendClass').textContent = info.ascendClassName;
    document.getElementById('level').textContent = info.level;
}

// Отображение предметов
function displayItems() {
    const itemsContainer = document.getElementById('itemsList');
    itemsContainer.innerHTML = '';

    buildData.items.forEach(item => {
        const itemCard = createItemCard(item);
        itemsContainer.appendChild(itemCard);
    });
}

// Создание карточки предмета
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';

    const rarityClass = `rarity-${item.rarity}`;

    card.innerHTML = `
        ${item.icon_url ? `
            <div class="item-icon-wrapper">
                <img src="${item.icon_url}" alt="${escapeHtml(item.name)}" class="item-icon" onerror="this.style.display='none'">
            </div>
        ` : ''}
        <div class="item-slot">Слот: ${item.slot}</div>
        <div class="item-rarity ${rarityClass}">${item.rarity}</div>
        <div class="item-name ${rarityClass}">${item.name}</div>
        ${item.base_type ? `<div class="item-base">${item.base_type}</div>` : ''}
        ${item.mods.length > 0 ? `
            <div class="item-mods">
                ${item.mods.slice(0, 3).map(mod => `<div class="item-mod">• ${escapeHtml(mod)}</div>`).join('')}
                ${item.mods.length > 3 ? `<div class="item-mod">... и еще ${item.mods.length - 3} модов</div>` : ''}
            </div>
        ` : ''}
        <div class="item-click-hint">Нажмите для подробностей</div>
    `;

    // Добавляем обработчик клика для открытия модального окна
    card.addEventListener('click', () => openItemModal(item));

    return card;
}

// Открыть модальное окно с детальной информацией о предмете
function openItemModal(item) {
    const modal = document.getElementById('itemModal');
    const modalName = document.getElementById('modalItemName');
    const modalDetails = document.getElementById('modalItemDetails');

    const rarityClass = `rarity-${item.rarity}`;

    // Устанавливаем название
    modalName.innerHTML = `<span class="${rarityClass}">${escapeHtml(item.name)}</span>`;

    // Формируем детальную информацию
    let detailsHTML = `
        <div class="modal-section">
            ${item.icon_url ? `
                <div class="modal-item-icon-wrapper">
                    <img src="${item.icon_url}" alt="${escapeHtml(item.name)}" class="modal-item-icon" onerror="this.style.display='none'">
                </div>
            ` : ''}
            <h3>Основная информация</h3>
            <div class="item-detail-row">
                <span class="item-detail-label">Слот:</span>
                <span class="item-detail-value">${escapeHtml(item.slot)}</span>
            </div>
            <div class="item-detail-row">
                <span class="item-detail-label">Редкость:</span>
                <span class="item-detail-value ${rarityClass}">${escapeHtml(item.rarity)}</span>
            </div>
            ${item.base_type ? `
                <div class="item-detail-row">
                    <span class="item-detail-label">Базовый тип:</span>
                    <span class="item-detail-value">${escapeHtml(item.base_type)}</span>
                </div>
            ` : ''}
            <div class="modal-action-buttons">
                <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(item.name)}', 'Название скопировано!')">📋 Копировать название</button>
                <a href="${getPoETradeLink(item.name)}" target="_blank" class="trade-btn">🔍 Найти на Trade</a>
            </div>
        </div>
    `;

    // Добавляем моды, если они есть
    if (item.mods.length > 0) {
        detailsHTML += `
            <div class="modal-section">
                <h3>Характеристики и моды</h3>
        `;

        item.mods.forEach((mod, index) => {
            if (mod.trim()) {
                detailsHTML += `
                    <div class="mod-line">
                        <span class="mod-text">${escapeHtml(mod)}</span>
                        <button class="copy-mod-btn" onclick="copyToClipboard('${escapeHtml(mod)}', 'Мод скопирован!')">📋</button>
                    </div>
                `;
            }
        });

        detailsHTML += `
                <button class="copy-btn" style="margin-top: 15px;" onclick="copyAllMods(${JSON.stringify(item.mods).replace(/"/g, '&quot;')})">📋 Копировать все моды</button>
            </div>
        `;
    }

    modalDetails.innerHTML = detailsHTML;

    // Показываем модальное окно
    modal.classList.add('active');

    // Закрытие по клику вне окна
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeItemModal();
        }
    };
}

// Закрыть модальное окно
function closeItemModal() {
    const modal = document.getElementById('itemModal');
    modal.classList.remove('active');
}

// Копировать все моды предмета
function copyAllMods(mods) {
    const text = mods.filter(m => m.trim()).join('\n');
    copyToClipboard(text, 'Все моды скопированы!');
}

// Универсальная функция копирования в буфер обмена
function copyToClipboard(text, successMessage = 'Скопировано!') {
    navigator.clipboard.writeText(text).then(() => {
        showNotification(successMessage);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        showNotification('Ошибка копирования', 'error');
    });
}

// Показать уведомление
function showNotification(message, type = 'success') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#1dd1a1' : '#ff6b6b'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s, fadeOut 0.3s 2.7s;
    `;

    document.body.appendChild(notification);

    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Отображение скиллов
function displaySkills() {
    const skillsContainer = document.getElementById('skillsList');
    skillsContainer.innerHTML = '';

    if (buildData.skills.length === 0) {
        skillsContainer.innerHTML = '<p>Скиллы не найдены</p>';
        return;
    }

    buildData.skills.forEach(skill => {
        const skillCard = createSkillCard(skill);
        skillsContainer.appendChild(skillCard);
    });
}

// Получить цвет для гема по атрибуту
function getGemColor(attribute) {
    const colors = {
        'str': 'gem-str',      // Красный (strength)
        'dex': 'gem-dex',      // Зеленый (dexterity)
        'int': 'gem-int',      // Синий (intelligence)
        'support': 'gem-support' // Бирюзовый (support)
    };
    return colors[attribute] || 'gem-int';
}

// Создание карточки скилла
function createSkillCard(skill) {
    const card = document.createElement('div');
    card.className = 'skill-card';

    card.innerHTML = `
        <div class="skill-label">${skill.label || 'Unnamed Skill'}</div>
        <div class="gems-list">
            ${skill.gems.map(gem => {
                const gemColorClass = getGemColor(gem.attribute || 'int');
                return `
                    <div class="gem-item ${gemColorClass}">
                        <span class="gem-name">${gem.nameSpec}</span>
                        <span class="gem-stats">Lvl: ${gem.level} | Q: ${gem.quality}%</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    return card;
}

// Отображение дерева
function displayTree() {
    const treeContainer = document.getElementById('treeInfo');
    const tree = buildData.tree;

    if (tree.specs.length === 0) {
        treeContainer.innerHTML = '<p>Информация о дереве не найдена</p>';
        return;
    }

    const spec = tree.specs[0];
    const nodesCount = spec.nodes.filter(n => n).length;

    treeContainer.innerHTML = `
        <div class="tree-info">
            <div class="nodes-count">Выбрано узлов: ${nodesCount}</div>
            <div class="config-value">Версия дерева: ${spec.treeVersion}</div>
            <div class="config-value">Class ID: ${spec.classId}</div>
            <div class="config-value">Ascend Class ID: ${spec.ascendClassId}</div>
        </div>
    `;
}

// Отображение конфигурации
function displayConfig() {
    const configContainer = document.getElementById('configList');
    const config = buildData.config;

    if (Object.keys(config).length === 0) {
        configContainer.innerHTML = '<p>Конфигурация не найдена</p>';
        return;
    }

    configContainer.innerHTML = '';
    const configGrid = document.createElement('div');
    configGrid.className = 'config-grid';

    for (const [name, value] of Object.entries(config)) {
        const configItem = document.createElement('div');
        configItem.className = 'config-item';
        configItem.innerHTML = `
            <div class="config-name">${name}</div>
            <div class="config-value">${value}</div>
        `;
        configGrid.appendChild(configItem);
    }

    configContainer.appendChild(configGrid);
}

// Отображение заметок
function displayNotes() {
    const notesContainer = document.getElementById('notesContent');
    const notes = buildData.notes;

    if (!notes || notes.trim() === '') {
        notesContainer.innerHTML = '<p>Заметки отсутствуют</p>';
        return;
    }

    notesContainer.innerHTML = `<div class="notes-content">${escapeHtml(notes)}</div>`;
}


// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Получить ссылку на PoE Trade
function getPoETradeLink(itemName) {
    // Используем официальный trade site
    // Формат: https://www.pathofexile.com/trade/search/Standard?q={"query":{"name":"ItemName"}}
    const encodedName = encodeURIComponent(itemName);
    return `https://www.pathofexile.com/trade/search/Standard?q=${encodedName}`;
}
