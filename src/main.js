import * as THREE from "three";
import { Scout } from "./scout.js";
import { World } from "./world.js";
import { Inputs } from "./inputs.js";

class Game {
  constructor() {
    // 1. Initialisation du Canvas et Rendu
    this.canvas = document.querySelector("canvas.webgl");
    // Alpha: true permet d'avoir un fond transparent si besoin
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Optimisation pour le Pixel Art : on limite le ratio de pixels
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Création de la Scène
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#3b7d4f");

    // 3. Caméra (Orthographique pour la 2D stricte) [2]
    this.setupCamera();

    // 4. Ajout des Entités (Approche Orientée Objet [1])
    this.inputs = new Inputs(); // Gestion des touches (Z,Q,S,D, E)
    this.world = new World(this.scene); // Décors et PNJ (Animaux)
    this.scout = new Scout(this.scene); // Personnage principal

    // 5. Démarrage de la boucle
    this.clock = new THREE.Clock(); // Gestion du temps [3]
    this.loop();
  }

  setupCamera() {
    // Configuration Orthographique : supprime la perspective pour un rendu 2D plat [4]
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10; // Niveau de zoom

    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100,
    );
    this.camera.position.set(0, 0, 10); // Recul caméra
    this.camera.lookAt(0, 0, 0);
  }

  // --- BOUCLE PRINCIPALE (Technique) ---
  loop() {
    // Appel récursif pour créer une boucle infinie (~60fps) [5], [6]
    requestAnimationFrame(() => this.loop());

    // Calcul du temps écoulé depuis la dernière frame
    const deltaTime = this.clock.getDelta();

    // Appel de la logique de jeu (séparée du rendu)
    this.update(deltaTime);

    // Rendu final de l'image
    this.renderer.render(this.scene, this.camera);
  }

  // --- LOGIQUE DU JEU (Gameplay) ---
  update(deltaTime) {
    // 1. Mise à jour du Scout (Mouvements & Animation)
    // On passe les colliders du monde pour empêcher de traverser les murs
    this.scout.update(deltaTime, this.inputs, this.world.colliders);

    // 2. La caméra suit le personnage
    this.camera.position.x = this.scout.mesh.position.x;
    this.camera.position.y = this.scout.mesh.position.y;

    // 3. Gestion de l'interaction (Touche E)
    if (this.inputs.keys.interact) {
      this.checkInteraction();

      // On "consomme" l'input pour éviter que le dialogue ne clignote
      this.inputs.keys.interact = false;
    }
  }

  // --- SYSTÈME DE DIALOGUE ---
  // checkInteraction() {
  //   const interactionRange = 1.5; // Distance d'interaction
  //   const scoutPos = this.scout.mesh.position;

  //   // On vérifie la distance avec chaque animal (PNJ)
  //   // Note: Assurez-vous que this.world.npcs est bien défini dans World.js
  //   if (this.world.npcs) {
  //     for (const npc of this.world.npcs) {
  //       const distance = scoutPos.distanceTo(npc.position);

  //       if (distance < interactionRange) {
  //         console.log(`Interaction avec : ${npc.name}`);
  //         this.showDialogue(npc.name, npc.dialogue);
  //         return; // On arrête dès qu'on trouve un animal proche
  //       }
  //     }
  //   }
  // }

  // showDialogue(name, text) {
  //   // Manipulation du DOM HTML (au-dessus du Canvas)
  //   const dialogueBox = document.getElementById("dialogue-box");
  //   if (dialogueBox) {
  //     dialogueBox.innerHTML = `<strong>${name} :</strong> ${text}`;
  //     dialogueBox.style.display = "block";

  //     // Optionnel : Masquer après 5 secondes
  //     setTimeout(() => {
  //       dialogueBox.style.display = "none";
  //     }, 5000);
  //   } else {
  //     console.warn("Élément HTML 'dialogue-box' introuvable !");
  //   }
  // }
}

// Lancement du jeu
new Game();
