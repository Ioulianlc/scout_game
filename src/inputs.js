export class Inputs {
    constructor() {
        // État logique des actions (ce que le jeu regarde)
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            interact: false 
        };

        // État physique de la touche (pour empêcher le "spam" si on reste appuyé)
        this.isInteractPressed = false;

        // Écouteurs d'événements
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.keys.enter = true;
                // ... reste du code
            });

            window.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.keys.enter = false;
            });
    }

    onKeyDown(event) {
        switch(event.code) {
            // Mouvements : on autorise le maintien de la touche
            case 'KeyW': case 'ArrowUp': this.keys.up = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.down = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            
            // Interaction (E) : Logique "Single Shot"
            case 'KeyE': 
                // Si la touche n'était pas déjà physiquement enfoncée...
                if (!this.isInteractPressed) {
                    this.keys.interact = true;  // On lance l'action
                    this.isInteractPressed = true; // On verrouille
                }
                break;
        }
    }

    onKeyUp(event) {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.up = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.down = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            
            case 'KeyE': 
                // On libère le verrou physique quand on relâche la touche
                this.isInteractPressed = false; 
                this.keys.interact = false; 
                break;
        }
    }
}