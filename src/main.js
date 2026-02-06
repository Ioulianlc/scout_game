import * as THREE from "three";
import { Scout } from "./scout.js";
import { World } from "./world.js";
import { Inputs } from "./inputs.js";
import { LightSystem } from "./lightSystem.js";
import { AudioManager } from "./audioManager.js";
import { Book } from "./book.js";
import { QuestManager } from "./questManager.js";

class Game {
  constructor() {
    // --- 1. RÉCUPÉRATION DES ÉLÉMENTS HTML ---
    const startButton = document.getElementById("btn-new-game");
    const menuElement = document.getElementById("main-menu");
    this.mainMenu = menuElement;
    this.settingsMenu = document.getElementById("settings-menu");
    this.gameHud = document.getElementById("game-hud");
    this.tutorialOverlay = document.getElementById("tutorial-overlay");
    this.coordDisplay = document.getElementById("debug-coords");

    // --- 2. GESTION DU LANCEMENT (START) ---
    if (startButton) {
      startButton.addEventListener("click", () => {
        menuElement.classList.add("hidden");
        // On affiche tout le HUD d'un coup
        if (this.gameHud) this.gameHud.classList.remove("hidden");
        this.isPaused = false;
        if (this.audioManager) {
          this.audioManager.playMusic("forest_theme", 0.3);
        }
      });
    }

    // --- 3. GESTION DES MENUS ---
    const btnSettings = document.getElementById("btn-settings");
    if (btnSettings) {
      btnSettings.addEventListener("click", () => {
        this.mainMenu.classList.add("hidden");
        this.settingsMenu.classList.remove("hidden");
        this.isPaused = true;
      });
    }

    const btnBack = document.getElementById("btn-back");
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        this.settingsMenu.classList.add("hidden");
        // Si on revient des paramètres et qu'on n'a pas encore lancé la partie, on montre le menu
        // Si on est en partie, on ne fait rien (le HUD reste affiché)
        if (
          this.isPaused &&
          this.mainMenu.classList.contains("hidden") &&
          this.gameHud.classList.contains("hidden")
        ) {
          this.mainMenu.classList.remove("hidden");
        } else {
          this.isPaused = false;
        }
      });
    }

    const quitActions = ["btn-quit-match", "btn-quit-game"];
    quitActions.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", () => {
          this.settingsMenu.classList.add("hidden");
          // On cache le HUD quand on quitte pour revenir au menu propre
          if (this.gameHud) this.gameHud.classList.add("hidden");
          this.mainMenu.classList.remove("hidden");
          this.isPaused = true;
        });
      }
    });

    // --- 4. ACTIONS DU HUD ---
    const btnHudSettings = document.getElementById("btn-hud-settings");
    if (btnHudSettings) {
      btnHudSettings.addEventListener("click", () => {
        this.settingsMenu.classList.remove("hidden");
        this.isPaused = true;
      });
    }

    const btnHudInventory = document.getElementById("btn-hud-inventory");
    if (btnHudInventory) {
      btnHudInventory.addEventListener("click", () => {
        if (this.currentNPC) return;
        this.book.toggle();
        this.isPaused = this.book.isOpen;
        if (this.audioManager) this.audioManager.play("book_open");
      });
    }

    // --- 5. DIDACTICIEL ---
    const btnTutorial = document.getElementById("btn-tutorial");
    if (btnTutorial) {
      btnTutorial.addEventListener("click", () => {
        this.tutorialOverlay.classList.remove("hidden");
      });
    }

    if (this.tutorialOverlay) {
      this.tutorialOverlay.addEventListener("click", (e) => {
        if (e.target === this.tutorialOverlay) {
          this.tutorialOverlay.classList.add("hidden");
        }
      });
    }

    // --- 6. INITIALISATION THREE.JS ---
    this.canvas = document.querySelector("canvas.webgl");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#3b7d4f");

    this.setupCamera();
    this.inputs = new Inputs();

    this.audioManager = new AudioManager();
    this.audioManager.load("forest_theme", "./sounds/forest_theme.mp3");

    window.addEventListener(
      "keydown",
      () => {
        if (this.audioManager) this.audioManager.playMusic("forest_theme", 0.3);
      },
      { once: true },
    );

    this.scout = new Scout(this.scene);
    this.world = new World(this.scene, this.camera, this.scout);

    this.book = new Book(this);
    this.questManager = new QuestManager(this);
    this.book.addItem("Carte", "La carte de la forêt.", null);

    this.lightSystem = new LightSystem(this.scene);
    this.mazeZone = { minX: -95, maxX: -52, minY: -1, maxY: 30 };

    this.isPaused = true;
    this.currentNPC = null;
    this.dialogueIndex = 0;

    // --- 7. ÉCOUTEURS CLAVIER ---
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (
          this.tutorialOverlay &&
          !this.tutorialOverlay.classList.contains("hidden")
        ) {
          this.tutorialOverlay.classList.add("hidden");
          return;
        }
        if (this.currentNPC) return;
        if (!this.settingsMenu.classList.contains("hidden")) {
          this.settingsMenu.classList.add("hidden");
          this.isPaused = false;
        } else if (!this.mainMenu.classList.contains("hidden")) {
          this.mainMenu.classList.add("hidden");
          this.settingsMenu.classList.remove("hidden");
        } else {
          this.settingsMenu.classList.remove("hidden");
          this.isPaused = true;
        }
      }

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
        if (this.audioManager) this.audioManager.play("book_open");
      }
    });

    window.addEventListener("resize", () => this.handleResize());
    this.clock = new THREE.Clock();
    this.loop();
  }

  // --- MÉTHODES DE LA CLASSE ---

  setupCamera() {
    this.frustumSize = 10;
    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
    this.handleResize();
  }

  handleResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const deltaTime = this.clock.getDelta();
    this.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
  }

  update(deltaTime) {
    this.checkProximity();
    this.checkCollectibles();

    if (this.book) {
      this.book.updatePlayerPositionOnMap(
        this.scout.mesh.position.x,
        this.scout.mesh.position.y,
      );
    }

    if (!this.isPaused) {
      this.scout.update(
        deltaTime,
        this.inputs,
        this.world.colliders,
        this.audioManager,
      );

      let targetX =
        this.camera.position.x +
        (this.scout.mesh.position.x - this.camera.position.x) * 5 * deltaTime;
      let targetY =
        this.camera.position.y +
        (this.scout.mesh.position.y - this.camera.position.y) * 5 * deltaTime;

      const aspect = window.innerWidth / window.innerHeight;
      const camHalfWidth = (this.frustumSize * aspect) / 2;
      const camHalfHeight = this.frustumSize / 2;

      this.camera.position.x = THREE.MathUtils.clamp(
        targetX,
        -96 + camHalfWidth,
        96 - camHalfWidth,
      );
      this.camera.position.y = THREE.MathUtils.clamp(
        targetY,
        -56 + camHalfHeight,
        56 - camHalfHeight,
      );

      if (this.world.currentMapId === "grotte") {
        this.lightSystem.enable();
        this.lightSystem.update(this.scout.mesh.position);
      } else {
        this.lightSystem.disable();
      }

      if (this.coordDisplay) {
        this.coordDisplay.innerText = `X: ${this.scout.mesh.position.x.toFixed(1)} | Y: ${this.scout.mesh.position.y.toFixed(1)}`;
      }
    }

    if (this.inputs.keys.interact) {
      if (!this.isPaused && this.nearestNPC)
        this.startDialogue(this.nearestNPC);
      this.inputs.keys.interact = false;
    }

    if (this.inputs.keys.enter && this.isPaused && this.currentNPC) {
      this.nextStep();
      this.inputs.keys.enter = false;
    }
  }

  checkProximity() {
    const range = 1.5;
    this.nearestNPC = null;
    const prompt = document.getElementById("interaction-prompt");
    if (this.world.npcs) {
      for (const npc of this.world.npcs) {
        if (this.scout.mesh.position.distanceTo(npc.position) < range) {
          this.nearestNPC = npc;
          break;
        }
      }
    }
    if (prompt) {
      prompt.style.display =
        this.nearestNPC && !this.isPaused ? "block" : "none";
      if (this.nearestNPC)
        prompt.innerText = `Appuyez sur E pour parler à ${this.nearestNPC.name}`;
    }
  }

  checkCollectibles() {
    if (!this.world.collectibles) return;
    const pickupRange = 1.5;
    const prompt = document.getElementById("interaction-prompt");
    let itemFound = null;
    let indexFound = -1;

    for (let i = 0; i < this.world.collectibles.length; i++) {
      const item = this.world.collectibles[i];
      if (this.scout.mesh.position.distanceTo(item.position) < pickupRange) {
        itemFound = item;
        indexFound = i;
        break;
      }
    }

    if (itemFound && !this.isPaused && !this.nearestNPC) {
      prompt.style.display = "block";
      prompt.innerText = `Appuyez sur E pour ramasser : ${itemFound.name}`;
      if (this.inputs.keys.interact) {
        this.book.addItem(itemFound.name, "Objet trouvé.", null);
        this.scene.remove(itemFound);
        this.world.collectibles.splice(indexFound, 1);
        this.inputs.keys.interact = false;
      }
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
        <button onclick="window.game.handleChoice('accept')">Accepter</button>
        <button onclick="window.game.handleChoice('close')">Partir</button>
      `;
    }
  }

  nextStep() {
    this.dialogueIndex++;
    this.updateDialogueText();
  }

  handleChoice(choice) {
    document.getElementById("dialogue-screen").style.display = "none";
    this.isPaused = false;
    this.currentNPC = null;
  }
}

window.game = new Game();
