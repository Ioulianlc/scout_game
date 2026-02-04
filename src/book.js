// book.js
export class Book {
  constructor(game) {
    this.game = game;
    this.isOpen = false;

    // --- DONNÉES DES BADGES ---
    this.badges = [
      {
        id: "biche",
        name: "Badge Biche",
        desc: "Aventure commencée.",
        unlocked: false,
      },
      {
        id: "ecureuil",
        name: "Badge Écureuil",
        desc: "Agile et rapide.",
        unlocked: false,
      },
      {
        id: "renard",
        name: "Badge Renard",
        desc: "Esprit rusé.",
        unlocked: false,
      },
      {
        id: "castor",
        name: "Badge Castor",
        desc: "Bâtisseur né.",
        unlocked: false,
      },
      {
        id: "taupe",
        name: "Badge Taupe",
        desc: "Explorateur souterrain.",
        unlocked: false,
      },
      {
        id: "arbre",
        name: "Badge Arbre",
        desc: "Gardien de la forêt.",
        unlocked: false,
      },
      {
        id: "maitre",
        name: "Badge Ultime",
        desc: "Grand Maître Scout !",
        unlocked: false,
      },
    ];

    this.inventory = [null, null, null, null];
    this.quests = [
      {
        titre: "La Noisette Dorée",
        demandeur: "Mme Écureuil",
        status: "En cours",
      },
    ];

    this.initUI();
  }

  initUI() {
    // Conteneur principal du livre
    this.bookUI = document.createElement("div");
    this.bookUI.id = "scoutBook";
    Object.assign(this.bookUI.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "800px",
      height: "550px",
      backgroundColor: "#f4e4bc",
      backgroundImage: "linear-gradient(to right, #e3d2a7 50%, #f4e4bc 50%)",
      border: "10px solid #5d4037",
      borderRadius: "15px",
      boxShadow: "0 0 50px rgba(0,0,0,0.8)",
      display: "none",
      fontFamily: "Georgia, serif",
      color: "#3e2723",
      zIndex: "2000",
    });

    // Tooltip pour les descriptions
    this.tooltip = document.createElement("div");
    Object.assign(this.tooltip.style, {
      position: "fixed",
      padding: "8px",
      background: "#fffbe6",
      border: "2px solid #3e2723",
      borderRadius: "4px",
      pointerEvents: "none",
      display: "none",
      zIndex: "3000",
      fontSize: "12px",
    });
    document.body.appendChild(this.tooltip);

    this.createLeftPage();
    this.createRightPage();
    document.body.appendChild(this.bookUI);
  }

  createLeftPage() {
    const leftPage = document.createElement("div");
    Object.assign(leftPage.style, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "50%",
      height: "100%",
      padding: "20px",
      boxSizing: "border-box",
      borderRight: "2px solid #c7b299",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    });

    leftPage.innerHTML =
      '<h2 style="margin:0 0 10px 0; border-bottom:2px solid #3e2723; width:100%; text-align:center;">JOUEUR</h2>';

    // 1. INVENTAIRE (HAUT)
    const itemsContainer = document.createElement("div");
    Object.assign(itemsContainer.style, {
      display: "flex",
      gap: "10px",
      marginBottom: "10px",
    });
    this.itemSlotsDOM = [];
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      Object.assign(slot.style, {
        width: "50px",
        height: "50px",
        border: "2px solid #5d4037",
        backgroundColor: "rgba(255,255,255,0.4)",
        borderRadius: "6px",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      });
      this.setupItemEvents(slot, i);
      this.itemSlotsDOM.push(slot);
      itemsContainer.appendChild(slot);
    }
    leftPage.appendChild(itemsContainer);

    // 2. PERSONNAGE (MILIEU)
    const charContainer = document.createElement("div");
    Object.assign(charContainer.style, {
      flex: "1",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
    const playerSprite = document.createElement("div");
    Object.assign(playerSprite.style, {
      width: "128px",
      height: "128px",
      backgroundImage: "url('./src/assets/scoutt.png')",
      backgroundSize: "400%",
      backgroundPosition: "0% 100%",
      imageRendering: "pixelated",
    });
    charContainer.appendChild(playerSprite);
    leftPage.appendChild(charContainer);

    // 3. BADGES (BAS)
    this.badgeContainer = document.createElement("div");
    Object.assign(this.badgeContainer.style, {
      height: "50px",
      display: "flex",
      gap: "8px",
      marginBottom: "10px",
    });

    this.badges.forEach((badge) => {
      const bDiv = document.createElement("div");
      bDiv.id = `badge-${badge.id}`;
      Object.assign(bDiv.style, {
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "2px solid #3e2723",
        backgroundColor: "#ccc",
        opacity: "0.3",
        backgroundSize: "cover",
      });
      this.badgeContainer.appendChild(bDiv);
    });
    leftPage.appendChild(this.badgeContainer);

    this.bookUI.appendChild(leftPage);
  }

  createRightPage() {
    const rightPage = document.createElement("div");
    Object.assign(rightPage.style, {
      position: "absolute",
      top: 0,
      right: 0,
      width: "50%",
      height: "100%",
      padding: "20px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    });

    // CARTE
    const mapSection = document.createElement("div");
    Object.assign(mapSection.style, {
      flex: "1.2",
      borderBottom: "2px dashed #8c7b70",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    });
    mapSection.innerHTML =
      '<h2 style="margin:0 0 10px 0; border-bottom:2px solid #3e2723; width:100%; text-align:center;">CARTE</h2>';

    this.mapImgDiv = document.createElement("div");
    Object.assign(this.mapImgDiv.style, {
      width: "90%",
      height: "160px",
      backgroundImage: "url('./src/assets/MAP_V1.png')",
      backgroundSize: "100% 100%",
      border: "2px solid #5d4037",
      position: "relative",
      filter: "sepia(0.3)",
      display: "none",
      overflow: "hidden",
    });

    this.playerMarker = document.createElement("div");
    Object.assign(this.playerMarker.style, {
      position: "absolute",
      width: "8px",
      height: "8px",
      backgroundColor: "red",
      borderRadius: "50%",
      border: "1px solid white",
      transform: "translate(-50%, -50%)",
      zIndex: "10",
    });
    this.mapImgDiv.appendChild(this.playerMarker);

    this.noMapMsg = document.createElement("div");
    this.noMapMsg.innerText = "Tu n'as pas encore de carte...";
    this.noMapMsg.style.marginTop = "20px";

    mapSection.appendChild(this.mapImgDiv);
    mapSection.appendChild(this.noMapMsg);
    rightPage.appendChild(mapSection);

    // QUÊTES
    const questSection = document.createElement("div");
    Object.assign(questSection.style, {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
    });
    questSection.innerHTML =
      '<h2 style="margin:10px 0 5px 0; border-bottom:2px solid #3e2723; width:100%; text-align:center;">QUÊTES</h2>';
    this.questListDiv = document.createElement("div");
    questSection.appendChild(this.questListDiv);

    rightPage.appendChild(questSection);
    this.bookUI.appendChild(rightPage);
  }

  setupItemEvents(slot, index) {
    slot.addEventListener("mouseenter", () => {
      const item = this.inventory[index];
      this.tooltip.style.display = "block";
      this.tooltip.innerHTML = item
        ? `<strong>${item.name}</strong><br>${item.desc}`
        : "Vide";
    });
    slot.addEventListener("mousemove", (e) => {
      this.tooltip.style.left = e.clientX + 15 + "px";
      this.tooltip.style.top = e.clientY + 15 + "px";
    });
    slot.addEventListener(
      "mouseleave",
      () => (this.tooltip.style.display = "none"),
    );
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.bookUI.style.display = this.isOpen ? "block" : "none";
    if (this.isOpen) this.updateUI();
  }

  updateUI() {
    // Quêtes
    this.questListDiv.innerHTML =
      this.quests
        .map(
          (q) => `
      <div style="border-bottom:1px dashed #8c7b70; padding:5px 0; font-size:13px">
        <strong>${q.titre}</strong> - <span style="color:#d35400">${q.status}</span>
      </div>`,
        )
        .join("") || "Aucune quête.";

    // Carte
    const hasMap = this.inventory.some((item) => item && item.name === "Carte");
    this.mapImgDiv.style.display = hasMap ? "block" : "none";
    this.noMapMsg.style.display = hasMap ? "none" : "block";

    // Inventaire
    this.inventory.forEach((item, i) => {
      const slot = this.itemSlotsDOM[i];
      if (item) {
        slot.style.backgroundImage = item.img ? `url('${item.img}')` : "none";
        slot.style.backgroundColor = item.img ? "transparent" : "#8B4513";
        slot.style.border = "2px solid #3e2723";
      } else {
        slot.style.backgroundImage = "none";
        slot.style.backgroundColor = "rgba(255,255,255,0.4)";
        slot.style.border = "2px dashed #8c7b70";
      }
    });
  }

  addItem(name, desc, img) {
    const index = this.inventory.indexOf(null);
    if (index !== -1) {
      this.inventory[index] = { name, desc, img };
      this.updateUI();
      return true;
    }
    return false;
  }

  unlockBadge(badgeId) {
    const badge = this.badges.find((b) => b.id === badgeId);
    if (badge) {
      badge.unlocked = true;
      const bDiv = document.getElementById(`badge-${badge.id}`);
      if (bDiv) bDiv.style.opacity = "1";
    }
  }

  updatePlayerPositionOnMap(playerX, playerY) {
    const worldW = 192; // Largeur de ta map dans world.js
    const worldH = 112; // Hauteur de ta map dans world.js
    let posX = ((playerX + worldW / 2) / worldW) * 100;
    let posY = (1 - (playerY + worldH / 2) / worldH) * 100;

    if (this.playerMarker) {
      this.playerMarker.style.left = posX + "%";
      this.playerMarker.style.top = posY + "%";
    }
  }
}
