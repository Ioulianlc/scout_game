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
    // --- DONNÉES DE L'HISTOIRE ---
    this.storyIndex = 0;
    this.storyData = [
        {
            img: "./story1.png", // Assure-toi d'avoir cette image
            text: "Après une longue marche, nous avons enfin trouvé l'endroit idéal pour camper. Tout le monde s'est entraidé pour monter les tentes avant la tombée de la nuit !"
        },
        {
            img: "./story2.png", // Assure-toi d'avoir cette image
            text: "Le soir venu, les histoires et les rires ont rempli la forêt. Autour du feu de camp, les chamallows grillaient... c'était la soirée parfaite. Enfin, c'est ce que je croyais."
        },
        {
            img: "./story3.png", // Assure-toi d'avoir cette image
            text: "Pendant mon sommeil, une voix ancienne m'a appelé... L'Arbre Sacré ! Il m'a murmuré : 'Aide-moi, petit humain. La forêt est en danger, le feu approche ! Je te donne le don de comprendre les animaux... Trouve-les, et sauvez notre maison !'"
        }   
    ];
    
    this.endingData = [
        {
            img: "./ending1.png", 
            text: "Grâce à toi, la forêt a été sauvée ! Le feu a été éteint et la nature peut enfin respirer. L'Arbre Sacré te remercie, et tous les animaux ont retrouvé la paix."
        },
        {
            img: "./ending2.png", 
            text: "Mais comment tout cela a-t-il commencé ? En explorant, tu as trouvé ça : un tout petit mégot de cigarette, jeté sans faire attention. Ce petit déchet, à l'origine du grand danger. La forêt a failli disparaître à cause d'une simple cigarette mal éteinte."
        }
    ];
    this.isEnding = false; // Pour savoir si on est dans l'intro ou la fin

    // --- 1. RÉCUPÉRATION DES ÉLÉMENTS HTML ---
    const startButton = document.getElementById("btn-new-game");
    const menuElement = document.getElementById("main-menu");
    this.mainMenu = menuElement;
    this.storyScreen = document.getElementById("story-screen"); // Nouvel écran
    this.settingsMenu = document.getElementById("settings-menu");
    this.gameHud = document.getElementById("game-hud");
    this.tutorialOverlay = document.getElementById("tutorial-overlay");
    this.coordDisplay = document.getElementById("debug-coords");

    // --- 2. GESTION DU LANCEMENT (START) ---
    if (startButton) {
      startButton.addEventListener("click", () => {
        // Au lieu de lancer le jeu direct, on lance l'histoire
        this.startStorySequence();
      });
    }

    // Bouton SUIVANT de l'histoire
    const nextStoryBtn = document.getElementById("btn-next-story");
    if (nextStoryBtn) {
        nextStoryBtn.addEventListener("click", () => {
            this.nextStorySlide();
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
        if (
          this.isPaused &&
          this.mainMenu.classList.contains("hidden") &&
          this.gameHud.classList.contains("hidden") &&
          this.storyScreen.classList.contains("hidden") // Vérif histoire
        ) {
          this.mainMenu.classList.remove("hidden");
        } else {
          // Si on est en jeu ou histoire
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
          if (this.gameHud) this.gameHud.classList.add("hidden");
          if (this.storyScreen) this.storyScreen.classList.add("hidden"); // Cacher histoire si on quitte
          this.mainMenu.classList.remove("hidden");
          this.isPaused = true;
          
          // Reset musique si besoin
           if (this.audioManager) this.audioManager.stopMusic();
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
    this.audioManager.load("forest_theme", "./forest_theme.mp3");
    this.audioManager.load("step", "./step.mp3");

    // Suppression de l'auto-play au keydown global pour éviter les conflits
    // La musique se lancera via l'histoire ou le jeu

    this.scout = new Scout(this.scene);
    this.world = new World(this.scene, this.camera, this.scout);

    this.book = new Book(this);
    this.questManager = new QuestManager(this);

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
        
        // Gestion de l'echap pendant l'histoire (optionnel)
        if (!this.storyScreen.classList.contains("hidden")) {
            // On peut choisir de quitter l'histoire ou ouvrir le menu
            this.settingsMenu.classList.remove("hidden");
            return;
        }

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
        // On empêche d'ouvrir le livre pendant l'histoire ou le menu
        if (!this.mainMenu.classList.contains("hidden")) return;
        if (!this.storyScreen.classList.contains("hidden")) return;

        this.book.toggle();
        this.isPaused = this.book.isOpen;
        if (this.audioManager) this.audioManager.play("book_open");
      }
    });

    window.addEventListener("resize", () => this.handleResize());
    this.clock = new THREE.Clock();
    this.loop();
  }

  // --- NOUVELLES MÉTHODES POUR L'HISTOIRE ---

  startStorySequence() {
      // 1. Cacher le menu
      this.mainMenu.classList.add("hidden");
      
      // 2. Afficher l'écran d'histoire
      this.storyScreen.classList.remove("hidden");
      this.storyScreen.style.display = "flex"; // Force flex pour le centrage

      // 3. Reset index et affichage
      this.storyIndex = 0;
      this.updateStoryDisplay();

      // 4. Lancer une musique calme (si tu as, sinon garde forest_theme)
      if (this.audioManager) this.audioManager.playMusic("forest_theme", 0.2);
      
  }

  updateStoryDisplay() {
      // CHOIX DES DONNÉES : Intro ou Fin ?
      const currentData = this.isEnding ? this.endingData : this.storyData;
      const data = currentData[this.storyIndex];
      
      const imgEl = document.getElementById("story-image");
      const textEl = document.getElementById("story-text-container");
      
      if(imgEl) imgEl.src = data.img;
      if(textEl) textEl.innerText = data.text;

      const btn = document.getElementById("btn-next-story");
      if(btn) {
          // Si c'est la DERNIÈRE image
          if (this.storyIndex === currentData.length - 1) {
              
              if (this.isEnding) {
                  btn.innerText = "RETOURNER AU MENU"; // Texte de fin
              } else {
                  btn.innerText = "COMMENCER L'AVENTURE !"; // Texte d'intro
              }
              
              // On garde ton style vert classe
              btn.classList.add("btn-start-adventure");
          } 
          else {
              btn.innerText = "Suivant >>";
              btn.classList.remove("btn-start-adventure");
          }
      }
  }

  nextStorySlide() {
      // CHOIX DES DONNÉES
      const currentData = this.isEnding ? this.endingData : this.storyData;

      if (this.storyIndex < currentData.length - 1) {
          this.storyIndex++;
          this.updateStoryDisplay();
      } else {
          // C'EST LA DERNIÈRE DIA
          if (this.isEnding) {
              // FIN DU JEU -> On recharge la page pour revenir au menu propre
              location.reload(); 
          } else {
              // FIN DE L'INTRO -> On lance le jeu
              this.launchGame();
          }
      }
  }

  launchGame() {
      // 1. Cacher l'histoire
      this.storyScreen.classList.add("hidden");
      this.storyScreen.style.display = "none"; // Important pour ne pas bloquer les clics

      // 2. Afficher le HUD
      if (this.gameHud) this.gameHud.classList.remove("hidden");
      
      // 3. Démarrer la logique
      this.isPaused = false;
      
      // 4. Monter le volume musique
      if (this.audioManager) this.audioManager.playMusic("forest_theme", 0.8);
  }
  startEndingSequence() {
      console.log("🎬 Lancement de la séquence de fin");
      this.isEnding = true; // On passe en mode "Fin"
      
      // 1. On cache l'interface de jeu et le dialogue
      if (this.gameHud) this.gameHud.classList.add("hidden");
      document.getElementById("dialogue-screen").style.display = "none";

      // 2. On affiche l'écran d'histoire
      this.storyScreen.classList.remove("hidden");
      this.storyScreen.style.display = "flex";

      // 3. On reset l'index et on met à jour
      this.storyIndex = 0;
      this.updateStoryDisplay();

      // 4. Musique de victoire/émotion (optionnel)
      if (this.audioManager) this.audioManager.playMusic("forest_theme", 0.5); 
  }

  // ------------------------------------------

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
    // Si on est dans le menu OU l'histoire, on ne met pas à jour le jeu
    if (!this.storyScreen.classList.contains("hidden")) return;

    this.checkProximity();
    this.checkCollectibles();
    this.checkSpecialInteractions();
    this.checkTeleporters();

    if (this.book) {
      this.book.updatePlayerPositionOnMap(
        this.scout.mesh.position.x,
        this.scout.mesh.position.y,
      );
    }

    if (!this.isPaused) {
      if (this.scout) {
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

  checkSpecialInteractions() {
    if (this.questManager.storyStep === 1) {
        const targetPos = new THREE.Vector3(-62, -32, 0);
        const dist = this.scout.mesh.position.distanceTo(targetPos);
        const prompt = document.getElementById("interaction-prompt");

        if (dist < 3.0) { 
            prompt.style.display = "block";
            prompt.innerText = "Appuyez sur E pour ramasser la Carte";

            if (this.inputs.keys.interact) {
                if (this.audioManager) this.audioManager.play('book_open');
                
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

  checkTeleporters() {
    if (!this.world.teleporters) return;
    for (const tp of this.world.teleporters) {
        const dist = this.scout.mesh.position.distanceTo(new THREE.Vector3(tp.x, tp.y, 0));
        if (dist < 1.5) {
            console.log("🌀 Téléportation vers :", tp.targetMap);
            this.world.loadMap(tp.targetMap);
            this.scout.mesh.position.set(tp.targetX, tp.targetY, 0);
            this.camera.position.x = tp.targetX;
            this.camera.position.y = tp.targetY;
            break; 
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
    if (choice === 'accept') {
        const npcName = this.currentNPC.name;
        const step = this.questManager.storyStep;

        if (npcName === "Lapin") {
            if (step === 0) {
                this.questManager.addQuestToBook("lapin_map", "La Carte Perdue", "Trouve la carte à la Tour (-62, -32).");
                this.questManager.advanceStory(); 
                
            } 
        }
        else if (npcName === "biche") {
             if (step === 2 || step === 3) {
                const hasBerry = this.book.inventory.find(i => i && i.name === "Baie");
                if (hasBerry) {
                    this.book.removeItem("Baie");
                    this.questManager.awardBadge("Ami des Biches", "silver");
                    this.questManager.advanceStory(); 
                    if(this.questManager.storyStep === 3) this.questManager.advanceStory(); 
                    
                } else {
                    this.questManager.storyStep = 3; 
                    this.questManager.updateMainQuestUI();
                }
             }
        }
        else if (npcName === "Ecureuil") {
             const hasAcorn = this.book.inventory.find(i => i && i.name === "Gland");
             if (hasAcorn) {
                 this.book.removeItem("Gland");
                 this.questManager.awardBadge("Éclaireur", "gold");
                 this.world.unlockCave(); 
                 this.questManager.advanceStory(); 
             }  
        }
        else if (npcName === "Renard") {
            const hasMap = this.book.inventory.find(i => i && i.name === "Carte");
            if (hasMap) {
                this.book.removeItem("Carte");
                this.book.addItem("Boussole", "Indique le Nord.", null); 
                this.questManager.awardBadge("Rusé comme un Renard", "red");
                this.questManager.addQuestToBook("renard_done", "Renard trouvé", "Fait.");
                this.questManager.completeQuestInBook("renard_done");
                this.questManager.advanceStory(); 
                
            }
        }
        // DANS handleChoice (src/main.js)

        // ... les autres animaux avant ...

        else if (npcName === "Castor") {
             const hasLog = this.book.inventory.find(i => i && i.name === "Bûche");
             
             if (hasLog) {
                 // 1. On retire la bûche
                 this.book.removeItem("Bûche");
                 
                 // 2. On donne le badge
                 this.questManager.awardBadge("Bâtisseur", "brown");
                 this.questManager.advanceStory();
                 
                 console.log("✅ Bûche donnée au Castor !");
                 
                 // 4. LANCEMENT DE LA FIN (Avec un petit délai pour être sûr)
                 console.log("🎬 Lancement de la séquence de fin dans 0.5s...");
                 
                 // On utilise une flèche => pour garder le "this" correct
                 setTimeout(() => {
                     if (this.startEndingSequence) {
                        this.startEndingSequence();
                     } else {
                        console.error("❌ ERREUR : La méthode startEndingSequence n'existe pas !");
                     }
                 }, 1000);

             } else {
                 if (step === 7) this.questManager.advanceStory();
             }
        }
    }

    document.getElementById("dialogue-screen").style.display = "none";
    this.isPaused = false;
    this.currentNPC = null;
  }
}

window.game = new Game();