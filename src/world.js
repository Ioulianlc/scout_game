import * as THREE from 'three';
import { LevelBuilder } from "./tools.js";
import { maps } from "./maps.js"; 
import { VegetationGenerator } from "./vegetation.js"; 

export class World {
    constructor(scene, camera, scout) {
        this.scene = scene;
        this.camera = camera;
        this.scout = scout;
        this.caveBlocker = null;

        this.colliders = []; 
        this.teleporters = []; 
        this.npcs = [];  
        
        // Liste pour stocker les arbres
        this.vegetation = []; 

        // Collectable
        this.collectibles = [];
        
        this.currentMapMesh = null;
        this.debugMode = false;

        // On lance la première carte
        this.loadMap("exterieur");
    }

    loadMap(mapId) {
        console.log(`🌍 Chargement de la carte : ${mapId}`);

        this.currentMapId = mapId;
        const data = maps[mapId];

        if (!data) {
            console.error("Erreur : Carte introuvable ->", mapId);
            return;
        }

        // 1. NETTOYAGE
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

        // 5. NPCS (On passe l'ID de la map pour filtrer)
        if (data.hasNPCs) {
            this.initNPCs(mapId);
        }

        // 6. GÉNÉRATION DES ARBRES & OBJETS SPÉCIAUX
        if (mapId === "exterieur") {
            const veg = new VegetationGenerator(this.scene, this);

            // --- LE MUR QUI BLOQUE LA GROTTE ---
            // Coordonnées pour bloquer l'accès (-75, -2, largeur 4)
            this.caveBlocker = this.addCollider(-75, -2, 4, 1);

            // ZONES VÉGÉTATION
            veg.generateZone(-33, -10, -26, -6, 70);
            veg.generateZone(-8, 4, -26, -4, 40);
            veg.generateZone(-6, 7, -25, -19, 60);
            veg.generateZone( 6, 21, -16, -6, 60);
            veg.generateZone( 10, 30, -37, -19, 60);
            veg.generateZone( 9, 35, -55, -39, 60);
            veg.generateZone( -7, 7, -52, -28, 60);
            veg.generateZone( -31, 10, -44, -28, 60);
            veg.generateZone( -43, -34, -44, -27, 60);
            veg.generateZone( -95, -10, -55, -47, 200);
            veg.generateZone( -7, 7, -55, -55, 20);

            veg.generateZone( -46, -38, -15, -12, 20);
            veg.generateZone( -20, -14, 4, -1, 4);
            veg.generateZone( -4, 25, 45, 48, 60);

            // BUSHES
            veg.generateBushes(-28, -23, 47, 49, 50);
            veg.generateBushes(-5, 34, 0, 42, 150);
            veg.generateBushes(-26, 50, -11, -1, 40);

            // BerryBush
            veg.generateBerryBushes(-68, -61, 41, 44, 50);
            veg.generateBerryBushes(-6, 36, 1, 43, 150);

            // FEU
            veg.generateFireZone(54, 95, 6, 55, 180);
            veg.generateFireZone(39, 52, 5, 14, 20);

            // --- OBJETS DE QUÊTE & UNIQUES ---
            veg.plantTower(-59, -33);       // Tour
            veg.plantSacredTree(-28, 45);   // Arbre Sacré
            veg.plantCampfire(-28, 42);     // Feu de camp

            // --- NOUVEAU : PLACER LA MAP AU SOL ---
            veg.plantQuestMap(-62, -32);
            
            // Tentes
            veg.plantTent(-35, 41);
            veg.plantTent(-22, 48);
            veg.plantTent(-31, 50);

            // Objets à ramasser
            veg.plantLog(-31, 43);   // Bûche
            veg.plantBerry(24, 12); // Baie (pour la Biche)
            veg.plantBerry(29, 37); // Baie (pour la Biche)
            veg.plantBerry(3, 24); // Baie (pour la Biche)
            veg.plantBerry(-81, -29); // Baie (pour la Biche)
            veg.plantBerry(13, 37); // Baie (pour la Biche)
            veg.plantAcorn(27, -55); // Gland (pour l'Écureuil)
            veg.plantAcorn(14, -26); // Gland (pour l'Écureuil)
            veg.plantAcorn(-94, -44); // Gland (pour l'Écureuil)
            veg.plantAcorn(5, -25); // Gland (pour l'Écureuil)
            veg.plantAcorn(-22, -39); // Gland (pour l'Écureuil)
        }
        
    }

    // --- GESTION DES NPCS SELON LA CARTE ---
    initNPCs(mapId) {
        // CAS 1 : EXTÉRIEUR
        if (mapId === "exterieur") {
            this.addNPC(
                'Lapin', -27, 28, './lapindebout.png',
                ['./lapindialogue.png', 'Je vois que tu es perdu !', 'Va voir la tour de guet pour la carte.']
            );
            this.addNPC(
                'biche', -64, 42, './bichedebout.png',
                ['./bichedialogue.png', 'J\'ai très faim !', 'Trouve-moi une baie s\'il te plaît.']
            );
            this.addNPC(
                'Ecureuil', -79, -6, './ecureuildebout.png',
                ['./ecureuildialogue.png', 'Si tu veux entrer dans la grotte...', 'Il te faudra ma lampe torche !']
            );
            this.addNPC(
                'Castor', 52, -12, './castordebout.png',
                ['./castorspeek.png', 'Aide-moi à réparer mon pont pour sauver la forêt ! ']
            );
        }
 
        // CAS 2 : GROTTE
        if (mapId === "grotte") {
            // Le Renard est UNIQUEMENT ici
            this.addNPC(
                'Renard', -26, 29, './renarddebout.png',
                ['./renarddialogue.png', 'Miam un humain !', 'Miam un humain !', 'Donne-moi ta carte et je t\' aiderai.']
            );
        }
    }
 

    clearLevel() {
        if (this.currentMapMesh) {
            this.scene.remove(this.currentMapMesh);
            this.currentMapMesh.geometry.dispose();
            this.currentMapMesh.material.dispose();
            this.currentMapMesh = null;
        }

        if (this.vegetation) {
            this.vegetation.forEach(tree => {
                this.scene.remove(tree);
                if (tree.geometry) tree.geometry.dispose();
                if (tree.material) tree.material.dispose();
            });
            this.vegetation = []; 
        }

        this.collectibles = [];
        this.colliders = [];
        this.teleporters = [];

        this.npcs.forEach(npc => {
            this.scene.remove(npc.mesh);
        });
        this.npcs = [];
    }

    unlockCave() {
        console.log("🗝️ Tentative d'ouverture de la grotte...");
        
        if (this.caveBlocker) {
            console.log("✅ Mur trouvé ! Suppression en cours...");
            
            // 1. Suppression visuelle (Boîte rouge)
            if (this.caveBlocker.helper) {
                this.scene.remove(this.caveBlocker.helper);
            }
            
            // 2. Suppression physique (Collision)
            const index = this.colliders.indexOf(this.caveBlocker.box);
            if (index > -1) {
                this.colliders.splice(index, 1);
                console.log("✅ Collision supprimée !");
            } else {
                console.warn("⚠️ Bizarre : La collision n'était pas dans la liste.");
            }

            this.caveBlocker = null;
        } else {
            console.error("❌ ERREUR : Le jeu ne trouve pas 'this.caveBlocker'. Vérifie la ligne de création dans loadMap !");
        }
    }

    addCollider(x, y, w, h) {
        const box = new THREE.Box3();
        box.setFromCenterAndSize(
            new THREE.Vector3(x, y, 0),
            new THREE.Vector3(w, h, 1)
        );
        this.colliders.push(box);
        
        let helper = null;
        if (this.debugMode) {
            helper = new THREE.Box3Helper(box, 0xff0000);
            this.scene.add(helper);
        }
        return { box, helper }; 
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