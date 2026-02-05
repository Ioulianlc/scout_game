export class AudioManager {
  constructor() {
    this.sounds = {};
    this.currentMusic = null; // Pour se souvenir de la musique actuelle
  }

  load(name, path) {
    const audio = new Audio(path);
    this.sounds[name] = audio;
  }

  // Pour les bruitages (Pas, Coups, Inventaire...)
  play(name, volume = 1.0) {
    const sound = this.sounds[name];
    if (sound) {
      sound.loop = false; // Pas de boucle
      sound.volume = volume;
      sound.currentTime = 0;
      sound.play().catch((e) => console.warn("Son bloqué :", e));
    }
  }

  // --- NOUVEAU : POUR LA MUSIQUE D'AMBIANCE ---
  playMusic(name, volume = 0.3) {
    const music = this.sounds[name];

    // 1. Si c'est déjà cette musique qui joue, on ne fait rien (on évite le reboot)
    if (this.currentMusic === music) return;

    // 2. Si une autre musique joue, on l'arrête
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
    }

    // 3. On lance la nouvelle musique
    if (music) {
      this.currentMusic = music;
      music.loop = true; // CRUCIAL : La musique tourne en boucle
      music.volume = volume; // Musique plus douce que les effets
      music
        .play()
        .catch((e) => console.warn("Musique bloquée (cliquez sur le jeu)", e));
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }

  // Ton système de pas
  playStep(interval = 400) {
    const now = Date.now();
    if (!this.lastStepTime || now - this.lastStepTime > interval) {
      this.play("step", 0.5);
      this.lastStepTime = now;
    }
  }
}
