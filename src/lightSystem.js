import * as THREE from 'three';

export class LightSystem {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;

        // Paramètres de la torche (Tu peux jouer avec ces valeurs !)
        const radiusInt = 20;  // Le cœur très chaud
        const radiusMid = 80;  // Le corps de la lumière
        const radiusExt = 150; // Le halo extérieur

        // =================================================================
        // COUCHE 1 : LES TÉNÈBRES (Le voile noir qui masque le jeu)
        // =================================================================
        const canvasDark = document.createElement('canvas');
        canvasDark.width = 512; canvasDark.height = 512;
        const ctxDark = canvasDark.getContext('2d');

        // 1. On remplit tout en noir opaque
        ctxDark.fillStyle = '#000000';
        ctxDark.fillRect(0, 0, 512, 512);

        // 2. On prépare la "gomme" pour faire le trou
        const gradDark = ctxDark.createRadialGradient(256, 256, radiusInt, 256, 256, radiusExt);
        // Au centre : Gomme forte (rgba alpha 1) -> Transparent
        gradDark.addColorStop(0, 'rgba(0,0,0,1)'); 
        // Aux bords : Gomme nulle (rgba alpha 0) -> Reste Noir
        gradDark.addColorStop(1, 'rgba(0,0,0,0)');

        // 3. On perce le trou
        ctxDark.globalCompositeOperation = 'destination-out';
        ctxDark.fillStyle = gradDark;
        ctxDark.beginPath();
        ctxDark.arc(256, 256, radiusExt, 0, Math.PI * 2, false);
        ctxDark.fill();

        // Création du Mesh Ténèbres
        const texDark = new THREE.CanvasTexture(canvasDark);
        const geoDark = new THREE.PlaneGeometry(30, 30);
        // Matériau normal, juste transparent
        const matDark = new THREE.MeshBasicMaterial({ map: texDark, transparent: true, depthTest: false, opacity: 0.98 });
        this.darknessMesh = new THREE.Mesh(geoDark, matDark);
        this.darknessMesh.position.set(0, 0, 5); // Z=5


        // =================================================================
        // COUCHE 2 : LA LUEUR CHAUDE (L'orange qui éclaire)
        // =================================================================
        const canvasGlow = document.createElement('canvas');
        canvasGlow.width = 512; canvasGlow.height = 512;
        const ctxGlow = canvasGlow.getContext('2d');

        // On ne remplit PAS le fond. Le fond est transparent par défaut.

        // 1. Le dégradé de couleur chaude (Feu/Torche)
        // 1. Le dégradé de couleur chaude (Feu/Torche)
        const gradGlow = ctxGlow.createRadialGradient(256, 256, 5, 256, 256, radiusExt);
        
        // --- CORRECTION ANTI-ÉBLOUISSEMENT ---
        
        // 0% (Centre sur le perso) : 
        // On met une opacité TRÈS FAIBLE (0.1) et pas de blanc.
        // Cela permet de voir le personnage presque sans altération.
        gradGlow.addColorStop(0, 'rgba(255, 150, 50, 0.1)'); 
        
        // 20% (Juste autour du perso) : 
        // C'est là que la lumière commence vraiment, un orange doux.
        gradGlow.addColorStop(0.1, 'rgba(238, 87, 0, 0.41)');
        
        // 60% (Le corps de la lumière) : 
        // Un rouge-orange sombre pour l'ambiance.
        gradGlow.addColorStop(0.6, 'rgba(150, 50, 0, 0.2)');
        
        // 100% (Bords) : Transparent
        gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        // 2. On dessine la lueur
        // Pas de 'destination-out' ici, on dessine normalement par dessus
        ctxGlow.globalCompositeOperation = 'source-over';
        ctxGlow.fillStyle = gradGlow;
        ctxGlow.fillRect(0, 0, 512, 512);

        // Création du Mesh Lueur
        const texGlow = new THREE.CanvasTexture(canvasGlow);
        // IMPORTANT : AdditiveBlending fait que le noir devient transparent, 
        // et les couleurs "s'ajoutent" pour créer de la lumière.
        const matGlow = new THREE.MeshBasicMaterial({ 
            map: texGlow, 
            transparent: true, 
            depthTest: false,
            blending: THREE.AdditiveBlending, // <--- LE SECRET EST ICI
            opacity: 0.8 // Règle l'intensité de la torche (0.5 = faible, 1.0 = fort)
        });
        this.glowMesh = new THREE.Mesh(geoDark, matGlow); // On réutilise la même géométrie
        // On le place au même endroit que les ténèbres
        this.glowMesh.position.set(0, 0, 5); 


        // On ajoute les deux couches à la scène, cachées par défaut
        this.darknessMesh.visible = false;
        this.glowMesh.visible = false;
        this.scene.add(this.darknessMesh);
        this.scene.add(this.glowMesh);
    }

    update(playerPosition) {
        if (this.isActive) {
            // Les deux couches suivent le joueur
            this.darknessMesh.position.x = playerPosition.x;
            this.darknessMesh.position.y = playerPosition.y;

            this.glowMesh.position.x = playerPosition.x;
            this.glowMesh.position.y = playerPosition.y;
        }
    }

    enable() {
        if (!this.isActive) {
            this.isActive = true;
            this.darknessMesh.visible = true;
            this.glowMesh.visible = true;
        }
    }

    disable() {
        if (this.isActive) {
            this.isActive = false;
            this.darknessMesh.visible = false;
            this.glowMesh.visible = false;
        }
    }
}