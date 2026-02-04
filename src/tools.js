import * as THREE from 'three';

export class LevelBuilder {
    constructor(scene, camera, mapMesh) {
        this.scene = scene;
        this.camera = camera;
        this.mapMesh = mapMesh; 

        this.raycaster = new THREE.Raycaster();
        this.mouseVector = new THREE.Vector2();

        this.initGhost();
        this.initLabel();
        this.addEvents();
    }

    initGhost() {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            opacity: 0.5, 
            transparent: true,
            side: THREE.DoubleSide
        });
        this.ghostMesh = new THREE.Mesh(geometry, material);
        this.ghostMesh.visible = false;
        this.ghostMesh.position.z = 2; 
        this.scene.add(this.ghostMesh);
    }

    initLabel() {
        this.mouseLabel = document.createElement('div');
        Object.assign(this.mouseLabel.style, {
            position: 'absolute',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#0f0',
            padding: '5px',
            borderRadius: '4px',
            pointerEvents: 'none',
            display: 'none',
            fontFamily: 'monospace',
            zIndex: '2000'
        });
        document.body.appendChild(this.mouseLabel);
    }

    addEvents() {
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('click', () => this.onClick());
    }

    onMouseMove(event) {
        this.mouseVector.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouseVector.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouseVector, this.camera);
        const intersects = this.raycaster.intersectObject(this.mapMesh);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const snapX = Math.round(point.x);
            const snapY = Math.round(point.y);

            this.ghostMesh.position.set(snapX, snapY, 2);
            this.ghostMesh.visible = true;

            this.mouseLabel.style.display = 'block';
            this.mouseLabel.style.left = (event.clientX + 15) + 'px';
            this.mouseLabel.style.top = (event.clientY + 15) + 'px';
            this.mouseLabel.innerHTML = `X: ${snapX}<br>Y: ${snapY}`;
        } else {
            this.ghostMesh.visible = false;
            this.mouseLabel.style.display = 'none';
        }
    }

    onClick() {
        if (this.ghostMesh.visible) {
            const x = this.ghostMesh.position.x;
            const y = this.ghostMesh.position.y;
            const codeMur = `this.addCollider(${x}, ${y}, 1, 1);`;
            console.log(`%c [BUILDER] ${codeMur}`, 'color: #bada55');
            
            this.ghostMesh.material.color.setHex(0x00ff00);
            setTimeout(() => this.ghostMesh.material.color.setHex(0xff0000), 200);
        }
    }
}