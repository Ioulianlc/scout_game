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
        this.tentTexture = loader.load('./tente.png');
        this.tentTexture.magFilter = THREE.NearestFilter;

        // 4. NOUVEAU : LES 3 BÛCHES
        // On crée une liste (Array) avec tes 3 images
        this.logTextures = [
            loader.load('./rondindebois.png'),
            loader.load('./rondindebois1.png'),
            loader.load('./rondindebois2.png')
        ];
        
        // On applique le filtre "Pixel Art" sur les 3 images d'un coup
        this.logTextures.forEach(texture => {
            texture.magFilter = THREE.NearestFilter;
        });
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

    plantTent(x, y) {
        this.createMesh(x, y, 2, 3, this.tentTexture, false);
        this.world.addCollider(x, y, 1, 1.5); 
    }

    // --- NOUVEAU : PLANTER UNE BÛCHE ALÉATOIRE ---
    plantLog(x, y) {
        // 1. Choisir une texture au hasard dans la liste (0, 1 ou 2)
        const randomIndex = Math.floor(Math.random() * this.logTextures.length);
        const randomTexture = this.logTextures[randomIndex];

        // 2. Créer l'objet avec cette texture
        const mesh = this.createMesh(x, y, 0.8, 0.8, randomTexture, false);
        
        // 3. Nom pour l'inventaire
        mesh.name = "Bûche"; 

        // 4. Ajouter aux objets ramassables
        if (this.world.collectibles) {
            this.world.collectibles.push(mesh);
        }
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