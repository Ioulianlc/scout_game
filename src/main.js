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
    // Attention : j'ai remis this.camera ici car ton World en a besoin pour l'outil de construction
    this.world = new World(this.scene, this.camera); 
    this.scout = new Scout(this.scene);

    // --- VARIABLES DE DIALOGUE ---
    this.isPaused = false;
    this.currentNPC = null;
    this.dialogueIndex = 0;

    // --- 1. NOUVEAU : Récupération de l'affichage DEBUG ---
    this.coordDisplay = document.getElementById("debug-coords");

    // --- 2. NOUVEAU : Touche F3 pour Cacher/Afficher ---
    window.addEventListener('keydown', (e) => {
        if (e.code === 'F3') {
            e.preventDefault(); // Empêche l'action par défaut du navigateur
            if (this.coordDisplay) {
                this.coordDisplay.style.display = 
                    this.coordDisplay.style.display === 'none' ? 'block' : 'none';
            }
        }
    });

    this.clock = new THREE.Clock();
    this.loop();
  }

  setupCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10; // J'ai remis 10 (zoom standard) car 100 dézoome énormément
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

      // La caméra suit le personnage (avec effet fluide Lerp)
      this.camera.position.x += (this.scout.mesh.position.x - this.camera.position.x) * 5 * deltaTime;
      this.camera.position.y += (this.scout.mesh.position.y - this.camera.position.y) * 5 * deltaTime;

      // --- 3. NOUVEAU : Mise à jour du texte X et Y ---
      if (this.coordDisplay) {
          const x = this.scout.mesh.position.x.toFixed(1);
          const y = this.scout.mesh.position.y.toFixed(1);
          this.coordDisplay.innerText = `X: ${x} | Y: ${y}`;
      }
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
    document.getElementById("npc-portrait").src = npc.portrait;
    this.updateDialogueText();
  }

  updateDialogueText() {
    const textElement = document.getElementById("dialogue-text");
    const optionsElement = document.getElementById("dialogue-options");
    const phrases = this.currentNPC.phrases;
    
    if (this.dialogueIndex < phrases.length) {
      textElement.innerText = phrases[this.dialogueIndex];
      optionsElement.innerHTML = "<small>[Entrée] pour continuer...</small>";
    } else {
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
        // Ici l'intégration de l'inventaire se fera plus tard si tu le souhaites
    }
    
    document.getElementById("dialogue-screen").style.display = "none";
    this.isPaused = false;
    this.currentNPC = null;
  }
}

// Lancement global
window.game = new Game();