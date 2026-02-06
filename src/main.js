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
    // Gestion du lancement du jeu
    const startButton = document.getElementById("btn-new-game");
    const menuElement = document.getElementById("main-menu");
    this.mainMenu = menuElement;
    this.settingsMenu = document.getElementById("settings-menu");

    startButton.addEventListener("click", () => {
      menuElement.classList.add("hidden");
      this.isPaused = false;
      if (this.audioManager) {
        this.audioManager.playMusic("forest_theme", 0.3);
      }
    });

    document.getElementById("btn-settings").addEventListener("click", () => {
      this.mainMenu.classList.add("hidden");
      this.settingsMenu.classList.remove("hidden");
      this.isPaused = true;
    });

    document.getElementById("btn-back").addEventListener("click", () => {
      this.settingsMenu.classList.add("hidden");
      this.mainMenu.classList.remove("hidden");
    });

    // Quitter la partie (depuis le menu paramètres)
    document.getElementById("btn-quit-match").addEventListener("click", () => {
      this.settingsMenu.classList.add("hidden"); // Cache les paramètres
      this.mainMenu.classList.remove("hidden"); // Affiche le menu principal
      this.isPaused = true; // Garde le jeu en pause
    });

    // Quitter le jeu (souvent la même action sur navigateur)
    document.getElementById("btn-quit-game").addEventListener("click", () => {
      // Si tu veux simplement retourner au menu :
      this.settingsMenu.classList.add("hidden");
      this.mainMenu.classList.remove("hidden");
      this.isPaused = true;

      // Optionnel : Tu peux aussi recharger la page pour tout remettre à zéro
      // window.location.reload();
    });

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

    // --- AUDIO ---
    this.audioManager = new AudioManager();
    this.audioManager.load("forest_theme", "./sounds/forest_theme.mp3");

    window.addEventListener(
      "keydown",
      () => {
        this.audioManager.playMusic("forest_theme", 0.3);
      },
      { once: true },
    );

    this.scout = new Scout(this.scene);
    this.world = new World(this.scene, this.camera, this.scout);

    // --- LIVRE & QUÊTES ---
    this.book = new Book(this);
    this.questManager = new QuestManager(this);
    this.book.addItem("Carte", "La carte de la forêt.", null);

    // --- LUMIÈRE ---
    this.lightSystem = new LightSystem(this.scene);

    // --- ZONE LABYRINTHE ---
    this.mazeZone = {
      minX: -95,
      maxX: -52,
      minY: -1,
      maxY: 30,
    };

    // --- ÉTAT INITIAL ---
    this.isPaused = true; // On commence en pause pour le menu
    this.currentNPC = null;
    this.dialogueIndex = 0;
    this.coordDisplay = document.getElementById("debug-coords");

    // --- ÉCOUTEURS CLAVIER ---
    window.addEventListener("keydown", (e) => {
      // LOGIQUE ECHAP (Placée ici, là où 'e' existe !)
      if (e.key === "Escape") {
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
        this.audioManager.play("book_open");
      }
    });

    window.addEventListener("resize", () => this.handleResize());

    this.clock = new THREE.Clock();
    this.loop();
  }

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

    const compassUI = document.getElementById("dynamic-compass");
    if (compassUI && compassUI.style.display !== "none") {
      const wobble = Math.sin(Date.now() * 0.005) * 4;
      compassUI.style.transform = `rotate(${wobble}deg)`;
    }

    if (!this.isPaused) {
      this.scout.update(
        deltaTime,
        this.inputs,
        this.world.colliders,
        this.audioManager,
      );

      // --- CAMÉRA ---
      let targetX =
        this.camera.position.x +
        (this.scout.mesh.position.x - this.camera.position.x) * 5 * deltaTime;
      let targetY =
        this.camera.position.y +
        (this.scout.mesh.position.y - this.camera.position.y) * 5 * deltaTime;

      const aspect = window.innerWidth / window.innerHeight;
      const camHalfHeight = this.frustumSize / 2;
      const camHalfWidth = (this.frustumSize * aspect) / 2;

      const limitX = 96 - camHalfWidth;
      const limitY = 56 - camHalfHeight;

      if (limitX > 0) {
        this.camera.position.x = THREE.MathUtils.clamp(
          targetX,
          -limitX,
          limitX,
        );
      } else {
        this.camera.position.x = 0;
      }

      if (limitY > 0) {
        this.camera.position.y = THREE.MathUtils.clamp(
          targetY,
          -limitY,
          limitY,
        );
      } else {
        this.camera.position.y = 0;
      }

      // --- TÉLÉPORTATION ---
      if (this.world.teleporters) {
        const px = this.scout.mesh.position.x;
        const py = this.scout.mesh.position.y;

        for (const tp of this.world.teleporters) {
          const dist = Math.sqrt((px - tp.x) ** 2 + (py - tp.y) ** 2);
          if (dist < 1.0) {
            this.audioManager.play("teleport");
            this.world.loadMap(tp.targetMap);
            this.scout.mesh.position.set(tp.targetX, tp.targetY, 0);
            this.camera.position.x = tp.targetX;
            this.camera.position.y = tp.targetY;
            break;
          }
        }
      }

      // --- LOGIQUE NUIT ---
      const isDarkZone = this.world.currentMapId === "grotte";
      if (isDarkZone) {
        this.lightSystem.enable();
        this.lightSystem.update(this.scout.mesh.position);
      } else {
        this.lightSystem.disable();
      }

      if (this.coordDisplay) {
        const px = this.scout.mesh.position.x;
        const py = this.scout.mesh.position.y;
        this.coordDisplay.innerText = `X: ${px.toFixed(1)} | Y: ${py.toFixed(1)}`;
      }
    }

    // Gestion des dialogues
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

    if (this.world.npcs) {
      for (const npc of this.world.npcs) {
        const dist = this.scout.mesh.position.distanceTo(npc.position);
        if (dist < range) {
          this.nearestNPC = npc;
          break;
        }
      }
    }

    if (this.nearestNPC && !this.isPaused) {
      prompt.style.display = "block";
      prompt.innerText = `Appuyez sur E pour parler à ${this.nearestNPC.name}`;
    } else {
      if (!this.world.collectibles || this.world.collectibles.length === 0) {
        prompt.style.display = "none";
      }
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
      const dist = this.scout.mesh.position.distanceTo(item.position);
      if (dist < pickupRange) {
        itemFound = item;
        indexFound = i;
        break;
      }
    }

    if (itemFound && !this.isPaused && !this.nearestNPC) {
      prompt.style.display = "block";
      prompt.innerText = `Appuyez sur E pour ramasser : ${itemFound.name}`;

      if (this.inputs.keys.interact) {
        this.book.addItem(itemFound.name, "Du bois pour le castor.", null);
        this.audioManager.play("book_open");
        this.scene.remove(itemFound);
        this.world.collectibles.splice(indexFound, 1);
        this.inputs.keys.interact = false;
        prompt.style.display = "none";
      }
    } else if (!this.nearestNPC) {
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
        const hasLog = this.book.inventory.find((i) => i && i.name === "Bûche");
        if (hasLog) {
          this.questManager.acceptQuest("chamalow");
          this.book.removeItem("Bûche");
          this.questManager.completeQuest("chamalow");
          this.book.updateUI();
          alert("Merci ! Avec ce bois, je vais pouvoir réparer mon barrage !");
        } else {
          alert("Je ne peux pas travailler... Trouve-moi une Bûche de bois !");
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
