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

        // Параметры визуализации
        this.zoom = 1.0;
        this.minZoom = 0.3;
        this.maxZoom = 3.0;
        this.offsetX = 0;
        this.offsetY = 0;

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
        // Обработка колесика мыши для зума
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

            // Зум к курсору
            const worldX = (mouseX - this.offsetX) / this.zoom;
            const worldY = (mouseY - this.offsetY) / this.zoom;

            this.zoom = newZoom;

            this.offsetX = mouseX - worldX * this.zoom;
            this.offsetY = mouseY - worldY * this.zoom;

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
            // Используем статические данные дерева
            // В реальном приложении нужно загружать актуальную версию с официального API
            const response = await fetch(`https://www.pathofexile.com/passive-skill-tree/3.25.0/data.json`);

            if (!response.ok) {
                // Если не удалось загрузить, используем упрощенную визуализацию
                console.warn('Не удалось загрузить данные дерева, используем упрощенную версию');
                this.createSimplifiedTree();
                return;
            }

            this.treeData = await response.json();
            console.log('Данные дерева загружены:', this.treeData);

            // Кэшируем позиции узлов для быстрого доступа
            this.cacheNodePositions();
        } catch (error) {
            console.error('Ошибка загрузки данных дерева:', error);
            this.createSimplifiedTree();
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
        return {
            x: x * this.zoom + this.offsetX,
            y: y * this.zoom + this.offsetY
        };
    }

    // Преобразование экранных координат в мировые
    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.zoom,
            y: (y - this.offsetY) / this.zoom
        };
    }

    // Проверка наведения на узел
    checkNodeHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldPos = this.screenToWorld(mouseX, mouseY);

        let foundNode = null;
        const hoverRadius = 15 / this.zoom; // Радиус в мировых координатах

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

    // Показать тултип
    showTooltip(node, x, y) {
        let tooltip = document.getElementById('tree-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tree-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #ffa500;
                border-radius: 10px;
                padding: 15px;
                color: #fff;
                font-size: 14px;
                pointer-events: none;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            `;
            document.body.appendChild(tooltip);
        }

        const isAllocated = this.allocatedNodes.has(node.id.toString());
        const statusBadge = isAllocated
            ? '<span style="color: #1dd1a1; font-weight: bold;">✓ Взято</span>'
            : '<span style="color: #888;">Не взято</span>';

        tooltip.innerHTML = `
            <div style="color: #ffa500; font-weight: bold; font-size: 16px; margin-bottom: 8px;">
                ${node.name || `Node ${node.id}`}
            </div>
            <div style="color: #aaa; font-size: 12px; margin-bottom: 5px;">
                ID: ${node.id} | Тип: ${node.type || 'Normal'}
            </div>
            <div style="margin-top: 8px;">
                ${statusBadge}
            </div>
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
            const radius = baseOrbitRadius * i * this.zoom;
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

            // Размер и стиль узла зависит от типа
            let radius = 6;
            let innerRadius = 4;
            let outerGlow = false;

            if (node.type === 'Notable') {
                radius = 10;
                innerRadius = 7;
                outerGlow = true;
            } else if (node.type === 'Keystone') {
                radius = 15;
                innerRadius = 11;
                outerGlow = true;
            }

            const scaledRadius = radius * this.zoom;
            const scaledInnerRadius = innerRadius * this.zoom;

            // Цвета в зависимости от состояния
            let colors = {
                outer: '#4a4a6a',
                middle: '#3a3a5a',
                inner: '#2a2a4a',
                glow: '#5a5a8a'
            };

            if (node.type === 'Notable') {
                colors = {
                    outer: '#6a6aaa',
                    middle: '#5a5a9a',
                    inner: '#4a4a8a',
                    glow: '#7a7aba'
                };
            } else if (node.type === 'Keystone') {
                colors = {
                    outer: '#aa6a6a',
                    middle: '#9a5a5a',
                    inner: '#8a4a4a',
                    glow: '#ba7a7a'
                };
            }

            // Если узел взят
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
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, scaledRadius, 0, Math.PI * 2);
            ctx.fill();

            // Обводка
            ctx.strokeStyle = colors.outer;
            ctx.lineWidth = isAllocated ? 3 : 2;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, scaledRadius, 0, Math.PI * 2);
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

    // Отрисовка информации о зуме
    drawZoomInfo() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 80);

        ctx.fillStyle = '#ffa500';
        ctx.font = '14px monospace';
        ctx.fillText(`Зум: ${(this.zoom * 100).toFixed(0)}%`, 20, 30);
        ctx.fillText(`Узлов в билде: ${this.allocatedNodes.size}`, 20, 50);
        ctx.fillText(`Всего узлов: ${this.nodePositions.size}`, 20, 70);
    }

    // Центрирование дерева
    centerTree() {
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
        this.zoom = 0.8;
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
