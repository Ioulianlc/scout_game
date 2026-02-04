import * as THREE from "three";
import { Scout } from "./scout.js";
import { World } from "./world.js";
import { Inputs } from "./inputs.js";

class Game {
  constructor() {
    this.canvas = document.querySelector("canvas.webgl");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#3b7d4f");

    this.setupCamera();

    this.inputs = new Inputs(); 
    this.world = new World(this.scene); 
    this.scout = new Scout(this.scene); 

    // --- VARIABLES DE DIALOGUE ---
    this.isPaused = false; // Bloque le jeu pendant la discussion
    this.currentNPC = null; // L'animal avec qui on parle
    this.dialogueIndex = 0; // Index de la phrase actuelle

    this.clock = new THREE.Clock();
    this.loop();
  }

  setupCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10; 
    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const deltaTime = this.clock.getDelta();
    this.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
  }

  update(deltaTime) {
    // 1. Détection de proximité constante
    this.checkProximity();

    // 2. Mise à jour du Scout (uniquement si pas en pause)
    if (!this.isPaused) {
      this.scout.update(deltaTime, this.inputs, this.world.colliders);
      
      // La caméra suit le personnage seulement s'il bouge
      this.camera.position.x = this.scout.mesh.position.x;
      this.camera.position.y = this.scout.mesh.position.y;
    }

    // 3. Touche Interaction (E)
    if (this.inputs.keys.interact) {
      if (!this.isPaused && this.nearestNPC) {
        this.startDialogue(this.nearestNPC);
      }
      this.inputs.keys.interact = false;
    }

    // 4. Touche Suivant (Entrée)
    if (this.inputs.keys.enter && this.isPaused) {
      this.nextStep();
      this.inputs.keys.enter = false;
    }
  }

  // --- LOGIQUE D'INTERACTION ---

  checkProximity() {
    const range = 1.5;
    this.nearestNPC = null;
    const prompt = document.getElementById("interaction-prompt");

    for (const npc of this.world.npcs) {
      const dist = this.scout.mesh.position.distanceTo(npc.position);
      if (dist < range) {
        this.nearestNPC = npc;
        break;
      }
    }

    // Affiche le petit texte "Appuyez sur E"
    if (this.nearestNPC && !this.isPaused) {
      prompt.style.display = "block";
      prompt.innerText = `Appuyez sur E pour parler à ${this.nearestNPC.name}`;
    } else {
      prompt.style.display = "none";
    }
  }

  startDialogue(npc) {
    this.isPaused = true;
    this.currentNPC = npc;
    this.dialogueIndex = 0;

    document.getElementById("dialogue-screen").style.display = "flex";
    document.getElementById("npc-portrait").src = npc.portrait; // Image fixe de l'animal
    this.updateDialogueText();
  }

  updateDialogueText() {
    const textElement = document.getElementById("dialogue-text");
    const optionsElement = document.getElementById("dialogue-options");
    const phrases = this.currentNPC.phrases;
    console.log("J'essaie d'afficher :", phrases[this.dialogueIndex]); // <--- AJOUTE ÇA
    if (this.dialogueIndex < phrases.length) {
      textElement.innerText = phrases[this.dialogueIndex];
      optionsElement.innerHTML = "<small>[Entrée] pour continuer...</small>";
    } else {
      // Fin des phrases : on affiche les choix
      textElement.innerText = "Que veux-tu faire ?";
      optionsElement.innerHTML = `
        <button onclick="window.game.handleChoice('accept')">Accepter la mission</button>
        <button onclick="window.game.handleChoice('close')">Partir</button>
      `;
    }
  }

  nextStep() {
    this.dialogueIndex++;
    this.updateDialogueText();
  }

  handleChoice(choice) {
    if (choice === 'accept') {
        alert("Mission acceptée ! Vous recevez un objet.");
        // Ici tu pourras ajouter l'objet à l'inventaire
    }
    
    // Fermeture du dialogue
    document.getElementById("dialogue-screen").style.display = "none";
    this.isPaused = false;
    this.currentNPC = null;
  }
}

// Lancement et exposition globale pour les boutons HTML
window.game = new Game();