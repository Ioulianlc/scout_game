import * as THREE from 'three';
import { LevelBuilder } from "./tools.js";
import { maps } from "./maps.js"; 

export class World {
    // On garde le constructeur complet (nécessaire pour game.js)
    constructor(scene, camera, scout) {
        this.scene = scene;
        this.camera = camera;
        this.scout = scout;

        this.colliders = []; 
        this.teleporters = []; 
        this.npcs = [];  
        
        this.currentMapMesh = null;
        this.debugMode = true; // Mets à false si tu veux cacher les boites rouges

        // On charge la carte par défaut définie dans maps.js
        this.loadMap("exterieur");
    }

    loadMap(mapId) {
        console.log(`🌍 Chargement de la carte : ${mapId}`);
        const data = maps[mapId];

        if (!data) {
            console.error("Erreur : Carte introuvable ->", mapId);
            return;
        }

        // 1. NETTOYAGE
        this.clearLevel();

        // 2. SPAWN DU JOUEUR
        if (data.spawn) {
            this.scout.mesh.position.set(data.spawn.x, data.spawn.y, 0);
        }

        // 3. CHARGEMENT TEXTURE & SOL
        const loader = new THREE.TextureLoader();
        loader.load(data.texture, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            const geometry = new THREE.PlaneGeometry(data.width, data.height);
            const material = new THREE.MeshBasicMaterial({ map: texture });
            
            this.currentMapMesh = new THREE.Mesh(geometry, material);
            this.currentMapMesh.position.z = -1; 
            this.scene.add(this.currentMapMesh);

            // Réactivation du Builder
            if (this.debugMode) {
                this.builder = new LevelBuilder(this.scene, this.camera, this.currentMapMesh);
            }
        });

        // 4. MURS & TÉLÉPORTEURS (Depuis maps.js)
        data.colliders.forEach(wall => {
            this.addCollider(wall.x, wall.y, wall.w, wall.h);
        });

        this.teleporters = data.teleporters || [];

        // 5. CRÉATION DES NPCS
        if (data.hasNPCs) {
            this.initNPCs();
        }
    }

    clearLevel() {
        if (this.currentMapMesh) {
            this.scene.remove(this.currentMapMesh);
            this.currentMapMesh.geometry.dispose();
            this.currentMapMesh.material.dispose();
            this.currentMapMesh = null;
        }

        this.colliders = [];
        this.teleporters = [];

        // Suppression propre des NPCs
        this.npcs.forEach(npc => {
            this.scene.remove(npc.mesh);
        });
        this.npcs = [];
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

    initNPCs() {
        // Renard
        this.addNPC(
            'Renard', 2, 0, './src/assets/biche.png', // Attention: image 'biche.png' pour le Renard ? À vérifier.
            ['./src/assets/renard_zoom.png', 'Merci d\'avoir éteint le feu !', 'Tu es un vrai héros.']
        );

        // Lapin
        this.addNPC(
            'Lapin', -2, 0, '/lapinspeek.png',
            ['/lapin_zoom.png', 'Attention, ça brûle par là-bas !', 'Vite, va chercher de l\'aide !']
        );

        // Castor
        this.addNPC(
            'Castor', 0, 2, '/castorspeek.png',
            ['/castorspeek.png', 'Salut jeune scout, tu est bien brave pour être arrivé jusqu\'ici !']
        );
    }

    addNPC(name, x, y, texturePath, dialogueData) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        }); 

        // Chargement de la texture du sprite (dans le monde)
        const loader = new THREE.TextureLoader();
        loader.load(texturePath, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            material.map = texture;
            material.needsUpdate = true;
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0.9); 
        this.scene.add(mesh);

        // Extraction des données de dialogue
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