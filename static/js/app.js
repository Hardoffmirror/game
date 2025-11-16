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
    // Информация о билде
    displayBuildInfo(data.build_info);

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

function displayBuildInfo(buildInfo) {
    const buildInfoDiv = document.getElementById('buildInfo');

    // Создаем URL для картинки подкласса
    const ascendancyImage = getAscendancyImage(buildInfo.ascendClassName);

    buildInfoDiv.innerHTML = `
        <div class="build-info-compact">
            ${ascendancyImage ? `<img src="${ascendancyImage}" class="ascendancy-icon" alt="${escapeHtml(buildInfo.ascendClassName)}" onerror="this.style.display='none'">` : ''}
            <div class="build-info-text">
                <div class="build-class">${escapeHtml(buildInfo.className)}${buildInfo.ascendClassName && buildInfo.ascendClassName !== 'None' ? ` - ${escapeHtml(buildInfo.ascendClassName)}` : ''}</div>
                <div class="build-level">Уровень ${escapeHtml(buildInfo.level)}</div>
            </div>
        </div>
    `;
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
    // Базовый путь к картинкам на PoE CDN
    const basePath = 'https://web.poecdn.com/gen/image/';

    // Для уникальных предметов можно попробовать получить изображение
    if (!item.name) return null;

    // Создаем упрощенное имя для поиска изображения
    const simplifiedName = item.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');

    // Пытаемся создать URL для изображения (это приблизительная логика)
    return `https://web.poecdn.com/image/Art/2DItems/${getItemCategory(item)}/${simplifiedName}.png`;
}

function getItemCategory(item) {
    const slot = item.slot ? item.slot.toLowerCase() : '';
    const basetype = item.base_type ? item.base_type.toLowerCase() : '';

    if (slot.includes('flask')) return 'Flasks';
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
            // Пропускаем Unique ID
            if (key === 'Unique ID') {
                return;
            }
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
            <img src="${itemIcon}" class="item-icon" alt="${escapeHtml(item.name)}" onerror="this.parentElement.style.display='none'">
        </div>
    ` : '';

    // Отображаем камни для этого предмета
    const gemsHtml = itemGems.length > 0 ? createGemsDisplay(itemGems) : '';

    return `
        <div class="item-card ${rarityClass}">
            <div class="item-card-top">
                <div class="item-slot">${escapeHtml(item.slot)}</div>
                ${itemIconHtml}
            </div>
            <div class="item-header">
                <div class="item-name-wrapper">
                    <div class="item-name ${rarityClass} copyable" onclick="copyToClipboard('${escapeForAttribute(item.name)}')" title="Нажмите, чтобы скопировать">${escapeHtml(item.name)}</div>
                    ${tradeLink}
                </div>
                <div class="item-header-right">
                    ${itemLevel ? `<div class="item-level">iLvl ${escapeHtml(itemLevel)}</div>` : ''}
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
                <div class="gem-item copyable" style="color: ${gemColor};" onclick="copyToClipboard('${escapeForAttribute(gem.nameSpec)}')" title="Нажмите, чтобы скопировать">
                    <span class="gem-name">${escapeHtml(gem.nameSpec)}</span>
                    <span class="gem-details">${details}</span>
                </div>
            `;
        }).join('');

        return gems;
    }).join('');

    return `<div class="item-gems">${gemsHtml}</div>`;
}

function getGemColor(gemName) {
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
        'infused channelling'];

    // Зеленые (Dexterity) камни - проджектайлы, яды, ловушки
    const greenKeywords = ['split arrow', 'ice shot', 'tornado shot', 'rain of arrows',
        'barrage', 'blast rain', 'caustic arrow', 'toxic rain', 'scourge arrow',
        'viper strike', 'pestilent strike', 'cobra lash', 'plague bearer',
        'grace', 'haste', 'precision', 'herald of agony', 'herald of ice',
        'toxic', 'poison', 'venom', 'viper', 'plague', 'caustic',
        'trap', 'mine', 'bear trap', 'lightning arrow', 'explosive arrow',
        'puncture', 'frenzy', 'double strike', 'dual strike', 'flicker strike',
        'whirling blades', 'blink arrow', 'mirror arrow', 'dash'];

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
        'voltaxic burst', 'hydrosphere'];

    // Проверяем ключевые слова
    for (const keyword of redKeywords) {
        if (nameLower.includes(keyword)) return '#ff4444';  // Яркий красный
    }

    for (const keyword of greenKeywords) {
        if (nameLower.includes(keyword)) return '#44ff44';  // Яркий зеленый
    }

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
        'R': '#ff4444',  // Red
        'G': '#44ff44',  // Green
        'B': '#4444ff',  // Blue
        'W': '#ffffff',  // White
        'A': '#00ff88'   // Abyss (зеленоватый)
    };

    const groups = socketsString.split(' ');
    const groupsHtml = groups.map(group => {
        const sockets = group.split('-');
        const socketsHtml = sockets.map(socket => {
            const color = socketColors[socket] || '#888888';
            return `<span class="socket" style="background-color: ${color};" title="${socket}"></span>`;
        }).join('<span class="socket-link"></span>');

        return `<div class="socket-group">${socketsHtml}</div>`;
    }).join('');

    return `<div class="item-sockets">${groupsHtml}</div>`;
}
