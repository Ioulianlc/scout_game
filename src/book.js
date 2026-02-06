export class Book {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    // Tes badges existants (je garde tes IDs)
    this.badges = [
      { id: "biche", name: "Badge Biche", desc: "Aventure commencée.", img:"./badgebambi.png",unlocked: false },
      { id: "ecureuil", name: "Badge Écureuil", desc: "Agile et rapide.", img:"./badgeecureuil.png", unlocked: false },
      { id: "renard", name: "Badge Renard", desc: "Esprit rusé.", img:"./badgerenard.png", unlocked: false },
      { id: "castor", name: "Badge Castor", desc: "Bâtisseur né.", img:"./badgecastor.png",unlocked: false },
      { id: "taupe", name: "Badge Taupe", desc: "Explorateur souterrain.", img:"./badgetaupe.png",unlocked: false },
      { id: "arbre", name: "Badge Arbre", desc: "Gardien de la forêt.", img:"./badgearbre.png",unlocked: false },
      { id: "maitre", name: "Badge Ultime", desc: "Grand Maître Scout !", img:"./badgefeu.png",unlocked: false },
    ];
    this.inventory = [null, null, null, null];
    this.quests = [];
    this.initUI();
  }

  initUI() {
    // --- WIDGET DE NAVIGATION ---
    this.navWidget = document.createElement("div");
    Object.assign(this.navWidget.style, {
      position: "fixed", top: "20px", right: "20px", width: "120px", height: "120px",
      zIndex: "5000", display: "none", border: "4px solid #5d4037", borderRadius: "50%",
      backgroundColor: "#3b7d4f", boxShadow: "0 0 15px rgba(0,0,0,0.5)", overflow: "hidden",
      pointerEvents: "none", backgroundRepeat: "no-repeat",
    });

    this.miniMarker = document.createElement("div");
    Object.assign(this.miniMarker.style, {
      position: "absolute", top: "50%", left: "50%", width: "8px", height: "8px",
      backgroundColor: "red", borderRadius: "50%", border: "1px solid white",
      transform: "translate(-50%, -50%)", zIndex: "5001", display: "none",
    });

    this.navWidget.appendChild(this.miniMarker);
    document.body.appendChild(this.navWidget);

    // --- LE LIVRE ---
    this.bookUI = document.createElement("div");
    this.bookUI.id = "scoutBook";
    Object.assign(this.bookUI.style, {
      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      width: "800px", height: "550px", backgroundColor: "#f4e4bc",
      backgroundImage: "linear-gradient(to right, #e3d2a7 50%, #f4e4bc 50%)",
      border: "10px solid #5d4037", borderRadius: "15px", boxShadow: "0 0 50px rgba(0,0,0,0.8)",
      display: "none", fontFamily: "Georgia, serif", color: "#3e2723", zIndex: "2000",
    });

    this.tooltip = document.createElement("div");
    Object.assign(this.tooltip.style, {
      position: "fixed", padding: "8px", background: "#fffbe6", border: "2px solid #3e2723",
      borderRadius: "4px", pointerEvents: "none", display: "none", zIndex: "3000", fontSize: "12px",
    });
    document.body.appendChild(this.tooltip);

    this.createLeftPage();
    this.createRightPage();
    document.body.appendChild(this.bookUI);
  }

  createLeftPage() {
    const leftPage = document.createElement("div");
    Object.assign(leftPage.style, {
      position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
      padding: "20px", boxSizing: "border-box", borderRight: "2px solid #c7b299",
      display: "flex", flexDirection: "column", alignItems: "center",
    });
    leftPage.innerHTML = '<h2 style="margin:0 0 10px 0; border-bottom:2px solid #3e2723; width:100%; text-align:center;">JOUEUR</h2>';

    const itemsContainer = document.createElement("div");
    itemsContainer.style.display = "flex";
    itemsContainer.style.gap = "10px";
    itemsContainer.style.marginBottom = "10px";
    this.itemSlotsDOM = [];
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      Object.assign(slot.style, {
        width: "50px", height: "50px", border: "2px solid #5d4037",
        backgroundColor: "rgba(255,255,255,0.4)", borderRadius: "6px",
        backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
      });
      this.setupItemEvents(slot, i);
      this.itemSlotsDOM.push(slot);
      itemsContainer.appendChild(slot);
    }
    leftPage.appendChild(itemsContainer);

    const charContainer = document.createElement("div");
    charContainer.style.flex = "1";
    charContainer.style.display = "flex";
    charContainer.style.justifyContent = "center";
    charContainer.style.alignItems = "center";
    const playerSprite = document.createElement("div");
    Object.assign(playerSprite.style, {
      width: "128px", height: "128px", backgroundImage: "url('./scoutt.png')",
      backgroundSize: "400%", backgroundPosition: "0% 100%", imageRendering: "pixelated",
    });
    charContainer.appendChild(playerSprite);
    leftPage.appendChild(charContainer);

    this.badgeContainer = document.createElement("div");
    Object.assign(this.badgeContainer.style, {
      height: "50px", display: "flex", gap: "8px", marginBottom: "10px",
    });

    this.badges.forEach((badge) => {
      const bDiv = document.createElement("div");
      bDiv.id = `badge-${badge.id}`;
      Object.assign(bDiv.style, {
        width: "32px", 
        height: "32px", 
        borderRadius: "50%", 
        border: "2px solid #3e2723",
        
        // --- C'EST ICI QUE ÇA CHANGE ---
        backgroundColor: "transparent", // Plus de fond gris
        backgroundImage: `url('${badge.img}')`, // On met ton image !
        backgroundSize: "cover", // L'image remplit tout le rond
        backgroundPosition: "center",
        // -------------------------------

        opacity: "0.3", // Grisé si pas débloqué
        transition: "opacity 0.3s, transform 0.2s" // Petit effet sympa
      });
      bDiv.addEventListener("mouseenter", () => {
        this.tooltip.style.display = "block";
        this.tooltip.innerHTML = `<strong>${badge.name}</strong><br>${badge.unlocked ? badge.desc : "???"}`;
      });
      bDiv.addEventListener("mousemove", (e) => {
        this.tooltip.style.left = e.clientX + 15 + "px";
        this.tooltip.style.top = e.clientY + 15 + "px";
      });
      bDiv.addEventListener("mouseleave", () => (this.tooltip.style.display = "none"));
      this.badgeContainer.appendChild(bDiv);
    });
    leftPage.appendChild(this.badgeContainer);
    this.bookUI.appendChild(leftPage);
  }

  createRightPage() {
    const rightPage = document.createElement("div");
    Object.assign(rightPage.style, {
      position: "absolute", top: 0, right: 0, width: "50%", height: "100%",
      padding: "20px", boxSizing: "border-box", display: "flex", flexDirection: "column",
    });

    const mapSection = document.createElement("div");
    Object.assign(mapSection.style, {
      flex: "1.2", borderBottom: "2px dashed #8c7b70", display: "flex",
      flexDirection: "column", alignItems: "center",
    });
    mapSection.innerHTML = '<h2 style="margin:0 0 10px 0; border-bottom:2px solid #3e2723; width:100%; text-align:center;">CARTE</h2>';

    this.mapImgDiv = document.createElement("div");
    Object.assign(this.mapImgDiv.style, {
      width: "90%", height: "160px", backgroundImage: "url('./map.png')",
      backgroundSize: "100% 100%", border: "2px solid #5d4037", position: "relative",
      filter: "sepia(0.3)", display: "none", overflow: "hidden",
    });

    this.playerMarker = document.createElement("div");
    Object.assign(this.playerMarker.style, {
      position: "absolute", width: "8px", height: "8px", backgroundColor: "red",
      borderRadius: "50%", border: "1px solid white", transform: "translate(-50%, -50%)", zIndex: "10",
    });
    this.mapImgDiv.appendChild(this.playerMarker);

    this.noMapMsg = document.createElement("div");
    this.noMapMsg.innerText = "Tu n'as pas encore de carte...";
    this.noMapMsg.style.marginTop = "20px";

    mapSection.appendChild(this.mapImgDiv);
    mapSection.appendChild(this.noMapMsg);
    rightPage.appendChild(mapSection);

    const questSection = document.createElement("div");
    Object.assign(questSection.style, {
      flex: "1", display: "flex", flexDirection: "column", overflowY: "auto",
    });
    questSection.innerHTML = '<h2 style="margin:10px 0 5px 0; border-bottom:2px solid #3e2723; width:100%; text-align:center;">QUÊTES</h2>';
    this.questListDiv = document.createElement("div");
    questSection.appendChild(this.questListDiv);

    rightPage.appendChild(questSection);
    this.bookUI.appendChild(rightPage);
  }

  setupItemEvents(slot, index) {
    slot.addEventListener("mouseenter", () => {
      const item = this.inventory[index];
      this.tooltip.style.display = "block";
      this.tooltip.innerHTML = item ? `<strong>${item.name}</strong><br>${item.desc}` : "Vide";
    });
    slot.addEventListener("mousemove", (e) => {
      this.tooltip.style.left = e.clientX + 15 + "px";
      this.tooltip.style.top = e.clientY + 15 + "px";
    });
    slot.addEventListener("mouseleave", () => (this.tooltip.style.display = "none"));
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.bookUI.style.display = this.isOpen ? "block" : "none";
    this.updateUI();
  }

  updateUI() {
    // 1. Quêtes
    this.questListDiv.innerHTML = this.quests.map(q => `
      <div style="border-bottom:1px dashed #8c7b70; padding:8px 0; font-size:13px">
        <div style="display:flex; justify-content:space-between;">
            <strong>${q.titre}</strong>
            <span style="color:${q.status === "Terminée" ? "#27ae60" : "#d35400"}; font-weight:bold;">${q.status}</span>
        </div>
        <div style="font-style:italic; color:#5d4037; margin-top:2px;">${q.description || ""}</div>
      </div>`).join("") || "Aucune quête.";

    // 2. Inventaire
    this.inventory.forEach((item, i) => {
      const slot = this.itemSlotsDOM[i];
      if (item) {
        slot.style.backgroundImage = item.img ? `url('${item.img}')` : "none";
        slot.style.backgroundColor = item.img ? "transparent" : "#8B4513";
        slot.style.border = "2px solid #3e2723";
        // Si c'est un texte sans image, on affiche la première lettre
        if (!item.img) slot.innerText = item.name.charAt(0);
      } else {
        slot.style.backgroundImage = "none";
        slot.style.backgroundColor = "rgba(255,255,255,0.4)";
        slot.style.border = "2px dashed #8c7b70";
        slot.innerText = "";
      }
    });

    // 3. Carte & Boussole
    const hasMap = this.inventory.some(item => item && item.name === "Carte");
    const hasBoussole = this.inventory.some(item => item && item.name === "Boussole");

    this.mapImgDiv.style.display = hasMap ? "block" : "none";
    this.noMapMsg.style.display = hasMap ? "none" : "block";

    if (this.navWidget) {
      if (this.isOpen) {
        this.navWidget.style.display = "none";
      } else if (hasMap) {
        this.navWidget.style.display = "block";
        this.navWidget.style.backgroundImage = "url('./map.png')";
        this.navWidget.style.backgroundSize = "450%";
        this.navWidget.id = "mini-map-hud";
        this.miniMarker.style.display = "block";
      } else if (hasBoussole) {
        this.navWidget.style.display = "block";
        this.navWidget.style.backgroundImage = "url('./boussole.png')";
        this.navWidget.style.backgroundSize = "contain";
        this.navWidget.id = "dynamic-compass";
        this.miniMarker.style.display = "none";
      } else {
        this.navWidget.style.display = "none";
      }
    }
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

  removeItem(itemName) {
    const index = this.inventory.findIndex(item => item && item.name === itemName);
    if (index !== -1) {
      this.inventory[index] = null;
      this.updateUI();
    }
  }

  unlockBadge(badgeId) {
    const badge = this.badges.find(b => b.id === badgeId);
    if (badge) {
      badge.unlocked = true;
      const bDiv = document.getElementById(`badge-${badge.id}`);
      if (bDiv) {
          bDiv.style.opacity = "1";
          bDiv.style.backgroundColor = "gold"; // Visuel "débloqué"
      }
    }
  }

  // --- NOUVELLES MÉTHODES POUR QUEST MANAGER ---
  addQuest(id, title, desc) {
      // Évite les doublons
      if (this.quests.find(q => q.id === id)) return;
      
      this.quests.push({
          id: id,
          titre: title,
          description: desc,
          status: "En cours"
      });
      this.updateUI();
      // On ouvre le livre pour montrer la nouvelle quête
      if (!this.isOpen) this.toggle();
  }

  completeQuest(id) {
      const q = this.quests.find(q => q.id === id);
      if (q) {
          q.status = "Terminée";
          this.updateUI();
      }
  }
  // ---------------------------------------------

  updatePlayerPositionOnMap(playerX, playerY) {
    const worldW = 192;
    const worldH = 112;
    let posX = ((playerX + worldW / 2) / worldW) * 100;
    let posY = (1 - (playerY + worldH / 2) / worldH) * 100;

    if (this.playerMarker) {
      this.playerMarker.style.left = posX + "%";
      this.playerMarker.style.top = posY + "%";
    }

    if (this.navWidget && this.navWidget.id === "mini-map-hud") {
      this.miniMarker.style.left = "50%";
      this.miniMarker.style.top = "50%";
      this.navWidget.style.backgroundPosition = `${posX}% ${posY}%`;
    }
  }
}