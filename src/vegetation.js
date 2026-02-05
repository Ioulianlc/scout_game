import * as THREE from 'three';

export class VegetationGenerator {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world; 
        this.trees = []; 
        
        const loader = new THREE.TextureLoader();

        // 1. ARBRES & BUISSONS
        this.treeTexture = loader.load('./tree.png'); 
        this.treeTexture.magFilter = THREE.NearestFilter;
        this.bushTexture = loader.load('./bush.png'); 
        this.bushTexture.magFilter = THREE.NearestFilter;
        this.fireTreeTexture = loader.load('./firetree.png'); 
        this.fireTreeTexture.magFilter = THREE.NearestFilter;

        // 2. GROS OBJETS
        this.towerTexture = loader.load('./tower.png'); 
        this.towerTexture.magFilter = THREE.NearestFilter;
        this.sacredTreeTexture = loader.load('./sacredtree.png'); 
        this.sacredTreeTexture.magFilter = THREE.NearestFilter;

        // 3. CAMPEMENT
        this.campfireTexture = loader.load('./feucamp.png');
        this.campfireTexture.magFilter = THREE.NearestFilter;
        
        // 4. NOUVEAU : TENTE
        this.tentTexture = loader.load('./tente.png');
        this.tentTexture.magFilter = THREE.NearestFilter;
    }

    // --- GÉNÉRATEURS DE ZONES ---
    generateZone(minX, maxX, minY, maxY, count) { this.generateGeneric(minX, maxX, minY, maxY, count, 'tree'); }
    generateBushes(minX, maxX, minY, maxY, count) { this.generateGeneric(minX, maxX, minY, maxY, count, 'bush'); }
    generateFireZone(minX, maxX, minY, maxY, count) { this.generateGeneric(minX, maxX, minY, maxY, count, 'fire'); }

    generateGeneric(minX, maxX, minY, maxY, count, type) {
        let planted = 0;
        let attempts = 0;
        while (planted < count && attempts < count * 5) {
            attempts++;
            const x = Math.random() * (maxX - minX) + minX;
            const y = Math.random() * (maxY - minY) + minY;
            if (this.isTooClose(x, y)) continue;

            if (type === 'tree') this.plantTree(x, y);
            else if (type === 'bush') this.plantBush(x, y);
            else if (type === 'fire') this.plantFireTree(x, y);
            planted++;
        }
    }

    isTooClose(x, y) {
        const minDistance = 2.0; 
        for (const item of this.trees) {
            const dx = item.x - x;
            const dy = item.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < minDistance) return true; 
        }
        return false;
    }

    // --- PLANTEURS ---

    plantTree(x, y) { this.createMesh(x, y, 3, 3, this.treeTexture, true); }
    plantBush(x, y) { this.createMesh(x, y, 1.5, 1.5, this.bushTexture, false); }
    plantFireTree(x, y) { this.createMesh(x, y, 3, 3, this.fireTreeTexture, true, 0xffaaaa); }
    
    plantTower(x, y) {
        this.createMesh(x, y, 4, 6, this.towerTexture, false); 
        this.world.addCollider(x, y, 3.5, 1.5); 
    }

    plantSacredTree(x, y) {
        this.createMesh(x, y, 6, 6, this.sacredTreeTexture, false, 0xffd700);
        this.world.addCollider(x, y, 2, 1); 
    }

    plantCampfire(x, y) {
        this.createMesh(x, y, 1.5, 1.5, this.campfireTexture, false);
        this.world.addCollider(x, y, 1, 1);
    }

    // --- NOUVEAU : TENTE ---
    plantTent(x, y) {
        // Une tente fait environ 3 de large et 2 de haut
        const width = 2;
        const height = 3;
        
        this.createMesh(x, y, width, height, this.tentTexture, false);
        
        // Collision : On bloque tout le bas de la tente (2.5 de large, 1 de haut)
        this.world.addCollider(x, y, 1, 1.5); 
    }

    // --- UTILITAIRE ---
    createMesh(x, y, w, h, texture, hasCollision, color = 0xffffff) {
        const geometry = new THREE.PlaneGeometry(w, h);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            alphaTest: 0.5,
            color: color 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y + h/2, 1); 
        this.scene.add(mesh);

        if (this.world.vegetation) this.world.vegetation.push(mesh);
        if (hasCollision) this.world.addCollider(x, y, 1, 0.5); 

        this.trees.push({ x, y });
        return mesh; 
    }
}