import * as THREE from "three";
import { Scout } from "./scout.js";
import { World } from "./world.js";
import { Inputs } from "./inputs.js";
import { LightSystem } from "./lightSystem.js";
import { VegetationGenerator } from "./vegetation.js";

class Game {
  constructor() {
    this.canvas = document.querySelector("canvas.webgl");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    // On ne définit pas la taille ici, handleResize s'en chargera
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#3b7d4f");

    this.setupCamera();

    this.inputs = new Inputs();
    
    this.scout = new Scout(this.scene);

    // --- MODIFICATION 1 : On passe 'scout' au World pour qu'il puisse le gérer ---
    this.world = new World(this.scene, this.camera, this.scout); 
    
    // --- GÉNÉRATION D'ARBRES ---
    // Note : Pour l'instant, ces arbres resteront affichés même si tu changes de carte.
    // Idéalement, il faudra déplacer ça dans world.js plus tard.
    const vegetation = new VegetationGenerator(this.scene, this.world);
    vegetation.generateZone(-42, 34, -55, -6, 200);
    vegetation.generateZone(-10, 42, 39, 10, 60);
    vegetation.generateZone(-17, 48, 56, 40, 43);

    // --- SYSTÈME DE LUMIÈRE ---
    this.lightSystem = new LightSystem(this.scene);

    // --- ZONE DU LABYRINTHE ---
    this.mazeZone = {
        minX: -95,  
        maxX: -52,  
        minY: -1,  
        maxY: 30   
    };

    // --- VARIABLES DE DIALOGUE ---
    this.isPaused = false;
    this.currentNPC = null;
    this.dialogueIndex = 0;

    // --- DEBUG HUD ---
    this.coordDisplay = document.getElementById("debug-coords");
    window.addEventListener('keydown', (e) => {
        if (e.code === 'F3') {
            e.preventDefault();
            if (this.coordDisplay) {
                this.coordDisplay.style.display = 
                    this.coordDisplay.style.display === 'none' ? 'block' : 'none';
            }
        }
    });

    // --- GESTION DU REDIMENSIONNEMENT (Anti-Étirement) ---
    window.addEventListener('resize', () => this.handleResize());

    this.clock = new THREE.Clock();
    this.loop();
  }

  setupCamera() {
    this.frustumSize = 100; // J'ai remis 10 (zoom standard) car 100 est très loin
    
    // On crée une caméra vide, elle sera configurée par handleResize
    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // On force le calcul des proportions dès le démarrage
    this.handleResize();
  }

  handleResize() {
    // 1. Calcul du ratio de l'écran (Largeur / Hauteur)
    const aspect = window.innerWidth / window.innerHeight;

    // 2. Mise à jour des bordures de la caméra
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;

    // 3. Application des changements
    this.camera.updateProjectionMatrix();

    // 4. Redimensionnement du rendu
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

    if (!this.isPaused) {
      this.scout.update(deltaTime, this.inputs, this.world.colliders);

      // --- 1. MOUVEMENT FLUIDE CAMÉRA ---
      let targetX = this.camera.position.x + (this.scout.mesh.position.x - this.camera.position.x) * 5 * deltaTime;
      let targetY = this.camera.position.y + (this.scout.mesh.position.y - this.camera.position.y) * 5 * deltaTime;

      // --- 2. BLOCAGE CAMÉRA (Clamping) ---
      const aspect = window.innerWidth / window.innerHeight;
      const camHalfHeight = this.frustumSize / 2;
      const camHalfWidth = (this.frustumSize * aspect) / 2;

      // Limites basées sur ta map (192x112 -> demi-taille 96x56)
      // Note : Si tu changes de map pour une plus petite (Grotte), il faudra adapter ces valeurs !
      // Pour l'instant on garde celles de la map principale.
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

      // --- MODIFICATION 2 : SYSTÈME DE TÉLÉPORTATION ---
      // On vérifie si le joueur marche sur un téléporteur
      if (this.world.teleporters) {
          const px = this.scout.mesh.position.x;
          const py = this.scout.mesh.position.y;

          for (const tp of this.world.teleporters) {
               const dist = Math.sqrt((px - tp.x)**2 + (py - tp.y)**2);
               
               // Si distance < 1.0 (on est dessus)
               if (dist < 1.0) {
                   console.log("Teleportation vers :", tp.targetMap);
                   
                   // A. Charger la nouvelle carte
                   this.world.loadMap(tp.targetMap);
                   
                   // B. Déplacer le joueur
                   this.scout.mesh.position.set(tp.targetX, tp.targetY, 0);

                   // C. Reset immédiat de la caméra pour éviter de voir le fond vert
                   this.camera.position.x = tp.targetX;
                   this.camera.position.y = tp.targetY;
                   
                   break; // On arrête pour ne pas téléporter en boucle
               }
          }
      }
      // ------------------------------------------------

      // --- LOGIQUE NUIT / LABYRINTHE ---
      const px = this.scout.mesh.position.x;
      const py = this.scout.mesh.position.y;

      const isInMaze = (
          px >= this.mazeZone.minX && 
          px <= this.mazeZone.maxX && 
          py >= this.mazeZone.minY && 
          py <= this.mazeZone.maxY
      );

      if (isInMaze) {
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
      this.nextStep();
      this.inputs.keys.enter = false;
    }
  }

  // --- INTERACTION ---

  checkProximity() {
    const range = 1.5;
    this.nearestNPC = null;
    const prompt = document.getElementById("interaction-prompt");

    // Vérification de sécurité au cas où world.npcs est vide
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
    }
    document.getElementById("dialogue-screen").style.display = "none";
    this.isPaused = false;
    this.currentNPC = null;
  }
}

window.game = new Game();