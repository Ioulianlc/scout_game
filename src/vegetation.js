import * as THREE from 'three';

export class VegetationGenerator {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world; 
        this.trees = []; // Sert uniquement pour vérifier la distance entre les arbres lors de la génération
        
        // On charge l'image de l'arbre
        const loader = new THREE.TextureLoader();
        // J'ai mis le chemin standard 'src/assets/'. Vérifie que ton image est bien là !
        this.treeTexture = loader.load('./tree.png'); 
        this.treeTexture.magFilter = THREE.NearestFilter;
    }

    /**
     * Génère une forêt dans une zone rectangulaire
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
        const minDistance = 2.5; 
        
        for (const tree of this.trees) {
            const dx = tree.x - x;
            const dy = tree.y - y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < minDistance) {
                return true; 
            }
        }
        return false;
    }

    plantTree(x, y) {
        // A. Visuel (L'image de l'arbre)
        const width = 3;
        const height = 3; 

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ 
            map: this.treeTexture, 
            transparent: true,
            alphaTest: 0.5 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Z-Index : On utilise Y pour la profondeur
        mesh.position.set(x, y + height/2, 1); 
        this.scene.add(mesh);

        // --- C'EST ICI QUE LA FUSION AGIT ---
        // On ajoute le mesh à la liste du World pour qu'il puisse être supprimé au changement de map
        if (this.world.vegetation) {
            this.world.vegetation.push(mesh);
        }

        // B. Collision (Le tronc)
        // Le tronc est un obstacle invisible en bas de l'arbre
        this.world.addCollider(x, y, 1, 0.5); 

        // C. Sauvegarde interne pour le calcul de distance
        this.trees.push({ x, y, mesh });
    }
}