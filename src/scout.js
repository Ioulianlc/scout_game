import * as THREE from 'three';

export class Scout {
    constructor(scene) {
        this.scene = scene;

        // --- 1. CONFIGURATION DU SPRITE (ANIMATION) ---
        // Géométrie et Matériau
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 'red',
            transparent: true,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        // Important : Z=1 pour être sûr d'être DEVANT le décor (Z=0)
        this.mesh.position.set(0, 0, 1); 
        this.scene.add(this.mesh);

        // --- 2. DONNÉES GAMEPLAY ---
        this.speed = 4; 
        this.collider = new THREE.Box3(); 
    }

    update(deltaTime, inputs, obstacles) {
        const velocity = { x: 0, y: 0 };
        let isMoving = false;

        if (inputs.keys.up) { velocity.y = 1; isMoving = true; }
        if (inputs.keys.down) { velocity.y = -1; isMoving = true; }
        if (inputs.keys.left) { velocity.x = -1; isMoving = true; }
        if (inputs.keys.right) { velocity.x = 1; isMoving = true; }

        // --- 3. MOUVEMENT AVEC GLISSEMENT (SLIDING) ---
        if (isMoving) {
            // Normalisation (diagonale pas plus rapide)
            if (velocity.x !== 0 && velocity.y !== 0) {
                const factor = 1 / Math.sqrt(2);
                velocity.x *= factor;
                velocity.y *= factor;
            }

            const moveStep = this.speed * deltaTime;

            // Axe X : On teste si on peut bouger horizontalement
            const nextX = this.mesh.position.x + (velocity.x * moveStep);
            // On vérifie la collision à (NextX, ActuelY)
            if (!this.checkCollision(nextX, this.mesh.position.y, obstacles)) {
                this.mesh.position.x = nextX;
            }

            // Axe Y : On teste séparément si on peut bouger verticalement
            const nextY = this.mesh.position.y + (velocity.y * moveStep);
            // On vérifie la collision à (ActuelX, NextY)
            if (!this.checkCollision(this.mesh.position.x, nextY, obstacles)) {
                this.mesh.position.y = nextY;
            }

            // Orientation du sprite (Flip)
            if (velocity.x < 0) this.mesh.scale.x = -1; // Regarde à gauche
            else if (velocity.x > 0) this.mesh.scale.x = 1; // Regarde à droite
        }
    }

    checkCollision(targetX, targetY, obstacles) {
        // Hitbox plus petite que le sprite (ex: 0.5) pour être permissif
        // On centre la hitbox sur la position cible
        this.collider.setFromCenterAndSize(
            new THREE.Vector3(targetX, targetY, 0),
            new THREE.Vector3(0.5, 0.5, 1) 
        );

        for (const obstacleBox of obstacles) {
            if (this.collider.intersectsBox(obstacleBox)) {
                return true; 
            }
        }
        return false;
    }
}