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

    // Экипировка
    displayItems(data.equipment, 'equipmentList');

    // Самоцветы (Jewels)
    displayItems(data.jewels, 'jewelsList');

    // Фласки
    displayItems(data.flasks, 'flasksList');

    // Камни умений (Gems)
    displayGems(data.gems, 'gemsList');

    showResults();
}

function displayBuildInfo(buildInfo) {
    const buildInfoDiv = document.getElementById('buildInfo');
    buildInfoDiv.innerHTML = `
        <h3>Информация о билде</h3>
        <p><strong>Класс:</strong> ${buildInfo.className}</p>
        <p><strong>Подкласс:</strong> ${buildInfo.ascendClassName}</p>
        <p><strong>Уровень:</strong> ${buildInfo.level}</p>
    `;
}

function displayItems(items, containerId) {
    const container = document.getElementById(containerId);

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-message">Нет предметов в этой категории</div>';
        return;
    }

    container.innerHTML = items.map(item => createItemCard(item)).join('');
}

function createItemCard(item) {
    const rarityClass = getRarityClass(item.rarity);

    // Функция для отображения мода (может быть объект или строка)
    const renderMod = (mod) => {
        if (typeof mod === 'object' && mod.text) {
            return escapeHtml(mod.text);
        }
        return escapeHtml(mod);
    };

    // Свойства предмета (урон, защита, и т.д.)
    const propertiesHtml = item.properties && Object.keys(item.properties).length > 0
        ? `
            <div class="item-properties">
                ${Object.entries(item.properties).map(([key, value]) =>
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
                ${item.implicits.map(mod => `<div class="mod-line mod-implicit">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Enchant моды
    const enchantModsHtml = item.enchant_mods && item.enchant_mods.length > 0
        ? `
            <div class="mod-section">
                ${item.enchant_mods.map(mod => `<div class="mod-line mod-enchant">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Префиксы
    const prefixesHtml = item.prefixes && item.prefixes.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Префиксы:</div>
                ${item.prefixes.map(mod => `<div class="mod-line mod-prefix">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Суффиксы
    const suffixesHtml = item.suffixes && item.suffixes.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Суффиксы:</div>
                ${item.suffixes.map(mod => `<div class="mod-line mod-suffix">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Крафтовые моды
    const craftedModsHtml = item.crafted_mods && item.crafted_mods.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Крафтовые:</div>
                ${item.crafted_mods.map(mod => `<div class="mod-line mod-crafted">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Fractured моды
    const fracturedModsHtml = item.fractured_mods && item.fractured_mods.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Fractured:</div>
                ${item.fractured_mods.map(mod => `<div class="mod-line mod-fractured">${renderMod(mod)}</div>`).join('')}
            </div>
        `
        : '';

    // Остальные эксплициты (если не были классифицированы)
    const explicitsHtml = item.explicits && item.explicits.length > 0
        ? `
            <div class="mod-section">
                <div class="mod-section-title">Моды:</div>
                ${item.explicits.map(mod => `<div class="mod-line mod-explicit">${renderMod(mod)}</div>`).join('')}
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

    return `
        <div class="item-card ${rarityClass}">
            <div class="item-slot">${escapeHtml(item.slot)}</div>
            <div class="item-name ${rarityClass}">${escapeHtml(item.name)}</div>
            ${item.base_type && item.base_type !== item.name ? `<div class="item-base-type">${escapeHtml(item.base_type)}</div>` : ''}
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

function displayGems(gems, containerId) {
    const container = document.getElementById(containerId);

    if (!gems || gems.length === 0) {
        container.innerHTML = '<div class="empty-message">Нет камней умений</div>';
        return;
    }

    container.innerHTML = gems.map(gemGroup => createGemGroup(gemGroup)).join('');
}

function createGemGroup(gemGroup) {
    const gemsHtml = gemGroup.gems.map(gem => {
        const details = `Level ${gem.level} | Quality ${gem.quality}%`;
        return `
            <li class="gem-item">
                <div>${escapeHtml(gem.nameSpec)}</div>
                <div class="gem-details">${details}</div>
            </li>
        `;
    }).join('');

    return `
        <div class="gem-group">
            <div class="gem-group-label">${escapeHtml(gemGroup.label)}</div>
            <div class="gem-slot">${escapeHtml(gemGroup.slot || 'No slot')}</div>
            <ul class="gem-list">
                ${gemsHtml}
            </ul>
        </div>
    `;
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
