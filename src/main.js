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
    this.audioManager.load('forest_theme', './sounds/forest_theme.mp3');

    window.addEventListener('keydown', () => {
        this.audioManager.playMusic('forest_theme', 0.3);
    }, { once: true });
        
    this.scout = new Scout(this.scene);

    // C'est ici que la végétation est créée maintenant (dans le World)
    this.world = new World(this.scene, this.camera, this.scout); 
    
    // --- LIVRE & QUÊTES ---
    this.book = new Book(this);
    this.questManager = new QuestManager(this);

    

    // --- LUMIÈRE ---
    this.lightSystem = new LightSystem(this.scene);

    // --- ZONE LABYRINTHE ---
    this.mazeZone = {
        minX: -95,  
        maxX: -52,  
        minY: -1,   
        maxY: 30   
    };

    // --- DIALOGUES ---
    this.isPaused = false;
    this.currentNPC = null;
    this.dialogueIndex = 0;

    // --- DEBUG & UI ---
    this.coordDisplay = document.getElementById("debug-coords");
    
    window.addEventListener('keydown', (e) => {
        if (e.code === 'F3') {
            e.preventDefault();
            if (this.coordDisplay) {
                this.coordDisplay.style.display = 
                    this.coordDisplay.style.display === 'none' ? 'block' : 'none';
            }
        }

        if (e.key.toLowerCase() === "i") {
            if (this.currentNPC) return;
            this.book.toggle();
            this.isPaused = this.book.isOpen;
            // Son inventaire
            this.audioManager.play('book_open');
        }
    });

    window.addEventListener('resize', () => this.handleResize());

    this.clock = new THREE.Clock();
    this.loop();
  }
// -------------------------------------------------------------------------------------------------------------------------------------------------
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
    this.checkSpecialInteractions()

    // --- AJOUT : On vérifie les bûches à ramasser ---
    this.checkCollectibles();
    // ------------------------------------------------

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
      this.scout.update(deltaTime, this.inputs, this.world.colliders, this.audioManager);

      // --- CAMÉRA ---
      let targetX = this.camera.position.x + (this.scout.mesh.position.x - this.camera.position.x) * 5 * deltaTime;
      let targetY = this.camera.position.y + (this.scout.mesh.position.y - this.camera.position.y) * 5 * deltaTime;

      const aspect = window.innerWidth / window.innerHeight;
      const camHalfHeight = this.frustumSize / 2;
      const camHalfWidth = (this.frustumSize * aspect) / 2;

      const limitX = 96 - camHalfWidth; 
      const limitY = 56 - camHalfHeight;

      if (limitX > 0) {
          this.camera.position.x = THREE.MathUtils.clamp(targetX, -limitX, limitX);
      } else {
          this.camera.position.x = 0; 
      }

      if (limitY > 0) {
          this.camera.position.y = THREE.MathUtils.clamp(targetY, -limitY, limitY);
      } else {
          this.camera.position.y = 0;
      }

      // --- TÉLÉPORTATION ---
      if (this.world.teleporters) {
          const px = this.scout.mesh.position.x;
          const py = this.scout.mesh.position.y;

          for (const tp of this.world.teleporters) {
               const dist = Math.sqrt((px - tp.x)**2 + (py - tp.y)**2);
               if (dist < 1.0) {
                   // Son téléportation
                   this.audioManager.play('teleport');

                   this.world.loadMap(tp.targetMap);
                   this.scout.mesh.position.set(tp.targetX, tp.targetY, 0);
                   this.camera.position.x = tp.targetX;
                   this.camera.position.y = tp.targetY;
                   break;
               }
          }
      }

      // --- LOGIQUE NUIT ---
      const isDarkZone = (this.world.currentMapId === 'grotte'); 

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

  // --- INTERACTION ---

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
      // Petite astuce : on ne cache le texte que si on n'a pas non plus d'objet à ramasser
      // (sinon le texte de la bûche clignoterait)
      if (!this.world.collectibles || this.world.collectibles.length === 0) {
          prompt.style.display = "none";
      }
    }
  }
  // DANS GAME.JS, AJOUTE CETTE MÉTHODE :
// DANS src/game.js

  checkSpecialInteractions() {
    // Si on est à l'étape 1 (On cherche la carte)
    if (this.questManager.storyStep === 1) {
        
        // --- MODIFICATION ICI : NOUVELLES COORDONNÉES (-62, -32) ---
        const targetPos = new THREE.Vector3(-62, -32, 0);
        // -----------------------------------------------------------

        const dist = this.scout.mesh.position.distanceTo(targetPos);
        const prompt = document.getElementById("interaction-prompt");

        // J'ai mis 3.0 de distance pour que ce soit confortable
        if (dist < 3.0) { 
            prompt.style.display = "block";
            prompt.innerText = "Appuyez sur E pour ramasser la Carte"; // Texte plus précis

            if (this.inputs.keys.interact) {
                // C'est CETTE action qui valide la mission
                this.audioManager.play('book_open');

                // --- NOUVEAU : SUPPRESSION VISUELLE ---
                // On cherche l'objet par son nom (défini dans vegetation.js)
                const mapObject = this.scene.getObjectByName("QuestMapObject");
                if (mapObject) {
                    this.scene.remove(mapObject); // On l'enlève de la scène
                }
                // --------------------------------------
                
                // 1. On donne l'objet
                this.book.addItem("Carte", "Carte de la forêt", null);
                
                // 2. On donne le badge
                this.questManager.awardBadge("Explorateur de Tour", "#cd7f32");
                
                // 3. On valide la quête dans le livre
                this.questManager.completeQuestInBook("lapin_map");
                
                // 4. On passe à l'étape suivante (Trouver la Biche)
                this.questManager.advanceStory(); 
                
                // Reset touche et prompt
                this.inputs.keys.interact = false;
                prompt.style.display = "none";
            }
            return true; 
        }
    }
    return false;
  }

  // --- NOUVEAU : GESTION DU RAMASSAGE (BÛCHES) ---
  checkCollectibles() {
      if (!this.world.collectibles) return;

      const pickupRange = 1.5;
      const prompt = document.getElementById("interaction-prompt");
      let itemFound = null;
      let indexFound = -1;

      // On regarde si on est proche d'un objet
      for (let i = 0; i < this.world.collectibles.length; i++) {
          const item = this.world.collectibles[i];
          const dist = this.scout.mesh.position.distanceTo(item.position);
          
          if (dist < pickupRange) {
              itemFound = item;
              indexFound = i;
              break;
          }
      }

      // Si on trouve un objet et qu'on n'est pas déjà en dialogue
      if (itemFound && !this.isPaused && !this.nearestNPC) {
          prompt.style.display = "block";
          prompt.innerText = `Appuyez sur E pour ramasser : ${itemFound.name}`;

          if (this.inputs.keys.interact) {
              // 1. Ajouter à l'inventaire
              this.book.addItem(itemFound.name, "Du bois pour le castor.", null);
              
              // 2. Son
              this.audioManager.play('book_open'); 

              // 3. Supprimer visuellement
              this.scene.remove(itemFound);

              // 4. Supprimer de la liste logique
              this.world.collectibles.splice(indexFound, 1); 
              
              this.inputs.keys.interact = false;
              prompt.style.display = "none";
          }
      } 
      // Important : ne pas cacher le prompt si c'est un PNJ qui l'utilise
      else if (!this.nearestNPC) {
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
                  
                  alert("Renard : 'Marché conclu ! Voici ta boussole. Elle t'aidera à t'orienter sans carte.'");
              } else {
                  alert("Renard : 'Il me faut ta carte ! Pas de carte, pas de boussole !'");
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
                  alert("Castor : 'Parfait ! Je peux réparer le pont. Tu es le héros de la forêt !'");
              } else {
                  alert("Castor : 'Pas de bras, pas de chocolat... euh pas de bois, pas de pont !'");
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