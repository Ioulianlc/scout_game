import * as THREE from "three";
import { Scout } from "./scout.js";
import { World } from "./world.js";
import { Inputs } from "./inputs.js";
import { LightSystem } from "./lightSystem.js";
import { AudioManager } from "./audioManager.js";
// On peut retirer l'import de VegetationGenerator car il n'est plus utilisé ici
// import { VegetationGenerator } from "./vegetation.js"; 
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
    // CORRECTION DU CHEMIN (Assure-toi que le fichier est bien dans public/sounds/)
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

    this.book.addItem("Carte", "La carte de la forêt.", null);

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
      const px = this.scout.mesh.position.x;
      const py = this.scout.mesh.position.y;

      const isDarkZone = (this.world.currentMapId === 'grotte'); 

      if (isDarkZone) {
          this.lightSystem.enable(); 
          this.lightSystem.update(this.scout.mesh.position);
      } else {
          this.lightSystem.disable();
      }

      if (this.coordDisplay) {
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