import * as THREE from "three";

export class Scout {
  constructor(scene) {
    this.scene = scene;

    // --- 1. CONFIGURATION DE LA GRILLE & TAILLES ---
    this.nbColonnes = 4;
    this.nbLignes = 4;

    // Tailles basées sur tes paramètres (32x32 pixels)
    this.width = 1; // 2 unités
    this.height = 2; // 1 unité

    // --- 2. GESTION DE L'ANIMATION ---
    this.currentColumn = 0;
    this.currentRow = 0; // Ligne 0 = tout en bas
    this.frameTimer = 0;
    this.frameSpeed = 0.12; // Vitesse de défilement des frames

    // --- 3. INITIALISATION DU VISUEL ---
    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    const material = new THREE.MeshBasicMaterial({
      transparent: false,
      alphaTest: 0.5, // Coupe le blanc net
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0, 1);
    this.scene.add(this.mesh);

    // --- 4. CHARGEMENT DE LA TEXTURE ---
    const loader = new THREE.TextureLoader();
    loader.load("/scoutt.png", (texture) => {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;

      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      // On ne veut afficher qu'une seule case de la grille (1/4)
      texture.repeat.set(1 / this.nbColonnes, 1 / this.nbLignes);

      this.mesh.material.map = texture;
      this.mesh.material.needsUpdate = true;
      this.updateUVs(); // Appliquer le bon cadrage initial
    });

    // FUSION : On utilise la vitesse de la branche secondaire (plus réaliste)
    // Si tu veux revenir au mode "debug rapide", remets 15 ici.
    this.speed = 15;
    
    this.collider = new THREE.Box3();
  }

  /**
   * Met à jour la portion de l'image affichée sur le carré
   */
  updateUVs() {
    if (this.mesh.material.map) {
      // On calcule l'offset exact
      const offsetX = this.currentColumn / this.nbColonnes;
      const offsetY = this.currentRow / this.nbLignes;

      // On applique directement
      this.mesh.material.map.offset.set(offsetX, offsetY);
    }
  }

  update(deltaTime, inputs, obstacles, audioManager) {
    const velocity = { x: 0, y: 0 };
    let isMoving = false;

    // --- DÉTERMINATION DE LA LIGNE (Index 0 en bas, 3 en haut) ---
    if (inputs.keys.up) {
      velocity.y = 1;
      isMoving = true;
      this.currentRow = 0; // Ligne 1 (bas) : Avancer
    } else if (inputs.keys.right) {
      velocity.x = 1;
      isMoving = true;
      this.currentRow = 1; // Ligne 2 : Droite
      this.mesh.scale.x = 1; // Pas de flip
    } else if (inputs.keys.left) {
      velocity.x = -1;
      isMoving = true;
      this.currentRow = 2; // Ligne 3 : Gauche
      this.mesh.scale.x = 1; // On utilise la ligne spécifique dessinée par l'équipe
    } else if (inputs.keys.down) {
      velocity.y = -1;
      isMoving = true;
      this.currentRow = 3; // Ligne 4 (haut) : Reculer
    }

    // --- LOGIQUE D'ANIMATION (Défilement horizontal) ---
    if (isMoving) {
      this.frameTimer += deltaTime;
      if (this.frameTimer >= this.frameSpeed) {
        this.frameTimer = 0;
        // On boucle sur les 4 colonnes (0, 1, 2, 3)
        this.currentColumn = (this.currentColumn + 1) % this.nbColonnes;
      }
    } else {
      this.currentColumn = 0; // Frame de repos quand on s'arrête
    }

    // --- LOGIQUE SONORE ---
    // Dans scout.js, méthode update :
    if (isMoving && audioManager) {
        console.log("Bruit de pas !"); // <--- AJOUTE ÇA
        audioManager.playStep(350);
    } else if (isMoving && !audioManager) {
        console.log("Erreur : audioManager est manquant !"); // <--- AJOUTE ÇA
        audioManager.stop('step');
    }

    this.updateUVs();

    // --- MOUVEMENT & COLLISIONS ---
    if (isMoving) {
      // Normalisation de la diagonale
      if (velocity.x !== 0 && velocity.y !== 0) {
        const factor = 1 / Math.sqrt(2);
        velocity.x *= factor;
        velocity.y *= factor;
      }

      const moveStep = this.speed * deltaTime;

      // Vérification X
      const nextX = this.mesh.position.x + velocity.x * moveStep;
      if (!this.checkCollision(nextX, this.mesh.position.y, obstacles)) {
        this.mesh.position.x = nextX;
      }

      // Vérification Y
      const nextY = this.mesh.position.y + velocity.y * moveStep;
      if (!this.checkCollision(this.mesh.position.x, nextY, obstacles)) {
        this.mesh.position.y = nextY;
      }
    }
  }

  checkCollision(targetX, targetY, obstacles) {
    // Hitbox ajustée (0.5 x 0.5)
    this.collider.setFromCenterAndSize(
      new THREE.Vector3(targetX, targetY, 0.5),
      new THREE.Vector3(0.5, 0.5, 1),
    );

    for (const obstacleBox of obstacles) {
      if (this.collider.intersectsBox(obstacleBox)) {
        return true;
      }
    }
    return false;
  }
}