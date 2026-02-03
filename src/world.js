import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        
        // Tableaux de stockage
        this.colliders = []; // Zones physiques (Murs, Rivières) [2]
        this.npcs = [];      // Personnages non-joueurs (Animaux)

        // Initialisation du contenu
        this.initLevel();
        this.initNPCs();
    }

    // --- GESTION DU DÉCOR ---
    initLevel() {
    const loader = new THREE.TextureLoader();

    // 1. CHARGEMENT DE LA MAP (Le "Tapis")
    // Remplace le chemin par le vrai chemin vers ton image
   loader.load('./src/assets/map.png',(texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

        const mapGeometry = new THREE.PlaneGeometry(20, 12); // Ajuste la taille selon tes besoins
        const mapMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const mapMesh = new THREE.Mesh(mapGeometry, mapMaterial);
        
        // Z=0 : La map est tout au fond
        mapMesh.position.set(0, 0, 0); 
        this.scene.add(mapMesh);
    });

    // 2. AJOUT DES COLLISIONS (Basé sur ton dessin)
    // On définit des zones où le Scout ne peut pas passer
    
    // Exemple : Le Labyrinthe (en haut à gauche)
    this.addCollider(-7, 3, 5, 5); 

    // Exemple : La Rivière (zone bleue à droite)
    this.addCollider(6, -2, 4, 8); 

    // Exemple : Le contour du campement (en haut au centre)
    this.addCollider(0, 5, 4, 1); 
}
    // --- GESTION DES PNJS ---
    initNPCs() {
        // Ajout des 6 animaux avec leurs positions et dialogues
        this.addNPC('Renard', 2, 0, "Merci d'avoir éteint le feu !");
        this.addNPC('Lapin', -3, 1, "Attention, ça brûle par là-bas !");
        // Vous pourrez ajouter les autres ici...
    }

    // --- MÉTHODES UTILITAIRES ---

    addCollider(x, y, w, h) {
        const box = new THREE.Box3();
        // On définit la zone interdite
        box.setFromCenterAndSize(
            new THREE.Vector3(x, y, 0),
            new THREE.Vector3(w, h, 1) // Profondeur 1 pour être sûr d'intercepter le joueur
        );
        this.colliders.push(box);
        
        // DEBUG : Visualiser les zones de collision (très utile !)
        // const helper = new THREE.Box3Helper(box, 0xffff00);
        // this.scene.add(helper);
    }

    addNPC(name, x, y, dialogue) {
        // 1. Visuel (En attendant les sprites de Julie, on met un carré de couleur)
        // Idéalement, chargez une texture ici comme pour la maison
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffa500 // Orange pour le renard par défaut
        }); 
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // IMPORTANT : Z=0.9 pour être affiché devant le sol mais derrière le Scout (qui est à Z=1)
        mesh.position.set(x, y, 0.9); 
        this.scene.add(mesh);

        // 2. Logique
        this.npcs.push({
            name: name,
            position: mesh.position, // On lie la position logique au visuel
            dialogue: dialogue,
            mesh: mesh
        });
    }
}