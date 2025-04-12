class GCode3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Создаем сцену
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xeeeeee);
        
        // Настраиваем камеру с лучшим соотношением сторон
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 150, 200); // Изменяем начальную позицию камеры
        
        // Настраиваем рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Добавляем более детальную сетку
        const gridHelper = new THREE.GridHelper(200, 50, 0x999999, 0xcccccc);
        gridHelper.position.y = -1; // Опускаем сетку ниже
        this.scene.add(gridHelper);

        // Улучшенное освещение для лучшей видимости рёбер
        this.setupLighting();
        
        // Материал для подсветки рёбер
        this.edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 3,
            opacity: 0.0,
            transparent: true,
            depthWrite: false
        });

        // Настраиваем управление
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.update();

        // Запускаем анимацию
        this.animate();

        // Обработка изменения размера окна
        window.addEventListener('resize', this.handleResize.bind(this));

        // Группы для разных типов линий
        this.layers = [];  // Добавим массив для хранения слоев
        this.lineGroups = {
            travel: {},    // Будет хранить объекты по слоям
            wall: {},
            'wall-inner': {},
            skin: {},
            fill: {},
            support: {},
            skirt: {},
            prime: {}
        };

        // Настройки видимости - travel теперь false по умолчанию
        this.viewSettings = {
            showTravel: false,  // изменено с true на false
            showWall: true,
            showWallInner: true,
            showSkin: true,
            showFill: true,
            showSupport: true,
            showSkirt: true,
            showPrime: true
        };

        // Цвета для разных типов линий
        this.colors = {
            travel: [0.5, 0.5, 0.5],      // светло-серый
            wall: [1.0, 0.0, 0.0],        // красный - внешние стены
            'wall-inner': [1.0, 0.4, 0.4], // светло-красный - внутренние стены
            skin: [0.0, 0.0, 1.0],        // синий - верхние/нижние слои
            fill: [0.0, 0.8, 0.0],        // зеленый - заполнение
            support: [1.0, 0.5, 0.0],     // оранжевый - поддержки
            skirt: [0.5, 0.0, 0.5],       // фиолетовый - юбка/брим
            prime: [0.0, 0.0, 0.0]        // черный - прайм башня
        };

        // Толщина для разных типов линий
        this.lineWidths = {
            travel: 1,
            wall: 5,           // увеличили с 3 до 5
            'wall-inner': 4,   // увеличили с 2 до 4
            skin: 4,           // увеличили с 2 до 4
            fill: 3,           // увеличили с 1 до 3
            support: 2,        // увеличили с 1 до 2
            skirt: 3,          // увеличили с 2 до 3
            prime: 3           // увеличили с 2 до 3
        };

        // Сохраним последний загруженный G-code
        this.lastGCode = '';

        // Добавляем настройки для слоев
        this.layerSettings = {
            minLayer: 0,
            maxLayer: 0,
            currentLayer: 0
        };

        // Инициализация слайдера слоев
        this.setupLayerSlider();

        // Добавим обработчики событий для чекбоксов
        this.setupViewControls();

        // В конце конструктора добавим принудительное обновление размеров
        requestAnimationFrame(() => {
            this.handleResize();
            this.renderer.render(this.scene, this.camera);
        });
    }

    setupLighting() {
        // Удаляем старое освещение
        this.scene.children
            .filter(child => child instanceof THREE.Light)
            .forEach(light => this.scene.remove(light));

        // Основной свет сверху
        const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
        topLight.position.set(0, 200, 100);
        this.scene.add(topLight);

        // Фоновое освещение для подсветки рёбер
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.6);
        frontLight.position.set(0, 0, 200);
        this.scene.add(frontLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, 0, -200);
        this.scene.add(backLight);

        const sideLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
        sideLight1.position.set(200, 0, 0);
        this.scene.add(sideLight1);

        const sideLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        sideLight2.position.set(-200, 0, 0);
        this.scene.add(sideLight2);

        // Мягкий рассеянный свет
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);
    }

    setupLayerSlider() {
        const slider = document.getElementById('layer-slider');
        const currentLayerSpan = document.getElementById('current-layer');
        const maxLayerSpan = document.getElementById('max-layer');

        if (slider && currentLayerSpan && maxLayerSpan) {
            slider.addEventListener('input', (e) => {
                const layer = parseInt(e.target.value);
                this.layerSettings.currentLayer = layer;
                currentLayerSpan.textContent = layer;
                this.updateLayerVisibility(layer);
            });
        }
    }

    setupViewControls() {
        const controls = ['travel', 'wall', 'wall-inner', 'skin', 'fill', 'support', 'skirt', 'prime'];
        controls.forEach(type => {
            const checkbox = document.getElementById(`show-${type}`);
            if (checkbox) {
                // Устанавливаем начальное состояние чекбокса
                checkbox.checked = this.viewSettings[`show${type.charAt(0).toUpperCase() + type.slice(1)}`];
                
                checkbox.addEventListener('change', (e) => {
                    this.viewSettings[`show${type.charAt(0).toUpperCase() + type.slice(1)}`] = e.target.checked;
                    // Обновляем видимость с учетом текущего слоя
                    this.updateLayerVisibility(this.layerSettings.currentLayer);
                });
            }
        });
    }

    parseGCode(gcode) {
        this.lastGCode = gcode;
        this.clearScene();
        
        // Создаем отдельные геометрии для каждого типа линий
        const geometries = {
            travel: { positions: [], colors: [], layers: [] },
            wall: { positions: [], colors: [], layers: [] },
            'wall-inner': { positions: [], colors: [], layers: [] },
            skin: { positions: [], colors: [], layers: [] },
            fill: { positions: [], colors: [], layers: [] },
            support: { positions: [], colors: [], layers: [] },
            skirt: { positions: [], colors: [], layers: [] },
            prime: { positions: [], colors: [], layers: [] }
        };
        
        let currentPos = { x: 0, y: 0, z: 0 };
        let minPos = { x: Infinity, y: Infinity, z: Infinity };
        let maxPos = { x: -Infinity, y: -Infinity, z: -Infinity };
        let currentZ = 0;
        let currentLayer = 0;
        let lastCommand = '';

        const lines = gcode.split('\n');
        for (const line of lines) {
            if (line.trim().length === 0) continue;
            
            // Парсим комментарии Cura
            const comment = line.split(';')[1]?.toLowerCase() || '';
            if (comment.includes('type:')) {
                lastCommand = comment.split('type:')[1].trim();
                continue;
            }

            // Парсим команду
            const tokens = line.split(';')[0].trim().toUpperCase().split(/\s+/);
            const command = {};
            
            tokens.forEach(token => {
                if (token[0] && !isNaN(parseFloat(token.slice(1)))) {
                    command[token[0]] = parseFloat(token.slice(1));
                }
            });

            // Определяем смену слоя
            if (command.Z !== undefined && command.Z !== currentZ) {
                currentZ = command.Z;
                currentLayer++;
            }

            if (command.G === 0 || command.G === 1) {
                const newPos = {
                    x: command.X !== undefined ? command.X : currentPos.x,
                    y: command.Y !== undefined ? command.Y : currentPos.y,
                    z: command.Z !== undefined ? command.Z : currentPos.z
                };

                // Обновляем границы
                Object.keys(newPos).forEach(axis => {
                    minPos[axis] = Math.min(minPos[axis], newPos[axis]);
                    maxPos[axis] = Math.max(maxPos[axis], newPos[axis]);
                });

                // Определяем тип линии на основе комментариев Cura
                let type = 'travel';
                if (command.E !== undefined && command.E > 0) {
                    if (lastCommand.includes('wall-outer')) {
                        type = 'wall';
                    } else if (lastCommand.includes('wall-inner')) {
                        type = 'wall-inner';
                    } else if (lastCommand.includes('skin')) {
                        type = 'skin';
                    } else if (lastCommand.includes('fill')) {
                        type = 'fill';
                    } else if (lastCommand.includes('support')) {
                        type = 'support';
                    } else if (lastCommand.includes('skirt') || lastCommand.includes('brim')) {
                        type = 'skirt';
                    } else if (lastCommand.includes('prime')) {
                        type = 'prime';
                    }
                }

                // Добавляем линию в соответствующую геометрию
                if (this.viewSettings[`show${type.charAt(0).toUpperCase() + type.slice(1)}`]) {
                    geometries[type].positions.push(
                        currentPos.x, currentPos.y, currentPos.z,
                        newPos.x, newPos.y, newPos.z
                    );
                    
                    // Делаем цвет ярче для верхних слоев
                    const layerFactor = currentLayer / (currentLayer + 5);
                    const color = this.colors[type].map(c => c * (0.7 + 0.3 * layerFactor));
                    geometries[type].colors.push(...color, ...color);
                    geometries[type].layers.push(currentLayer, currentLayer);
                }

                currentPos = newPos;
            }
        }

        this.layerSettings.maxLayer = currentLayer;
        this.layerSettings.currentLayer = currentLayer;

        // После определения границ модели, изменим подход к центрированию
        // Вычисляем реальный центр модели
        const center = {
            x: (minPos.x + maxPos.x) / 2,
            y: (minPos.y + maxPos.y) / 2,
            z: (minPos.z + maxPos.z) / 2
        };

        const size = {
            x: maxPos.x - minPos.x,
            y: maxPos.y - minPos.y,
            z: maxPos.z - minPos.z
        };

        // Используем меньший масштаб для более компактного отображения
        const maxSize = Math.max(size.x, size.y, size.z);
        const scale = 50 / maxSize; // уменьшили с 80 до 50

        // Создаем и добавляем линии для каждого типа
        Object.entries(geometries).forEach(([type, geometry]) => {
            if (geometry.positions.length > 0) {
                // В цикле нормализации позиций
                for (let i = 0; i < geometry.positions.length; i += 3) {
                    // Центрируем относительно начала координат и поднимаем модель над сеткой
                    geometry.positions[i] = (geometry.positions[i] - center.x) * scale;
                    geometry.positions[i + 1] = (geometry.positions[i + 1] - center.y) * scale;
                    geometry.positions[i + 2] = (geometry.positions[i + 2] - center.z) * scale + 3; // Добавляем смещение вверх
                }

                // Создаем отдельные группы для каждого слоя
                const layerGroups = {};
                const positions = geometry.positions;
                const colors = geometry.colors;
                const layers = geometry.layers;

                // Группируем геометрию по слоям
                const layerGeometries = {};
                for (let i = 0; i < positions.length; i += 6) { // 6 потому что каждая линия это 2 точки по 3 координаты
                    const layer = layers[i / 3];
                    if (!layerGeometries[layer]) {
                        layerGeometries[layer] = {
                            positions: [],
                            colors: []
                        };
                    }
                    // Добавляем обе точки линии
                    for (let j = 0; j < 6; j++) {
                        layerGeometries[layer].positions.push(positions[i + j]);
                    }
                    for (let j = 0; j < 6; j++) {
                        layerGeometries[layer].colors.push(colors[i + j]);
                    }
                }

                // Создаем отдельные меши для каждого слоя
                Object.entries(layerGeometries).forEach(([layer, layerGeometry]) => {
                    const bufferGeometry = new THREE.BufferGeometry();
                    bufferGeometry.setAttribute('position', 
                        new THREE.Float32BufferAttribute(layerGeometry.positions, 3));
                    bufferGeometry.setAttribute('color', 
                        new THREE.Float32BufferAttribute(layerGeometry.colors, 3));

                    const material = new THREE.LineBasicMaterial({
                        vertexColors: true,
                        linewidth: this.lineWidths[type],
                        transparent: true,
                    });

                    const lines = new THREE.LineSegments(bufferGeometry, material);
                    lines.rotation.x = -Math.PI / 2;
                    lines.userData.type = type;
                    lines.userData.layer = parseInt(layer);

                    if (!this.lineGroups[type][layer]) {
                        this.lineGroups[type][layer] = [];
                    }
                    this.lineGroups[type][layer].push(lines);
                    this.scene.add(lines);

                    // Сохраняем уникальные слои
                    if (!this.layers.includes(parseInt(layer))) {
                        this.layers.push(parseInt(layer));
                    }
                });
            }
        });

        // Сортируем слои
        this.layers.sort((a, b) => a - b);
        this.layerSettings.maxLayer = Math.max(...this.layers);

        // После парсинга обновляем слайдер
        const slider = document.getElementById('layer-slider');
        const maxLayerSpan = document.getElementById('max-layer');
        const currentLayerSpan = document.getElementById('current-layer');

        if (slider && maxLayerSpan && currentLayerSpan) {
            slider.max = this.layerSettings.maxLayer;
            slider.value = this.layerSettings.maxLayer;
            maxLayerSpan.textContent = this.layerSettings.maxLayer;
            currentLayerSpan.textContent = this.layerSettings.maxLayer;
        }

        // Устанавливаем начальную видимость travel moves
        if (this.lineGroups.travel) {
            Object.values(this.lineGroups.travel).forEach(objects => {
                objects.forEach(obj => obj.visible = false);
            });
        }

        // Обновляем камеру
        this.updateCamera();

        // После обновления камеры добавляем принудительное обновление размеров и рендер
        requestAnimationFrame(() => {
            this.handleResize();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });
    }

    clearScene() {
        // Очищаем сцену
        while(this.scene.children.length > 2) {
            const obj = this.scene.children[2];
            this.scene.remove(obj);
        }
        
        // Очищаем структуры данных
        this.layers = [];
        Object.keys(this.lineGroups).forEach(type => {
            this.lineGroups[type] = {};
        });
    }

    updateCamera() {
        // Уменьшаем дистанцию камеры
        const distance = 100; // уменьшили со 150 до 100
        this.camera.position.set(distance, distance * 0.8, distance * 0.8);
        this.camera.lookAt(0, 25, 0); // Смотрим на центр приподнятой модели
        this.controls.target.set(0, 25, 0); // Центр вращения тоже поднимаем
        
        // Обновляем ограничения зума
        this.controls.minDistance = 20;  // уменьшили с 50 до 20
        this.controls.maxDistance = 200; // уменьшили с 400 до 200
        
        this.controls.update();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        // Добавляем принудительный рендер после изменения размера
        this.renderer.render(this.scene, this.camera);
    }

    updateLayerVisibility(layer) {
        // Проходим по всем типам линий
        Object.entries(this.lineGroups).forEach(([type, layerGroups]) => {
            // Проверяем видимость типа
            const shouldBeVisible = this.viewSettings[`show${type.charAt(0).toUpperCase() + type.slice(1)}`];
            
            // Проходим по всем слоям данного типа
            Object.entries(layerGroups).forEach(([layerNum, objects]) => {
                const currentLayer = parseInt(layerNum);
                objects.forEach(obj => {
                    // Показываем только если тип видимый и слой подходящий
                    obj.visible = shouldBeVisible && currentLayer <= layer;
                    
                    if (obj.visible) {
                        // Настраиваем прозрачность только для видимых объектов
                        if (currentLayer === layer) {
                            obj.material.opacity = 1.0; // Текущий слой полностью непрозрачный
                        } else if (currentLayer < layer) {
                            obj.material.opacity = 0.3; // Нижние слои полупрозрачные
                        }
                    }
                });
            });
        });

        // Обновляем рендер
        this.renderer.render(this.scene, this.camera);
    }
}

export function initGCodeViewer() {
    const viewer = new GCode3DViewer('gcode-3d-preview');
    const fileInput = document.getElementById('gcode-file');
    const infoElement = document.querySelector('.info-card');
    const codeElement = document.querySelector('.gcode-content pre code');

    window.addEventListener('resize', () => viewer.handleResize());

    // Добавляем принудительную инициализацию после создания
    setTimeout(() => {
        viewer.handleResize();
        viewer.renderer.render(viewer.scene, viewer.camera);
    }, 100);

    if (!fileInput || !infoElement || !codeElement) {
        console.error('Required elements not found');
        return;
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const gcode = e.target.result;
            viewer.parseGCode(gcode);

            infoElement.innerHTML = `
                <h4>File Info</h4>
                <p>Name: ${file.name}</p>
                <p>Size: ${(file.size / 1024).toFixed(1)} KB</p>
                <p>Lines: ${gcode.split('\n').length}</p>
            `;

            codeElement.textContent = gcode.split('\n').slice(0, 100).join('\n');
        };
        reader.readAsText(file);
    });
}
