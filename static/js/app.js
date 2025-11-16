// PoE Build Converter - Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    const buildCodeTextarea = document.getElementById('buildCode');
    const parseBtn = document.getElementById('parseBtn');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    parseBtn.addEventListener('click', async () => {
        const buildCode = buildCodeTextarea.value.trim();

        if (!buildCode) {
            showError('Пожалуйста, вставьте код билда');
            return;
        }

        hideError();
        showLoading();
        hideResults();

        try {
            const response = await fetch('/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ build_code: buildCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при парсинге билда');
            }

            if (data.success) {
                // Debug: выводим полученные данные в консоль
                console.log('📦 Полученные данные:', data.data);
                console.log('📊 Статистика персонажа:', data.data.character_stats);
                console.log('🔧 Build Info:', data.data.build_info);
                if (data.data.build_info._all_build_attrs) {
                    console.log('🔍 Все атрибуты Build элемента:', data.data.build_info._all_build_attrs);
                }
                displayResults(data.data);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    });
});

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

function hideError() {
    const errorDiv = document.getElementById('error');
    errorDiv.classList.remove('show');
}

function showLoading() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.classList.add('show');
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.classList.remove('show');
}

function showResults() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.classList.add('show');
}

function hideResults() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.classList.remove('show');
}

function displayResults(data) {
    // Объединенная информация о билде и статистика
    displayBuildInfoAndStats(data);

    // Создаем карту камней по слотам
    const gemsBySlot = {};
    if (data.gems) {
        data.gems.forEach(gemGroup => {
            const slot = gemGroup.slot || gemGroup.label;
            if (!gemsBySlot[slot]) {
                gemsBySlot[slot] = [];
            }
            gemsBySlot[slot].push(gemGroup);
        });
    }

    // Экипировка (с камнями)
    displayItems(data.equipment, 'equipmentList', gemsBySlot);

    // Самоцветы (Jewels)
    displayItems(data.jewels, 'jewelsList');

    // Фласки
    displayItems(data.flasks, 'flasksList');

    showResults();
}

function displayBuildInfoAndStats(data) {
    const buildInfo = data.build_info;
    const characterStats = data.character_stats || {};
    const unifiedDiv = document.getElementById('buildInfoStats');

    // Создаем URL для картинки подкласса
    const ascendancyImage = getAscendancyImage(buildInfo.ascendClassName);

    // Получаем URL картинки класса
    const classImage = getClassImage(buildInfo.className);

    // Подсчитываем статистику
    const stats = {
        equipment: { total: 0, unique: 0, rare: 0, magic: 0, normal: 0 },
        jewels: { total: 0, unique: 0, rare: 0, magic: 0, normal: 0 },
        flasks: { total: 0, unique: 0, rare: 0, magic: 0, normal: 0 },
        total: { total: 0, unique: 0, rare: 0, magic: 0, normal: 0 }
    };

    const countItems = (items, category) => {
        if (!items) return;
        items.forEach(item => {
            stats[category].total++;
            stats.total.total++;

            const rarity = item.rarity ? item.rarity.toLowerCase() : '';
            if (rarity.includes('unique')) {
                stats[category].unique++;
                stats.total.unique++;
            } else if (rarity.includes('rare')) {
                stats[category].rare++;
                stats.total.rare++;
            } else if (rarity.includes('magic')) {
                stats[category].magic++;
                stats.total.magic++;
            } else {
                stats[category].normal++;
                stats.total.normal++;
            }
        });
    };

    countItems(data.equipment, 'equipment');
    countItems(data.jewels, 'jewels');
    countItems(data.flasks, 'flasks');

    // Создаем HTML для статистики персонажа
    const charStatsHtml = createCharacterStatsHtml(characterStats);

    // Создаем HTML для конфига, бандита и пантеона
    const configHtml = createConfigHtml(buildInfo, characterStats);

    // Объединенная верстка
    unifiedDiv.innerHTML = `
        <div class="build-info-stats-combined">
            <div class="build-header">
                <div class="class-images">
                    ${classImage ? `<img src="${classImage}" class="class-icon" alt="${escapeHtml(buildInfo.className)}" onerror="this.style.display='none'">` : ''}
                    ${ascendancyImage ? `<img src="${ascendancyImage}" class="ascendancy-icon-large" alt="${escapeHtml(buildInfo.ascendClassName)}" onerror="this.style.display='none'">` : ''}
                </div>
                <div class="build-details">
                    <div class="build-class-name">${escapeHtml(buildInfo.className)}${buildInfo.ascendClassName && buildInfo.ascendClassName !== 'None' ? ` - ${escapeHtml(buildInfo.ascendClassName)}` : ''}</div>
                    <div class="build-level-info">Уровень ${escapeHtml(buildInfo.level)}${buildInfo.league && buildInfo.league !== 'Unknown' ? ` | Лига: ${escapeHtml(buildInfo.league)}` : ''}</div>
                </div>
            </div>
            ${charStatsHtml}
            ${configHtml}
            <div class="stats-section">
                <div class="stats-title">📊 Статистика предметов</div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Всего:</span>
                        <span class="stat-value">${stats.total.total}</span>
                    </div>
                    ${stats.total.unique > 0 ? `
                    <div class="stat-item">
                        <span class="stat-label rarity-unique-text">Уникальных:</span>
                        <span class="stat-value">${stats.total.unique}</span>
                    </div>
                    ` : ''}
                    ${stats.total.rare > 0 ? `
                    <div class="stat-item">
                        <span class="stat-label rarity-rare-text">Редких:</span>
                        <span class="stat-value">${stats.total.rare}</span>
                    </div>
                    ` : ''}
                    ${stats.equipment.total > 0 ? `
                    <div class="stat-item">
                        <span class="stat-label">⚔️ Экипировка:</span>
                        <span class="stat-value">${stats.equipment.total}</span>
                    </div>
                    ` : ''}
                    ${stats.jewels.total > 0 ? `
                    <div class="stat-item">
                        <span class="stat-label">💎 Самоцветы:</span>
                        <span class="stat-value">${stats.jewels.total}</span>
                    </div>
                    ` : ''}
                    ${stats.flasks.total > 0 ? `
                    <div class="stat-item">
                        <span class="stat-label">🧪 Фласки:</span>
                        <span class="stat-value">${stats.flasks.total}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function createCharacterStatsHtml(stats) {
    if (!stats) return '';

    // Создаем строки статистики
    const statLines = [];

    // Life
    if (stats.life) {
        statLines.push(`Life: ${stats.life}`);
    }

    // ES
    if (stats.es) {
        statLines.push(`ES: ${stats.es}`);
    }

    // Mana
    if (stats.mana) {
        statLines.push(`Mana: ${stats.mana}`);
    }

    // eHP
    if (stats.ehp) {
        statLines.push(`eHP: ${formatNumber(stats.ehp)}`);
    }

    // Resistances
    if (stats.resistances) {
        const resists = stats.resistances;
        if (resists.fire || resists.cold || resists.lightning || resists.chaos) {
            const resistParts = [];
            if (resists.fire) resistParts.push(`Fire ${resists.fire}%`);
            if (resists.cold) resistParts.push(`Cold ${resists.cold}%`);
            if (resists.lightning) resistParts.push(`Lightning ${resists.lightning}%`);
            if (resists.chaos) resistParts.push(`Chaos ${resists.chaos}%`);
            statLines.push(`Resistances: ${resistParts.join(' | ')}`);
        }
    }

    // Evade
    if (stats.evade_chance) {
        statLines.push(`Evade: ${stats.evade_chance}%`);
    }

    // DPS
    if (stats.dps) {
        statLines.push(`DPS: ${formatNumber(stats.dps)}`);
    }

    // Speed
    if (stats.speed) {
        statLines.push(`Speed: ${stats.speed}`);
    }

    // Hit Chance
    if (stats.hit_chance) {
        statLines.push(`Hit Chance: ${stats.hit_chance}%`);
    }

    // Crit Chance
    if (stats.crit_chance) {
        statLines.push(`Crit: ${stats.crit_chance}%`);
    }

    // Crit Multi
    if (stats.crit_multi) {
        statLines.push(`Crit Multi: ${stats.crit_multi}%`);
    }

    if (statLines.length === 0) {
        // Если нет статистики, показываем заметку
        return `
            <div class="character-stats-section">
                <div class="stats-title">⚔️ Статистика персонажа</div>
                <div class="char-stat-item" style="font-style: italic; color: #999;">
                    Статистика не доступна в экспортированном билде. Откройте билд в Path of Building для просмотра.
                </div>
            </div>
        `;
    }

    return `
        <div class="character-stats-section">
            <div class="stats-title">⚔️ Статистика персонажа</div>
            <div class="character-stats-grid">
                ${statLines.map(line => `<div class="char-stat-item">${escapeHtml(line)}</div>`).join('')}
            </div>
        </div>
    `;
}

function createConfigHtml(buildInfo, characterStats) {
    const parts = [];

    // Config
    if (characterStats.config && characterStats.config.length > 0) {
        parts.push(`Config: ${characterStats.config.join(', ')}`);
    }

    // Bandit
    if (buildInfo.bandit && buildInfo.bandit !== 'None') {
        parts.push(`Bandit: ${buildInfo.bandit}`);
    }

    // Pantheon
    if (characterStats.pantheon) {
        const pantheonParts = [];
        if (characterStats.pantheon.major) {
            pantheonParts.push(characterStats.pantheon.major);
        }
        if (characterStats.pantheon.minor) {
            pantheonParts.push(characterStats.pantheon.minor);
        }
        if (pantheonParts.length > 0) {
            parts.push(`Pantheon: ${pantheonParts.join(', ')}`);
        }
    }

    if (parts.length === 0) return '';

    return `
        <div class="config-section">
            <div class="config-text">${parts.map(p => escapeHtml(p)).join(' | ')}</div>
        </div>
    `;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function getClassImage(className) {
    if (!className) return null;

    // Используем PoE Wiki для иконок классов - более надежный источник
    const classImageMap = {
        'Marauder': 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9TdXBwb3J0L1N0cmVuZ3RoIiwicyI6MC41fV0/9f2c4a28c0/Strength.png',
        'Ranger': 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9TdXBwb3J0L0RleHRlcml0eSIsInMiOjAuNX1d/a6f2b03ad1/Dexterity.png',
        'Witch': 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9TdXBwb3J0L0ludGVsbGlnZW5jZSIsInMiOjAuNX1d/5b53c20e8e/Intelligence.png',
        'Duelist': 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9TdXBwb3J0L1N0cmVuZ3RoRGV4dGVyaXR5IiwicyI6MC41fV0/8b0e3a5994/StrengthDexterity.png',
        'Templar': 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9TdXBwb3J0L1N0cmVuZ3RoSW50ZWxsaWdlbmNlIiwicyI6MC41fV0/f0dc2f1814/StrengthIntelligence.png',
        'Shadow': 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9TdXBwb3J0L0RleHRlcml0eUludGVsbGlnZW5jZSIsInMiOjAuNX1d/f3db06de9e/DexterityIntelligence.png',
        'Scion': 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9TdXBwb3J0L1N0cmVuZ3RoRGV4dGVyaXR5SW50ZWxsaWdlbmNlIiwicyI6MC41fV0/8e5e3e3d3f/StrengthDexterityIntelligence.png'
    };

    return classImageMap[className] || null;
}

function getAscendancyImage(ascendClassName) {
    if (!ascendClassName || ascendClassName === 'None') return null;

    // Маппинг подклассов к их иконкам
    const ascendancyMap = {
        'Juggernaut': 'Juggernaut',
        'Berserker': 'Berserker',
        'Chieftain': 'Chieftain',
        'Raider': 'Raider',
        'Deadeye': 'Deadeye',
        'Pathfinder': 'Pathfinder',
        'Occultist': 'Occultist',
        'Elementalist': 'Elementalist',
        'Necromancer': 'Necromancer',
        'Slayer': 'Slayer',
        'Gladiator': 'Gladiator',
        'Champion': 'Champion',
        'Inquisitor': 'Inquisitor',
        'Hierophant': 'Hierophant',
        'Guardian': 'Guardian',
        'Assassin': 'Assassin',
        'Trickster': 'Trickster',
        'Saboteur': 'Saboteur',
        'Ascendant': 'Ascendant'
    };

    const imageName = ascendancyMap[ascendClassName];
    if (!imageName) return null;

    return `https://web.poecdn.com/image/Art/2DArt/UIImages/InGame/AscendancyClassesIcons/${imageName}.png`;
}

function displayItems(items, containerId, gemsBySlot = {}) {
    const container = document.getElementById(containerId);

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-message">Нет предметов в этой категории</div>';
        return;
    }

    container.innerHTML = items.map(item => createItemCard(item, gemsBySlot)).join('');
}

function getItemIcon(item) {
    // Отображаем иконки для ВСЕХ предметов
    if (!item.name) return null;

    const isUnique = item.rarity && item.rarity.toLowerCase().includes('unique');
    const isFlask = item.slot && item.slot.toLowerCase().includes('flask');
    const isJewel = item.slot && item.slot.toLowerCase().includes('jewel');

    // Для обычных/magic/rare предметов используем base_type
    let itemName = item.name;
    if (!isUnique && item.base_type) {
        itemName = item.base_type;
    }

    // Создаем упрощенное имя для поиска изображения
    let simplifiedName = itemName
        .replace(/^The\s+/i, '')  // Убираем "The" в начале
        .replace(/[''`´']/g, '')  // Убираем все виды апострофов
        .replace(/[^\w\s-]/g, '')  // Убираем все кроме букв, цифр, пробелов и дефисов
        .replace(/\s+/g, '')  // Убираем все пробелы
        .replace(/-+/g, '');  // Убираем дефисы

    // Получаем категорию предмета
    const category = getItemCategory(item);

    // Формируем URL для изображения
    const imageUrl = `https://web.poecdn.com/image/Art/2DItems/${category}/${simplifiedName}.png`;

    return imageUrl;
}

function getItemCategory(item) {
    const slot = item.slot ? item.slot.toLowerCase() : '';
    const basetype = item.base_type ? item.base_type.toLowerCase() : '';
    const name = item.name ? item.name.toLowerCase() : '';

    // Flask проверка
    if (slot.includes('flask') || basetype.includes('flask') || name.includes('flask')) {
        return 'Flasks';
    }

    // Jewel проверка
    if (slot.includes('jewel') || basetype.includes('jewel') || name.includes('jewel')) {
        return 'Jewels';
    }

    if (slot.includes('amulet')) return 'Amulets';
    if (slot.includes('ring')) return 'Rings';
    if (slot.includes('belt')) return 'Belts';
    if (slot.includes('helmet') || slot.includes('helm')) return 'Armours/Helmets';
    if (slot.includes('body') || slot.includes('chest')) return 'Armours/BodyArmours';
    if (slot.includes('gloves')) return 'Armours/Gloves';
    if (slot.includes('boots')) return 'Armours/Boots';
    if (slot.includes('weapon') || basetype.includes('sword') || basetype.includes('axe') ||
        basetype.includes('mace') || basetype.includes('bow') || basetype.includes('wand') ||
        basetype.includes('dagger') || basetype.includes('claw') || basetype.includes('sceptre')) {
        return 'Weapons';
    }
    if (slot.includes('shield')) return 'Armours/Shields';
    if (slot.includes('quiver')) return 'Quivers';

    return 'Currency';
}

function createItemCard(item, gemsBySlot = {}) {
    const rarityClass = getRarityClass(item.rarity);
    const isFlask = item.slot && item.slot.toLowerCase().includes('flask');

    // Получаем камни для этого слота
    const itemGems = gemsBySlot[item.slot] || [];

    // Функция для отображения мода (может быть объект или строка)
    const renderMod = (mod) => {
        if (typeof mod === 'object' && mod.text) {
            return escapeHtml(mod.text);
        }
        return escapeHtml(mod);
    };

    // Извлечь уровень, сокеты и важные характеристики из properties
    let itemLevel = '';
    let socketsHtml = '';
    const headerProperties = {};  // Характеристики для header (Armour, Quality и т.д.)
    const filteredProperties = {};  // Остальные свойства

    // Список ключевых характеристик для вывода в header
    const headerPropertyKeys = ['Armour', 'Evasion', 'Energy Shield', 'Quality', 'Physical Damage',
                                'Elemental Damage', 'Critical Strike Chance', 'Attacks per Second',
                                'Cast Time', 'Block'];

    if (item.properties) {
        Object.entries(item.properties).forEach(([key, value]) => {
            // Извлекаем уровень предмета
            if (key === 'Item Level') {
                itemLevel = value;
                return;
            }
            // Обрабатываем сокеты отдельно
            if (key === 'Sockets') {
                socketsHtml = createSocketsDisplay(value);
                return;
            }
            // Разделяем на header properties и обычные
            if (headerPropertyKeys.includes(key)) {
                headerProperties[key] = value;
            } else {
                filteredProperties[key] = value;
            }
        });
    }

    // Свойства предмета (урон, защита, и т.д.) - без Unique ID, Item Level и Sockets
    const propertiesHtml = Object.keys(filteredProperties).length > 0
        ? `
            <div class="item-properties">
                ${Object.entries(filteredProperties).map(([key, value]) =>
                    `<div class="property"><span class="property-name">${escapeHtml(key)}:</span> ${escapeHtml(value)}</div>`
                ).join('')}
            </div>
        `
        : '';

    // Требования
    const requirementsHtml = item.requirements && Object.keys(item.requirements).length > 0
        ? `
            <div class="item-requirements">
                <div class="requirements-title">Requirements:</div>
                ${Object.entries(item.requirements).map(([key, value]) =>
                    `<div class="requirement">${escapeHtml(key)}: ${escapeHtml(value)}</div>`
                ).join('')}
            </div>
        `
        : '';

    // Имплициты
    const implicitsHtml = item.implicits && item.implicits.length > 0
        ? `
            <div class="mod-section">
                ${item.implicits.map(mod => `<div class="mod-line mod-implicit copyable" onclick="copyToClipboard('${escapeForAttribute(renderMod(mod))}')">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Enchant моды
    const enchantModsHtml = item.enchant_mods && item.enchant_mods.length > 0
        ? `
            <div class="mod-section">
                ${item.enchant_mods.map(mod => `<div class="mod-line mod-enchant copyable" onclick="copyToClipboard('${escapeForAttribute(renderMod(mod))}')">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Префиксы
    const prefixesHtml = item.prefixes && item.prefixes.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Префиксы:</div>
                ${item.prefixes.map(mod => `<div class="mod-line mod-prefix copyable" onclick="copyToClipboard('${escapeForAttribute(renderMod(mod))}')">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Суффиксы
    const suffixesHtml = item.suffixes && item.suffixes.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Суффиксы:</div>
                ${item.suffixes.map(mod => `<div class="mod-line mod-suffix copyable" onclick="copyToClipboard('${escapeForAttribute(renderMod(mod))}')">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Крафтовые моды
    const craftedModsHtml = item.crafted_mods && item.crafted_mods.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Крафтовые:</div>
                ${item.crafted_mods.map(mod => `<div class="mod-line mod-crafted copyable" onclick="copyToClipboard('${escapeForAttribute(renderMod(mod))}')">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Fractured моды
    const fracturedModsHtml = item.fractured_mods && item.fractured_mods.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Fractured:</div>
                ${item.fractured_mods.map(mod => `<div class="mod-line mod-fractured copyable" onclick="copyToClipboard('${escapeForAttribute(renderMod(mod))}')">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Остальные эксплициты (если не были классифицированы)
    const explicitsHtml = item.explicits && item.explicits.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Моды:</div>
                ${item.explicits.map(mod => `<div class="mod-line mod-explicit copyable" onclick="copyToClipboard('${escapeForAttribute(renderMod(mod))}')">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Corrupted и Mirrored
    const statusHtml = [];
    if (item.corrupted) {
        statusHtml.push('<div class="item-status corrupted">Corrupted</div>');
    }
    if (item.mirrored) {
        statusHtml.push('<div class="item-status mirrored">Mirrored</div>');
    }

    // Создаем ссылку на trade
    const tradeUrl = createTradeUrl(item);
    const tradeLink = tradeUrl ? `<a href="${tradeUrl}" target="_blank" class="trade-link" title="Искать на trade">🔗</a>` : '';

    // Создаем HTML для header properties
    const headerPropsHtml = Object.keys(headerProperties).length > 0
        ? `<div class="item-header-props">
            ${Object.entries(headerProperties).map(([key, value]) =>
                `<span class="header-prop"><span class="prop-key">${escapeHtml(key)}:</span> ${escapeHtml(value)}</span>`
            ).join('')}
        </div>`
        : '';

    // Иконка предмета
    const itemIcon = getItemIcon(item);
    const itemIconHtml = itemIcon ? `
        <div class="item-icon-wrapper">
            <img src="${itemIcon}" class="item-icon" alt="${escapeHtml(item.name)}"
                 onerror="handleImageError(this, '${escapeForAttribute(item.name)}', '${escapeForAttribute(item.base_type || '')}', '${escapeForAttribute(item.slot || '')}')">
        </div>
    ` : '';

    // Отображаем камни для этого предмета
    const gemsHtml = itemGems.length > 0 ? createGemsDisplay(itemGems) : '';

    return `
        <div class="item-card ${rarityClass}">
            <div class="item-card-top">
                <div class="item-slot">${escapeHtml(item.slot)}${itemLevel ? ` | iLvl ${escapeHtml(itemLevel)}` : ''}</div>
                ${itemIconHtml}
            </div>
            <div class="item-header">
                <div class="item-name-wrapper">
                    <div class="item-name ${rarityClass} copyable" onclick="copyToClipboard('${escapeForAttribute(item.name)}')" title="Нажмите, чтобы скопировать">${escapeHtml(item.name)}</div>
                    ${tradeLink}
                </div>
                <div class="item-header-right">
                    ${headerPropsHtml}
                </div>
            </div>
            ${item.base_type && item.base_type !== item.name ? `<div class="item-base-type copyable" onclick="copyToClipboard('${escapeForAttribute(item.base_type)}')">${escapeHtml(item.base_type)}</div>` : ''}
            ${socketsHtml}
            ${gemsHtml}
            ${propertiesHtml}
            ${requirementsHtml}
            <div class="item-mods">
                ${enchantModsHtml}
                ${implicitsHtml}
                ${prefixesHtml}
                ${suffixesHtml}
                ${craftedModsHtml}
                ${fracturedModsHtml}
                ${explicitsHtml}
            </div>
            ${statusHtml.join('')}
        </div>
    `;
}

function createGemsDisplay(gemGroups) {
    const gemsHtml = gemGroups.map(gemGroup => {
        const gems = gemGroup.gems.map(gem => {
            const details = `Lvl ${gem.level} | Q ${gem.quality}%`;
            const gemColor = getGemColor(gem.nameSpec);

            return `
                <div class="gem-item copyable" onclick="copyToClipboard('${escapeForAttribute(gem.nameSpec)}')" title="Нажмите, чтобы скопировать">
                    <span class="gem-name" style="color: ${gemColor};">${escapeHtml(gem.nameSpec)}</span>
                    <span class="gem-details">${details}</span>
                </div>
            `;
        }).join('');

        return gems;
    }).join('');

    return `<div class="item-gems">${gemsHtml}</div>`;
}

function getGemColor(gemName) {
    if (!gemName) return '#e8e8e8';

    const nameLower = gemName.toLowerCase();

    // Support gems (обычно белые или с оттенком)
    if (nameLower.includes('support') || nameLower.includes('awakened')) {
        return '#88ddff';  // Яркий голубой для support
    }

    // Красные (Strength) камни - физический урон, огонь, ближний бой
    const redKeywords = ['molten', 'fire', 'burning', 'flame', 'infernal', 'magma', 'volcanic',
        'anger', 'determination', 'vitality', 'purity of fire', 'herald of ash',
        'cleave', 'ground slam', 'heavy strike', 'shield charge', 'leap slam',
        'earthquake', 'sunder', 'ancestral', 'warchief', 'protector',
        'enduring cry', 'immortal call', 'rallying cry', 'blood rage',
        'melee', 'slam', 'smite', 'dominating blow', 'consecrated path',
        'cyclone', 'bladestorm', 'lacerate', 'reave', 'static strike',
        'infused channelling', 'perforate', 'boneshatter', 'general'];

    // Зеленые (Dexterity) камни - проджектайлы, яды, ловушки
    const greenKeywords = ['split arrow', 'ice shot', 'tornado shot', 'rain of arrows',
        'barrage', 'blast rain', 'caustic arrow', 'toxic rain', 'scourge arrow',
        'viper strike', 'pestilent strike', 'cobra lash', 'plague bearer',
        'grace', 'haste', 'precision', 'herald of agony', 'herald of ice',
        'toxic', 'poison', 'venom', 'viper', 'plague', 'caustic',
        'trap', 'mine', 'bear trap', 'lightning arrow', 'explosive arrow',
        'puncture', 'frenzy', 'double strike', 'dual strike', 'flicker strike',
        'whirling blades', 'blink arrow', 'mirror arrow', 'dash', 'spectral throw',
        'ballista', 'artillery'];

    // Синие (Intelligence) камни - холод, молния, заклинания, миньоны
    const blueKeywords = ['cold', 'ice', 'frost', 'freeze', 'glacial', 'arctic', 'frostbite',
        'clarity', 'discipline', 'wrath', 'zealotry', 'purity of ice', 'purity of lightning',
        'herald of thunder', 'freezing pulse', 'frostbolt', 'ice nova', 'vortex',
        'cold snap', 'spark', 'ball lightning', 'arc', 'storm', 'lightning', 'shock',
        'wave of conviction', 'orb of storms', 'discharge', 'firestorm', 'flameblast',
        'raise zombie', 'raise spectre', 'summon', 'animate', 'skeletons', 'carrion',
        'stone golem', 'chaos golem', 'flame golem', 'ice golem', 'lightning golem',
        'blade vortex', 'ethereal knives', 'bladefall', 'blade blast',
        'power siphon', 'kinetic blast', 'storm brand', 'armageddon brand',
        'voltaxic burst', 'hydrosphere', 'orb', 'nova', 'pulse'];

    // Проверяем ключевые слова для красных
    for (const keyword of redKeywords) {
        if (nameLower.includes(keyword)) return '#ff4444';  // Яркий красный
    }

    // Проверяем ключевые слова для зеленых
    for (const keyword of greenKeywords) {
        if (nameLower.includes(keyword)) return '#44ff44';  // Яркий зеленый
    }

    // Проверяем ключевые слова для синих
    for (const keyword of blueKeywords) {
        if (nameLower.includes(keyword)) return '#4488ff';  // Яркий синий
    }

    // По умолчанию белый (для гибридных и неизвестных)
    return '#e8e8e8';
}

function createTradeUrl(item) {
    // Текущая лига (можно будет сделать динамической позже)
    const currentLeague = 'Kreepers';  // TODO: сделать динамическим

    if (!item.name) return null;

    const isJewel = item.slot && (item.slot.toLowerCase().includes('jewel') ||
                                  item.slot.toLowerCase().includes('abyssal'));

    // For unique items, search by name
    if (item.rarity && item.rarity.toLowerCase().includes('unique')) {
        const query = encodeURIComponent(JSON.stringify({
            "query": {
                "name": item.name
            }
        }));
        return `https://www.pathofexile.com/trade/search/${currentLeague}?q=${query}`;
    }

    // For jewels (rare/magic), add stats to search
    if (isJewel && item.rarity && (item.rarity.toLowerCase().includes('rare') ||
                                    item.rarity.toLowerCase().includes('magic'))) {
        const queryObj = {
            "query": {
                "type": item.base_type || item.name,
                "filters": {},
                "stats": [{"type": "and", "filters": []}]
            }
        };

        // Собираем все моды для поиска (префиксы, суффиксы, explicits)
        const allMods = [
            ...(item.prefixes || []),
            ...(item.suffixes || []),
            ...(item.explicits || []),
            ...(item.implicits || [])
        ];

        // Добавляем моды в поиск (максимум 6-8 модов для лучшего результата)
        const modsToSearch = allMods.slice(0, 6);
        modsToSearch.forEach(mod => {
            const modText = typeof mod === 'object' ? mod.text : mod;
            if (modText && modText.trim()) {
                // Упрощаем текст мода для поиска - убираем числа и лишние символы
                const simplifiedMod = modText.replace(/[\d.+#%-]+/g, '#').trim();
                queryObj.query.stats[0].filters.push({
                    "id": "",
                    "value": {"min": null, "max": null},
                    "disabled": false,
                    "text": simplifiedMod
                });
            }
        });

        // Добавляем фильтр по item level если есть
        if (item.properties && item.properties['Item Level']) {
            const ilvl = parseInt(item.properties['Item Level']);
            if (!isNaN(ilvl)) {
                queryObj.query.filters.misc_filters = {
                    "filters": {
                        "ilvl": {
                            "min": Math.max(1, ilvl - 3),
                            "max": ilvl + 3
                        }
                    }
                };
            }
        }

        const query = encodeURIComponent(JSON.stringify(queryObj));
        return `https://www.pathofexile.com/trade/search/${currentLeague}?q=${query}`;
    }

    // For rare items, search by base type + item level
    if (item.base_type && item.rarity && item.rarity.toLowerCase().includes('rare')) {
        const queryObj = {
            "query": {
                "type": item.base_type,
                "filters": {}
            }
        };

        // Добавляем фильтр по item level если есть
        if (item.properties && item.properties['Item Level']) {
            const ilvl = parseInt(item.properties['Item Level']);
            if (!isNaN(ilvl)) {
                queryObj.query.filters.misc_filters = {
                    "filters": {
                        "ilvl": {
                            "min": Math.max(1, ilvl - 5),
                            "max": ilvl + 5
                        }
                    }
                };
            }
        }

        const query = encodeURIComponent(JSON.stringify(queryObj));
        return `https://www.pathofexile.com/trade/search/${currentLeague}?q=${query}`;
    }

    // For magic items, search by base type
    if (item.base_type && item.rarity && item.rarity.toLowerCase().includes('magic')) {
        const query = encodeURIComponent(JSON.stringify({
            "query": {
                "type": item.base_type
            }
        }));
        return `https://www.pathofexile.com/trade/search/${currentLeague}?q=${query}`;
    }

    // For other items, generic search
    return null;
}

function getRarityClass(rarity) {
    const rarityLower = rarity.toLowerCase();
    if (rarityLower.includes('unique')) return 'rarity-unique';
    if (rarityLower.includes('rare')) return 'rarity-rare';
    if (rarityLower.includes('magic')) return 'rarity-magic';
    return 'rarity-normal';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeForAttribute(text) {
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function copyToClipboard(text) {
    // Создаем временный элемент для копирования
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        // Показываем уведомление
        showCopyNotification();
    } catch (err) {
        console.error('Ошибка копирования:', err);
    }

    document.body.removeChild(textarea);
}

function showCopyNotification() {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'Скопировано!';
    document.body.appendChild(notification);

    // Показываем с анимацией
    setTimeout(() => notification.classList.add('show'), 10);

    // Удаляем через 2 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 2000);
}

function createSocketsDisplay(socketsString) {
    // Формат: "R-G-B G-G-G" или "R-R-G"
    // R=Red, G=Green, B=Blue, W=White, A=Abyss
    const socketColors = {
        'R': '#ff3333',  // Red (Strength) - яркий насыщенный красный
        'G': '#00ff00',  // Green (Dexterity) - яркий насыщенный зеленый
        'B': '#4466ff',  // Blue (Intelligence) - яркий синий
        'W': '#ffffff',  // White - белый
        'A': '#1eff00'   // Abyss - яркий изумрудно-зеленый
    };

    const groups = socketsString.split(' ');
    const groupsHtml = groups.map(group => {
        const sockets = group.split('-');
        const socketsHtml = sockets.map(socket => {
            const color = socketColors[socket] || '#888888';
            return `<span class="socket" style="background-color: ${color}; box-shadow: 0 0 6px ${color};" title="${socket}"></span>`;
        }).join('<span class="socket-link"></span>');

        return `<div class="socket-group">${socketsHtml}</div>`;
    }).join('');

    return `<div class="item-sockets">${groupsHtml}</div>`;
}

function handleImageError(img, itemName, baseType, slot) {
    // Если изображение не загрузилось, пробуем альтернативные варианты
    const currentSrc = img.src;

    // Если уже пробовали все варианты, скрываем иконку
    if (img.dataset.attempt && parseInt(img.dataset.attempt) >= 3) {
        img.parentElement.style.display = 'none';
        return;
    }

    // Увеличиваем счетчик попыток
    const attempt = parseInt(img.dataset.attempt || '0') + 1;
    img.dataset.attempt = attempt;

    const category = getCategoryFromSlot(slot);

    // Пробуем разные варианты
    if (attempt === 1 && baseType && baseType !== itemName) {
        // Попытка 1: base_type
        const simplifiedBase = baseType
            .replace(/^The\s+/i, '')
            .replace(/[''`´']/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '')
            .replace(/-+/g, '');

        img.src = `https://web.poecdn.com/image/Art/2DItems/${category}/${simplifiedBase}.png`;
    } else if (attempt === 2) {
        // Попытка 2: только латинские буквы и цифры, без спецсимволов
        const cleanName = (baseType || itemName)
            .replace(/^The\s+/i, '')
            .replace(/[^a-zA-Z0-9]/g, '');

        img.src = `https://web.poecdn.com/image/Art/2DItems/${category}/${cleanName}.png`;
    } else {
        // Скрываем иконку после всех попыток
        img.parentElement.style.display = 'none';
    }
}

function getCategoryFromSlot(slot) {
    const slotLower = slot ? slot.toLowerCase() : '';

    if (slotLower.includes('flask')) return 'Flasks';
    if (slotLower.includes('jewel')) return 'Jewels';
    if (slotLower.includes('amulet')) return 'Amulets';
    if (slotLower.includes('ring')) return 'Rings';
    if (slotLower.includes('belt')) return 'Belts';
    if (slotLower.includes('helmet') || slotLower.includes('helm')) return 'Armours/Helmets';
    if (slotLower.includes('body') || slotLower.includes('chest')) return 'Armours/BodyArmours';
    if (slotLower.includes('gloves')) return 'Armours/Gloves';
    if (slotLower.includes('boots')) return 'Armours/Boots';
    if (slotLower.includes('weapon')) return 'Weapons';
    if (slotLower.includes('shield')) return 'Armours/Shields';
    if (slotLower.includes('quiver')) return 'Quivers';

    return 'Currency';
}
