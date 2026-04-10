// --- DEV MODE SETTINGS ---
const DEV_MODE = false; 
let godMode = false;

// --- Configuration & State ---
let bgmVolume = 1.0; let sfxVolume = 1.0; let joystickSensitivity = 1.0; 
let difficulty = 'normal'; let spawnTimer, shootTimer; 
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// --- DOM Elements & Resize handling ---
const c = document.getElementById("c"); const ctx = c.getContext("2d");
c.width = innerWidth; c.height = innerHeight;
window.addEventListener('resize', () => { c.width = innerWidth; c.height = innerHeight; });

const menus = {
  main: document.getElementById('main-menu'), settings: document.getElementById('settings-menu'),
  pause: document.getElementById('pause-menu'), gameOver: document.getElementById('game-over-screen'),
  hud: document.getElementById('hud'), shutdown: document.getElementById('shutdown-screen'),
  mobileControls: document.getElementById('mobile-controls'), upgrade: document.getElementById('upgrade-screen')
};

// UI Handlers
document.getElementById('btn-settings-open').addEventListener('click', () => { menus.main.style.display = "none"; menus.settings.style.display = "flex"; });
document.getElementById('btn-settings-close').addEventListener('click', () => { menus.settings.style.display = "none"; menus.main.style.display = "flex"; });
document.getElementById('btn-exit').addEventListener('click', () => { menus.main.style.display = "none"; menus.shutdown.style.display = "flex"; });
document.getElementById('slider-bgm').addEventListener('input', (e) => { bgmVolume = e.target.value / 100; document.getElementById('bgm-val').innerText = e.target.value + "%"; });
document.getElementById('slider-sfx').addEventListener('input', (e) => { sfxVolume = e.target.value / 100; document.getElementById('sfx-val').innerText = e.target.value + "%"; });
document.getElementById('slider-sens').addEventListener('input', (e) => { joystickSensitivity = e.target.value / 100; document.getElementById('sens-val').innerText = e.target.value + "%"; });

function setDifficulty(level) {
  difficulty = level;
  ['easy', 'normal', 'hard'].forEach(l => document.getElementById('diff-' + l).classList.remove('active-diff'));
  document.getElementById('diff-' + level).classList.add('active-diff');
}

// --- Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmInterval; let isBgmPlaying = false;

function startBGM() {
  if (isBgmPlaying) return; isBgmPlaying = true;
  const notes = [110, 110, 130, 146, 110, 110, 98, 82]; let step = 0;
  bgmInterval = setInterval(() => {
    if (gameOver || gameWon || isPaused || inMenu || inUpgradeMenu || bgmVolume === 0) return; 
    const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(notes[step], audioCtx.currentTime);
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.015 * bgmVolume, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.15); step = (step + 1) % notes.length; 
  }, 150); 
}

function playSound(type) {
  if (sfxVolume <= 0) return; if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
  osc.connect(gainNode); gainNode.connect(audioCtx.destination); const now = audioCtx.currentTime;
  if (type === 'shoot') { osc.type = 'square'; osc.frequency.setValueAtTime(880, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.1); gainNode.gain.setValueAtTime(0.05 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.1); gainNode.gain.linearRampToValueAtTime(0, now + 0.15); osc.start(now); osc.stop(now + 0.15); } 
  else if (type === 'enemyShoot') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(55, now + 0.15); gainNode.gain.setValueAtTime(0.05 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.15); gainNode.gain.linearRampToValueAtTime(0, now + 0.2); osc.start(now); osc.stop(now + 0.2); } 
  else if (type === 'hit') { osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.2); gainNode.gain.setValueAtTime(0.3 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.2); gainNode.gain.linearRampToValueAtTime(0, now + 0.25); osc.start(now); osc.stop(now + 0.25); } 
  else if (type === 'explode') { osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.3); gainNode.gain.setValueAtTime(0.15 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.3); gainNode.gain.linearRampToValueAtTime(0, now + 0.35); osc.start(now); osc.stop(now + 0.35); } 
  else if (type === 'levelup') { osc.type = 'square'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554, now + 0.1); osc.frequency.setValueAtTime(659, now + 0.2); gainNode.gain.setValueAtTime(0.1 * sfxVolume, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4); } 
  else if (type === 'bossWarning') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(150, now + 0.5); osc.frequency.linearRampToValueAtTime(100, now + 1.0); gainNode.gain.setValueAtTime(0.15 * sfxVolume, now); gainNode.gain.linearRampToValueAtTime(0, now + 1.0); osc.start(now); osc.stop(now + 1.0); } 
  else if (type === 'bossHit') { osc.type = 'square'; osc.frequency.setValueAtTime(80, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.1); gainNode.gain.setValueAtTime(0.2 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
}

// --- Game State Variables ---
let mouse = {x:c.width/2, y:c.height/2};
let firing = false; let inMenu = true; let isPaused = false; let gameOver = false; let inUpgradeMenu = false; let gameWon = false;
let player, bullets, enemies, enemyBullets, stars, particles, powerups;
let health, score, currentLevel, nextBossScore; let bossActive = false; let boss = null;
let joystick = { active: false, dx: 0, dy: 0, touchId: null };

let playerStats = { maxHealth: 100, weaponLevel: 0, drones: 0, missiles: 0, tesla: 0, shields: 0, inverted: false };
let activeTeslaArcs = []; 
const bossNames = ["GOLIATH CRUISER", "SWARM HIVE", "PULSAR STAR", "GEMINI SYSTEM", "NEXUS CORE", "VOID SINGULARITY", "PRISM WEAVER", "PHANTOM SWARM", "SIEGE ENGINE", "OMEGA ARCHON"];

let shakeDuration = 0; let shakeIntensity = 0;
function triggerShake(duration, intensity) { shakeDuration = duration; shakeIntensity = intensity; }

function createExplosion(x, y, color, count, speedModifier = 1) {
  let actualCount = Math.min(count, 30); 
  for(let i=0; i<actualCount; i++){
    let angle = Math.random() * Math.PI * 2; let speed = (Math.random() * 4 + 1) * speedModifier;
    particles.push({ x: x, y: y, dx: Math.cos(angle)*speed, dy: Math.sin(angle)*speed, radius: Math.random() * 3 + 1, color: color, life: 1.0, decay: Math.random() * 0.05 + 0.02 });
  }
}

stars = [];
for (let i = 0; i < 150; i++) { stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, size: Math.random() * 2.5 + 0.5, speed: Math.random() * 2 + 0.1, color: Math.random() > 0.8 ? '#44aaff' : '#ffffff' }); }

const upgrades = [
  { id: 'heal', name: 'SYSTEM REPAIR', desc: 'Restores 50 Hull Integrity.', weight: 100, action: () => { health = Math.min(playerStats.maxHealth, health + 50); } },
  { id: 'maxhp', name: 'HULL PLATING', desc: 'Increases Maximum HP by 25.', weight: 80, action: () => { playerStats.maxHealth += 25; health += 25; } },
  { id: 'drone', name: 'COMBAT DRONE', desc: 'Adds an orbiting drone. (Max 2)', weight: 20, action: () => { playerStats.drones++; } },
  { id: 'missile', name: 'SWARM MISSILES', desc: 'Periodically launches missiles. (Max 3)', weight: 20, action: () => { playerStats.missiles++; } },
  { id: 'tesla', name: 'TESLA COIL', desc: 'Zaps nearby enemies. (Max 2)', weight: 15, action: () => { playerStats.tesla++; } },
  { id: 'shield', name: 'ORBITAL SHIELD', desc: 'Blocks bullets. Shatters if rammed!', weight: 20, action: () => { playerStats.shields++; } },
  { id: 'wep1', name: 'TWIN BLASTER', desc: 'Fires 2 parallel lasers.', weight: 50, reqWep: 0, action: () => { playerStats.weaponLevel = 1; } },
  { id: 'wep2', name: 'TRIPLE BURST', desc: 'Fires 3 lasers in a wide arc.', weight: 15, reqWep: 1, action: () => { playerStats.weaponLevel = 2; } },
  { id: 'wep3', name: 'PLASMA FAN', desc: 'Fires 5 lasers. Overwhelming firepower.', weight: 2, reqWep: 2, action: () => { playerStats.weaponLevel = 3; } }
];

function showUpgradeScreen() {
  inUpgradeMenu = true; menus.upgrade.style.display = "flex"; menus.hud.style.display = "none";
  if (isTouchDevice) menus.mobileControls.style.display = "none";

  let validUpgrades = upgrades.filter(u => {
    if (u.reqWep !== undefined && playerStats.weaponLevel !== u.reqWep) return false;
    if (u.id === 'drone' && playerStats.drones >= 2) return false; 
    if (u.id === 'missile' && playerStats.missiles >= 3) return false;
    if (u.id === 'tesla' && playerStats.tesla >= 2) return false;
    if (u.id === 'shield' && playerStats.shields >= 3) return false;
    return true;
  });

  let choices = [];
  for(let i=0; i<3; i++) {
    if (validUpgrades.length === 0) break;
    let totalWeight = validUpgrades.reduce((sum, u) => sum + u.weight, 0);
    let r = Math.random() * totalWeight; let sum = 0;
    for(let j=0; j<validUpgrades.length; j++) {
      sum += validUpgrades[j].weight;
      if (r <= sum) { choices.push(validUpgrades[j]); validUpgrades.splice(j, 1); break; }
    }
  }

  const container = document.getElementById('upgrade-options'); container.innerHTML = '';
  choices.forEach(choice => {
    let btn = document.createElement('div'); btn.className = 'upgrade-card';
    btn.innerHTML = `<h3 class="title-cyan">${choice.name}</h3><p>${choice.desc}</p>`;
    btn.onclick = () => {
      choice.action(); playSound('levelup'); inUpgradeMenu = false;
      menus.upgrade.style.display = "none"; menus.hud.style.display = "flex";
      if (isTouchDevice) menus.mobileControls.style.display = "flex"; triggerLevelUp(); 
    };
    container.appendChild(btn);
  });
}

function spawnBoss() {
  bossActive = true; clearInterval(spawnTimer);
  playSound('bossWarning'); setTimeout(() => playSound('bossWarning'), 1000); triggerShake(60, 5); 
  let speedMod = difficulty === 'easy' ? 0.6 : (difficulty === 'normal' ? 1.0 : 1.5);
  let bossMaxHp = 1000 + (currentLevel * 800); 
  
  // FIXED: Now properly cycles through ALL 10 bosses based on level
  let bossType = currentLevel % 10; 
  
  boss = { 
    x: c.width / 2, y: -150, targetY: 120, width: 200, height: 140, 
    hp: bossMaxHp, maxHp: bossMaxHp, speed: (2 + (currentLevel * 0.3)) * speedMod, direction: 1, 
    attackTimer: 0, spiral: 0, angle: 0, type: bossType, state: 0, phantoms: [] 
  };
  
  if (bossType === 7) { 
      for(let i=0; i<4; i++) boss.phantoms.push({x:0, y:0, isReal: i===0});
  }
}

function applyDifficultyTimers() {
  clearInterval(spawnTimer); clearInterval(shootTimer);
  let baseSpawn = difficulty === 'easy' ? 2000 : (difficulty === 'normal' ? 1500 : 1000);
  let baseFire = difficulty === 'easy' ? 4000 : (difficulty === 'normal' ? 3000 : 2000);
  let speedMod = difficulty === 'easy' ? 0.6 : (difficulty === 'normal' ? 1.0 : 1.5);
  let levelMultiplier = Math.max(0.3, 1 - (currentLevel * 0.12));

  spawnTimer = setInterval(()=>{
    if(gameOver || gameWon || inMenu || isPaused || inUpgradeMenu || bossActive) return;
    if(enemies.length >= 25) return; 

    let side = Math.floor(Math.random()*4); let x,y;
    if(side===0){ x=Math.random()*c.width; y=-30; } else if(side===1){ x=Math.random()*c.width; y=c.height+30; } else if(side===2){ x=-30; y=Math.random()*c.height; } else { x=c.width+30; y=Math.random()*c.height; }
    
    let maxTypes = 3; 
    if (currentLevel >= 1) maxTypes = 4; if (currentLevel >= 2) maxTypes = 5; if (currentLevel >= 3) maxTypes = 6; 
    if (currentLevel >= 5) maxTypes = 7; if (currentLevel >= 7) maxTypes = 8; if (currentLevel >= 8) maxTypes = 9; 

    let selectedType = Math.floor(Math.random() * maxTypes); 
    let enemyHP = 1;
    if (selectedType === 4) enemyHP = 3; if (selectedType === 7) enemyHP = 5; if (selectedType === 8) enemyHP = 8;

    let enemySpeed = (0.5 + (Math.random() * 0.5)) * speedMod * (1 + (currentLevel * 0.15));
    if (selectedType === 4 || selectedType === 7 || selectedType === 8) enemySpeed *= 0.5; 
    if (selectedType === 6) enemySpeed *= 1.4; 
    
    enemies.push({ x: x, y: y, speed: enemySpeed, type: selectedType, tick: 0, hp: enemyHP });
  }, baseSpawn * levelMultiplier);

  shootTimer = setInterval(()=>{
    if(gameOver || gameWon || inMenu || isPaused || inUpgradeMenu) return;
    if (enemies.length > 0) {
      playSound('enemyShoot'); 
      enemies.forEach(e=>{
        if (e.type !== 8 && e.type !== 7) {
            let centerX = e.x; let centerY = e.y; let a = Math.atan2(player.y - centerY, player.x - centerX); let bulletSpeed = 3.0 * speedMod; 
            enemyBullets.push({ x: centerX, y: centerY, dx: Math.cos(a)*bulletSpeed, dy: Math.sin(a)*bulletSpeed, glow: "orange" });
        }
      });
    }
  }, baseFire * levelMultiplier);
}

function startGame(){
  player = {x:c.width/2, y:c.height/2, angle:0};
  playerStats = { maxHealth: 100, weaponLevel: 0, drones: 0, missiles: 0, tesla: 0, shields: 0, inverted: false }; 
  bullets = []; enemies = []; enemyBullets = []; particles = []; powerups = [];
  health = 100; score = 0; currentLevel = 0; nextBossScore = 500; bossActive = false; boss = null; godMode = false;
  inMenu = false; isPaused = false; gameOver = false; gameWon = false; inUpgradeMenu = false;

  document.querySelector('#game-over-screen h1').innerText = "CRITICAL FAILURE";
  document.querySelector('#game-over-screen h1').className = "title-red";
  document.getElementById('game-over-screen').style.borderColor = "red";
  document.getElementById('btn-restart').innerText = "REBOOT SYSTEM";

  Object.values(menus).forEach(m => m.style.display = 'none'); menus.hud.style.display = "flex";
  if (isTouchDevice) menus.mobileControls.style.display = "flex";
  updateUI(); if (audioCtx.state === 'suspended') audioCtx.resume(); startBGM(); applyDifficultyTimers();
}

function triggerLevelUp() { currentLevel++; nextBossScore = score + 500 + (currentLevel * 200); applyDifficultyTimers(); updateUI(); }
function returnToMenu() { inMenu = true; isPaused = false; Object.values(menus).forEach(m => m.style.display = 'none'); menus.main.style.display = "flex"; clearInterval(bgmInterval); isBgmPlaying = false; }
function togglePause() {
  if(inMenu || gameOver || gameWon || inUpgradeMenu) return; isPaused = !isPaused;
  if (isPaused) { menus.pause.style.display = "flex"; if(audioCtx.state === 'running') audioCtx.suspend(); } else { menus.pause.style.display = "none"; if(audioCtx.state === 'suspended') audioCtx.resume(); }
}
function triggerGameOver() {
  gameOver = true; document.getElementById('final-score').innerText = score; triggerShake(30, 10);
  document.querySelector('#game-over-screen p').innerHTML = `FINAL SCORE: <span id="final-score" style="color:yellow; font-weight:bold; font-size:24px;">${score}</span>`;
  menus.hud.style.display = "none"; menus.mobileControls.style.display = "none"; menus.gameOver.style.display = "flex"; clearInterval(bgmInterval); isBgmPlaying = false; 
}
function triggerVictory() {
  // Infinite looping! Show upgrades, then next level.
  showUpgradeScreen();
}

function updateUI() {
  document.getElementById('score-display').innerText = "SCORE: " + score; document.getElementById('level-display').innerText = "LEVEL: " + (currentLevel + 1);
  let healthPercent = Math.max(0, (health / playerStats.maxHealth) * 100); 
  let hBar = document.getElementById('health-bar'); let hBox = document.querySelector('.health-box'); let hLabel = document.querySelector('.health-label');
  hBar.style.width = healthPercent + "%"; hBox.classList.remove('health-critical');
  
  if (playerStats.inverted) { hLabel.innerText = "SYSTEM ERROR: INVERTED"; hLabel.style.color = "magenta"; hBar.style.background = "magenta"; hBar.style.boxShadow = "0 0 10px magenta"; hBox.style.borderColor = "magenta"; hBox.classList.add('health-critical'); }
  else if (godMode) { hBar.style.background = "magenta"; hBox.style.borderColor = "magenta"; hLabel.style.color = "magenta"; hLabel.innerText = "GOD MODE ACTIVE"; } 
  else {
      hLabel.innerText = "SYSTEM INTEGRITY";
      if (healthPercent > 50) { hBar.style.background = "cyan"; hBar.style.boxShadow = "0 0 10px cyan"; hBox.style.borderColor = "cyan"; hLabel.style.color = "cyan"; } 
      else if (healthPercent > 25) { hBar.style.background = "yellow"; hBar.style.boxShadow = "0 0 10px yellow"; hBox.style.borderColor = "yellow"; hLabel.style.color = "yellow"; } 
      else { hBar.style.background = "red"; hBar.style.boxShadow = "0 0 10px red"; hBox.style.borderColor = "red"; hLabel.style.color = "red"; hBox.classList.add('health-critical'); }
  }
}

// --- Inputs & Dev Commands ---
document.getElementById('btn-play').addEventListener('click', startGame); document.getElementById('btn-restart').addEventListener('click', startGame); document.getElementById('btn-resume').addEventListener('click', togglePause); document.getElementById('btn-quit').addEventListener('click', returnToMenu);
document.getElementById('btn-pause-icon').addEventListener('click', togglePause);

window.addEventListener("keydown", (e) => { 
  if (e.code === "Escape") togglePause(); 
  if (DEV_MODE && !inMenu && !gameOver && !gameWon) {
      if (e.key.toLowerCase() === 'b' && !bossActive) spawnBoss();
      if (e.key.toLowerCase() === 'g') { godMode = !godMode; updateUI(); }
      if (e.key.toLowerCase() === 'u') { playerStats.weaponLevel = 3; playerStats.drones = 2; playerStats.missiles = 3; playerStats.tesla = 2; playerStats.shields = 3; playSound('levelup'); }
      if (e.key.toLowerCase() === 'l') { showUpgradeScreen(); }
      if (e.key.toLowerCase() === 'k') { enemies = []; createExplosion(c.width/2, c.height/2, "orange", 50, 5); playSound('explode'); }
      if (e.key.toLowerCase() === 'n') { currentLevel++; score+=500; updateUI(); spawnBoss(); } 
  }
});

addEventListener("mousemove", e=>{ mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener("mousedown", (e)=> { if(e.target.id === "c") firing = true; }); window.addEventListener("mouseup", ()=> firing = false);

const joyBase = document.getElementById('joystick-base'); const joyStick = document.getElementById('joystick-stick'); const fireBtn = document.getElementById('btn-fire');
joyBase.addEventListener('touchstart', (e) => { e.preventDefault(); if (joystick.touchId !== null) return; let touch = e.changedTouches[0]; joystick.touchId = touch.identifier; updateJoystickVector(touch); }, {passive: false});
joyBase.addEventListener('touchmove', (e) => { e.preventDefault(); for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === joystick.touchId) updateJoystickVector(e.changedTouches[i]); } }, {passive: false});
const resetJoystick = (e) => { e.preventDefault(); for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === joystick.touchId) { joystick.touchId = null; joystick.active = false; joystick.dx = 0; joystick.dy = 0; joyStick.style.transform = `translate(0px, 0px)`; } } };
joyBase.addEventListener('touchend', resetJoystick, {passive: false}); joyBase.addEventListener('touchcancel', resetJoystick, {passive: false});

function updateJoystickVector(touch) {
  joystick.active = true; let rect = joyBase.getBoundingClientRect(); let centerX = rect.left + rect.width / 2; let centerY = rect.top + rect.height / 2;
  let dx = touch.clientX - centerX; let dy = touch.clientY - centerY; let distance = Math.sqrt(dx*dx + dy*dy); let maxDist = rect.width / 2 - 30; 
  if (distance > maxDist) { dx = (dx / distance) * maxDist; dy = (dy / distance) * maxDist; }
  joyStick.style.transform = `translate(${dx}px, ${dy}px)`; joystick.dx = dx / maxDist; joystick.dy = dy / maxDist;
}
fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); firing = true; if (audioCtx.state === 'suspended') audioCtx.resume(); }, {passive: false});
fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); firing = false; }, {passive: false}); fireBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); firing = false; }, {passive: false});

let droneTick = 0; let missileTick = 0;

setInterval(()=>{
  if(gameOver || gameWon || inMenu || isPaused || inUpgradeMenu || !firing) return;
  playSound('shoot'); 
  let a = Math.atan2(mouse.y-player.y, mouse.x-player.x);
  if (joystick.active && (joystick.dx !== 0 || joystick.dy !== 0)) {
      let inv = playerStats.inverted ? -1 : 1;
      a = Math.atan2(joystick.dy * inv, joystick.dx * inv); // Use joystick angle if active
  }
  
  if (playerStats.weaponLevel === 0) { bullets.push({ x: player.x, y: player.y, dx: Math.cos(a)*12, dy: Math.sin(a)*12, color: "lime", isMissile: false }); } 
  else if (playerStats.weaponLevel === 1) {
    let perp = a + Math.PI/2; let ox = Math.cos(perp)*8; let oy = Math.sin(perp)*8;
    bullets.push({ x: player.x+ox, y: player.y+oy, dx: Math.cos(a)*12, dy: Math.sin(a)*12, color: "cyan", isMissile: false }); bullets.push({ x: player.x-ox, y: player.y-oy, dx: Math.cos(a)*12, dy: Math.sin(a)*12, color: "cyan", isMissile: false });
  }
  else if (playerStats.weaponLevel === 2) {
    bullets.push({ x: player.x, y: player.y, dx: Math.cos(a)*12, dy: Math.sin(a)*12, color: "#ff00ff", isMissile: false }); 
    bullets.push({ x: player.x, y: player.y, dx: Math.cos(a-0.2)*12, dy: Math.sin(a-0.2)*12, color: "#ff00ff", isMissile: false }); bullets.push({ x: player.x, y: player.y, dx: Math.cos(a+0.2)*12, dy: Math.sin(a+0.2)*12, color: "#ff00ff", isMissile: false }); 
  }
  else {
    for(let offset = -0.4; offset <= 0.4; offset += 0.2) { bullets.push({ x: player.x, y: player.y, dx: Math.cos(a+offset)*12, dy: Math.sin(a+offset)*12, color: "white", isMissile: false }); }
  }

  if (playerStats.drones > 0) {
    droneTick++;
    if (droneTick >= 8) { 
      droneTick = 0; let target = null;
      if (bossActive && boss) target = boss; else if (enemies.length > 0) target = enemies[0];
      if (target) {
        for(let i=0; i<playerStats.drones; i++) {
            let da = (Date.now() / 500) + (Math.PI*2 / playerStats.drones) * i; let px = player.x + Math.cos(da)*40; let py = player.y + Math.sin(da)*40; let ta = Math.atan2(target.y - py, target.x - px);
            bullets.push({x: px, y: py, dx: Math.cos(ta)*10, dy: Math.sin(ta)*10, color: "yellow", isMissile: false});
        }
      }
    }
  }

  if (playerStats.missiles > 0) {
    missileTick++;
    if (missileTick >= 10) {
      missileTick = 0;
      for(let i=0; i<playerStats.missiles; i++) {
        let ma = a + (Math.random()-0.5); 
        bullets.push({x: player.x, y: player.y, dx: Math.cos(ma)*4, dy: Math.sin(ma)*4, color: "red", isMissile: true});
      }
    }
  }
}, 120);

// --- Game Loop ---
function update(){
  activeTeslaArcs = []; 
  stars.forEach(s => { s.y += s.speed; if (s.y > c.height) { s.y = 0; s.x = Math.random() * c.width; } });
  if(gameOver || gameWon || inMenu || isPaused || inUpgradeMenu) return;

  if (shakeDuration > 0) shakeDuration--;

  if (particles.length > 200) particles.splice(0, particles.length - 200);
  if (enemyBullets.length > 150) enemyBullets.splice(0, enemyBullets.length - 150);
  if (bullets.length > 100) bullets.splice(0, bullets.length - 100);

  for(let i = particles.length - 1; i >= 0; i--){
    let p = particles[i]; p.x += p.dx; p.y += p.dy; p.life -= p.decay;
    if(p.life <= 0) particles.splice(i, 1);
  }

  // PLAYER MOVEMENT (INCLUDES INVERTED LOGIC FOR BOSS 10)
  let inv = playerStats.inverted ? -1 : 1;
  if (joystick.active) {
    let speed = 7 * joystickSensitivity; 
    player.x += joystick.dx * speed * inv; 
    player.y += joystick.dy * speed * inv;
    if (joystick.dx !== 0 || joystick.dy !== 0) {
      player.angle = Math.atan2(joystick.dy * inv, joystick.dx * inv); 
      mouse.x = player.x + Math.cos(player.angle) * 100; 
      mouse.y = player.y + Math.sin(player.angle) * 100;
    }
  } else if (!isTouchDevice) {
    player.x += (mouse.x-player.x)*0.1; 
    player.y += (mouse.y-player.y)*0.1; 
    player.angle = Math.atan2(mouse.y-player.y, mouse.x-player.x);
  }
  player.x = Math.max(20, Math.min(c.width - 20, player.x)); 
  player.y = Math.max(20, Math.min(c.height - 20, player.y));

  if (Math.random() > 0.6) {
    let exhaustX = player.x - Math.cos(player.angle) * 15; let exhaustY = player.y - Math.sin(player.angle) * 15;
    particles.push({ x: exhaustX, y: exhaustY, dx: -Math.cos(player.angle)*2 + (Math.random()-0.5), dy: -Math.sin(player.angle)*2 + (Math.random()-0.5), radius: Math.random()*3 + 2, color: "cyan", life: 1.0, decay: 0.1 });
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i]; p.y += 1.5; 
    if (Math.random() > 0.7) particles.push({ x: p.x + (Math.random()-0.5)*10, y: p.y, dx: 0, dy: 0, radius: 2, color: "lime", life: 1.0, decay: 0.1 });
    if (Math.hypot(player.x - p.x, player.y - p.y) < p.radius + 15) { 
        health = Math.min(playerStats.maxHealth, health + 50); updateUI(); playSound('levelup'); createExplosion(p.x, p.y, "lime", 15, 2); powerups.splice(i, 1); continue;
    }
    if (p.y > c.height + 30) powerups.splice(i, 1);
  }
  
  bullets = bullets.filter(b=>{
    if (b.isMissile) {
        let target = bossActive && boss ? boss : null;
        if (!target && enemies.length > 0) { target = enemies.reduce((closest, e) => (Math.hypot(e.x-b.x, e.y-b.y) < Math.hypot(closest.x-b.x, closest.y-b.y) ? e : closest), enemies[0]); }
        if (target) { let angle = Math.atan2(target.y - b.y, target.x - b.x); b.dx += Math.cos(angle) * 0.8; b.dy += Math.sin(angle) * 0.8; let speed = Math.hypot(b.dx, b.dy); if (speed > 8) { b.dx = (b.dx/speed)*8; b.dy = (b.dy/speed)*8; } }
        if(Math.random()>0.5) particles.push({x: b.x, y: b.y, dx: 0, dy: 0, radius: 1.5, color: "orange", life: 0.8, decay: 0.15}); 
    }
    b.x+=b.dx; b.y+=b.dy; return b.x>0 && b.x<c.width && b.y>0 && b.y<c.height; 
  });

  enemyBullets = enemyBullets.filter(b=>{
    b.x+=b.dx; b.y+=b.dy;
    if(Math.random()>0.8) particles.push({ x: b.x, y: b.y, dx: 0, dy: 0, radius: 1.5, color: b.glow, life: 1.0, decay: 0.2 });

    if (playerStats.shields > 0) {
        let blocked = false;
        for(let i=0; i<playerStats.shields; i++) {
            let angle = (Date.now() / 600) + (Math.PI*2 / playerStats.shields) * i; let sx = player.x + Math.cos(angle)*60; let sy = player.y + Math.sin(angle)*60;
            if (Math.hypot(b.x - sx, b.y - sy) < 18) { createExplosion(b.x, b.y, "cyan", 3); playSound('hit'); blocked = true; break; }
        }
        if (blocked) return false; 
    }

    if( b.x > player.x-15 && b.x < player.x+15 && b.y > player.y-15 && b.y < player.y+15 ){
      if (!godMode) health -= 10; 
      playSound('hit'); triggerShake(10, 4); createExplosion(player.x, player.y, "cyan", 8); updateUI(); return false; 
    }
    return b.x>0 && b.x<c.width && b.y>0 && b.y<c.height;
  });

  // --- ALL 10 BOSS MECHANICS ARE HERE ---
  if (bossActive && boss) {
    if (boss.y < boss.targetY) { boss.y += 1.5; } 
    else {
      boss.x += boss.speed * boss.direction;
      if (boss.x + boss.width/2 > c.width - 20 || boss.x - boss.width/2 < 20) boss.direction *= -1;
      
      boss.attackTimer++; 
      let a = Math.atan2(player.y - boss.y, player.x - boss.x); 
      let bs = 4.0 + (currentLevel * 0.2);
      
      switch(boss.type) {
          case 0: // Goliath Cruiser 
              if (boss.attackTimer > Math.max(30, 80 - currentLevel*5)) {
                  boss.attackTimer = 0; playSound('enemyShoot');
                  [-0.2, 0, 0.2].forEach(off => enemyBullets.push({ x: boss.x - 60, y: boss.y, dx: Math.cos(a+off)*bs, dy: Math.sin(a+off)*bs, glow: "red" }));
                  [-0.2, 0, 0.2].forEach(off => enemyBullets.push({ x: boss.x + 60, y: boss.y, dx: Math.cos(a+off)*bs, dy: Math.sin(a+off)*bs, glow: "red" }));
              }
              break;
          case 1: // Swarm Hive 
              if (boss.attackTimer > Math.max(50, 150 - currentLevel*8)) {
                  boss.attackTimer = 0; playSound('bossHit');
                  for(let i=0; i<3; i++) enemies.push({ x: boss.x + (Math.random()-0.5)*100, y: boss.y, speed: 3.5, type: 6, tick: 0, hp: 1 });
              }
              break;
          case 2: // Pulsar Star 
              boss.angle += 0.03 + (currentLevel * 0.005);
              if (boss.attackTimer > Math.max(10, 30 - currentLevel*2)) {
                  boss.attackTimer = 0; playSound('enemyShoot');
                  for(let i=0; i<4; i++) {
                      let sa = boss.angle + (Math.PI/2)*i;
                      enemyBullets.push({ x: boss.x, y: boss.y, dx: Math.cos(sa)*bs*1.2, dy: Math.sin(sa)*bs*1.2, glow: "cyan" });
                  }
              }
              break;
          case 3: // Gemini System 
              boss.angle += 0.02;
              if (boss.attackTimer > Math.max(20, 60 - currentLevel*4)) {
                  boss.attackTimer = 0; playSound('enemyShoot');
                  [-0.3, 0.3].forEach(off => {
                      enemyBullets.push({ x: boss.x - 60, y: boss.y, dx: Math.cos(a+off)*bs, dy: Math.sin(a+off)*bs, glow: "orange" });
                      enemyBullets.push({ x: boss.x + 60, y: boss.y, dx: Math.cos(a+off)*bs, dy: Math.sin(a+off)*bs, glow: "purple" });
                  });
              }
              break;
          case 4: // Nexus Core 
              if (boss.attackTimer > Math.max(12, 40 - currentLevel*3)) {
                  boss.attackTimer = 0; playSound('enemyShoot');
                  boss.spiral = (boss.spiral || 0) + 0.3;
                  for(let i=0; i<6; i++) {
                      let sa = boss.spiral + (Math.PI/3)*i;
                      enemyBullets.push({ x: boss.x, y: boss.y, dx: Math.cos(sa)*bs*0.8, dy: Math.sin(sa)*bs*0.8, glow: "magenta" });
                  }
              }
              break;
          case 5: // Void Singularity (GRAVITY WELL)
              let dist = Math.hypot(player.x - boss.x, player.y - boss.y);
              if (dist < 400 && !godMode) { player.x += (boss.x - player.x) * 0.015; player.y += (boss.y - player.y) * 0.015; }
              if (boss.attackTimer > 30) { boss.attackTimer = 0; let sa = Math.random()*Math.PI*2; enemyBullets.push({x: boss.x, y: boss.y, dx: Math.cos(sa)*bs, dy: Math.sin(sa)*bs, glow: "white"}); }
              break;
          case 6: // Prism Weaver (REFRACTION LOGIC IS IN DAMAGEBOSS)
              if (boss.attackTimer > 50) { boss.attackTimer = 0; for(let i=0; i<8; i++) { let sa = (Math.PI/4)*i; enemyBullets.push({x: boss.x, y: boss.y, dx: Math.cos(sa)*bs, dy: Math.sin(sa)*bs, glow: "lime"}); } }
              break;
          case 7: // Phantom Swarm (STEALTH)
              if (boss.attackTimer > 150) { boss.attackTimer = 0; let realIdx = Math.floor(Math.random()*4); boss.phantoms.forEach((p,i) => p.isReal = (i === realIdx)); playSound('bossWarning'); }
              if (boss.attackTimer % 40 === 0) { boss.phantoms.forEach((p,i) => { let px = boss.x - 105 + (i*70); enemyBullets.push({x: px, y: boss.y, dx: 0, dy: bs, glow: "red"}); }); }
              break;
          case 8: // Siege Engine (TRANSFORMING BEAM)
              if (boss.attackTimer > 200) { boss.attackTimer = 0; boss.state = boss.state === 0 ? 1 : 0; }
              if (boss.state === 1) {
                  if (player.x > boss.x - 40 && player.x < boss.x + 40 && !godMode) { health -= 1; triggerShake(5, 2); updateUI(); }
              } else {
                  if (boss.attackTimer % 20 === 0) enemyBullets.push({x: boss.x, y: boss.y, dx: Math.cos(a)*bs, dy: Math.sin(a)*bs, glow: "orange"});
              }
              break;
          case 9: // Omega Archon (INVERT CONTROLS)
              if (boss.attackTimer > 300) { boss.attackTimer = 0; playerStats.inverted = !playerStats.inverted; updateUI(); playSound('bossWarning'); setTimeout(() => { playerStats.inverted = false; updateUI(); }, 4000); }
              if (boss.attackTimer % 15 === 0) { boss.spiral += 0.5; for(let i=0; i<3; i++) { let sa = boss.spiral + (Math.PI*2/3)*i; enemyBullets.push({x: boss.x, y: boss.y, dx: Math.cos(sa)*bs, dy: Math.sin(sa)*bs, glow: "yellow"}); } }
              break;
      }
    }
  }

  function damageBoss(amount, impactX, impactY) {
      if (!boss) return;
      // REFRACTION FOR BOSS 6
      if (boss.type === 6) { enemyBullets.push({ x: impactX, y: impactY, dx: (Math.random()-0.5)*6, dy: 4, glow: "lime" }); }
      
      boss.hp -= amount; 
      if (boss.hp <= 0) {
          bossActive = false; score += 500; playSound('explode'); triggerShake(60, 20); 
          createExplosion(boss.x, boss.y, "magenta", 50, 4); createExplosion(boss.x, boss.y, "orange", 50, 5); 
          powerups.push({ x: boss.x, y: boss.y, radius: 15 }); 
          boss = null; triggerVictory(); 
      }
  }

  if (playerStats.tesla > 0 && boss) {
    let range = 80 + (playerStats.tesla * 20); 
    if (Math.hypot(boss.x - player.x, boss.y - player.y) < range) {
      if (!boss) return;
        activeTeslaArcs.push({x: boss.x, y: boss.y});
        damageBoss(0.1 * playerStats.tesla, boss.x, boss.y);
    }
  }

  if (boss) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!boss) break;
      let b = bullets[i];
      if (b.x > boss.x - boss.width/2 && b.x < boss.x + boss.width/2 && b.y > boss.y - boss.height/2 && b.y < boss.y + boss.height/2) {
        playSound('bossHit'); createExplosion(b.x, b.y, "magenta", 3, 0.5); bullets.splice(i, 1);
        damageBoss(10, b.x, b.y);
      }
    }
  }

  if (boss) {
    if (playerStats.shields > 0) {
        for(let i=0; i<playerStats.shields; i++) {
            if (!boss) break;
            let sa = (Date.now() / 600) + (Math.PI*2 / playerStats.shields) * i; let sx = player.x + Math.cos(sa)*60; let sy = player.y + Math.sin(sa)*60;
            if (Math.hypot(boss.x - sx, boss.y - sy) < boss.width/2) { 
                playerStats.shields--; createExplosion(sx, sy, "cyan", 15); playSound('hit'); triggerShake(10, 5);
                damageBoss(20, sx, sy);
                break; 
            }
        }
    }

    if (player.x > boss.x - boss.width/2 && player.x < boss.x + boss.width/2 && player.y > boss.y - boss.height/2 && player.y < boss.y + boss.height/2) {
        if (!godMode) health -= 2; triggerShake(5, 2); createExplosion(player.x, player.y, "cyan", 2); updateUI();
    }
    if (Math.random() > 0.5) {
        particles.push({ x: boss.x - 40, y: boss.y - boss.height/2, dx: 0, dy: -3, radius: Math.random()*5+3, color: "magenta", life: 1.0, decay: 0.1 });
        particles.push({ x: boss.x + 40, y: boss.y - boss.height/2, dx: 0, dy: -3, radius: Math.random()*5+3, color: "magenta", life: 1.0, decay: 0.1 });
    }
  }

  enemies = enemies.filter(e=>{
    let a = Math.atan2(player.y-e.y, player.x-e.x);
    if (e.type === 3) { e.tick += 1; let perpAngle = a + Math.PI / 2; let waveOffset = Math.sin(e.tick * 0.15) * 4; e.x += Math.cos(a) * e.speed + Math.cos(perpAngle) * waveOffset; e.y += Math.sin(a) * e.speed + Math.sin(perpAngle) * waveOffset; } 
    else if (e.type === 5) { e.tick += 1; let currentSpeed = (e.tick % 80 < 15) ? e.speed * 4 : e.speed * 0.5; e.x += Math.cos(a) * currentSpeed; e.y += Math.sin(a) * currentSpeed; } 
    else if (e.type === 6) { let ta = Math.atan2(player.y - e.y, player.x - e.x); e.x += Math.cos(ta)*e.speed; e.y += Math.sin(ta)*e.speed; } 
    else { e.x += Math.cos(a)*e.speed; e.y += Math.sin(a)*e.speed; }
    
    if (e.type === 8 && Math.random() < 0.015) { enemyBullets.push({ x: e.x, y: e.y, dx: Math.cos(a)*5, dy: Math.sin(a)*5, glow: "red" }); playSound('enemyShoot'); }

    if (Math.random() > 0.6) {
        let exhaustColor = "orange"; if (e.type === 3) exhaustColor = "#bc13fe"; else if (e.type === 4) exhaustColor = "yellow"; else if (e.type === 5) exhaustColor = "cyan"; else if (e.type === 6) exhaustColor = "lime";
        particles.push({ x: e.x - Math.cos(a)*10, y: e.y - Math.sin(a)*10, dx: 0, dy: 0, radius: 2, color: exhaustColor, life: 1.0, decay: 0.15 });
    }

    if (playerStats.shields > 0) {
        for(let i=0; i<playerStats.shields; i++) {
            let sa = (Date.now() / 600) + (Math.PI*2 / playerStats.shields) * i; let sx = player.x + Math.cos(sa)*60; let sy = player.y + Math.sin(sa)*60;
            if (Math.hypot(e.x - sx, e.y - sy) < 25) { 
                e.hp -= 5; playerStats.shields--; createExplosion(sx, sy, "cyan", 10); playSound('hit'); triggerShake(5, 3);
                if (e.hp <= 0) {
                    score += (e.type === 8 ? 50 : (e.type === 7 ? 40 : 10)); playSound('explode'); createExplosion(e.x, e.y, "orange", 10); createExplosion(e.x, e.y, "red", 5);
                    if (e.type === 7) { for(let k=0; k<3; k++) enemies.push({x: e.x + (Math.random()-0.5)*20, y: e.y + (Math.random()-0.5)*20, speed: e.speed*2, type: 0, tick: 0, hp: 1}); }
                    if (score >= nextBossScore && !bossActive) spawnBoss(); else updateUI(); 
                    return false; 
                }
                break; 
            }
        }
    }

    if (playerStats.tesla > 0) {
        let range = 80 + (playerStats.tesla * 20);
        if (Math.hypot(e.x - player.x, e.y - player.y) < range) {
            e.hp -= 0.05 * playerStats.tesla; activeTeslaArcs.push({x: e.x, y: e.y});
            if (e.hp <= 0) {
                score += (e.type === 8 ? 50 : (e.type === 7 ? 40 : 10)); playSound('explode'); createExplosion(e.x, e.y, "orange", 10); createExplosion(e.x, e.y, "cyan", 5);
                if (e.type === 7) { for(let k=0; k<3; k++) enemies.push({x: e.x + (Math.random()-0.5)*20, y: e.y + (Math.random()-0.5)*20, speed: e.speed*2, type: 0, tick: 0, hp: 1}); }
                if (score >= nextBossScore && !bossActive) spawnBoss(); else updateUI(); 
                return false; 
            }
        }
    }

    for(let i = bullets.length - 1; i >= 0; i--){
      let b = bullets[i]; let hitBox = (e.type === 8 || e.type === 7) ? 25 : 20; 
      if( Math.hypot(b.x - e.x, b.y - e.y) < hitBox ){ 
        e.hp -= 1; bullets.splice(i, 1); 
        if (e.hp <= 0) {
            score += (e.type === 8 ? 50 : (e.type === 7 ? 40 : 10)); playSound('explode'); triggerShake(e.type === 8 ? 10 : 5, e.type === 8 ? 4 : 2); 
            createExplosion(e.x, e.y, "orange", 10); createExplosion(e.x, e.y, "red", 5);
            if (e.type === 7) { for(let k=0; k<3; k++) enemies.push({x: e.x + (Math.random()-0.5)*20, y: e.y + (Math.random()-0.5)*20, speed: e.speed*2, type: 0, tick: 0, hp: 1}); } 
            if (score >= nextBossScore && !bossActive) spawnBoss(); else updateUI(); 
            return false; 
        } else { playSound('hit'); createExplosion(e.x, e.y, "white", 5); return true; }
      }
    }
    return true;
  });

  if(health <= 0 && !gameOver && !gameWon && !godMode) triggerGameOver(); 
}

function draw(){
  ctx.fillStyle="black"; ctx.fillRect(0,0,c.width,c.height);
  stars.forEach(s => { ctx.globalAlpha = s.speed / 3; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill(); }); ctx.globalAlpha = 1.0; 
  if (inMenu) return;

  ctx.save();
  if (shakeDuration > 0) { let dx = (Math.random() - 0.5) * shakeIntensity; let dy = (Math.random() - 0.5) * shakeIntensity; ctx.translate(dx, dy); }

  ctx.globalCompositeOperation = "lighter";
  particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); }); ctx.globalAlpha = 1.0;

  ctx.lineWidth = 4; ctx.lineCap = "round";
  bullets.forEach(b=>{ ctx.shadowBlur = 10; ctx.shadowColor = b.color; ctx.strokeStyle = b.color; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.dx*1.5, b.y - b.dy*1.5); ctx.stroke(); });

  ctx.shadowBlur = 15;
  enemyBullets.forEach(b=>{ ctx.shadowColor = b.glow; ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });
  ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0; 

  if (activeTeslaArcs.length > 0) {
      ctx.strokeStyle = "cyan"; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = "cyan";
      activeTeslaArcs.forEach(arc => {
          ctx.beginPath(); ctx.moveTo(player.x, player.y);
          let mx = (player.x + arc.x)/2 + (Math.random()-0.5)*30; let my = (player.y + arc.y)/2 + (Math.random()-0.5)*30;
          ctx.lineTo(mx, my); ctx.lineTo(arc.x, arc.y); ctx.stroke();
      });
  }

  enemies.forEach(e=>{
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.atan2(player.y - e.y, player.x - e.x)); 
    let eGrad = ctx.createLinearGradient(-15, -15, 15, 15);
    if (e.type === 3) { eGrad.addColorStop(0, "#bc13fe"); eGrad.addColorStop(0.5, "#8a2be2"); eGrad.addColorStop(1, "#4b0082"); ctx.shadowColor = "#bc13fe"; ctx.strokeStyle = "#e066ff"; } 
    else if (e.type === 4) { eGrad.addColorStop(0, "#ffaa00"); eGrad.addColorStop(0.5, "#885500"); eGrad.addColorStop(1, "#332200"); ctx.shadowColor = "#ffaa00"; ctx.strokeStyle = "#ffff55"; } 
    else if (e.type === 5) { eGrad.addColorStop(0, "#00ffff"); eGrad.addColorStop(0.5, "#008888"); eGrad.addColorStop(1, "#003333"); ctx.shadowColor = "cyan"; ctx.strokeStyle = "#aaffff"; } 
    else if (e.type === 6) { eGrad.addColorStop(0, "#00ff00"); eGrad.addColorStop(0.5, "#008800"); eGrad.addColorStop(1, "#003300"); ctx.shadowColor = "lime"; ctx.strokeStyle = "#aaffaa"; } 
    else if (e.type === 7) { eGrad.addColorStop(0, "#ffffff"); eGrad.addColorStop(0.5, "#cccccc"); eGrad.addColorStop(1, "#888888"); ctx.shadowColor = "white"; ctx.strokeStyle = "#ffffff"; } 
    else if (e.type === 8) { eGrad.addColorStop(0, "#880000"); eGrad.addColorStop(0.5, "#440000"); eGrad.addColorStop(1, "#110000"); ctx.shadowColor = "red"; ctx.strokeStyle = "#ff4444"; } 
    else { eGrad.addColorStop(0, "#ff4444"); eGrad.addColorStop(0.5, "#880000"); eGrad.addColorStop(1, "#330000"); ctx.shadowColor = "red"; ctx.strokeStyle = "#ffaaaa"; }
    
    ctx.shadowBlur = 10; ctx.fillStyle = eGrad; ctx.lineWidth = 1.5; ctx.beginPath();
    if (e.type === 0) { ctx.moveTo(15, 0); ctx.lineTo(-10, 15); ctx.lineTo(-5, 0); ctx.lineTo(-10, -15); } 
    else if (e.type === 1) { ctx.moveTo(15, 0); ctx.lineTo(5, 15); ctx.lineTo(-15, 10); ctx.lineTo(-15, -10); ctx.lineTo(5, -15); } 
    else if (e.type === 2) { ctx.moveTo(10, 0); ctx.lineTo(-15, 20); ctx.lineTo(-10, 0); ctx.lineTo(-15, -20); } 
    else if (e.type === 3) { ctx.moveTo(15, 0); ctx.quadraticCurveTo(0, 10, -15, 15); ctx.lineTo(-5, 0); ctx.lineTo(-15, -15); ctx.quadraticCurveTo(0, -10, 15, 0); }
    else if (e.type === 4) { ctx.moveTo(20, 0); ctx.lineTo(10, 15); ctx.lineTo(-10, 15); ctx.lineTo(-20, 0); ctx.lineTo(-10, -15); ctx.lineTo(10, -15); } 
    else if (e.type === 5) { ctx.moveTo(25, 0); ctx.lineTo(-15, 5); ctx.lineTo(-10, 0); ctx.lineTo(-15, -5); }
    else if (e.type === 6) { ctx.moveTo(20, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10); } 
    else if (e.type === 7) { ctx.arc(0, 0, 18, 0, Math.PI*2); } 
    else if (e.type === 8) { ctx.moveTo(25, 0); ctx.lineTo(-20, 20); ctx.lineTo(-15, 0); ctx.lineTo(-20, -20); } 
    
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "white"; ctx.shadowColor = (e.type === 3 || e.type === 5) ? "#ff00ff" : "yellow"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill(); ctx.restore();
  });

  // --- ALL 10 BOSSES RENDERING ENGINE ---
  if (bossActive && boss) {
    ctx.save(); ctx.translate(boss.x, boss.y);
    
    // Spin Pulsar and Gemini and Archon
    if (boss.type === 2 || boss.type === 3 || boss.type === 9) { ctx.rotate(boss.angle); }
    
    let bGrad = ctx.createLinearGradient(0, -boss.height/2, 0, boss.height/2); 
    
    switch(boss.type) {
        case 0: // Goliath Cruiser
            bGrad.addColorStop(0, "#222"); bGrad.addColorStop(0.5, "#555"); bGrad.addColorStop(1, "#222");
            ctx.shadowColor = "red"; ctx.strokeStyle = "#ff0000"; ctx.fillStyle = bGrad; ctx.lineWidth = 3; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.moveTo(-boss.width/2, -boss.height/2); ctx.lineTo(boss.width/2, -boss.height/2);
            ctx.lineTo(boss.width/2 - 30, boss.height/2); ctx.lineTo(-boss.width/2 + 30, boss.height/2); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(-boss.width/2 + 30, 0, 15, 0, Math.PI*2); ctx.arc(boss.width/2 - 30, 0, 15, 0, Math.PI*2); ctx.fill();
            break;
            
        case 1: // Swarm Hive
            bGrad.addColorStop(0, "#003300"); bGrad.addColorStop(0.5, "#00aa00"); bGrad.addColorStop(1, "#003300");
            ctx.shadowColor = "lime"; ctx.strokeStyle = "#aaffaa"; ctx.fillStyle = bGrad; ctx.lineWidth = 3; ctx.shadowBlur = 30;
            ctx.beginPath();
            for(let i=0; i<6; i++) { let ha = (Math.PI/3) * i; ctx.lineTo(Math.cos(ha)*boss.width/2.5, Math.sin(ha)*boss.height/1.5); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            let pulseH = Math.abs(Math.sin(Date.now() / 200)) * 5;
            ctx.fillStyle = "yellow"; ctx.shadowColor = "lime"; ctx.shadowBlur = 10 + pulseH;
            for(let i=0; i<3; i++) { ctx.beginPath(); ctx.arc(Math.cos((Math.PI/1.5)*i)*30, Math.sin((Math.PI/1.5)*i)*30, 10+pulseH, 0, Math.PI*2); ctx.fill(); }
            break;

        case 2: // Pulsar Star
            bGrad.addColorStop(0, "#000033"); bGrad.addColorStop(0.5, "#0000aa"); bGrad.addColorStop(1, "#000033");
            ctx.shadowColor = "cyan"; ctx.strokeStyle = "#00ffff"; ctx.fillStyle = bGrad; ctx.lineWidth = 3; ctx.shadowBlur = 30;
            ctx.beginPath(); ctx.arc(0,0, 40, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            for(let i=0; i<4; i++) {
                ctx.rotate(Math.PI/2);
                ctx.beginPath(); ctx.moveTo(40, -15); ctx.lineTo(boss.width/1.5, 0); ctx.lineTo(40, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill();
            break;

        case 3: // Gemini System
            ctx.shadowBlur = 20; ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.stroke(); // Tether
            ctx.fillStyle = "#331100"; ctx.strokeStyle = "#ff8800"; ctx.shadowColor = "#ff8800";
            ctx.beginPath(); ctx.arc(-60, 0, 40, Math.PI/2, Math.PI*1.5); ctx.quadraticCurveTo(-20, 0, -60, Math.PI/2); ctx.fill(); ctx.stroke(); // Left
            ctx.fillStyle = "#110033"; ctx.strokeStyle = "#8a2be2"; ctx.shadowColor = "#8a2be2";
            ctx.beginPath(); ctx.arc(60, 0, 40, Math.PI*1.5, Math.PI/2); ctx.quadraticCurveTo(20, 0, 60, Math.PI*1.5); ctx.fill(); ctx.stroke(); // Right
            break;

        case 4: // Nexus Core
            bGrad.addColorStop(0, "#330033"); bGrad.addColorStop(0.5, "#aa00aa"); bGrad.addColorStop(1, "#330033");
            ctx.shadowColor = "magenta"; ctx.strokeStyle = "white"; ctx.fillStyle = bGrad; ctx.lineWidth = 3; ctx.shadowBlur = 30;
            ctx.beginPath();
            for(let i=0; i<8; i++) { let oa = (Math.PI/4) * i; ctx.lineTo(Math.cos(oa)*boss.width/2.2, Math.sin(oa)*boss.height/1.5); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            let pulseC = Math.abs(Math.sin(Date.now() / 150)) * 10;
            ctx.fillStyle = "white"; ctx.shadowColor = "magenta"; ctx.shadowBlur = 20 + pulseC;
            ctx.beginPath(); ctx.arc(0,0, 25+pulseC/2, 0, Math.PI*2); ctx.fill();
            break;
            
        case 5: // Void Singularity
            let p = Math.abs(Math.sin(Date.now()/300))*20; 
            ctx.fillStyle="black"; ctx.shadowColor="white"; ctx.shadowBlur=20+p; 
            ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2); ctx.fill(); 
            ctx.lineWidth=3; ctx.strokeStyle="white"; ctx.stroke(); 
            ctx.beginPath(); ctx.arc(0,0,80,0,Math.PI*2); ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.stroke();
            break;
            
        case 6: // Prism Weaver
            ctx.fillStyle="rgba(255,255,255,0.1)"; ctx.strokeStyle="lime"; ctx.lineWidth=4; ctx.shadowColor="lime"; ctx.shadowBlur=30;
            ctx.beginPath(); ctx.moveTo(0,-80); ctx.lineTo(80,60); ctx.lineTo(-80,60); ctx.closePath(); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(0,-20,15,0,Math.PI*2); ctx.fill();
            break;
            
        case 7: // Phantom Swarm
            boss.phantoms.forEach((ph, i) => { 
                let px = -105 + (i*70); 
                ctx.fillStyle = ph.isReal ? "red" : "rgba(255,0,0,0.2)"; 
                ctx.shadowColor = "red"; ctx.shadowBlur = ph.isReal ? 20 : 5;
                ctx.beginPath(); ctx.moveTo(px, -30); ctx.lineTo(px+25, 0); ctx.lineTo(px, 30); ctx.lineTo(px-25, 0); ctx.closePath(); ctx.fill(); 
            }); 
            break;
            
        case 8: // Siege Engine
            ctx.fillStyle="#442200"; ctx.strokeStyle="orange"; ctx.lineWidth=3; ctx.shadowColor="orange"; ctx.shadowBlur=20;
            ctx.fillRect(-60,-40,120,80); ctx.strokeRect(-60,-40,120,80); 
            if(boss.state===1){ 
                ctx.fillStyle="rgba(255,100,0,0.6)"; ctx.shadowBlur=50;
                ctx.fillRect(-45, 0, 90, 1000); // Massive Beam
                ctx.fillStyle="white"; ctx.fillRect(-20, 0, 40, 1000); 
            } 
            break;
            
        case 9: // Omega Archon
            ctx.fillStyle="rgba(255, 215, 0, 0.2)"; ctx.strokeStyle="gold"; ctx.shadowColor="gold"; ctx.shadowBlur=30; ctx.lineWidth=4;
            ctx.strokeRect(-60,-60,120,120); ctx.fillRect(-60,-60,120,120);
            ctx.rotate(Math.PI/4); // Inner diamond
            ctx.strokeRect(-40,-40,80,80); ctx.fillStyle="white"; ctx.fillRect(-15,-15,30,30);
            break;
    }
    
    // Boss Name & HP Bar
    if (boss.type === 2 || boss.type === 3 || boss.type === 9) ctx.rotate(-boss.angle); 
    let hpPercent = Math.max(0, boss.hp / boss.maxHp); ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; ctx.fillRect(-100, -110, 200, 6); ctx.fillStyle = "lime"; ctx.shadowBlur = 10; ctx.shadowColor = "lime"; ctx.fillRect(-100, -110, 200 * hpPercent, 6); 
    
    if (boss.y < boss.targetY && !isPaused) { 
      ctx.save(); ctx.fillStyle = "red"; ctx.shadowBlur = 20; ctx.shadowColor = "red"; ctx.font = "bold 32px Orbitron"; ctx.textAlign = "center"; 
      if (c.width < 600) ctx.font = "bold 20px Orbitron"; 
      ctx.fillText("WARNING: " + bossNames[boss.type], 0, 140); 
      ctx.restore(); 
    }
    ctx.restore();
  }

  powerups.forEach(p => {
    ctx.save(); ctx.translate(p.x, p.y); let pulse = Math.abs(Math.sin(Date.now() / 200)) * 5; ctx.shadowBlur = 15 + pulse; ctx.shadowColor = "lime"; ctx.fillStyle = "rgba(0, 255, 0, 0.2)"; ctx.strokeStyle = "lime"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "lime"; ctx.shadowBlur = 10; ctx.fillRect(-2, -8, 4, 16); ctx.fillRect(-8, -2, 16, 4); ctx.restore();
  });
  
  if(!gameOver && !gameWon) {
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle); let pGrad = ctx.createLinearGradient(-15, 0, 15, 0); pGrad.addColorStop(0, "#aaaaaa"); pGrad.addColorStop(0.5, "#ffffff"); pGrad.addColorStop(1, "#aaaaaa");
    ctx.shadowBlur = 15; ctx.shadowColor = "cyan"; ctx.fillStyle = pGrad; ctx.strokeStyle = "cyan"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-10, 15); ctx.lineTo(-15, 15); ctx.lineTo(-5, 0); ctx.lineTo(-15, -15); ctx.lineTo(-10, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(0, 255, 255, 0.8)"; ctx.beginPath(); ctx.ellipse(5, 0, 8, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();

    for(let i=0; i<playerStats.drones; i++) {
        let da = (Date.now() / 500) + (Math.PI*2 / playerStats.drones) * i; let px = player.x + Math.cos(da)*40; let py = player.y + Math.sin(da)*40;
        ctx.save(); ctx.translate(px, py); ctx.rotate(da); ctx.fillStyle = "#444"; ctx.shadowBlur = 10; ctx.shadowColor = "yellow"; ctx.strokeStyle = "yellow"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    if (playerStats.shields > 0) {
        for(let i=0; i<playerStats.shields; i++) {
            let sa = (Date.now() / 600) + (Math.PI*2 / playerStats.shields) * i;
            let sx = player.x + Math.cos(sa)*60; let sy = player.y + Math.sin(sa)*60;
            ctx.fillStyle = "rgba(0, 255, 255, 0.6)"; ctx.strokeStyle = "cyan"; ctx.shadowBlur = 20; ctx.shadowColor = "cyan"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        }
    }
  }

  ctx.restore(); 
}

function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();