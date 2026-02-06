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

        // Collectable
        this.collectibles = [];
        
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

            // veg.generateZone(min x,max x, min y, max y, nb arbre);
            // Parcelle 1
            veg.generateZone(-33, -10, -26, -6, 70);
            // Parcelle 2
            veg.generateZone(-8, 4, -26, -4, 40);
            // Parcelle 3
            veg.generateZone(-6, 7, -25, -19, 60);
            // Parcelle 4
            veg.generateZone( 6, 21, -16, -6, 60);
            // Parcelle 5
            veg.generateZone( 10, 30, -37, -19, 60);
            // Parcelle 6
            veg.generateZone( 9, 35, -55, -39, 60);
            // Parcelle 7
            veg.generateZone( -7, 7, -52, -28, 60);
            // Parcelle 8
            veg.generateZone( -31, 10, -44, -28, 60);
            // Parcelle 9
            veg.generateZone( -43, -34, -44, -27, 60);
            // Parcelle 10
            veg.generateZone( -95, -10, -55, -47, 200);
            // Parcelle 11
            veg.generateZone( -7, 7, -55, -55, 20);

            // Parcelles entouré de bush
            veg.generateZone( -46, -38, -15, -12, 20);
            veg.generateZone( -20, -14, 4, -1, 4);
            veg.generateZone( -4, 25, 45, 48, 60);

            // Bush
            veg.generateBushes(-28, -23, 47, 49, 50);
            veg.generateBushes(-5, 34, 0, 42, 300);
            veg.generateBushes(-26, 50, -11, -1, 40);

            // Firetree
            veg.generateFireZone(54, 95, 6, 55, 180);
            veg.generateFireZone(39, 52, 5, 14, 20);

            // Tower
            veg.plantTower(-59, -33);

            // Sacredtree
            veg.plantSacredTree(-28, 45);

            // Camp fire
            veg.plantCampfire(-28, 42);

            // Tente
            veg.plantTent(-35, 41);
            veg.plantTent(-22, 48);
            veg.plantTent(-31, 50);

            // Buche
            veg.plantLog(-31, 43);

            
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

        // Vide la liste de collectable
        this.collectibles = [];

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
        // lapin
        this.addNPC(
            'Lapin', -40, 48, './lapindebout.png', 
            ['./lapindialogue.png', 'Je vois que tu ne sais pas où tu est !', 'je peux t\aider à trouver ton chemin il te suffit de trouver la carte du garde forestier dans sa tour de guet. ']
        );
        // biche
        this.addNPC(
            'biche', -40, 46, './bichedebout.png',
            ['./bichedialogue.png', 'Hey salut jeune homme, j\'ai très faim !', 'peut tu trouver des baies pour moi je n\'en trouve plus !']
        );
        // ecureuil
        this.addNPC(
            'Ecureuil', -40, 42, './ecureuildebout.png',
            ['./ecureuildialogue.png', 'Salut jeune scout, est-tu assez brave pour rentrer dans cette grotte sombre et trouver Monsieur le renard !', 'Si oui prend ma lampe torche tu en aura besoin !']
        );
        // renard
        this.addNPC(
            'Renard', -43, 48, './renarddebout.png',
            ['./renarddialogue.png', 'Hummmmmmmmmm yummy un humain !','Je suppose que tu veux savoir ou est le castor !','Donne moi ta carte je te donnerai une bousole pour le trouver il se trouve...............','au nord............ à non peut être au sud dans la forêt, débrouille toi tu est un aventurier NON !']
        );
        // castor
        this.addNPC(
            'Castor', -43, 45, './castordebout.png',
            ['./castordialogue.png', 'Hey Ho jeune Boy Scout aide moi à réparer mon pont pour que je puisse t_aider à eteindre le FEU !']
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