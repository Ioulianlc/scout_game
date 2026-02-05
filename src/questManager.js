// questManager.js
export class QuestManager {
  constructor(game) {
    this.game = game;
    this.allQuests = {
      baie: {
        id: "baie",
        titre: "La faim de la biche",
        demandeur: "Mme Biche",
        status: "En cours",
        description: "Trouver 3 baies dans la clairière des baies.",
        recompense: { name: "Clés", desc: "Clés de la tour.", img: null },
        badgeId: "biche",
      },
      gland: {
        id: "gland",
        titre: "L'écureuil radin",
        demandeur: "M. Écureuil",
        status: "En cours",
        description: "Ramenez 5 glands à monsieur l'écureuil.",
        recompense: {
          name: "Lampe",
          desc: "Une lampe torche puissante.",
          img: null,
        },
        badgeId: "ecureuil",
      },
      bousole: {
        id: "bousole",
        titre: "Le renard et la malice",
        demandeur: "M. Renard",
        status: "En cours",
        description: "Échangez votre carte contre une boussole.",
        recompense: {
          name: "Boussole",
          desc: "Elle pointe vers le Nord.",
          img: "/boussole.png",
        },
        badgeId: "renard",
      },
      pont: {
        id: "pont",
        titre: "La réparation du pont",
        demandeur: "Panneau",
        status: "En cours",
        description:
          "Allez au camp d'urgence récupérer la hache pour couper du bois...",
        badgeId: "arbre", // Badge de protecteur de la forêt
      },
      chamalow: {
        id: "chamalow",
        titre: "La gourmandise du castor",
        demandeur: "Mme. Castor",
        status: "En cours",
        description: "Donnez les chamalows pour libérer le passage de l'eau.",
        badgeId: "castor",
      },
      // --- LA QUÊTE MANQUANTE : LE RAVITAILLEMENT ---
      scout: {
        id: "scout",
        titre: "Le ravitaillement",
        demandeur: "Chef Scout",
        status: "En cours",
        description:
          "Allez voir vos amis scouts pour récupérer les provisions (Chamalows).",
        recompense: {
          name: "Chamalow",
          desc: "Un sachet de guimauves sucrées.",
          img: null,
        },
        badgeId: "maitre",
      },
    };
  }

  acceptQuest(questId) {
    const questData = this.allQuests[questId];
    if (questData) {
      const alreadyAccepted = this.game.book.quests.find(
        (q) => q.id === questId,
      );
      if (!alreadyAccepted) {
        this.game.book.quests.push({ ...questData });
        this.game.book.updateUI();
      }
    }
  }

  completeQuest(questId) {
    const quest = this.game.book.quests.find((q) => q.id === questId);

    if (quest && quest.status !== "Terminée") {
      quest.status = "Terminée";

      // 1. Donne l'objet de récompense si défini
      if (quest.recompense) {
        this.game.book.addItem(
          quest.recompense.name,
          quest.recompense.desc,
          quest.recompense.img,
        );
      }

      // 2. Débloque le badge associé
      if (quest.badgeId) {
        this.game.book.unlockBadge(quest.badgeId);
      }

      this.game.book.updateUI();
    }
  }
}