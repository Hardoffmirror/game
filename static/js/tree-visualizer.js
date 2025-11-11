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

    // Отрисовка сетки
    drawGrid() {
        const ctx = this.ctx;
        const gridSize = 100 * this.zoom;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        // Вертикальные линии
        for (let x = this.offsetX % gridSize; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Горизонтальные линии
        for (let y = this.offsetY % gridSize; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    // Отрисовка связей
    drawConnections() {
        const ctx = this.ctx;

        ctx.lineWidth = 2;

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

                // Цвет связи зависит от того, взяты ли оба узла
                if (isFromAllocated && isToAllocated) {
                    ctx.strokeStyle = 'rgba(29, 209, 161, 0.8)';
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
                    ctx.lineWidth = 2;
                }

                ctx.beginPath();
                ctx.moveTo(fromScreen.x, fromScreen.y);
                ctx.lineTo(toScreen.x, toScreen.y);
                ctx.stroke();
            }
        }
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

            // Размер узла зависит от типа
            let radius = 5;
            let fillColor = '#4a4a6a';
            let strokeColor = '#6a6a8a';

            if (node.type === 'Notable') {
                radius = 8;
                fillColor = '#5a5a7a';
                strokeColor = '#8a8aaa';
            } else if (node.type === 'Keystone') {
                radius = 12;
                fillColor = '#7a4a4a';
                strokeColor = '#aa6a6a';
            }

            // Если узел взят в билде
            if (isAllocated) {
                fillColor = '#1dd1a1';
                strokeColor = '#1dd1a1';
                radius += 2;
            }

            // Если наведен курсор
            if (isHovered) {
                radius += 4;

                // Свечение вокруг узла
                ctx.shadowBlur = 20;
                ctx.shadowColor = isAllocated ? '#1dd1a1' : '#ffa500';
            } else {
                ctx.shadowBlur = 0;
            }

            // Рисуем внешнюю обводку
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, radius * this.zoom, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowBlur = 0;
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
