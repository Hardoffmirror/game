// Глобальная переменная для хранения данных билда
let buildData = null;

// Глобальная переменная для визуализатора дерева
let treeVisualizer = null;

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

// Группировка предметов по категориям
function categorizeItems(items) {
    const categories = {
        weapon: { name: '⚔️ Оружие', items: [] },
        armor: { name: '🛡️ Броня', items: [] },
        accessories: { name: '💍 Украшения', items: [] },
        flasks: { name: '⚗️ Фласки', items: [] },
        jewels: { name: '💎 Самоцветы', items: [] },
        other: { name: '📦 Прочее', items: [] }
    };

    items.forEach(item => {
        const slot = item.slot.toLowerCase();

        if (slot.includes('weapon')) {
            categories.weapon.items.push(item);
        } else if (slot.includes('helm') || slot.includes('body') || slot.includes('gloves') ||
                   slot.includes('boots') || slot.includes('shield')) {
            categories.armor.items.push(item);
        } else if (slot.includes('ring') || slot.includes('amulet') || slot.includes('belt')) {
            categories.accessories.items.push(item);
        } else if (slot.includes('flask')) {
            categories.flasks.items.push(item);
        } else if (slot.includes('jewel')) {
            categories.jewels.items.push(item);
        } else {
            categories.other.items.push(item);
        }
    });

    return categories;
}

// Отображение предметов
function displayItems() {
    const itemsContainer = document.getElementById('itemsList');
    itemsContainer.innerHTML = '';

    const categories = categorizeItems(buildData.items);

    // Проходим по всем категориям
    for (const [key, category] of Object.entries(categories)) {
        if (category.items.length > 0) {
            // Создаем заголовок категории
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'item-category-header';
            categoryHeader.innerHTML = `
                <h3>${category.name}</h3>
                <span class="item-count">${category.items.length} предмет(ов)</span>
            `;
            itemsContainer.appendChild(categoryHeader);

            // Создаем контейнер для предметов категории
            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'item-grid';

            category.items.forEach(item => {
                const itemCard = createItemCard(item);
                categoryGrid.appendChild(itemCard);
            });

            itemsContainer.appendChild(categoryGrid);
        }
    }
}

// Создание карточки предмета
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';

    const rarityClass = `rarity-${item.rarity}`;

    card.innerHTML = `
        ${item.icon_url ? `
            <div class="item-icon-wrapper">
                <img src="${item.icon_url}" alt="${escapeHtml(item.name)}" class="item-icon"
                     onerror="handleItemIconError(this, '${escapeHtml(item.slot)}')">
            </div>
        ` : `
            <div class="item-icon-wrapper">
                <div class="item-icon-placeholder">${getItemSlotIcon(item.slot)}</div>
            </div>
        `}
        <div class="item-slot">Слот: ${item.slot}</div>
        ${item.sockets ? `<div class="item-sockets">${renderSockets(item.sockets)}</div>` : ''}
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

// Отрисовка сокетов с правильными цветами
function renderSockets(socketsString) {
    if (!socketsString) return '';

    // Разделяем на группы (пробелы разделяют группы)
    const groups = socketsString.split(' ');

    const socketColors = {
        'R': 'socket-red',      // Красный (Strength)
        'G': 'socket-green',    // Зеленый (Dexterity)
        'B': 'socket-blue',     // Синий (Intelligence)
        'W': 'socket-white',    // Белый (Any)
        'A': 'socket-abyss'     // Abyssal socket
    };

    let html = '<div class="sockets-container">';

    groups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
            // Добавляем разделитель между группами
            html += '<span class="socket-divider">|</span>';
        }

        html += '<div class="socket-group">';

        // Парсим сокеты в группе (разделены дефисом)
        const sockets = group.split('-');
        sockets.forEach((socket, index) => {
            const colorClass = socketColors[socket] || 'socket-default';
            html += `<span class="socket ${colorClass}" title="${getSocketName(socket)}">${socket}</span>`;

            // Добавляем линк между сокетами в группе
            if (index < sockets.length - 1) {
                html += '<span class="socket-link">-</span>';
            }
        });

        html += '</div>';
    });

    html += '</div>';
    return html;
}

// Получить полное название сокета
function getSocketName(socket) {
    const names = {
        'R': 'Red Socket (Strength)',
        'G': 'Green Socket (Dexterity)',
        'B': 'Blue Socket (Intelligence)',
        'W': 'White Socket (Any)',
        'A': 'Abyss Socket'
    };
    return names[socket] || 'Unknown Socket';
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
            ${item.sockets ? `
                <div class="item-detail-row">
                    <span class="item-detail-label">Сокеты:</span>
                    <span class="item-detail-value">${renderSockets(item.sockets)}</span>
                </div>
            ` : ''}
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

    // Определяем название слота
    const slotName = skill.slot || 'Unknown Slot';

    card.innerHTML = `
        <div class="skill-header">
            <div class="skill-label">${skill.label || 'Unnamed Skill'}</div>
            <div class="skill-slot-badge">${slotName}</div>
        </div>
        <div class="gems-grid">
            ${skill.gems.map((gem, idx) => {
                const gemColorClass = getGemColor(gem.attribute || 'int');
                return `
                    <div class="gem-item ${gemColorClass}">
                        <div class="gem-info">
                            <span class="gem-name">${gem.nameSpec}</span>
                            <span class="gem-stats">Lvl: ${gem.level} | Q: ${gem.quality}%</span>
                        </div>
                        <button class="copy-gem-btn" onclick="copyToClipboard('${escapeHtml(gem.nameSpec)}', 'Название камня скопировано!')">📋</button>
                    </div>
                `;
            }).join('')}
        </div>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="copy-btn" onclick="copyAllGems(${JSON.stringify(skill.gems.map(g => g.nameSpec)).replace(/"/g, '&quot;')})">📋 Копировать все камни</button>
        </div>
    `;

    return card;
}

// Копировать все камни из скилла
function copyAllGems(gemNames) {
    const text = gemNames.join('\n');
    copyToClipboard(text, 'Все камни скопированы!');
}

// Отображение дерева
async function displayTree() {
    const treeContainer = document.getElementById('treeInfo');
    const tree = buildData.tree;

    if (!tree.specs || tree.specs.length === 0) {
        treeContainer.innerHTML = '<p>Информация о дереве не найдена</p>';
        return;
    }

    const spec = tree.specs[0];
    const nodes = spec.nodes.filter(n => n && n !== '');
    const nodesCount = nodes.length;

    // Создаем красивую визуализацию
    let html = `
        <div class="tree-overview">
            <div class="tree-stat-card">
                <div class="tree-stat-icon">🌳</div>
                <div class="tree-stat-content">
                    <div class="tree-stat-value">${nodesCount}</div>
                    <div class="tree-stat-label">Всего узлов</div>
                </div>
            </div>

            <div class="tree-stat-card">
                <div class="tree-stat-icon">⚡</div>
                <div class="tree-stat-content">
                    <div class="tree-stat-value">${spec.treeVersion || 'N/A'}</div>
                    <div class="tree-stat-label">Версия дерева</div>
                </div>
            </div>

            <div class="tree-stat-card">
                <div class="tree-stat-icon">👤</div>
                <div class="tree-stat-content">
                    <div class="tree-stat-value">${getClassName(spec.classId)}</div>
                    <div class="tree-stat-label">Класс персонажа</div>
                </div>
            </div>

            <div class="tree-stat-card">
                <div class="tree-stat-icon">🔮</div>
                <div class="tree-stat-content">
                    <div class="tree-stat-value">${getAscendClassName(spec.ascendClassId)}</div>
                    <div class="tree-stat-label">Подкласс</div>
                </div>
            </div>
        </div>

        <div class="tree-visualization-section">
            <h3 style="color: #ffa500; margin: 30px 0 15px 0;">
                <span style="font-size: 1.5em;">🗺️</span> Интерактивная визуализация дерева
            </h3>
            <div class="tree-visual-info">
                <p style="color: #aaa; margin-bottom: 15px;">
                    Дерево пассивных умений содержит <strong style="color: #ffa500;">${nodesCount}</strong> выбранных узлов.
                    Используйте колесо мыши для зума, перетаскивайте для навигации.
                </p>
            </div>

            <div id="tree-canvas-container" style="position: relative; width: 100%; margin-bottom: 20px;">
                <!-- Canvas будет вставлен сюда -->
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                <button class="copy-btn" onclick="centerTreeView()">
                    🎯 Центрировать дерево
                </button>
                <button class="copy-btn" onclick="zoomInTree()">
                    🔍+ Увеличить
                </button>
                <button class="copy-btn" onclick="zoomOutTree()">
                    🔍- Уменьшить
                </button>
            </div>
        </div>

        <div class="tree-nodes-section">
            <h3 style="color: #ffa500; margin: 30px 0 15px 0;">
                <span style="font-size: 1.5em;">📋</span> Список узлов
            </h3>
            <div class="tree-nodes-grid">
                ${nodes.slice(0, 100).map((nodeId, index) => `
                    <div class="tree-node-pill" title="Node ID: ${nodeId}">
                        <span class="node-number">#${index + 1}</span>
                        <span class="node-id">${nodeId}</span>
                    </div>
                `).join('')}
            </div>

            ${nodes.length > 100 ? `
                <div class="tree-more-nodes">
                    <p style="color: #888; text-align: center; margin-top: 20px;">
                        ... и еще ${nodes.length - 100} узлов
                    </p>
                </div>
            ` : ''}
        </div>

        <div class="tree-export-section">
            <h3 style="color: #ffa500; margin: 30px 0 15px 0;">
                <span style="font-size: 1.5em;">🔗</span> Экспорт и планировщики
            </h3>
            <p style="color: #aaa; margin-bottom: 15px;">
                Используйте внешние планировщики для детального просмотра узлов:
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="copy-btn" onclick="copyTreeNodes()">
                    📋 Копировать все ID узлов
                </button>
                <a href="https://www.pathofexile.com/passive-skill-tree" target="_blank" class="trade-btn">
                    🌐 Официальное дерево PoE
                </a>
                <a href="https://poeplanner.com/" target="_blank" class="trade-btn">
                    🔧 PoE Planner
                </a>
                <a href="https://poedb.tw/us/Passive_Skill_Tree" target="_blank" class="trade-btn">
                    📖 PoE DB - База узлов
                </a>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: rgba(255, 165, 0, 0.1); border-radius: 10px; border: 2px solid rgba(255, 165, 0, 0.3);">
                <p style="color: #ddd; font-size: 0.95em;">
                    💡 <strong>Совет:</strong> Наведите курсор на узлы в визуализации для просмотра информации. Зеленые узлы - взятые в вашем билде.
                </p>
            </div>
        </div>
    `;

    treeContainer.innerHTML = html;

    // Инициализируем визуализатор дерева
    const canvasContainer = document.getElementById('tree-canvas-container');
    if (canvasContainer && typeof PassiveTreeVisualizer !== 'undefined') {
        treeVisualizer = new PassiveTreeVisualizer('passiveTreeCanvas', 'tree-canvas-container');
        await treeVisualizer.initialize(canvasContainer, nodes);
    }
}

// Получить название класса по ID
function getClassName(classId) {
    const classes = {
        '0': 'Scion',
        '1': 'Marauder',
        '2': 'Ranger',
        '3': 'Witch',
        '4': 'Duelist',
        '5': 'Templar',
        '6': 'Shadow'
    };
    return classes[classId] || `Class ${classId}`;
}

// Получить название подкласса по ID
function getAscendClassName(ascendClassId) {
    const ascendClasses = {
        '0': 'None',
        '1': 'Juggernaut',
        '2': 'Berserker',
        '3': 'Chieftain',
        '4': 'Raider',
        '5': 'Deadeye',
        '6': 'Pathfinder',
        '7': 'Occultist',
        '8': 'Elementalist',
        '9': 'Necromancer',
        '10': 'Slayer',
        '11': 'Gladiator',
        '12': 'Champion',
        '13': 'Inquisitor',
        '14': 'Hierophant',
        '15': 'Guardian',
        '16': 'Assassin',
        '17': 'Trickster',
        '18': 'Saboteur',
        '19': 'Ascendant'
    };
    return ascendClasses[ascendClassId] || `Ascend ${ascendClassId}`;
}

// Копировать ID узлов дерева
function copyTreeNodes() {
    if (!buildData || !buildData.tree || !buildData.tree.specs || buildData.tree.specs.length === 0) {
        showNotification('Нет данных о дереве', 'error');
        return;
    }

    const spec = buildData.tree.specs[0];
    const nodes = spec.nodes.filter(n => n && n !== '');
    const nodesList = nodes.join(', ');

    copyToClipboard(nodesList, `Скопировано ${nodes.length} узлов!`);
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
    const query = {
        query: {
            name: itemName,
            type: ""
        },
        sort: {
            price: "asc"
        }
    };
    const encodedQuery = encodeURIComponent(JSON.stringify(query));
    return `https://www.pathofexile.com/trade/search/Standard?q=${encodedQuery}`;
}

// Обработка ошибки загрузки иконки предмета
function handleItemIconError(img, slot) {
    // Заменяем на placeholder с иконкой слота
    const placeholder = document.createElement('div');
    placeholder.className = 'item-icon-placeholder';
    placeholder.innerHTML = getItemSlotIcon(slot);
    img.parentElement.replaceChild(placeholder, img);
}

// Получить иконку для слота
function getItemSlotIcon(slot) {
    const slotIcons = {
        'Weapon 1': '⚔️',
        'Weapon 2': '🗡️',
        'Helmet': '🪖',
        'Body Armour': '🛡️',
        'Gloves': '🧤',
        'Boots': '👢',
        'Amulet': '📿',
        'Ring 1': '💍',
        'Ring 2': '💍',
        'Belt': '📿',
        'Flask 1': '⚗️',
        'Flask 2': '⚗️',
        'Flask 3': '⚗️',
        'Flask 4': '⚗️',
        'Flask 5': '⚗️',
        'Jewel': '💎'
    };

    return slotIcons[slot] || '📦';
}

// Функции управления деревом
function centerTreeView() {
    if (treeVisualizer) {
        treeVisualizer.centerTree();
    }
}

function zoomInTree() {
    if (treeVisualizer) {
        treeVisualizer.zoom = Math.min(treeVisualizer.maxZoom, treeVisualizer.zoom * 1.2);
        treeVisualizer.render();
    }
}

function zoomOutTree() {
    if (treeVisualizer) {
        treeVisualizer.zoom = Math.max(treeVisualizer.minZoom, treeVisualizer.zoom / 1.2);
        treeVisualizer.render();
    }
}
