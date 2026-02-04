import * as THREE from "three";

export class World {
  constructor(scene) {
    this.scene = scene;
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

    loader.load("./src/assets/MAP_V1.png", (texture) => {
      texture.magFilter = THREE.NearestFilter;
      const geometry = new THREE.PlaneGeometry(mapW, mapH);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mapMesh = new THREE.Mesh(geometry, material);
      this.scene.add(mapMesh);
    });

    // Tes collisions existantes
    this.addCollider(-7, 3, 5, 5);
    this.addCollider(this.scene.width, 48, 1, 1);

    // this.addCollider (0,0,1,1);
    // this.addCollider(6, -2, 4, 8);
    // this.addCollider(0, 5, 4, 1);
  }

  initNPCs() {
    // --- AJOUT DES ANIMAUX AVEC LE FORMAT NARRATIF ---

    this.addNPC("Renard", 2, 0, [
      "./src/assets/renard_zoom.png",
      "Merci d'avoir éteint le feu !",
      "Tu es un vrai héros.",
    ]);

    this.addNPC("Lapin", -3, 1, [
      "./src/assets/lapin_zoom.png",
      "Attention, ça brûle par là-bas !",
      "Vite, va chercher de l'aide !",
    ]);
  }

  addCollider(x, y, w, h) {
    const box = new THREE.Box3();
    box.setFromCenterAndSize(
      new THREE.Vector3(x, y, 0),
      new THREE.Vector3(w, h, 1),
    );
    this.colliders.push(box);
    if (this.debugMode) {
      // Box3Helper dessine automatiquement les contours de la boîte
      const helper = new THREE.Box3Helper(box, 0xff0000); // 0xff0000 = Rouge
      this.scene.add(helper);
    }
  }

  /**
   * @param {string} name - Nom de l'animal
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {Array} dialogueData - [PortraitURL, Phrase1, Phrase2, ...]
   */
  addNPC(name, x, y, dialogueData) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0.9);
    this.scene.add(mesh);

    // EXTRACTION DES DONNÉES
    const portraitUrl = dialogueData[0];
    const phrasesUniquement = dialogueData.slice(1); // On prend tout sauf le premier élément

    this.npcs.push({
      name: name,
      position: mesh.position,
      portrait: portraitUrl, // Pour l'image en gros plan
      phrases: phrasesUniquement, // Le tableau de phrases pour le défilement
      mesh: mesh,
    });
  }
}
