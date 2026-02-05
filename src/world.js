import * as THREE from 'three';
import { LevelBuilder } from "./tools.js";
import { maps } from "./maps.js"; 
// N'oublie pas cet import !
import { VegetationGenerator } from "./vegetation.js"; 

export class World {
    constructor(scene, camera, scout) {
        this.scene = scene;
        this.camera = camera;
        this.scout = scout;

        this.colliders = []; 
        this.teleporters = []; 
        this.npcs = [];  
        
        // Liste pour stocker les arbres
        this.vegetation = []; 
        
        this.currentMapMesh = null;
        this.debugMode = true;

        // On lance la première carte
        this.loadMap("exterieur");
    }

    // --- C'EST ICI QUE DOIT ÊTRE LA LOGIQUE DES ARBRES ---
    loadMap(mapId) {
        console.log(`🌍 Chargement de la carte : ${mapId}`);

        this.currentMapId = mapId;
        const data = maps[mapId];

        if (!data) {
            console.error("Erreur : Carte introuvable ->", mapId);
            return;
        }

        // 1. NETTOYAGE (Arbres, murs, NPCs...)
        this.clearLevel();

        // 2. SPAWN
        if (data.spawn) {
            this.scout.mesh.position.set(data.spawn.x, data.spawn.y, 0);
        }

        // 3. TEXTURE SOL
        const loader = new THREE.TextureLoader();
        loader.load(data.texture, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            const geometry = new THREE.PlaneGeometry(data.width, data.height);
            const material = new THREE.MeshBasicMaterial({ map: texture });
            
            this.currentMapMesh = new THREE.Mesh(geometry, material);
            this.currentMapMesh.position.z = -1; 
            this.scene.add(this.currentMapMesh);

            if (this.debugMode) {
                this.builder = new LevelBuilder(this.scene, this.camera, this.currentMapMesh);
            }
        });

        // 4. MURS & TÉLÉPORTEURS
        data.colliders.forEach(wall => {
            this.addCollider(wall.x, wall.y, wall.w, wall.h);
        });
        this.teleporters = data.teleporters || [];

        // 5. NPCS
        if (data.hasNPCs) {
            this.initNPCs();
        }

        // 6. GÉNÉRATION DES ARBRES (C'est ici la bonne place !)
        // On vérifie le mapId qui est passé en argument de la fonction loadMap
        if (mapId === "exterieur") {
            const veg = new VegetationGenerator(this.scene, this);
            veg.generateZone(-42, 34, -55, -6, 200);
            veg.generateZone(-10, 42, 39, 10, 60);
            veg.generateZone(-17, 48, 56, 40, 43);
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

        // Supprime les arbres
        if (this.vegetation) {
            this.vegetation.forEach(tree => {
                this.scene.remove(tree);
                if (tree.geometry) tree.geometry.dispose();
                if (tree.material) tree.material.dispose();
            });
            this.vegetation = []; // Vide la liste
        }

        // Vide les listes de collisions
        this.colliders = [];
        this.teleporters = [];

        // Supprime les NPCs
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
            'Renard', 2, 0, './renarddialogue.png', 
            ['./renarddialogue.png', 'Merci d\'avoir éteint le feu !', 'Tu es un vrai héros.']
        );
        // ecureuil
        this.addNPC(
            'Ecureuil', -2, 0, './ecureuildialogue.png',
            ['./ecureuildialogue.png', 'Attention, ça brûle par là-bas !', 'Vite, va chercher de l\'aide !']
        );
        // Castor
        this.addNPC(
            'Castor', 0, 2, './castorspeek.png',
            ['./castorspeek.png', 'Salut jeune scout, tu est bien brave pour être arrivé jusqu\'ici !']
        );
    }

    addNPC(name, x, y, texturePath, dialogueData) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        }); 

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