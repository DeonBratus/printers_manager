class GCode3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Создаем сцену
        this.scene = new THREE.Scene();
        
        // Настраиваем камеру
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(200, 200, 200);
        
        // Настраиваем рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Добавляем сетку
        const gridHelper = new THREE.GridHelper(200, 20);
        this.scene.add(gridHelper);

        // Добавляем оси
        const axesHelper = new THREE.AxesHelper(100);
        this.scene.add(axesHelper);

        this.setupScene();
        this.setupControls();
        this.animate();

        // Обработка изменения размера окна
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    setupScene() {
        // Настройка сцены
        this.scene.background = new THREE.Color(0x1e1e1e);
        
        // Добавляем освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(ambientLight, directionalLight);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    parseGCode(gcode) {
        // Очищаем сцену, оставляя только сетку и оси
        while(this.scene.children.length > 2) {
            const obj = this.scene.children[2];
            this.scene.remove(obj);
        }

        const lines = gcode.split('\n');
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        let currentPos = { x: 0, y: 0, z: 0 };
        let isExtruding = false;

        for (const line of lines) {
            const tokens = line.split(';')[0].trim().toUpperCase().split(/\s+/);
            const command = {};
            
            tokens.forEach(token => {
                if (token[0] && !isNaN(parseFloat(token.slice(1)))) {
                    command[token[0]] = parseFloat(token.slice(1));
                }
            });

            if (command.G === 0 || command.G === 1) {
                const newPos = {
                    x: command.X !== undefined ? command.X : currentPos.x,
                    y: command.Z !== undefined ? command.Z : currentPos.z,
                    z: command.Y !== undefined ? command.Y : currentPos.y
                };

                isExtruding = command.E !== undefined && command.E > 0;

                positions.push(currentPos.x, currentPos.y, currentPos.z);
                positions.push(newPos.x, newPos.y, newPos.z);
                
                // Разные цвета для экструзии и перемещения
                const color = isExtruding ? [0.26, 0.38, 0.93] : [0.5, 0.5, 0.5];
                colors.push(...color, ...color);

                currentPos = newPos;
            }
        }

        if (positions.length > 0) {
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.LineBasicMaterial({ 
                vertexColors: true,
                linewidth: 2
            });

            const lines3D = new THREE.LineSegments(geometry, material);
            this.scene.add(lines3D);

            // Центрируем камеру на модели
            const box = new THREE.Box3().setFromObject(lines3D);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
            
            this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
            this.camera.lookAt(center);
            this.controls.target.copy(center);
            
            this.controls.update();
        }
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
    }
}

export function initGCodeViewer() {
    const viewer = new GCode3DViewer('gcode-3d-preview');
    const fileInput = document.getElementById('gcode-file');
    const infoElement = document.querySelector('.info-card');
    const codeElement = document.querySelector('.gcode-content pre code');

    window.addEventListener('resize', () => viewer.handleResize());

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
