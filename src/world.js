import * as THREE from 'three';
import { LevelBuilder } from "./tools.js"; // Import OBLIGATOIRE pour le curseur rouge

export class World {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera; // On stocke la caméra pour l'outil de construction
        this.colliders = []; 
        this.npcs = [];  
        
        this.debugMode = true;

        this.initLevel();
        this.initNPCs();
    }

    initLevel() {
        const loader = new THREE.TextureLoader();
        const mapW = 192; 
        const mapH = 112; 

        loader.load('./src/assets/map.png', (texture) => {
            texture.magFilter = THREE.NearestFilter;
            const geometry = new THREE.PlaneGeometry(mapW, mapH);
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const mapMesh = new THREE.Mesh(geometry, material);
            this.scene.add(mapMesh);

            // --- LANCEMENT DU BUILDER (Curseur Rouge) ---
            if (this.debugMode) {
                // On passe la scene, la camera et le mesh du sol pour que le rayon touche bien le sol
                this.builder = new LevelBuilder(this.scene, this.camera, mapMesh);
                console.log("🛠️ Mode Construction Activé !");
            }
        });

        // Tes collisions existantes
        this.addCollider(-78, 30, 52, 1); 
        this.addCollider(-52.4, 24, 1, 12); 
        // Note: scene.width n'existe pas par défaut dans Three.js, j'ai mis mapW pour être sûr
        this.addCollider(mapW, 48, 1, 1);
        // Dans world.js, méthode initLevel()

        // 1. Bord GAUCHE (Position X: -96.5)
        this.addCollider(-96.5, 0, 1, mapH); 

        // 2. Bord DROITE (Position X: 96.5)
        this.addCollider(96.5, 0, 1, mapH);

        // 3. Bord BAS (Position Y: -56.5)
        this.addCollider(0, -56.5, mapW, 1);

        // 4. Bord HAUT (Position Y: 56.5)
        this.addCollider(0, 56.5, mapW, 1); 
    }

    initNPCs() {
        // --- AJOUT DES ANIMAUX ---
        this.addNPC(
            'Renard', 2, 0, './src/assets/biche.png', 
            ['./src/assets/renard_zoom.png', 'Merci d\'avoir éteint le feu !', 'Tu es un vrai héros.']
        );

        this.addNPC(
            'Lapin', -2, 0, './src/imgdialogue/lapinspeek.png',
            ['./src/assets/lapin_zoom.png', 'Attention, ça brûle par là-bas !', 'Vite, va chercher de l\'aide !']
        );

        this.addNPC(
            'Castor', 0, 2, './src/imgdialogue/castorspeek.png',
            ['./src/imgdialogue/castorspeek.png', 'Salut jeune scout, tu est bien brave pour être arrivé jusqu\'ici !']
        );
    }

    addCollider(x, y, w, h) {
        const box = new THREE.Box3();
        box.setFromCenterAndSize(
            new THREE.Vector3(x, y, 0),
            new THREE.Vector3(w, h, 1)
        );
        this.colliders.push(box);
        if (this.debugMode) {
            const helper = new THREE.Box3Helper(box, 0xff0000);
            this.scene.add(helper);
        }
    }

    addNPC(name, x, y, texturePath, dialogueData) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const loader = new THREE.TextureLoader();
        
        // Création du matériel AVANT de charger, pour pouvoir l'utiliser tout de suite
        const material = new THREE.MeshBasicMaterial({ 
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        }); 

        // Chargement asynchrone
        loader.load(texturePath, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            material.map = texture;
            material.needsUpdate = true;
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0.9); 
        this.scene.add(mesh);

        const portraitUrl = dialogueData[0];
        const phrases = dialogueData.slice(1);

        this.npcs.push({
            name: name,
            position: mesh.position,
            portrait: portraitUrl,
            phrases: phrases,
            mesh: mesh
        });
    }
}