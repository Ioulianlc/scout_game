import * as THREE from 'three';

export class VegetationGenerator {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world; // On a besoin du World pour ajouter les collisions
        this.trees = [];
        
        // On charge l'image de l'arbre une seule fois pour optimiser
        const loader = new THREE.TextureLoader();
        this.treeTexture = loader.load('./src/assets/tree.png'); // Mets ton image d'arbre ici !
        this.treeTexture.magFilter = THREE.NearestFilter;
    }

    /**
     * Génère une forêt dans une zone rectangulaire
     * @param {number} minX - Début Zone X
     * @param {number} maxX - Fin Zone X
     * @param {number} minY - Début Zone Y
     * @param {number} maxY - Fin Zone Y
     * @param {number} count - Nombre d'arbres à planter
     */
    generateZone(minX, maxX, minY, maxY, count) {
        let planted = 0;
        let attempts = 0;

        while (planted < count && attempts < count * 5) {
            attempts++;

            // 1. Position aléatoire
            const x = Math.random() * (maxX - minX) + minX;
            const y = Math.random() * (maxY - minY) + minY;

            // 2. Vérification : Est-ce que c'est trop proche d'un autre arbre ?
            if (this.isTooClose(x, y)) continue;

            // 3. On plante !
            this.plantTree(x, y);
            planted++;
        }
        
        console.log(`🌲 Forêt générée : ${planted} arbres plantés.`);
    }

    isTooClose(x, y) {
        const minDistance = 2.5; // Espace minimum entre deux arbres (pour pouvoir passer)
        
        for (const tree of this.trees) {
            const dx = tree.x - x;
            const dy = tree.y - y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < minDistance) {
                return true; // Trop proche !
            }
        }
        return false;
    }

    plantTree(x, y) {
        // A. Visuel (L'image de l'arbre)
        // On suppose qu'un arbre fait 2x3 unités (ajuste selon ton image)
        const width = 3;
        const height = 3; 

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ 
            map: this.treeTexture, 
            transparent: true,
            alphaTest: 0.5 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Z-Index : On utilise Y pour la profondeur (les arbres plus bas cachent ceux plus haut)
        // On décale un peu le Z (y * 0.01) pour l'effet de profondeur
        mesh.position.set(x, y + height/2, 1); 
        this.scene.add(mesh);

        // B. Collision (Le tronc)
        // Le tronc est généralement en bas de l'image et plus petit que le feuillage
        // Ici on crée un carré de collision de 1x1 à la base de l'arbre
        this.world.addCollider(x, y, 1, 0.5); 

        // C. Sauvegarde
        this.trees.push({ x, y, mesh });
    }
}