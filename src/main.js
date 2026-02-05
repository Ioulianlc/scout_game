import * as THREE from "three";
import { Scout } from "./scout.js";
import { World } from "./world.js";
import { Inputs } from "./inputs.js";
import { Book } from "./book.js";
import { QuestManager } from "./questManager.js";

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
    this.world = new World(this.scene, this.camera);
    this.scout = new Scout(this.scene);

    this.book = new Book(this);
    this.questManager = new QuestManager(this);

    // Objet de départ
    this.book.addItem("Carte", "La carte de la forêt.", null);

    this.isPaused = false;
    this.currentNPC = null;
    this.dialogueIndex = 0;
    this.coordDisplay = document.getElementById("debug-coords");

    window.addEventListener("keydown", (e) => {
      if (e.code === "F3") {
        e.preventDefault();
        if (this.coordDisplay) {
          this.coordDisplay.style.display =
            this.coordDisplay.style.display === "none" ? "block" : "none";
        }
      }

      if (e.key.toLowerCase() === "i") {
        if (this.currentNPC) return;
        this.book.toggle();
        this.isPaused = this.book.isOpen;
      }
    });

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
      100,
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
    this.checkProximity();

    if (this.book) {
      this.book.updatePlayerPositionOnMap(
        this.scout.mesh.position.x,
        this.scout.mesh.position.y,
      );
    }

    // --- LOGIQUE ANIMATION BOUSSOLE ---
    const compassUI = document.getElementById("dynamic-compass");
    // On vérifie si l'élément existe ET s'il est visible
    if (compassUI && compassUI.style.display !== "none") {
      const wobble = Math.sin(Date.now() * 0.005) * 4;
      compassUI.style.transform = `rotate(${wobble}deg)`;
    }

    if (!this.isPaused) {
      this.scout.update(deltaTime, this.inputs, this.world.colliders);

      this.camera.position.x +=
        (this.scout.mesh.position.x - this.camera.position.x) * 5 * deltaTime;
      this.camera.position.y +=
        (this.scout.mesh.position.y - this.camera.position.y) * 5 * deltaTime;

      if (this.coordDisplay) {
        this.coordDisplay.innerText = `X: ${this.scout.mesh.position.x.toFixed(
          1,
        )} | Y: ${this.scout.mesh.position.y.toFixed(1)}`;
      }
    }

    if (this.inputs.keys.interact) {
      if (!this.isPaused && this.nearestNPC) {
        this.startDialogue(this.nearestNPC);
      }
      this.inputs.keys.interact = false;
    }

    if (this.inputs.keys.enter && this.isPaused) {
      if (this.currentNPC) {
        this.nextStep();
      }
      this.inputs.keys.enter = false;
    }
  }

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
        <button onclick="window.game.handleChoice('accept')">Accepter / Donner</button>
        <button onclick="window.game.handleChoice('close')">Partir</button>
      `;
    }
  }

  nextStep() {
    this.dialogueIndex++;
    this.updateDialogueText();
  }

  handleChoice(choice) {
    if (choice === "accept") {
      const npcName = this.currentNPC.name;

      if (npcName === "Biche") {
        this.questManager.acceptQuest("baie");
      } else if (npcName === "Ecureuil" || npcName === "Lapin") {
        this.questManager.acceptQuest("gland");
      } else if (npcName === "Renard") {
        const hasMap = this.book.inventory.find((i) => i && i.name === "Carte");
        if (hasMap) {
          this.questManager.acceptQuest("bousole");
          this.book.removeItem("Carte");
          this.questManager.completeQuest("bousole");
          // FORCER LA MISE A JOUR VISUELLE DE LA BOUSSOLE
          this.book.updateUI();
        } else {
          alert("Le Renard ricane : 'Pas de carte, pas de boussole !'");
        }
      } else if (npcName === "ChefScout") {
        this.questManager.acceptQuest("scout");
      } else if (npcName === "ScoutAmi") {
        this.questManager.completeQuest("scout");
        this.book.updateUI();
      } else if (npcName === "Castor") {
        const hasChamalow = this.book.inventory.find(
          (i) => i && i.name === "Chamalow",
        );
        if (hasChamalow) {
          this.questManager.acceptQuest("chamalow");
          this.book.removeItem("Chamalow");
          this.questManager.completeQuest("chamalow");
          this.book.updateUI();
        } else {
          alert("Mme. Castor attend ses chamalows...");
        }
      } else if (npcName === "Panneau") {
        this.questManager.acceptQuest("pont");
      }
    }

    document.getElementById("dialogue-screen").style.display = "none";
    this.isPaused = false;
    this.currentNPC = null;
  }
}

window.game = new Game();
