export class QuestManager {
    constructor(game) {
        this.game = game;
        this.storyStep = 0; 
        this.updateMainQuestUI();
    }

    updateMainQuestUI() {
        const ui = document.getElementById("main-quest-text");
        let text = "";

        switch (this.storyStep) {
            case 0: text = "Trouve le Lapin, il a besoin de toi."; break;
            case 1: text = "Rejoins la TOUR pour trouver la Carte. Appuye sur \"e\" pour la rammasser"; break;
            case 2: text = "Trouve maintenant la Biche."; break;
            case 3: text = "La Biche a faim : Trouve une BAIE."; break;
            case 4: text = "Trouve Célian l'écureuil curieux."; break;
            case 5: text = "L'écureuil veut un GLAND pour t'aider."; break;
            case 6: text = "Trouve le Renard dans la Grotte."; break;
            case 7: text = "Trouve vite Monsieur le Castor."; break;
            case 8: text = "Le Castor a besoin d'une BÛCHE."; break;
            case 9: text = "Félicitations ! Tu as aidé toute la forêt !"; break;
        }
        if (ui) ui.innerText = text;
    }

    advanceStory() {
        this.storyStep++;
        this.updateMainQuestUI();
        if(this.game.audioManager) this.game.audioManager.play('book_open');
    }

    // --- CES FONCTIONS UTILISENT MAINTENANT TON BOOK.JS ---

    addQuestToBook(id, title, description) {
        // Appelle la méthode qu'on vient d'ajouter dans book.js
        this.game.book.addQuest(id, title, description);
    }

    completeQuestInBook(id) {
        this.game.book.completeQuest(id);
    }

    awardBadge(name, color) {
        // Mapping entre les noms du scénario et les IDs de ton book.js
        let badgeId = null;

        if (name === "Ami des Biches") badgeId = "biche";
        else if (name === "Éclaireur") badgeId = "ecureuil"; // L'écureuil donne ce badge
        else if (name === "Rusé comme un Renard") badgeId = "renard";
        else if (name === "Bâtisseur") badgeId = "castor";
        else if (name === "Explorateur de Tour") badgeId = "arbre"; // On utilise "arbre" pour la tour/carte

        if (badgeId) {
            this.game.book.unlockBadge(badgeId);
            alert(`BADGE DÉBLOQUÉ : ${name}`);
        } else {
            console.warn("Badge ID inconnu pour :", name);
        }
    }
}