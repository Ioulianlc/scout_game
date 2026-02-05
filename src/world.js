import * as THREE from 'three';
import { LevelBuilder } from "./tools.js";
import { maps } from "./maps.js"; // <--- Import des données

export class World {
    // Ajout de 'scout' dans le constructeur pour pouvoir le téléporter si besoin
    constructor(scene, camera, scout) {
        this.scene = scene;
        this.camera = camera;
        this.scout = scout;

        this.colliders = []; 
        this.teleporters = []; // Liste des zones de TP
        this.npcs = [];  
        
        this.currentMapMesh = null;
        this.debugMode = true;

        // Au lieu de initLevel(), on charge la carte "exterieur" définie dans maps.js
        this.loadMap("exterieur");
    }

    loadMap(mapId) {
        console.log(`🌍 Chargement de la carte : ${mapId}`);
        const data = maps[mapId];

        if (!data) {
            console.error("Erreur : Carte introuvable ->", mapId);
            return;
        }

        // 1. NETTOYAGE (On supprime l'ancienne map et les NPC)
        this.clearLevel();

        // --- NOUVEAU : DÉPLACEMENT DU JOUEUR AU SPAWN ---
        // On vérifie si un point de spawn existe, et on téléporte le scout dessus
        if (data.spawn) {
            this.scout.mesh.position.set(data.spawn.x, data.spawn.y, 0);
        }
        // ------------------------------------------------

        // 2. CHARGEMENT TEXTURE & SOL
        const loader = new THREE.TextureLoader();
        loader.load(data.texture, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            const geometry = new THREE.PlaneGeometry(data.width, data.height);
            const material = new THREE.MeshBasicMaterial({ map: texture });
            
            this.currentMapMesh = new THREE.Mesh(geometry, material);
            this.currentMapMesh.position.z = -1; // En arrière plan
            this.scene.add(this.currentMapMesh);

            // Réactivation du Builder sur la nouvelle map
            if (this.debugMode) {
                this.builder = new LevelBuilder(this.scene, this.camera, this.currentMapMesh);
            }
        });

        // 3. CRÉATION DES MURS (Depuis le fichier maps.js)
        data.colliders.forEach(wall => {
            this.addCollider(wall.x, wall.y, wall.w, wall.h);
        });

        // 4. CRÉATION DES TÉLÉPORTEURS
        this.teleporters = data.teleporters;

        // 5. CRÉATION DES NPCS (Seulement si la carte le demande)
        if (data.hasNPCs) {
            this.initNPCs();
        }
    }

    clearLevel() {
        // Supprime le sol
        if (this.currentMapMesh) {
            this.scene.remove(this.currentMapMesh);
            this.currentMapMesh.geometry.dispose();
            this.currentMapMesh.material.dispose();
            this.currentMapMesh = null;
        }

        // Supprime les murs (colliders)
        // Note : Les Box3Helper rouges restent parfois si on ne les track pas, 
        // mais pour simplifier on vide juste le tableau logique ici.
        this.colliders = [];
        this.teleporters = [];

        // Supprime les NPCs (Important pour ne pas avoir de Renard dans la grotte)
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
        // --- AJOUT DES ANIMAUX (Identique à ton code) ---
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

    addNPC(name, x, y, texturePath, dialogueData) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const loader = new THREE.TextureLoader();
        
        const material = new THREE.MeshBasicMaterial({ 
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        }); 

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