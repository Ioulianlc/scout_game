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
    // Note: On ne donne plus la carte au début, on doit la trouver !
    // this.book.addItem("Carte", "La carte de la forêt.", null);

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
    
    // Ajout : Vérification de la quête de la Carte (au sol)
    this.checkSpecialInteractions();

    this.checkTeleporters();

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

  // --- GESTION DES OBJETS SPÉCIAUX (CARTE AU SOL) ---
  checkSpecialInteractions() {
    // Si on est à l'étape 1 (On cherche la carte)
    if (this.questManager.storyStep === 1) {
        const targetPos = new THREE.Vector3(-62, -32, 0);
        const dist = this.scout.mesh.position.distanceTo(targetPos);
        const prompt = document.getElementById("interaction-prompt");

        if (dist < 3.0) { 
            prompt.style.display = "block";
            prompt.innerText = "Appuyez sur E pour ramasser la Carte";

            if (this.inputs.keys.interact) {
                if (this.audioManager) this.audioManager.play('book_open');
                
                // Suppression visuelle
                const mapObject = this.scene.getObjectByName("QuestMapObject");
                if (mapObject) {
                    this.scene.remove(mapObject);
                }

                this.book.addItem("Carte", "Carte de la forêt", null);
                this.questManager.awardBadge("Explorateur de Tour", "#cd7f32");
                this.questManager.completeQuestInBook("lapin_map");
                this.questManager.advanceStory(); 
                
                this.inputs.keys.interact = false;
                prompt.style.display = "none";
            }
            return true; 
        }
    }
    return false;
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

  // --- GESTION DES TÉLÉPORTEURS (Changement de carte) ---
  checkTeleporters() {
    if (!this.world.teleporters) return;

    for (const tp of this.world.teleporters) {
        // On calcule la distance entre le joueur et le téléporteur
        const dist = this.scout.mesh.position.distanceTo(new THREE.Vector3(tp.x, tp.y, 0));
        
        // Si on est assez proche (moins de 1.5 unité)
        if (dist < 1.5) {
            console.log("🌀 Téléportation vers :", tp.targetMap);
            
            // 1. On charge la nouvelle carte
            this.world.loadMap(tp.targetMap);
            
            // 2. On déplace le joueur à la destination prévue
            this.scout.mesh.position.set(tp.targetX, tp.targetY, 0);
            
            // 3. On centre la caméra immédiatement pour éviter un "saut" visuel
            this.camera.position.x = tp.targetX;
            this.camera.position.y = tp.targetY;
            
            // On arrête la boucle pour ne pas se téléporter deux fois
            break; 
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
        <button onclick="window.game.handleChoice('accept')">Accepter / Donner</button>
        <button onclick="window.game.handleChoice('close')">Partir</button>
      `;
    }
  }

  nextStep() {
    this.dialogueIndex++;
    this.updateDialogueText();
  }

  // --- LOGIQUE DES CHOIX (QUÊTES) ---
  handleChoice(choice) {
    if (choice === "accept") {
      const npcName = this.currentNPC.name;
      const step = this.questManager.storyStep; // Raccourci
 
      // --- 1. LAPIN ---
      if (npcName === "Lapin") {
          if (step === 0) {
              // Début de la quête
              this.questManager.addQuestToBook("lapin_map", "Carte de la forêt", "Va vite à la tour chercher la carte !");
              this.questManager.advanceStory(); // Step 1
          }
      }
 
      // --- 2. BICHE ---
      else if (npcName === "biche") { // Attention à la majuscule dans ton code initNPCs
          if (step === 2) {
              this.questManager.addQuestToBook("biche_baie", "La biche gourmande", "Trouve une baie pour la biche.");
              this.questManager.advanceStory(); // Step 3 (Cherche baie)
          }
          else if (step === 3) {
              // Vérifier si on a la baie
              const hasBerry = this.book.inventory.find(i => i.name === "Baie"); // Assure toi que l'item s'appelle "Baie"
              if (hasBerry) {
                  this.book.removeItem("Baie");
                  this.questManager.completeQuestInBook("biche_baie");
                  this.questManager.awardBadge("Ami des Biches", "silver");
                  this.questManager.advanceStory(); // Step 4 (Trouve Ecureuil)
                 
              }
          }
      }
 
      // --- 3. ECUREUIL ---
      else if (npcName === "Ecureuil") {
          if (step === 4) {
              this.questManager.addQuestToBook("ecureuil_gland", "Célian l'écureuil gourmand", "Trouve un gland.");
              this.questManager.advanceStory(); // Step 5 (Cherche Gland)
          }
          else if (step === 5) {
               const hasAcorn = this.book.inventory.find(i => i.name === "Gland");
               if (hasAcorn) {
                   this.book.removeItem("Gland");
                   
                   // Récompenses
                   this.book.addItem("Torche", "Pour voir dans le noir", null);
                   this.questManager.awardBadge("Éclaireur", "orange");
                   this.questManager.completeQuestInBook("ecureuil_gland");
                   
                   // Débloquer la grotte !
                   this.world.unlockCave();
                   
                   this.questManager.advanceStory(); // Step 6 (Trouve Renard)
                   
               }
          }
      }
 
      // --- 4. RENARD (Dans la grotte) ---
     // --- 4. RENARD (Dans la grotte) ---
      else if (npcName === "Renard") {
          if (step === 6) {
              // On vérifie si le joueur a la carte (note le '&&' pour être sûr que l'item n'est pas null)
              const hasMap = this.book.inventory.find(i => i && i.name === "Carte");
             
              if (hasMap) {
                  // 1. ON SUPPRIME LA CARTE
                  // Cela va automatiquement cacher la mini-map du widget
                  this.book.removeItem("Carte");
                 
                  // 2. ON AJOUTE LA BOUSSOLE
                  // Cela va automatiquement afficher le png boussole dans le widget !
                  // (Tu peux mettre null pour l'image d'inventaire si tu n'en as pas, ou mettre une icône)
                  this.book.addItem("Boussole", "Indique le Nord.", null);
                 
                  // 3. Récompenses & Progression
                  this.questManager.awardBadge("Rusé comme un Renard", "red");
                  this.questManager.addQuestToBook("renard_done", "Renard trouvé", "Fait.");
                  this.questManager.completeQuestInBook("renard_done");
                 
                  this.questManager.advanceStory(); // Step 7
                 
              }
              
          }
      }
 
      // --- 5. CASTOR ---
      else if (npcName === "Castor") {
          if (step === 7) {
               this.questManager.addQuestToBook("castor_pont", "Maître constructeur", "Construit un pont (trouve une bûche).");
               this.questManager.advanceStory(); // Step 8 (Cherche Bûche)
          }
          else if (step === 8) {
              const hasLog = this.book.inventory.find(i => i.name === "Bûche");
              if (hasLog) {
                  this.book.removeItem("Bûche"); // Il la donne
                  this.questManager.completeQuestInBook("castor_pont");
                  this.questManager.awardBadge("Bâtisseur", "brown");
                 
                  this.questManager.advanceStory(); // Step 9 (FIN)
              }
          }
      }
    }
   
    // Fermeture dialogue
    document.getElementById("dialogue-screen").style.display = "none";
    this.isPaused = false;
    this.currentNPC = null;
  }
}

window.game = new Game();