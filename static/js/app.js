// PoE Build Converter - Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    const buildCodeTextarea = document.getElementById('buildCode');
    const parseBtn = document.getElementById('parseBtn');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const compactModeCheckbox = document.getElementById('compactModeCheckbox');
    const compactModeToggle = document.getElementById('compactModeToggle');

    // Обработчик переключателя компактного режима
    compactModeCheckbox.addEventListener('change', (e) => {
        const gemsCompactSection = document.getElementById('gemsCompactSection');
        if (e.target.checked) {
            document.body.classList.add('compact-mode');
            if (gemsCompactSection) {
                gemsCompactSection.style.display = 'block';
            }
        } else {
            document.body.classList.remove('compact-mode');
            if (gemsCompactSection) {
                gemsCompactSection.style.display = 'none';
            }
        }
    });

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

    // Делегирование событий для копирования
    document.addEventListener('click', (e) => {
        const copyable = e.target.closest('.copyable');
        if (copyable && copyable.dataset.copy) {
            copyToClipboard(copyable.dataset.copy);
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
    const compactModeToggle = document.getElementById('compactModeToggle');
    resultsDiv.classList.add('show');
    compactModeToggle.style.display = 'flex';
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

    // Определяем дубликаты для jewels и flasks
    const jewelDuplicates = findDuplicates(data.jewels || []);
    const flaskDuplicates = findDuplicates(data.flasks || []);

    // Экипировка (с камнями)
    displayItems(data.equipment, 'equipmentList', gemsBySlot);

    // Самоцветы (Jewels) - с отметками дубликатов
    displayItems(data.jewels, 'jewelsList', {}, jewelDuplicates);

    // Фласки - с отметками дубликатов
    displayItems(data.flasks, 'flasksList', {}, flaskDuplicates);

    // Заполняем компактную секцию камней
    displayGemsCompact(data.gems || []);

    showResults();
}

function displayGemsCompact(gems) {
    const gemsCompactGrid = document.getElementById('gemsCompactGrid');

    if (!gems || gems.length === 0) {
        gemsCompactGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет камней</div>';
        return;
    }

    // Группируем камни по слотам
    const gemsBySlot = {};
    gems.forEach(gemGroup => {
        const slot = gemGroup.slot || gemGroup.label || 'Unknown Slot';
        if (!gemsBySlot[slot]) {
            gemsBySlot[slot] = [];
        }
        gemsBySlot[slot].push(...gemGroup.gems);
    });

    // Создаем HTML для каждого слота
    const slotsHtml = Object.entries(gemsBySlot).map(([slot, slotGems]) => {
        const gemsHtml = slotGems.map(gem => {
            const gemColor = getGemColor(gem.nameSpec);
            const tradeUrl = createGemTradeUrl(gem);
            const tradeLink = tradeUrl ? `<a href="${tradeUrl}" target="_blank" class="gem-trade-link" title="Искать на trade">🔗</a>` : '';

            return `
                <div class="gem-compact-item">
                    <span class="gem-compact-name" style="color: ${gemColor};">${escapeHtml(gem.nameSpec)}</span>
                    <span class="gem-compact-details">
                        Lvl ${gem.level} | Q ${gem.quality}%
                        ${tradeLink}
                    </span>
                </div>
            `;
        }).join('');

        return `
            <div class="gem-slot-section">
                <div class="gem-slot-title">📍 ${escapeHtml(slot)}</div>
                <div class="gem-slot-grid">${gemsHtml}</div>
            </div>
        `;
    }).join('');

    gemsCompactGrid.innerHTML = slotsHtml;
}

function findDuplicates(items) {
    // Подсчитываем количество предметов с одинаковым названием
    const nameCounts = {};
    items.forEach(item => {
        const name = item.name;
        if (name) {
            nameCounts[name] = (nameCounts[name] || 0) + 1;
        }
    });

    // Возвращаем Set с названиями дубликатов
    const duplicates = new Set();
    Object.entries(nameCounts).forEach(([name, count]) => {
        if (count > 1) {
            duplicates.add(name);
        }
    });

    return duplicates;
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

    // Life (поддержка обоих форматов: stats.life и stats.life из расчётов)
    const life = stats.life;
    if (life && life > 0) {
        statLines.push(`❤️ Life: ${formatNumber(life)}`);
    }

    // ES (energy_shield из расчётов или es из XML)
    const es = stats.energy_shield || stats.es;
    if (es && es > 0) {
        statLines.push(`🛡️ Energy Shield: ${formatNumber(es)}`);
    }

    // Mana
    const mana = stats.mana;
    if (mana && mana > 0) {
        statLines.push(`✨ Mana: ${formatNumber(mana)}`);
    }

    // Armour
    const armour = stats.armour;
    if (armour && armour > 0) {
        statLines.push(`🔰 Armour: ${formatNumber(armour)}`);
    }

    // Evasion
    const evasion = stats.evasion;
    if (evasion && evasion > 0) {
        statLines.push(`💨 Evasion: ${formatNumber(evasion)}`);
    }

    // Resistances
    if (stats.resistances) {
        const resists = stats.resistances;
        if (resists.fire !== undefined || resists.cold !== undefined ||
            resists.lightning !== undefined || resists.chaos !== undefined) {
            const resistParts = [];
            if (resists.fire !== undefined) resistParts.push(`🔥 ${resists.fire}%`);
            if (resists.cold !== undefined) resistParts.push(`❄️ ${resists.cold}%`);
            if (resists.lightning !== undefined) resistParts.push(`⚡ ${resists.lightning}%`);
            if (resists.chaos !== undefined) resistParts.push(`☠️ ${resists.chaos}%`);
            statLines.push(`Resistances: ${resistParts.join(' | ')}`);
        }
    }

    // Crit Chance (поддержка обоих форматов)
    const critChance = stats.crit_chance;
    if (critChance && critChance > 0) {
        statLines.push(`🎯 Crit Chance: ${critChance.toFixed(1)}%`);
    }

    // Crit Multi (поддержка обоих форматов)
    const critMulti = stats.crit_multiplier || stats.crit_multi;
    if (critMulti && critMulti > 0) {
        statLines.push(`💥 Crit Multi: ${critMulti.toFixed(0)}%`);
    }

    // Attack Speed
    const attackSpeed = stats.attack_speed;
    if (attackSpeed && attackSpeed > 0) {
        statLines.push(`⚔️ Attack Speed: ${attackSpeed.toFixed(2)}`);
    }

    // Cast Speed
    const castSpeed = stats.cast_speed;
    if (castSpeed && castSpeed > 0) {
        statLines.push(`🔮 Cast Speed: ${castSpeed.toFixed(2)}`);
    }

    // DPS Estimate
    const dps = stats.dps_estimate || stats.dps;
    if (dps && dps > 0) {
        statLines.push(`⚡ DPS: ${formatNumber(dps)}`);
    }

    if (statLines.length === 0) {
        // Если нет статистики, показываем заметку
        return `
            <div class="character-stats-section">
                <div class="stats-title">⚔️ Статистика персонажа</div>
                <div class="char-stat-item" style="font-style: italic; color: #999; line-height: 1.6;">
                    ℹ️ Статистика рассчитывается на основе предметов билда.<br>
                    Для более точной статистики откройте билд в Path of Building.
                </div>
            </div>
        `;
    }

    return `
        <div class="character-stats-section">
            <div class="stats-title">⚔️ Статистика персонажа</div>
            <div class="character-stats-grid">
                ${statLines.map(line => `<div class="char-stat-item">${line}</div>`).join('')}
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

    // Используем актуальные иконки классов из PoE CDN
    const classImageMap = {
        'Marauder': 'https://web.poecdn.com/image/Art/2DArt/SkillIcons/passives/Strength.png',
        'Ranger': 'https://web.poecdn.com/image/Art/2DArt/SkillIcons/passives/Dexterity.png',
        'Witch': 'https://web.poecdn.com/image/Art/2DArt/SkillIcons/passives/Intelligence.png',
        'Duelist': 'https://web.poecdn.com/image/Art/2DArt/SkillIcons/passives/StrengthDexterity.png',
        'Templar': 'https://web.poecdn.com/image/Art/2DArt/SkillIcons/passives/StrengthIntelligence.png',
        'Shadow': 'https://web.poecdn.com/image/Art/2DArt/SkillIcons/passives/DexterityIntelligence.png',
        'Scion': 'https://web.poecdn.com/image/Art/2DArt/SkillIcons/passives/StrengthDexterityIntelligence.png'
    };

    return classImageMap[className] || null;
}

function getAscendancyImage(ascendClassName) {
    if (!ascendClassName || ascendClassName === 'None') return null;

    // Маппинг подклассов к их иконкам - используем актуальные пути
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

    // Используем правильный путь к иконкам ascendancy
    return `https://web.poecdn.com/image/Art/2DArt/UIImages/InGame/AscendancyFrame${imageName}.png`;
}

function displayItems(items, containerId, gemsBySlot = {}, duplicates = new Set()) {
    const container = document.getElementById(containerId);

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-message">Нет предметов в этой категории</div>';
        return;
    }

    container.innerHTML = items.map(item => createItemCard(item, gemsBySlot, duplicates)).join('');
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
        // Проверяем что base_type не содержит "Crafted:", ":" или другие служебные данные
        const baseType = String(item.base_type).trim();
        if (baseType &&
            !baseType.includes('Crafted:') &&
            !baseType.includes('Crafted') &&
            !baseType.match(/^[^:]+:\s*/) &&  // Проверка на паттерн "Key: Value"
            baseType !== 'true' &&
            baseType !== 'false' &&
            baseType.length > 2) {
            itemName = baseType;
        }
    }

    // Список недопустимых placeholder имен из Path of Building
    const invalidNames = ['Unknown', 'New Item', 'NewItem', 'Crafted', 'None', 'null', 'undefined'];
    const itemNameUpper = String(itemName).trim();

    // Если имя содержит недопустимые данные, скрываем иконку
    if (!itemName ||
        itemName.length < 2 ||
        invalidNames.includes(itemNameUpper) ||
        itemName.includes('Crafted:') ||
        itemName.match(/^(true|false)$/i) ||
        itemName.match(/^[^:]+:\s*(true|false)/i)) {  // Проверка на "Key: true/false"
        return null;
    }

    // Создаем упрощенное имя для поиска изображения
    let simplifiedName = String(itemName)
        .replace(/^The\s+/i, '')  // Убираем "The" в начале
        .replace(/[''`´']/g, '')  // Убираем все виды апострофов
        .replace(/[^\w\s-]/g, '')  // Убираем все кроме букв, цифр, пробелов и дефисов
        .replace(/\s+/g, '')  // Убираем все пробелы
        .replace(/-+/g, '');  // Убираем дефисы

    // Проверка на пустое имя после очистки
    if (!simplifiedName || simplifiedName.length < 2) {
        return null;
    }

    // Получаем категорию предмета
    const category = getItemCategory(item);

    // Формируем URL для изображения (ВСЕГДА с https://)
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
    if (slot.includes('quiver')) return 'Quivers';

    // Shield проверка (до weapon, так как shield может быть в weapon slot)
    if (slot.includes('shield') || basetype.includes('shield')) {
        return 'Armours/Shields';
    }

    // Weapon - более детальная проверка
    if (slot.includes('weapon') || slot.includes('weapon 1') || slot.includes('weapon 2')) {
        // Проверяем конкретный тип оружия по base_type
        if (basetype.includes('wand')) return 'Weapons/Wands';
        if (basetype.includes('bow')) return 'Weapons/TwoHandWeapons';
        if (basetype.includes('staff')) return 'Weapons/TwoHandWeapons';
        if (basetype.includes('sword')) return 'Weapons/OneHandWeapons';
        if (basetype.includes('axe')) return 'Weapons/OneHandWeapons';
        if (basetype.includes('mace')) return 'Weapons/OneHandWeapons';
        if (basetype.includes('dagger')) return 'Weapons/OneHandWeapons';
        if (basetype.includes('claw')) return 'Weapons/OneHandWeapons';
        if (basetype.includes('sceptre')) return 'Weapons/OneHandWeapons';
        return 'Weapons';
    }

    // Дополнительная проверка по basetype для оружия
    if (basetype.includes('wand')) return 'Weapons/Wands';
    if (basetype.includes('sword') || basetype.includes('axe') || basetype.includes('mace') ||
        basetype.includes('dagger') || basetype.includes('claw') || basetype.includes('sceptre')) {
        return 'Weapons/OneHandWeapons';
    }
    if (basetype.includes('bow') || basetype.includes('staff')) {
        return 'Weapons/TwoHandWeapons';
    }

    return 'Currency';
}

function createItemCard(item, gemsBySlot = {}, duplicates = new Set()) {
    const rarityClass = getRarityClass(item.rarity);
    const isFlask = item.slot && item.slot.toLowerCase().includes('flask');
    const isDuplicate = duplicates.has(item.name);

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
                ${item.implicits.map(mod => `<div class="mod-line mod-implicit copyable" data-copy="${escapeHtml(renderMod(mod))}" title="Нажмите для копирования">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Enchant моды
    const enchantModsHtml = item.enchant_mods && item.enchant_mods.length > 0
        ? `
            <div class="mod-section">
                ${item.enchant_mods.map(mod => `<div class="mod-line mod-enchant copyable" data-copy="${escapeHtml(renderMod(mod))}" title="Нажмите для копирования">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Префиксы
    const prefixesHtml = item.prefixes && item.prefixes.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Префиксы:</div>
                ${item.prefixes.map(mod => `<div class="mod-line mod-prefix copyable" data-copy="${escapeHtml(renderMod(mod))}" title="Нажмите для копирования">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Суффиксы
    const suffixesHtml = item.suffixes && item.suffixes.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Суффиксы:</div>
                ${item.suffixes.map(mod => `<div class="mod-line mod-suffix copyable" data-copy="${escapeHtml(renderMod(mod))}" title="Нажмите для копирования">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Крафтовые моды
    const craftedModsHtml = item.crafted_mods && item.crafted_mods.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Крафтовые:</div>
                ${item.crafted_mods.map(mod => `<div class="mod-line mod-crafted copyable" data-copy="${escapeHtml(renderMod(mod))}" title="Нажмите для копирования">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Fractured моды
    const fracturedModsHtml = item.fractured_mods && item.fractured_mods.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Fractured:</div>
                ${item.fractured_mods.map(mod => `<div class="mod-line mod-fractured copyable" data-copy="${escapeHtml(renderMod(mod))}" title="Нажмите для копирования">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Остальные эксплициты (если не были классифицированы)
    const explicitsHtml = item.explicits && item.explicits.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Моды:</div>
                ${item.explicits.map(mod => `<div class="mod-line mod-explicit copyable" data-copy="${escapeHtml(renderMod(mod))}" title="Нажмите для копирования">${renderMod(mod)}</div>`).join('')}
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
                 data-item-name="${escapeHtml(item.name)}"
                 data-base-type="${escapeHtml(item.base_type || '')}"
                 data-slot="${escapeHtml(item.slot || '')}"
                 onerror="handleImageError(this)">
        </div>
    ` : '';

    // Отображаем камни для этого предмета
    const gemsHtml = itemGems.length > 0 ? createGemsDisplay(itemGems) : '';

    return `
        <div class="item-card ${rarityClass} ${isDuplicate ? 'has-duplicate' : ''}">
            ${isDuplicate ? '<div class="duplicate-badge" title="Дубликат: у вас есть несколько таких предметов">⚠️ Дубликат</div>' : ''}
            <div class="item-card-top">
                <div class="item-slot">${escapeHtml(item.slot)}${itemLevel ? ` | iLvl ${escapeHtml(itemLevel)}` : ''}</div>
                ${itemIconHtml}
            </div>
            <div class="item-header">
                <div class="item-name-wrapper">
                    <div class="item-name ${rarityClass} copyable" data-copy="${escapeHtml(item.name)}" title="Нажмите, чтобы скопировать">${escapeHtml(item.name)}</div>
                    ${tradeLink}
                </div>
                <div class="item-header-right">
                    ${headerPropsHtml}
                </div>
            </div>
            ${item.base_type && item.base_type !== item.name ? `<div class="item-base-type copyable" data-copy="${escapeHtml(item.base_type)}" title="Нажмите для копирования">${escapeHtml(item.base_type)}</div>` : ''}
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
            const tradeUrl = createGemTradeUrl(gem);
            const tradeLink = tradeUrl ? `<a href="${tradeUrl}" target="_blank" class="gem-trade-link" title="Искать на trade (${details})">🔗</a>` : '';

            return `
                <div class="gem-item copyable" data-copy="${escapeHtml(gem.nameSpec)}" title="Нажмите, чтобы скопировать">
                    <span class="gem-name" style="color: ${gemColor};">${escapeHtml(gem.nameSpec)}</span>
                    <span class="gem-details">${details}${tradeLink}</span>
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

    // Support gems - определяем цвет по типу support
    if (nameLower.includes('support') || nameLower.includes('awakened')) {
        // Красные support gems
        const redSupports = ['melee physical damage', 'multistrike', 'fortify', 'ruthless',
            'bloodlust', 'brutality', 'pulverise', 'close combat', 'fist of war',
            'impale', 'shockwave', 'ancestral call', 'call to arms', 'fire penetration',
            'immolate', 'burning damage', 'combustion', 'ignite proliferation',
            'elemental focus', 'chance to bleed', 'maim', 'rage', 'behead',
            'lifetap', 'cruelty', 'endurance charge on melee stun', 'melee splash',
            'added fire damage', 'elemental damage with attacks', 'fire', 'stun',
            'knockback', 'bloodlust', 'awakened fire penetration', 'awakened brutality',
            'awakened melee physical', 'awakened elemental damage'];

        // Зеленые support gems
        const greenSupports = ['pierce', 'chain', 'fork', 'greater multiple projectiles',
            'lesser multiple projectiles', 'slower projectiles', 'faster projectiles',
            'projectile', 'point blank', 'ballista', 'barrage', 'volley',
            'mirage archer', 'vicious projectiles', 'deadly ailments', 'unbound ailments',
            'swift affliction', 'withering touch', 'void manipulation', 'efficacy',
            'trap', 'mine', 'cluster traps', 'multiple traps', 'trap and mine damage',
            'high-impact mine', 'blastchain mine', 'swift assembly', 'nightblade',
            'returning projectiles', 'awakened fork', 'awakened chain',
            'awakened greater multiple projectiles', 'awakened vicious projectiles',
            'awakened void manipulation', 'arrow nova', 'focused ballista',
            'faster attacks', 'added chaos damage', 'chance to poison', 'lesser poison',
            'awakened deadly ailments', 'awakened swift affliction', 'awakened unbound ailments'];

        // Синие support gems
        const blueSupports = ['spell echo', 'unleash', 'intensify', 'spell cascade',
            'greater spell echo', 'concentrated effect', 'increased area',
            'increased critical', 'power charge on critical', 'controlled destruction',
            'elemental proliferation', 'hypothermia', 'bonechill', 'cold penetration',
            'lightning penetration', 'added cold', 'added lightning', 'innervate',
            'energy leech', 'mana leech', 'curse on hit', 'hextouch', 'blasphemy',
            'minion damage', 'minion speed', 'minion life', 'meat shield', 'feeding frenzy',
            'summon phantasm', 'infernal legion', 'deathmark', 'predator',
            'awakened spell echo', 'awakened spell cascade', 'awakened elemental focus',
            'awakened minion damage', 'awakened added cold damage', 'awakened added lightning damage',
            'awakened cold penetration', 'awakened lightning penetration',
            'faster casting', 'arcane surge', 'cast while channelling', 'cast on critical',
            'spell totem', 'awakened controlled destruction', 'awakened unleash',
            'divergent', 'anomalous', 'phantasmal'];

        // Проверяем тип support
        for (const keyword of redSupports) {
            if (nameLower.includes(keyword)) return '#D02020';
        }
        for (const keyword of greenSupports) {
            if (nameLower.includes(keyword)) return '#0D0';
        }
        for (const keyword of blueSupports) {
            if (nameLower.includes(keyword)) return '#4AF';
        }

        // Универсальные supports - белые
        return '#e8e8e8';
    }

    // Красные (Strength) активные камни - физический урон, огонь, ближний бой
    const redKeywords = [
        // Огненные
        'molten', 'fire', 'burning', 'flame', 'infernal', 'magma', 'volcanic',
        'righteous fire', 'scorching ray', 'purifying flame', 'flame dash',
        'flame surge', 'incinerate', 'searing bond', 'flamethrower',
        // Ауры и баффы
        'anger', 'determination', 'vitality', 'purity of fire', 'herald of ash',
        'blood and sand', 'flesh and stone', 'pride', 'defiance banner',
        // Физический ближний бой
        'cleave', 'ground slam', 'heavy strike', 'shield charge', 'leap slam',
        'earthquake', 'sunder', 'sweep', 'glacial hammer', 'vigilant strike',
        'dual strike', 'cleave', 'molten strike', 'wild strike',
        'cyclone', 'bladestorm', 'lacerate', 'perforate', 'blade flurry',
        'reave', 'vaal reave', 'static strike', 'ice crash',
        // Слэмы и страйки
        'slam', 'strike', 'smite', 'dominating blow', 'consecrated path',
        'infernal blow', 'tectonic slam', 'earthshatter', 'boneshatter',
        'shield crush', 'shield bash', 'spectral shield',
        // Крики и стансы
        'enduring cry', 'immortal call', 'rallying cry', 'intimidating cry',
        'generals cry', 'seismic cry', 'ancestral cry', 'infernal cry',
        'war banner', 'blood rage', 'berserk', 'rage', 'battlemage',
        // Тотемы и ancestral
        'ancestral', 'warchief', 'protector', 'devouring totem', 'rejuvenation totem',
        // Прочее
        'warlord', 'shockwave', 'war', 'seismic', 'absolution',
        // Курсы
        'warlords mark', 'vulnerability', 'flammability', 'punishment',
        // Новые
        'flame link', 'link', 'rage vortex', 'corrupting cry'
    ];

    // Зеленые (Dexterity) камни - проджектайлы, яды, ловушки
    const greenKeywords = [
        // Луки и стрелы
        'split arrow', 'ice shot', 'tornado shot', 'rain of arrows',
        'barrage', 'blast rain', 'caustic arrow', 'toxic rain', 'scourge arrow',
        'burning arrow', 'lightning arrow', 'explosive arrow', 'shrapnel shot',
        'elemental hit', 'galvanic arrow', 'ensnaring arrow',
        // Баллисты
        'ballista', 'artillery ballista', 'siege ballista', 'shrapnel ballista',
        // Яды и DoT
        'viper strike', 'pestilent strike', 'cobra lash', 'plague bearer',
        'poison', 'venom', 'viper', 'plague', 'caustic', 'toxic',
        'withering step', 'wither', 'poisonous concoction',
        // Ловушки и мины
        'trap', 'mine', 'bear trap', 'fire trap', 'ice trap', 'lightning trap',
        'explosive trap', 'flamethrower trap', 'siphoning trap', 'seismic trap',
        // Удары и блинки
        'puncture', 'frenzy', 'double strike', 'dual strike', 'flicker strike',
        'whirling blades', 'blink arrow', 'mirror arrow', 'dash', 'frost blink',
        'lancing steel', 'shattering steel', 'splitting steel', 'spectral throw',
        'spectral helix', 'venom gyre', 'cobra', 'pestilence',
        // Ауры
        'grace', 'haste', 'precision', 'herald of agony', 'herald of ice',
        // Курсы
        'snipers mark', 'poachers mark', 'assassins mark', 'projectile weakness',
        'despair', 'temporal chains',
        // Прочее
        'ricochet', 'chain', 'tornado', 'blood and sand', 'flesh and stone',
        'steelskin', 'phase run', 'smoke mine', 'explosive concoction',
        // Новые механики
        'helix', 'gyre', 'steel', 'arrow'
    ];

    // Синие (Intelligence) камни - холод, молния, заклинания, миньоны
    const blueKeywords = [
        // Холод
        'cold', 'ice', 'frost', 'freeze', 'glacial', 'arctic', 'frostbite',
        'freezing pulse', 'frostbolt', 'ice nova', 'vortex', 'polar',
        'cold snap', 'creeping frost', 'winter orb', 'ice spear',
        // Молния
        'spark', 'ball lightning', 'arc', 'storm', 'lightning', 'shock',
        'lightning warp', 'lightning tendrils', 'shock nova', 'static',
        'conductivity', 'overcharge', 'crackling lance', 'lightning conduit',
        // Огонь (заклинания)
        'firestorm', 'flameblast', 'fireball', 'flame surge',
        // Физические заклинания
        'ethereal knives', 'bladefall', 'blade blast', 'blade vortex',
        'bladefall', 'glacial cascade',
        // Брэнды
        'storm brand', 'armageddon brand', 'penance brand', 'wintertide brand',
        'brand',
        // Ауры и курсы
        'clarity', 'discipline', 'wrath', 'zealotry', 'malevolence',
        'purity of ice', 'purity of lightning', 'purity of elements',
        'herald of thunder', 'herald of ice', 'aspect',
        'conductivity', 'frostbite', 'elemental weakness', 'enfeeble',
        // Миньоны
        'raise zombie', 'raise spectre', 'summon', 'animate', 'skeletons',
        'carrion', 'raging spirits', 'phantasm', 'stone golem', 'chaos golem',
        'flame golem', 'ice golem', 'lightning golem', 'carrion golem',
        'absolution', 'herald of purity', 'dominating blow',
        // Другие заклинания
        'wave of conviction', 'orb of storms', 'discharge', 'power siphon',
        'kinetic blast', 'voltaxic burst', 'hydrosphere', 'eye of winter',
        'divine ire', 'purifying flame', 'forbidden rite', 'reap',
        'exsanguinate', 'corrupting fever', 'soulrend', 'blight', 'essence drain',
        'contagion', 'dark pact', 'detonate dead', 'volatile dead',
        'unearth', 'bodyswap', 'bone offering', 'flesh offering', 'spirit offering',
        // Щиты и защита
        'tempest shield', 'frost shield', 'arcane cloak', 'sigil of power',
        'frost bomb', 'orb of storms', 'energy blade',
        // Новые заклинания
        'manabond', 'absolution', 'voltaxic', 'forbidden', 'wintertide',
        // Ключевые слова
        'orb', 'nova', 'pulse', 'intelligence', 'mana', 'energy shield',
        'spell', 'cast', 'totem', 'sigil', 'cascade', 'siphon'
    ];

    // Проверяем ключевые слова для красных
    for (const keyword of redKeywords) {
        if (nameLower.includes(keyword)) return '#D02020';  // Насыщенный красный как в PoE
    }

    // Проверяем ключевые слова для зеленых
    for (const keyword of greenKeywords) {
        if (nameLower.includes(keyword)) return '#0D0';  // Насыщенный зелёный как в PoE
    }

    // Проверяем ключевые слова для синих
    for (const keyword of blueKeywords) {
        if (nameLower.includes(keyword)) return '#4AF';  // Насыщенный синий как в PoE
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
    const isFlask = item.slot && item.slot.toLowerCase().includes('flask');
    const isUnique = item.rarity && item.rarity.toLowerCase().includes('unique');

    // For unique items, search by name (для уникальных используем только name, без type)
    if (isUnique) {
        const queryObj = {
            "query": {
                "name": item.name,
                "type": item.base_type || "",  // Добавляем base_type для более точного поиска
                "filters": {}
            }
        };

        // Для уникальных jewels добавляем фильтр по item level если есть
        if (isJewel && item.properties && item.properties['Item Level']) {
            const ilvl = parseInt(item.properties['Item Level']);
            if (!isNaN(ilvl)) {
                queryObj.query.filters.misc_filters = {
                    "filters": {
                        "ilvl": {
                            "min": Math.max(1, ilvl - 2),
                            "max": ilvl + 2
                        }
                    }
                };
            }
        }

        const query = encodeURIComponent(JSON.stringify(queryObj));
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

    // For flasks (magic/rare/normal), search by base type
    if (isFlask) {
        // Для фласков всегда используем base_type как type для поиска
        const searchTerm = item.base_type || item.name;
        if (searchTerm) {
            const queryObj = {
                "query": {
                    "type": searchTerm,
                    "filters": {}
                }
            };

            // Для magic фласков можно добавить фильтр по редкости
            if (item.rarity && item.rarity.toLowerCase().includes('magic')) {
                queryObj.query.filters.type_filters = {
                    "filters": {
                        "rarity": {
                            "option": "magic"
                        }
                    }
                };
            }

            const query = encodeURIComponent(JSON.stringify(queryObj));
            return `https://www.pathofexile.com/trade/search/${currentLeague}?q=${query}`;
        }
    }

    // For other items, generic search
    return null;
}

function createGemTradeUrl(gem) {
    // Текущая лига
    const currentLeague = 'Kreepers';  // TODO: сделать динамическим

    if (!gem.nameSpec) return null;

    const gemLevel = parseInt(gem.level) || 1;
    const gemQuality = parseInt(gem.quality) || 0;

    // Создаем запрос для поиска камня
    const queryObj = {
        "query": {
            "type": gem.nameSpec,
            "filters": {
                "misc_filters": {
                    "filters": {
                        "gem_level": {
                            "min": gemLevel,
                            "max": null
                        }
                    }
                }
            }
        }
    };

    // Добавляем фильтр по качеству если оно больше 0
    if (gemQuality > 0) {
        queryObj.query.filters.misc_filters.filters.quality = {
            "min": gemQuality,
            "max": null
        };
    }

    const query = encodeURIComponent(JSON.stringify(queryObj));
    return `https://www.pathofexile.com/trade/search/${currentLeague}?q=${query}`;
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
        'R': '#D02020',  // Red (Strength) - насыщенный красный как в PoE
        'G': '#0D0',     // Green (Dexterity) - насыщенный зелёный как в PoE
        'B': '#4AF',     // Blue (Intelligence) - насыщенный синий как в PoE
        'W': '#FFF',     // White - белый
        'A': '#0E0'      // Abyss - изумрудно-зеленый
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

function handleImageError(img) {
    // Получаем данные из data-атрибутов
    const itemName = img.dataset.itemName || '';
    const baseType = img.dataset.baseType || '';
    const slot = img.dataset.slot || '';

    // Валидация: проверяем на placeholder имена
    const invalidNames = ['Unknown', 'New Item', 'NewItem', 'Crafted', 'None', 'null', 'undefined', 'true', 'false'];
    if (invalidNames.includes(itemName) || invalidNames.includes(baseType)) {
        img.parentElement.style.display = 'none';
        return;
    }

    // Если уже пробовали все варианты, скрываем иконку
    if (img.dataset.attempt && parseInt(img.dataset.attempt) >= 5) {
        img.parentElement.style.display = 'none';
        if (console.debug) {
            console.debug(`[Image] No valid image found for: ${itemName || baseType} (slot: ${slot})`);
        }
        return;
    }

    // Увеличиваем счетчик попыток
    const attempt = parseInt(img.dataset.attempt || '0') + 1;
    img.dataset.attempt = attempt;

    const category = getCategoryFromSlot(slot);

    // Функция для создания безопасного имени файла
    const sanitizeName = (name) => {
        if (!name || typeof name !== 'string') return '';
        return String(name)
            .replace(/^The\s+/i, '')
            .replace(/[''`´']/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '')
            .replace(/-+/g, '');
    };

    let newUrl = null;

    // Пробуем разные варианты
    if (attempt === 1 && baseType && baseType !== itemName && !baseType.includes(':')) {
        // Попытка 1: base_type (если он отличается от имени и не содержит служебные символы)
        const simplifiedBase = sanitizeName(baseType);
        if (simplifiedBase && simplifiedBase.length > 2) {
            newUrl = `https://web.poecdn.com/image/Art/2DItems/${category}/${simplifiedBase}.png`;
        }
    } else if (attempt === 2) {
        // Попытка 2: только латинские буквы и цифры, без спецсимволов
        const cleanName = (baseType || itemName)
            .replace(/^The\s+/i, '')
            .replace(/[^a-zA-Z0-9]/g, '');
        if (cleanName && cleanName.length > 2) {
            newUrl = `https://web.poecdn.com/image/Art/2DItems/${category}/${cleanName}.png`;
        }
    } else if (attempt === 3) {
        // Попытка 3: базовый тип для unique предметов
        if (baseType && !baseType.includes(':')) {
            const baseClean = baseType
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '');
            if (baseClean && baseClean.length > 2) {
                newUrl = `https://web.poecdn.com/image/Art/2DItems/${category}/${baseClean}.png`;
            }
        }
    } else if (attempt === 4) {
        // Попытка 4: пробуем альтернативные категории
        const altCategory = getAlternativeCategory(category, slot);
        if (altCategory && altCategory !== category) {
            const simplifiedName = sanitizeName(itemName || baseType);
            if (simplifiedName && simplifiedName.length > 2) {
                newUrl = `https://web.poecdn.com/image/Art/2DItems/${altCategory}/${simplifiedName}.png`;
            }
        }
    }

    // Если сформировали новый URL, пробуем его
    if (newUrl) {
        img.src = newUrl;
    } else {
        // Нет больше вариантов - скрываем иконку
        img.parentElement.style.display = 'none';
    }
}

function getAlternativeCategory(currentCategory, slot) {
    // Возвращает альтернативные категории для разных типов предметов
    const alternatives = {
        'Weapons/Wands': 'Weapons',
        'Weapons/OneHandWeapons': 'Weapons',
        'Weapons/TwoHandWeapons': 'Weapons',
        'Weapons': 'Weapons/OneHandWeapons',
        'Armours/BodyArmours': 'Armours/BodyArmors',  // Американское написание
        'Armours/Helmets': 'Armours/Helms',
        'Armours/Gloves': 'Armours/Gauntlets',
        'Armours/Boots': 'Armours/Footwear',
        'Armours/Shields': 'Shields',
        'Jewels': 'Jewellery',
    };

    return alternatives[currentCategory] || null;
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
    if (slotLower.includes('shield')) return 'Armours/Shields';
    if (slotLower.includes('quiver')) return 'Quivers';
    if (slotLower.includes('weapon')) return 'Weapons';

    return 'Currency';
}
