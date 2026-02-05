// Fichier: src/maps.js

export const maps = {
    "exterieur": {
        texture: '/map.png',
        width: 192,
        height: 112,
        spawn: { x: -31, y: 47 },
        
        // --- TES COLLISIONS SONT ICI MAINTENANT ---
        colliders: [
            // Tes obstacles spécifiques (que tu avais dans world.js)
            { x: -78, y: 30, w: 52, h: 1 },
            { x: -52.4, y: 24, w: 1, h: 12 },
            { x: 192, y: 48, w: 1, h: 1 }, // (mapW = 192)

            // Tes 4 murs de bordure
            { x: -96.5, y: 0, w: 1, h: 112 }, // Gauche
            { x: 96.5, y: 0, w: 1, h: 112 },  // Droite
            { x: 0, y: -56.5, w: 192, h: 1 }, // Bas
            { x: 0, y: 56.5, w: 192, h: 1 }   // Haut
        ],

        teleporters: [
            { 
                x: -75, y: 0, // Utilise le curseur rouge pour ajuster ça !
                targetMap: "grotte", 
                targetX: 0, targetY: -8 
            }
        ],
        hasNPCs: true 
    },

    "grotte": {
        // ... (suite du fichier pour la 2ème map)
        texture: '/cave_map.png',
        width: 64, height: 64, spawn: { x: 0, y: -8 },
        colliders: [
            { x: -32, y: 0, w: 1, h: 64 },
            { x: 32, y: 0, w: 1, h: 64 },
            { x: 0, y: 32, w: 64, h: 1 },
            { x: 0, y: -32, w: 64, h: 1 }
        ],
        teleporters: [
            { 
                x: 0, y: -10, 
                targetMap: "exterieur", 
                targetX: -10, targetY: 8 
            }   
        ],
        hasNPCs: false
    }
};