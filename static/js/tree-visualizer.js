// Визуализатор дерева пассивных умений Path of Exile
class PassiveTreeVisualizer {
    constructor(canvasId, containerClass) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = canvasId;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '800px';
        this.canvas.style.background = '#0a0a15';
        this.canvas.style.borderRadius = '15px';
        this.canvas.style.cursor = 'grab';

        this.ctx = this.canvas.getContext('2d');

        // Параметры визуализации (как в PathOfBuilding)
        this.zoomLevel = 0; // Уровень зума от -5 до 12
        this.minZoomLevel = -5;
        this.maxZoomLevel = 12;
        this.offsetX = 0;
        this.offsetY = 0;

        // Вычисляем реальный зум как 1.2^zoomLevel (как в PoB)
        this.getZoom = () => Math.pow(1.2, this.zoomLevel);

        // Состояние перетаскивания
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Данные дерева
        this.treeData = null;
        this.allocatedNodes = new Set();
        this.hoveredNode = null;

        // Кэш для позиций узлов
        this.nodePositions = new Map();

        this.setupEventListeners();
    }

    // Установка слушателей событий
    setupEventListeners() {
        // Обработка колесика мыши для зума (как в PathOfBuilding)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Изменяем уровень зума (как в PoB)
            const zoomDelta = e.deltaY < 0 ? 1 : -1;
            const newZoomLevel = Math.max(this.minZoomLevel, Math.min(this.maxZoomLevel, this.zoomLevel + zoomDelta));

            // Зум к курсору - сохраняем точку под курсором неподвижной
            const oldZoom = this.getZoom();
            const worldX = (mouseX - this.offsetX) / oldZoom;
            const worldY = (mouseY - this.offsetY) / oldZoom;

            this.zoomLevel = newZoomLevel;
            const newZoom = this.getZoom();

            this.offsetX = mouseX - worldX * newZoom;
            this.offsetY = mouseY - worldY * newZoom;

            this.render();
        });

        // Обработка перетаскивания
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;

                this.offsetX += deltaX;
                this.offsetY += deltaY;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                this.render();
            } else {
                // Проверка наведения на узел
                this.checkNodeHover(e);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
            this.hoveredNode = null;
            this.render();
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });
    }

    // Изменение размера canvas
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        this.canvas.width = rect.width;
        this.canvas.height = 800;
    }

    // Загрузка данных дерева
    async loadTreeData(treeVersion = '3.25') {
        try {
            // Загружаем актуальные данные дерева с официального API
            // Используем CORS proxy для обхода ограничений
            const response = await fetch(`https://www.pathofexile.com/passive-skill-tree/${treeVersion}.0/data.json`);

            if (!response.ok) {
                // Если не удалось загрузить, используем упрощенную визуализацию
                console.warn('Не удалось загрузить данные дерева, используем упрощенную версию');
                this.createSimplifiedTree();
                return;
            }

            this.treeData = await response.json();
            console.log('Данные дерева загружены:', this.treeData);

            // Обрабатываем данные дерева для улучшения производительности
            this.processTreeData();

            // Кэшируем позиции узлов для быстрого доступа
            this.cacheNodePositions();
        } catch (error) {
            console.error('Ошибка загрузки данных дерева:', error);
            this.createSimplifiedTree();
        }
    }

    // Обработка данных дерева (улучшение структуры по образцу PoB)
    processTreeData() {
        if (!this.treeData || !this.treeData.nodes) return;

        // Создаем индекс групп для быстрого доступа
        this.nodeGroups = new Map();

        if (this.treeData.groups) {
            for (const [groupId, group] of Object.entries(this.treeData.groups)) {
                this.nodeGroups.set(groupId, {
                    x: group.x || 0,
                    y: group.y || 0,
                    orbits: group.orbits || [],
                    nodes: group.nodes || []
                });
            }
        }

        // Обрабатываем узлы и добавляем дополнительные свойства
        for (const [nodeId, node] of Object.entries(this.treeData.nodes)) {
            // Определяем тип узла на основе данных
            if (!node.type) {
                if (node.isKeystone) {
                    node.type = 'Keystone';
                } else if (node.isNotable) {
                    node.type = 'Notable';
                } else if (node.isJewelSocket) {
                    node.type = 'JewelSocket';
                } else if (node.isMastery) {
                    node.type = 'Mastery';
                } else {
                    node.type = 'Normal';
                }
            }

            // Создаем массив связей для удобства
            if (node.out && !Array.isArray(node.out)) {
                node.out = Object.values(node.out);
            }
            if (node.in && !Array.isArray(node.in)) {
                node.in = Object.values(node.in);
            }
        }
    }

    // Создание упрощенного дерева (фоллбэк)
    createSimplifiedTree() {
        console.log('Создание упрощенного дерева');
        // Создаем упрощенное представление с радиальной структурой
        this.treeData = {
            nodes: {},
            groups: {}
        };

        // Создаем узлы в радиальной структуре
        const centerX = 0;
        const centerY = 0;
        const rings = 10;
        const nodesPerRing = 36;

        let nodeId = 1;

        // Центральный узел
        this.treeData.nodes[nodeId] = {
            id: nodeId,
            name: 'Start',
            x: centerX,
            y: centerY,
            type: 'Normal',
            out: []
        };

        nodeId++;

        // Создаем кольца узлов
        for (let ring = 1; ring <= rings; ring++) {
            const radius = ring * 100;
            const angleStep = (Math.PI * 2) / nodesPerRing;

            for (let i = 0; i < nodesPerRing; i++) {
                const angle = angleStep * i;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                const type = ring % 3 === 0 ? 'Notable' : ring % 5 === 0 ? 'Keystone' : 'Normal';

                this.treeData.nodes[nodeId] = {
                    id: nodeId,
                    name: `Node ${nodeId}`,
                    x: x,
                    y: y,
                    type: type,
                    out: []
                };

                // Связываем с предыдущим кольцом
                if (ring > 1) {
                    const prevRingStart = nodeId - nodesPerRing - nodesPerRing;
                    const connectionIndex = Math.floor(i * nodesPerRing / nodesPerRing);

                    if (prevRingStart > 0) {
                        const targetNode = prevRingStart + connectionIndex;
                        if (this.treeData.nodes[targetNode]) {
                            this.treeData.nodes[nodeId].out.push(targetNode.toString());
                        }
                    }
                }

                nodeId++;
            }
        }

        this.cacheNodePositions();
    }

    // Кэширование позиций узлов
    cacheNodePositions() {
        if (!this.treeData || !this.treeData.nodes) return;

        this.nodePositions.clear();

        for (const [nodeId, node] of Object.entries(this.treeData.nodes)) {
            if (node.x !== undefined && node.y !== undefined) {
                this.nodePositions.set(nodeId, {
                    x: node.x,
                    y: node.y,
                    node: node
                });
            }
        }
    }

    // Установка выделенных узлов из билда
    setAllocatedNodes(nodeIds) {
        this.allocatedNodes = new Set(nodeIds.map(id => id.toString()));
        this.render();
    }

    // Преобразование мировых координат в экранные
    worldToScreen(x, y) {
        const zoom = this.getZoom();
        return {
            x: x * zoom + this.offsetX,
            y: y * zoom + this.offsetY
        };
    }

    // Преобразование экранных координат в мировые
    screenToWorld(x, y) {
        const zoom = this.getZoom();
        return {
            x: (x - this.offsetX) / zoom,
            y: (y - this.offsetY) / zoom
        };
    }

    // Проверка наведения на узел
    checkNodeHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldPos = this.screenToWorld(mouseX, mouseY);

        let foundNode = null;
        const hoverRadius = 15 / this.getZoom(); // Радиус в мировых координатах

        for (const [nodeId, pos] of this.nodePositions.entries()) {
            const dx = worldPos.x - pos.x;
            const dy = worldPos.y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < hoverRadius) {
                foundNode = { id: nodeId, ...pos.node };
                break;
            }
        }

        if (foundNode !== this.hoveredNode) {
            this.hoveredNode = foundNode;
            this.render();

            // Показываем тултип
            if (foundNode) {
                this.showTooltip(foundNode, mouseX, mouseY);
            } else {
                this.hideTooltip();
            }
        }
    }

    // Показать тултип (улучшенный, как в PoB)
    showTooltip(node, x, y) {
        let tooltip = document.getElementById('tree-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tree-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: linear-gradient(135deg, rgba(10, 10, 25, 0.98), rgba(20, 20, 35, 0.98));
                border: 2px solid #ffa500;
                border-radius: 12px;
                padding: 16px;
                color: #fff;
                font-size: 14px;
                pointer-events: none;
                z-index: 10000;
                max-width: 350px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 165, 0, 0.3);
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(tooltip);
        }

        const isAllocated = this.allocatedNodes.has(node.id.toString());

        // Определяем цвет типа узла
        const typeColors = {
            'Normal': '#888',
            'Notable': '#7a7aba',
            'Keystone': '#ba7a7a',
            'JewelSocket': '#9a7aba',
            'Mastery': '#baaa7a'
        };
        const typeColor = typeColors[node.type] || '#888';

        // Формируем статус
        const statusBadge = isAllocated
            ? '<div style="display: inline-block; background: rgba(29, 209, 161, 0.2); border: 1px solid #1dd1a1; padding: 4px 10px; border-radius: 6px; color: #1dd1a1; font-weight: bold;">✓ Взято</div>'
            : '<div style="display: inline-block; background: rgba(136, 136, 136, 0.2); border: 1px solid #888; padding: 4px 10px; border-radius: 6px; color: #888;">Не взято</div>';

        // Формируем описание модификаторов узла
        let statsHTML = '';
        if (node.stats && node.stats.length > 0) {
            statsHTML = '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 165, 0, 0.3);">';
            node.stats.forEach(stat => {
                statsHTML += `<div style="color: #aaf; margin-bottom: 4px; line-height: 1.4;">• ${stat}</div>`;
            });
            statsHTML += '</div>';
        }

        // Формируем информацию о связях
        const connectionsInfo = node.out && node.out.length > 0
            ? `<div style="color: #999; font-size: 12px; margin-top: 8px;">Связей: ${node.out.length}</div>`
            : '';

        tooltip.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div style="color: #ffa500; font-weight: bold; font-size: 17px; flex: 1;">
                    ${node.name || `Узел ${node.id}`}
                </div>
                <div style="background: ${typeColor}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-left: 10px;">
                    ${node.type || 'Normal'}
                </div>
            </div>
            <div style="color: #aaa; font-size: 12px; margin-bottom: 10px;">
                ID: <span style="color: #ccc; font-family: monospace;">${node.id}</span>
            </div>
            ${statusBadge}
            ${statsHTML}
            ${connectionsInfo}
        `;

        const rect = this.canvas.getBoundingClientRect();
        tooltip.style.left = (rect.left + x + 20) + 'px';
        tooltip.style.top = (rect.top + y - 20) + 'px';
        tooltip.style.display = 'block';
    }

    // Скрыть тултип
    hideTooltip() {
        const tooltip = document.getElementById('tree-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Отрисовка дерева
    render() {
        if (!this.treeData) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Очистка canvas
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, width, height);

        // Рисуем сетку для ориентации
        this.drawGrid();

        // Рисуем группы узлов (фон)
        this.drawNodeGroups();

        // Рисуем связи между узлами
        this.drawConnections();

        // Рисуем узлы
        this.drawNodes();

        // Рисуем информацию о зуме
        this.drawZoomInfo();
    }

    // Отрисовка сетки и фона
    drawGrid() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Рисуем радиальный градиент для фона
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.sqrt(width * width + height * height) / 2;

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, 'rgba(30, 30, 50, 0.3)');
        gradient.addColorStop(0.5, 'rgba(20, 20, 40, 0.5)');
        gradient.addColorStop(1, 'rgba(10, 10, 20, 0.7)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Рисуем орбиты (круги) вокруг центра
        const orbitCount = 8;
        const baseOrbitRadius = 100;

        ctx.strokeStyle = 'rgba(100, 150, 200, 0.1)';
        ctx.lineWidth = 1;

        for (let i = 1; i <= orbitCount; i++) {
            const radius = baseOrbitRadius * i * this.getZoom();
            const screenCenter = this.worldToScreen(0, 0);

            ctx.beginPath();
            ctx.arc(screenCenter.x, screenCenter.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Рисуем линии от центра (как спицы)
        const spokeCount = 12;
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.08)';

        for (let i = 0; i < spokeCount; i++) {
            const angle = (Math.PI * 2 * i) / spokeCount;
            const screenCenter = this.worldToScreen(0, 0);
            const endX = screenCenter.x + Math.cos(angle) * maxRadius;
            const endY = screenCenter.y + Math.sin(angle) * maxRadius;

            ctx.beginPath();
            ctx.moveTo(screenCenter.x, screenCenter.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    // Отрисовка групп узлов (фоновые области)
    drawNodeGroups() {
        if (!this.nodeGroups || this.nodeGroups.size === 0) return;

        const ctx = this.ctx;
        const zoom = this.getZoom();

        // Рисуем только видимые группы для оптимизации
        for (const [groupId, group] of this.nodeGroups.entries()) {
            const screenPos = this.worldToScreen(group.x, group.y);

            // Проверяем видимость группы
            const maxOrbitRadius = 200 * zoom;
            if (screenPos.x + maxOrbitRadius < -50 || screenPos.x - maxOrbitRadius > this.canvas.width + 50 ||
                screenPos.y + maxOrbitRadius < -50 || screenPos.y - maxOrbitRadius > this.canvas.height + 50) {
                continue;
            }

            // Рисуем орбиты группы (если есть)
            if (group.orbits && group.orbits.length > 0) {
                ctx.save();
                ctx.globalAlpha = 0.15;
                ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
                ctx.lineWidth = 1;

                for (const orbit of group.orbits) {
                    const radius = (orbit || 50) * zoom;
                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Рисуем фоновый круг для группы
            ctx.save();
            ctx.globalAlpha = 0.05;
            ctx.fillStyle = 'rgba(150, 180, 220, 0.2)';
            const groupRadius = 100 * zoom;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, groupRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Отрисовка связей
    drawConnections() {
        const ctx = this.ctx;

        for (const [nodeId, node] of Object.entries(this.treeData.nodes)) {
            if (!node.out || node.out.length === 0) continue;

            const fromPos = this.nodePositions.get(nodeId);
            if (!fromPos) continue;

            const fromScreen = this.worldToScreen(fromPos.x, fromPos.y);
            const isFromAllocated = this.allocatedNodes.has(nodeId);

            for (const targetId of node.out) {
                const toPos = this.nodePositions.get(targetId.toString());
                if (!toPos) continue;

                const toScreen = this.worldToScreen(toPos.x, toPos.y);
                const isToAllocated = this.allocatedNodes.has(targetId.toString());

                // Проверка на видимость линии
                if (!this.isLineVisible(fromScreen, toScreen)) continue;

                // Цвет связи зависит от того, взяты ли оба узла
                if (isFromAllocated && isToAllocated) {
                    // Активная связь - с свечением
                    ctx.save();
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(29, 209, 161, 0.8)';
                    ctx.strokeStyle = 'rgba(29, 209, 161, 0.9)';
                    ctx.lineWidth = 3;
                } else if (isFromAllocated || isToAllocated) {
                    // Частично активная
                    ctx.strokeStyle = 'rgba(100, 150, 180, 0.5)';
                    ctx.lineWidth = 2;
                } else {
                    // Неактивная
                    ctx.strokeStyle = 'rgba(80, 80, 100, 0.25)';
                    ctx.lineWidth = 1.5;
                }

                // Рисуем линию
                ctx.beginPath();
                ctx.moveTo(fromScreen.x, fromScreen.y);
                ctx.lineTo(toScreen.x, toScreen.y);
                ctx.stroke();

                if (isFromAllocated && isToAllocated) {
                    ctx.restore();
                }
            }
        }
    }

    // Проверка видимости линии на экране
    isLineVisible(p1, p2) {
        const margin = 50;
        const minX = -margin;
        const minY = -margin;
        const maxX = this.canvas.width + margin;
        const maxY = this.canvas.height + margin;

        return !(
            (p1.x < minX && p2.x < minX) ||
            (p1.x > maxX && p2.x > maxX) ||
            (p1.y < minY && p2.y < minY) ||
            (p1.y > maxY && p2.y > maxY)
        );
    }

    // Отрисовка узлов
    drawNodes() {
        const ctx = this.ctx;

        for (const [nodeId, pos] of this.nodePositions.entries()) {
            const node = pos.node;
            const screenPos = this.worldToScreen(pos.x, pos.y);

            // Пропускаем узлы за пределами экрана (оптимизация)
            if (screenPos.x < -50 || screenPos.x > this.canvas.width + 50 ||
                screenPos.y < -50 || screenPos.y > this.canvas.height + 50) {
                continue;
            }

            const isAllocated = this.allocatedNodes.has(nodeId);
            const isHovered = this.hoveredNode && this.hoveredNode.id == nodeId;

            // Размер и стиль узла зависит от типа (как в PoB)
            let radius = 6;
            let innerRadius = 4;
            let outerGlow = false;
            let shape = 'circle'; // По умолчанию круг

            switch(node.type) {
                case 'Notable':
                    radius = 10;
                    innerRadius = 7;
                    outerGlow = true;
                    break;
                case 'Keystone':
                    radius = 15;
                    innerRadius = 11;
                    outerGlow = true;
                    shape = 'hexagon'; // Keystone обычно шестиугольник
                    break;
                case 'JewelSocket':
                    radius = 12;
                    innerRadius = 8;
                    outerGlow = true;
                    shape = 'square'; // Jewel Socket квадратный
                    break;
                case 'Mastery':
                    radius = 11;
                    innerRadius = 7;
                    outerGlow = true;
                    shape = 'diamond'; // Mastery ромб
                    break;
                default: // Normal
                    radius = 6;
                    innerRadius = 4;
                    break;
            }

            const zoom = this.getZoom();
            const scaledRadius = radius * zoom;
            const scaledInnerRadius = innerRadius * zoom;

            // Цвета в зависимости от типа узла (как в PoB)
            let colors = {
                outer: '#4a4a6a',
                middle: '#3a3a5a',
                inner: '#2a2a4a',
                glow: '#5a5a8a'
            };

            switch(node.type) {
                case 'Notable':
                    colors = {
                        outer: '#6a6aaa',
                        middle: '#5a5a9a',
                        inner: '#4a4a8a',
                        glow: '#7a7aba'
                    };
                    break;
                case 'Keystone':
                    colors = {
                        outer: '#aa6a6a',
                        middle: '#9a5a5a',
                        inner: '#8a4a4a',
                        glow: '#ba7a7a'
                    };
                    break;
                case 'JewelSocket':
                    colors = {
                        outer: '#8a6aaa',
                        middle: '#7a5a9a',
                        inner: '#6a4a8a',
                        glow: '#9a7aba'
                    };
                    break;
                case 'Mastery':
                    colors = {
                        outer: '#aa9a6a',
                        middle: '#9a8a5a',
                        inner: '#8a7a4a',
                        glow: '#baaa7a'
                    };
                    break;
            }

            // Если узел взят - зеленый цвет
            if (isAllocated) {
                colors = {
                    outer: '#1dd1a1',
                    middle: '#17b88d',
                    inner: '#119e79',
                    glow: '#23e4b4'
                };
                outerGlow = true;
            }

            ctx.save();

            // Внешнее свечение для взятых/важных узлов
            if (outerGlow || isHovered) {
                const glowRadius = scaledRadius + (isHovered ? 8 : 4);
                const gradient = ctx.createRadialGradient(
                    screenPos.x, screenPos.y, scaledRadius,
                    screenPos.x, screenPos.y, glowRadius
                );
                gradient.addColorStop(0, isHovered ? 'rgba(255, 165, 0, 0.6)' : colors.glow + '80');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Основное тело узла с градиентом
            const nodeGradient = ctx.createRadialGradient(
                screenPos.x - scaledRadius * 0.3,
                screenPos.y - scaledRadius * 0.3,
                0,
                screenPos.x,
                screenPos.y,
                scaledRadius
            );
            nodeGradient.addColorStop(0, colors.inner);
            nodeGradient.addColorStop(0.6, colors.middle);
            nodeGradient.addColorStop(1, colors.outer);

            ctx.fillStyle = nodeGradient;

            // Рисуем форму в зависимости от типа узла
            ctx.beginPath();
            this.drawNodeShape(ctx, screenPos.x, screenPos.y, scaledRadius, shape);
            ctx.fill();

            // Обводка
            ctx.strokeStyle = colors.outer;
            ctx.lineWidth = isAllocated ? 3 : 2;
            ctx.beginPath();
            this.drawNodeShape(ctx, screenPos.x, screenPos.y, scaledRadius, shape);
            ctx.stroke();

            // Внутренний светлый круг для глубины
            if (scaledInnerRadius > 2) {
                const innerGradient = ctx.createRadialGradient(
                    screenPos.x - scaledInnerRadius * 0.4,
                    screenPos.y - scaledInnerRadius * 0.4,
                    0,
                    screenPos.x,
                    screenPos.y,
                    scaledInnerRadius
                );
                innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

                ctx.fillStyle = innerGradient;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, scaledInnerRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Дополнительное свечение при наведении
            if (isHovered) {
                ctx.shadowBlur = 25;
                ctx.shadowColor = isAllocated ? '#1dd1a1' : '#ffa500';
                ctx.strokeStyle = isAllocated ? '#23e4b4' : '#ffb733';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, scaledRadius + 2, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    // Отрисовка формы узла (круг, квадрат, шестиугольник, ромб)
    drawNodeShape(ctx, x, y, radius, shape) {
        switch(shape) {
            case 'circle':
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                break;

            case 'square':
                ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
                break;

            case 'hexagon':
                // Рисуем шестиугольник
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    const px = x + Math.cos(angle) * radius;
                    const py = y + Math.sin(angle) * radius;
                    if (i === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                }
                ctx.closePath();
                break;

            case 'diamond':
                // Рисуем ромб (повернутый квадрат)
                ctx.moveTo(x, y - radius);
                ctx.lineTo(x + radius, y);
                ctx.lineTo(x, y + radius);
                ctx.lineTo(x - radius, y);
                ctx.closePath();
                break;

            default:
                ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
    }

    // Отрисовка информации о зуме
    drawZoomInfo() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 220, 100);

        ctx.fillStyle = '#ffa500';
        ctx.font = '14px monospace';
        const zoom = this.getZoom();
        ctx.fillText(`Зум: ${(zoom * 100).toFixed(0)}% (уровень ${this.zoomLevel})`, 20, 30);
        ctx.fillText(`Узлов в билде: ${this.allocatedNodes.size}`, 20, 55);
        ctx.fillText(`Всего узлов: ${this.nodePositions.size}`, 20, 80);
    }

    // Центрирование дерева
    centerTree() {
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
        this.zoomLevel = -2; // Соответствует зуму ~0.83 (1.2^-2)
        this.render();
    }

    // Инициализация визуализации
    async initialize(container, allocatedNodeIds = []) {
        container.innerHTML = '';
        container.appendChild(this.canvas);

        this.resizeCanvas();

        // Показываем загрузку
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ffa500;
            font-size: 18px;
            text-align: center;
        `;
        loadingDiv.innerHTML = `
            <div class="spinner" style="margin: 0 auto 20px;"></div>
            <div>Загрузка дерева умений...</div>
        `;
        container.appendChild(loadingDiv);

        // Загружаем данные дерева
        await this.loadTreeData();

        // Устанавливаем выделенные узлы
        this.setAllocatedNodes(allocatedNodeIds);

        // Центрируем дерево
        this.centerTree();

        // Удаляем индикатор загрузки
        loadingDiv.remove();
    }
}
