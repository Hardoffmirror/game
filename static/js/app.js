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

    card.innerHTML = `
        ${item.sockets ? `<div class="item-sockets">${renderSockets(item.sockets)}</div>` : ''}
        <div class="item-name ${rarityClass}">${escapeHtml(item.name)}</div>
        ${item.base_type ? `<div class="item-base">${escapeHtml(item.base_type)}</div>` : ''}
        ${item.mods.length > 0 ? `
            <div class="item-mods">
                ${item.mods.slice(0, 4).map(mod =>
                    `<div class="item-mod">${escapeHtml(mod)}</div>`
                ).join('')}
                ${item.mods.length > 4 ? `<div class="item-mod">...еще ${item.mods.length - 4}</div>` : ''}
            </div>
        ` : ''}
    `;

    return card;
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
