let buildData = null;
let currentLanguage = 'en'; // 'en' или 'ru'

document.addEventListener('DOMContentLoaded', function() {
    const parseBtn = document.getElementById('parseBtn');
    parseBtn.addEventListener('click', parseBuild);

    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }

    // Загружаем сохраненный язык
    const savedLang = localStorage.getItem('poe_language');
    if (savedLang) {
        currentLanguage = savedLang;
        updateLanguageButton();
        if (buildData) {
            displayResults();
        }
    }
});

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ru' : 'en';
    localStorage.setItem('poe_language', currentLanguage);
    updateLanguageButton();

    // Перерисовываем результаты если есть данные
    if (buildData) {
        displayResults();
    }
}

function updateLanguageButton() {
    const langToggle = document.getElementById('langToggle');
    if (!langToggle) return;

    const flag = langToggle.querySelector('.lang-flag');
    const text = langToggle.querySelector('.lang-text');

    if (currentLanguage === 'ru') {
        flag.textContent = '🇷🇺';
        text.textContent = 'RU';
    } else {
        flag.textContent = '🇬🇧';
        text.textContent = 'EN';
    }
}

function applyTranslation(text, category = 'baseTypes') {
    if (currentLanguage === 'en' || !text) return text;
    return window.getTranslation ? window.getTranslation(text, category) : text;
}

function applyModTranslation(modText) {
    if (currentLanguage === 'en' || !modText) return modText;
    return window.translateMod ? window.translateMod(modText) : modText;
}

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
    displayGems();
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

function displayGems() {
    const container = document.getElementById('gemsList');
    container.innerHTML = '';

    if (!buildData.skills || buildData.skills.length === 0) {
        container.innerHTML = '<div class="no-gems">Гемы не найдены</div>';
        return;
    }

    // Фильтруем активные группы гемов
    const activeSkills = buildData.skills.filter(skill =>
        skill.enabled === 'true' && skill.gems && skill.gems.length > 0
    );

    if (activeSkills.length === 0) {
        container.innerHTML = '<div class="no-gems">Гемы не найдены</div>';
        return;
    }

    activeSkills.forEach(skill => {
        const skillCard = createSkillCard(skill);
        container.appendChild(skillCard);
    });
}

function createSkillCard(skill) {
    const card = document.createElement('div');
    card.className = 'skill-card';

    // Определяем название группы
    const skillLabel = skill.label || 'Группа гемов';
    const slotLabel = skill.slot ? ` (${slotNames[skill.slot] || skill.slot})` : '';

    // Текст для копирования всей группы
    const copyText = buildSkillCopyText(skill);

    card.innerHTML = `
        <div class="skill-header">
            <div class="skill-title">${escapeHtml(skillLabel)}${escapeHtml(slotLabel)}</div>
            <button class="copy-btn" title="Копировать">📋</button>
        </div>
        <div class="gems-list">
            ${skill.gems.map(gem => renderGemItem(gem)).join('')}
        </div>
    `;

    // Добавляем обработчик для кнопки копирования
    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => copyToClipboard(e, copyText));
    }

    // Добавляем обработчики для кнопок копирования отдельных гемов
    const gemCopyBtns = card.querySelectorAll('.gem-copy-btn');
    gemCopyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const gemName = btn.getAttribute('data-gem');
            copyToClipboard(e, gemName);
        });
    });

    return card;
}

function renderGemItem(gem) {
    const attribute = gem.attribute || 'int';
    const attributeClass = `gem-${attribute}`;
    const translatedName = applyTranslation(gem.nameSpec, 'gems');

    return `
        <div class="gem-item ${attributeClass}">
            <div class="gem-info">
                <div class="gem-name">${escapeHtml(translatedName)}</div>
                <div class="gem-stats">Lvl ${gem.level} | Q ${gem.quality}%</div>
            </div>
            <button class="gem-copy-btn" data-gem="${escapeHtml(gem.nameSpec)}" title="Копировать название">📋</button>
        </div>
    `;
}

function buildSkillCopyText(skill) {
    let text = `${skill.label || 'Группа гемов'}\n`;
    if (skill.slot) {
        text += `Слот: ${slotNames[skill.slot] || skill.slot}\n`;
    }
    text += '\nГемы:\n';
    skill.gems.forEach(gem => {
        text += `${gem.nameSpec} (Lvl ${gem.level}, Q ${gem.quality}%)\n`;
    });
    return text;
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

    // Проверяем наличие гемов
    const hasGems = item.gems && item.gems.length > 0;

    // Проверяем наличие базовых характеристик
    const hasBaseStats = item.base_stats && Object.keys(item.base_stats).length > 0;

    // Применяем переводы
    const translatedName = applyTranslation(item.name, 'uniqueItems');
    const translatedBaseType = applyTranslation(item.base_type, 'baseTypes');

    card.innerHTML = `
        <div class="item-slot-label">${escapeHtml(slotName)}</div>
        ${item.sockets ? `<div class="item-sockets">${renderSockets(item.sockets)}</div>` : ''}
        <div class="item-header">
            <div class="item-name ${rarityClass}">${escapeHtml(translatedName)}</div>
            <button class="copy-btn" title="Копировать">📋</button>
        </div>
        ${item.base_type ? `<div class="item-base">${escapeHtml(translatedBaseType)}</div>` : ''}
        ${hasBaseStats ? renderBaseStats(item.base_stats) : ''}
        ${renderModsDropdown(categorizedMods)}
        ${hasGems ? renderItemGems(item.gems) : ''}
    `;

    // Добавляем обработчик после создания элемента
    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => copyToClipboard(e, copyText));
    }

    // Добавляем обработчик для выпадающего списка модов
    const modsToggle = card.querySelector('.mods-toggle');
    if (modsToggle) {
        modsToggle.addEventListener('click', function() {
            const modsContent = card.querySelector('.mods-content');
            const isExpanded = modsToggle.classList.contains('expanded');

            if (isExpanded) {
                modsToggle.classList.remove('expanded');
                modsContent.style.maxHeight = '0';
            } else {
                modsToggle.classList.add('expanded');
                modsContent.style.maxHeight = modsContent.scrollHeight + 'px';
            }
        });
    }

    // Добавляем обработчик для выпадающего списка базовых характеристик
    const baseStatsToggle = card.querySelector('.base-stats-toggle');
    if (baseStatsToggle) {
        baseStatsToggle.addEventListener('click', function() {
            const baseStatsContent = card.querySelector('.base-stats-content');
            const isExpanded = baseStatsToggle.classList.contains('expanded');

            if (isExpanded) {
                baseStatsToggle.classList.remove('expanded');
                baseStatsContent.style.maxHeight = '0';
            } else {
                baseStatsToggle.classList.add('expanded');
                baseStatsContent.style.maxHeight = baseStatsContent.scrollHeight + 'px';
            }
        });
    }

    // Добавляем обработчики для кнопок копирования модов
    const modCopyBtns = card.querySelectorAll('.mod-copy-btn');
    modCopyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modText = btn.getAttribute('data-mod');
            copyToClipboard(e, modText);
        });
    });

    // Добавляем обработчики для кнопок копирования гемов
    const gemCopyBtns = card.querySelectorAll('.gem-copy-btn');
    gemCopyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const gemName = btn.getAttribute('data-gem');
            copyToClipboard(e, gemName);
        });
    });

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
        enchant: [],
        explicit_prefix: [],
        explicit_suffix: [],
        explicit: [],
        crafted: [],
        fractured: [],
        synthesised: [],
        veiled: [],
        corrupted: [],
        other: []
    };

    // Если моды приходят как массив объектов с type
    if (mods.length > 0 && typeof mods[0] === 'object' && mods[0].type) {
        mods.forEach(mod => {
            const modType = mod.type;
            const modText = mod.text.replace(/\(implicit\)/i, '')
                                   .replace(/\(неявное\)/i, '')
                                   .replace(/\(crafted\)/i, '')
                                   .replace(/\(создано\)/i, '')
                                   .replace(/\(enchant\)/i, '')
                                   .replace(/\(зачаровано\)/i, '')
                                   .replace(/\(fractured\)/i, '')
                                   .replace(/\(расколото\)/i, '')
                                   .replace(/\(synthesised\)/i, '')
                                   .replace(/\(синтезировано\)/i, '')
                                   .replace(/\(veiled\)/i, '')
                                   .replace(/\(завуалировано\)/i, '')
                                   .trim();

            if (modType === 'corrupted_flag') {
                // Пропускаем флаг corrupted, он будет отображен отдельно
                return;
            }

            if (categories[modType]) {
                categories[modType].push(modText);
            } else {
                categories.other.push(modText);
            }
        });
    } else {
        // Старая логика для обратной совместимости (если приходят строки)
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
    }

    return categories;
}

function renderBaseStats(baseStats) {
    if (!baseStats || Object.keys(baseStats).length === 0) {
        return '';
    }

    // Переводы базовых характеристик
    const translations = {
        'Quality': 'Качество',
        'Armour': 'Броня',
        'Evasion Rating': 'Уклонение',
        'Energy Shield': 'Энергетический щит',
        'Ward': 'Защита',
        'Physical Damage': 'Физический урон',
        'Elemental Damage': 'Стихийный урон',
        'Chaos Damage': 'Урон хаосом',
        'Critical Strike Chance': 'Шанс критического удара',
        'Attacks per Second': 'Атак в секунду',
        'Weapon Range': 'Дальность оружия',
        'Block': 'Блок',
        'Chance to Block': 'Шанс блока',
        'Movement Speed': 'Скорость передвижения',
        'LevelReq': 'Треб. уровень',
        'Requirements': 'Требования',
        'Item Level': 'Уровень предмета',
        'ArmourBasePercentile': 'Броня (процентиль)',
        'EvasionBasePercentile': 'Уклонение (процентиль)',
        'EnergyShieldBasePercentile': 'Эн. щит (процентиль)'
    };

    let html = '<div class="base-stats-dropdown">';
    html += `<div class="base-stats-toggle">
        <span class="base-stats-toggle-text">Базовые характеристики (${Object.keys(baseStats).length})</span>
        <span class="base-stats-toggle-arrow">▼</span>
    </div>`;
    html += '<div class="base-stats-content">';

    for (const [key, value] of Object.entries(baseStats)) {
        // Пропускаем Sockets, т.к. они уже отображены
        if (key === 'Sockets') continue;

        const translatedKey = translations[key] || key;
        html += `<div class="base-stat-line">
            <span class="base-stat-key">${escapeHtml(translatedKey)}:</span>
            <span class="base-stat-value">${escapeHtml(value)}</span>
        </div>`;
    }

    html += '</div></div>';
    return html;
}

function renderModsDropdown(categories) {
    // Подсчитываем общее количество модов
    const totalMods = categories.implicit.length + categories.enchant.length +
                     categories.explicit_prefix.length + categories.explicit_suffix.length +
                     categories.explicit.length + categories.crafted.length +
                     categories.fractured.length + categories.synthesised.length +
                     categories.veiled.length + categories.corrupted.length;

    if (totalMods === 0) {
        return '';
    }

    let html = '<div class="mods-dropdown">';
    html += `<div class="mods-toggle">
        <span class="mods-toggle-text">Характеристики (${totalMods})</span>
        <span class="mods-toggle-arrow">▼</span>
    </div>`;
    html += '<div class="mods-content">';

    // Сортируем и группируем моды по категориям в правильном порядке
    const modsOrder = [
        { key: 'implicit', label: 'Имплиситы (Неявные)', items: categories.implicit, class: 'implicit-mods' },
        { key: 'enchant', label: 'Энчанты', items: categories.enchant, class: 'enchant-mods' },
        { key: 'explicit_prefix', label: 'Префиксы', items: categories.explicit_prefix, class: 'prefix-mods' },
        { key: 'explicit_suffix', label: 'Суффиксы', items: categories.explicit_suffix, class: 'suffix-mods' },
        { key: 'explicit', label: 'Явные моды', items: categories.explicit, class: 'explicit-mods' },
        { key: 'crafted', label: 'Крафтовые', items: categories.crafted, class: 'crafted-mods' },
        { key: 'fractured', label: 'Фрактурные', items: categories.fractured, class: 'fractured-mods' },
        { key: 'synthesised', label: 'Синтезированные', items: categories.synthesised, class: 'synthesised-mods' },
        { key: 'veiled', label: 'Завуалированные', items: categories.veiled, class: 'veiled-mods' },
        { key: 'corrupted', label: 'Корапты', items: categories.corrupted, class: 'corrupted-mods' }
    ];

    modsOrder.forEach(({ label, items, class: className }) => {
        if (items.length > 0) {
            html += `<div class="mods-group">`;
            html += `<div class="mods-group-label">${label}</div>`;
            html += `<div class="mods-section ${className}">`;
            items.forEach(mod => {
                const translatedMod = applyModTranslation(mod);
                html += `<div class="mod-line">
                    <span class="mod-text">${escapeHtml(translatedMod)}</span>
                    <button class="mod-copy-btn" data-mod="${escapeHtml(translatedMod)}" title="Копировать">📋</button>
                </div>`;
            });
            html += `</div></div>`;
        }
    });

    html += '</div></div>';
    return html;
}

function renderItemGems(gemGroups) {
    if (!gemGroups || gemGroups.length === 0) {
        return '';
    }

    let html = '<div class="item-gems-section">';
    html += '<div class="gems-section-title">Вставленные джевелы</div>';

    gemGroups.forEach(group => {
        if (group.gems && group.gems.length > 0) {
            html += '<div class="gems-group">';
            if (group.label) {
                html += `<div class="gems-group-label">${escapeHtml(group.label)}</div>`;
            }
            html += '<div class="gems-list">';

            group.gems.forEach(gem => {
                const attribute = gem.attribute || 'int';
                const attributeClass = `gem-${attribute}`;

                html += `<div class="gem-item ${attributeClass}">
                    <div class="gem-info">
                        <div class="gem-name">${escapeHtml(gem.nameSpec)}</div>
                        <div class="gem-stats">Lvl ${gem.level} | Q ${gem.quality}%</div>
                    </div>
                    <button class="gem-copy-btn" data-gem="${escapeHtml(gem.nameSpec)}" title="Копировать название">📋</button>
                </div>`;
            });

            html += '</div></div>';
        }
    });

    html += '</div>';
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
