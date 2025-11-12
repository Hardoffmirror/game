let buildData = null;

document.addEventListener('DOMContentLoaded', function() {
    const parseBtn = document.getElementById('parseBtn');
    parseBtn.addEventListener('click', parseBuild);
});

async function parseBuild() {
    const buildCode = document.getElementById('buildCode').value.trim();
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    errorDiv.style.display = 'none';
    resultsDiv.style.display = 'none';

    if (!buildCode) {
        showError('Введите код билда');
        return;
    }

    loadingDiv.style.display = 'block';

    try {
        const response = await fetch('/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ build_code: buildCode })
        });

        const data = await response.json();

        if (data.success) {
            buildData = data.data;
            displayResults();
            resultsDiv.style.display = 'block';
        } else {
            showError(data.error || 'Ошибка при парсинге');
        }
    } catch (error) {
        showError('Ошибка соединения: ' + error.message);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function displayResults() {
    displayItems();
    displaySkills();
    displayFlasks();
}

// Маппинг слотов на русский
const slotNames = {
    'Weapon 1': 'Оружие 1',
    'Weapon 2': 'Оружие 2',
    'Helmet': 'Шлем',
    'Body Armour': 'Нагрудник',
    'Gloves': 'Перчатки',
    'Boots': 'Ботинки',
    'Amulet': 'Амулет',
    'Ring 1': 'Кольцо 1',
    'Ring 2': 'Кольцо 2',
    'Belt': 'Пояс',
    'Weapon 1 Swap': 'Оружие 1 (своп)',
    'Weapon 2 Swap': 'Оружие 2 (своп)',
    'Flask 1': 'Фласка 1',
    'Flask 2': 'Фласка 2',
    'Flask 3': 'Фласка 3',
    'Flask 4': 'Фласка 4',
    'Flask 5': 'Фласка 5'
};

function displayItems() {
    const container = document.getElementById('itemsList');
    container.innerHTML = '';

    const items = buildData.items.filter(item =>
        !item.slot.toLowerCase().includes('flask')
    );

    items.forEach(item => {
        const card = createItemCard(item);
        container.appendChild(card);
    });
}

function displayFlasks() {
    const container = document.getElementById('flasksList');
    container.innerHTML = '';

    const flasks = buildData.items.filter(item =>
        item.slot.toLowerCase().includes('flask')
    );

    flasks.forEach(flask => {
        const card = createItemCard(flask);
        container.appendChild(card);
    });
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    const rarityClass = `rarity-${item.rarity}`;
    const slotName = slotNames[item.slot] || item.slot;

    // Разделяем моды на категории
    const categorizedMods = categorizeMods(item.mods);

    // Текст для копирования
    const copyText = buildCopyText(item, slotName);

    card.innerHTML = `
        <div class="item-slot-label">${escapeHtml(slotName)}</div>
        ${item.sockets ? `<div class="item-sockets">${renderSockets(item.sockets)}</div>` : ''}
        <div class="item-header">
            <div class="item-name ${rarityClass}">${escapeHtml(item.name)}</div>
            <button class="copy-btn" title="Копировать">📋</button>
        </div>
        ${item.base_type ? `<div class="item-base">${escapeHtml(item.base_type)}</div>` : ''}
        ${renderModsSections(categorizedMods)}
    `;

    // Добавляем обработчик после создания элемента
    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => copyToClipboard(e, copyText));
    }

    return card;
}

function buildCopyText(item, slotName) {
    let text = `${slotName}\n`;
    text += `${item.name}\n`;
    if (item.base_type) text += `${item.base_type}\n`;
    if (item.sockets) text += `Сокеты: ${item.sockets}\n`;
    if (item.mods.length > 0) {
        text += '\nХарактеристики:\n';
        item.mods.forEach(mod => text += `${mod}\n`);
    }
    return text;
}

function categorizeMods(mods) {
    const categories = {
        implicit: [],
        explicit: [],
        crafted: [],
        other: []
    };

    mods.forEach(mod => {
        const lowerMod = mod.toLowerCase();
        if (lowerMod.includes('(implicit)') || lowerMod.includes('(неявное)')) {
            categories.implicit.push(mod.replace(/\(implicit\)/i, '').replace(/\(неявное\)/i, '').trim());
        } else if (lowerMod.includes('(crafted)') || lowerMod.includes('(создано)')) {
            categories.crafted.push(mod.replace(/\(crafted\)/i, '').replace(/\(создано\)/i, '').trim());
        } else if (mod.trim().length > 0 && !mod.includes('Requirements:') && !mod.includes('Item Level:')) {
            categories.explicit.push(mod);
        } else {
            categories.other.push(mod);
        }
    });

    return categories;
}

function renderModsSections(categories) {
    let html = '';

    if (categories.implicit.length > 0) {
        html += `<div class="mods-section implicit-mods">
            ${categories.implicit.map(mod => `<div class="mod-line">${escapeHtml(mod)}</div>`).join('')}
        </div>`;
    }

    if (categories.explicit.length > 0) {
        html += `<div class="mods-section explicit-mods">
            ${categories.explicit.map(mod => `<div class="mod-line">${escapeHtml(mod)}</div>`).join('')}
        </div>`;
    }

    if (categories.crafted.length > 0) {
        html += `<div class="mods-section crafted-mods">
            ${categories.crafted.map(mod => `<div class="mod-line">${escapeHtml(mod)}</div>`).join('')}
        </div>`;
    }

    if (categories.other.length > 0) {
        html += `<div class="mods-section other-mods">
            ${categories.other.map(mod => `<div class="mod-line">${escapeHtml(mod)}</div>`).join('')}
        </div>`;
    }

    return html;
}

function copyToClipboard(event, text) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 1500);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
    });
}

function renderSockets(socketsString) {
    if (!socketsString) return '';

    const groups = socketsString.split(' ');
    const socketColors = {
        'R': 'socket-red',
        'G': 'socket-green',
        'B': 'socket-blue',
        'W': 'socket-white',
        'A': 'socket-abyss'
    };

    let html = '<div class="sockets-container">';

    groups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
            html += '<span class="socket-divider">|</span>';
        }

        html += '<div class="socket-group">';
        const sockets = group.split('-');

        sockets.forEach((socket, index) => {
            const colorClass = socketColors[socket] || 'socket-white';
            html += `<span class="socket ${colorClass}">${socket}</span>`;
            if (index < sockets.length - 1) {
                html += '<span class="socket-link">-</span>';
            }
        });

        html += '</div>';
    });

    html += '</div>';
    return html;
}

function displaySkills() {
    const container = document.getElementById('skillsList');
    container.innerHTML = '';

    if (buildData.skills.length === 0) {
        container.innerHTML = '<p>Камни не найдены</p>';
        return;
    }

    buildData.skills.forEach(skill => {
        const card = createSkillCard(skill);
        container.appendChild(card);
    });
}

function createSkillCard(skill) {
    const card = document.createElement('div');
    card.className = 'skill-card';

    card.innerHTML = `
        <div class="skill-header">
            <div class="skill-label">${escapeHtml(skill.label || 'Камни')}</div>
            <div class="skill-slot">${escapeHtml(skill.slot || '')}</div>
        </div>
        <div class="gems-grid">
            ${skill.gems.map(gem => `
                <div class="gem-item">
                    <div class="gem-name">${escapeHtml(gem.nameSpec)}</div>
                    <div class="gem-stats">Lvl: ${gem.level} | Q: ${gem.quality}%</div>
                </div>
            `).join('')}
        </div>
    `;

    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
