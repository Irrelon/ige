"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const IgeBaseClass_1 = require("../../engine/core/IgeBaseClass.js");
const IgeEntity_1 = require("../../engine/core/IgeEntity.js");
const IgeScene2d_1 = require("../../engine/core/IgeScene2d.js");
const IgeWebGlRenderer_1 = require("../../engine/core/IgeWebGlRenderer.js");
const IgeViewport_1 = require("../../engine/core/IgeViewport.js");
const IgePoint3d_1 = require("../../engine/core/IgePoint3d.js");
const instance_1 = require("../../engine/instance.js");
const enums_1 = require("../../enums/index.js");
const IgeWebGlLight_1 = require("../../engine/webgl/IgeWebGlLight.js");
const IgeGltfLoader_1 = require("../../engine/webgl/IgeGltfLoader.js");
const IgeParticleSystem3d_1 = require("../../engine/webgl/IgeParticleSystem3d.js");
const IgeGamePadComponent_1 = require("../../engine/components/IgeGamePadComponent.js");
const level_1 = require("./level");
// @ts-ignore
window.ige = instance_1.ige;
/**
 * Zombie Game - 4 player split-screen zombie ARPG prototype.
 *
 * Demonstrates the WebGL renderer features a split-screen action game needs:
 * - Four viewports, each with an isometric camera following its player
 * - A horde of animated, GPU-instanced skinned characters from one GLB
 *   (IgeEntity.model(), shared pose cache, off-screen animation culling)
 * - Per-instance material overrides (zombie tint, red hit flash)
 * - Moonlight shadows centred on each viewport, distance fog, player lanterns
 * - IgeParticleSystem3d blood and slash effects
 * - Floating damage numbers placed with renderer.worldToScreen()
 * - Gamepad input for 4 players (IgeGamePadComponent) with keyboard fallback
 *
 * - Generated level-of-detail meshes for the horde (IgeEntity.lod())
 *
 * URL options: ?zombies=200 to change the horde size, ?lod=0 to draw every
 * zombie at full detail.
 */
// Zombies switch to generated lower-detail meshes while small on screen.
// Sizes are bounding-sphere diameters in device pixels; players always draw
// at full detail.
const ZOMBIE_LOD = [
    { screenSize: 220, ratio: 0.5 },
    { screenSize: 120, ratio: 0.25 }
];
// Player configuration
const PLAYER_CONFIGS = [
    { color: { r: 0.3, g: 0.5, b: 1.0 }, name: "Blue", startPos: { x: -150, z: 100 } },
    { color: { r: 0.3, g: 1.0, b: 0.5 }, name: "Green", startPos: { x: 150, z: 100 } },
    { color: { r: 1.0, g: 0.3, b: 0.3 }, name: "Red", startPos: { x: -150, z: 300 } },
    { color: { r: 1.0, g: 1.0, b: 0.3 }, name: "Yellow", startPos: { x: 150, z: 300 } }
];
/** Keyboard fallback: move keys (up, left, down, right) and attack key per player. */
const KEYBOARD_MAPS = [
    { up: "KeyW", left: "KeyA", down: "KeyS", right: "KeyD", attack: "Space" },
    { up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight", attack: "Enter" },
    { up: "KeyI", left: "KeyJ", down: "KeyK", right: "KeyL", attack: "KeyU" },
    { up: "Numpad8", left: "Numpad4", down: "Numpad5", right: "Numpad6", attack: "Numpad0" }
];
// Camera configuration
const CAMERA_DISTANCE = 500;
const CAMERA_ORTHO_SIZE = 700;
// Gameplay tuning (world units and seconds)
const PLAYER_SPEED = 260;
const PLAYER_RADIUS = 28;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_RESPAWN_TIME = 3;
const ATTACK_COOLDOWN = 0.35;
const ATTACK_RANGE = 150;
const ATTACK_ARC = Math.cos((70 * Math.PI) / 180);
const ATTACK_DAMAGE = [30, 55];
const ZOMBIE_RADIUS = 26;
const ZOMBIE_SPEED = [55, 95];
const ZOMBIE_HEALTH = 100;
const ZOMBIE_DAMAGE = 8;
const ZOMBIE_ATTACK_RANGE = 70;
const ZOMBIE_ATTACK_COOLDOWN = 1.1;
const ZOMBIE_RESPAWN_TIME = 2.5;
const HIT_FLASH_TIME = 0.15;
const RESPAWN_INVULNERABLE_TIME = 2;
const IDLE_AUTO_FIGHT_TIME = 2;
const CHARACTER_SCALE = 100;
const ZOMBIE_TINT = { r: 0.45, g: 0.62, b: 0.38, a: 1 };
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        this.viewports = [];
        this.players = [];
        this.zombies = [];
        this.obstacles = [];
        this.damageNumbers = [];
        this.keysDown = {};
        this.keysPressed = {};
        this.totalKills = 0;
        // Isometric camera offset (computed once)
        this.cameraOffset = { x: 0, y: 0, z: 0 };
        // Spatial hash for zombie separation
        this.grid = new Map();
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.updateStatus("Creating renderer...");
                this.renderer = new IgeWebGlRenderer_1.IgeWebGlRenderer();
                // Four views on a high-DPI screen is a lot of pixels; 1.5x keeps
                // the image sharp while staying comfortably inside the GPU budget
                this.renderer.maxPixelRatio(1.5);
                instance_1.ige.engine.renderer(this.renderer);
                yield this.renderer.setup();
                this.renderer.createFrontBuffer(true);
                // Night-time atmosphere: dark clear colour that the fog fades into
                this.renderer.setClearColor(0.02, 0.025, 0.04, 1);
                this.renderer.fog({ mode: "linear", color: { r: 0.02, g: 0.025, b: 0.04 }, near: 700, far: 1500 });
                instance_1.ige.engine.addComponent("gamePad", IgeGamePadComponent_1.IgeGamePadComponent);
                this.gamePad = instance_1.ige.engine.components.gamePad;
                this.updateStatus("Starting engine...");
                yield instance_1.ige.engine.start();
                this.scene = new IgeScene2d_1.IgeScene2d();
                this.scene.id("mainScene");
                this.updateStatus("Setting up lights...");
                this.setupLights();
                this.updateStatus("Building hospital lobby...");
                this.obstacles = (0, level_1.createHospitalLobby)(this.scene);
                this.updateStatus("Loading character model...");
                this.characterModel = yield IgeGltfLoader_1.igeGltfLoader.load("../../assets/models/CesiumMan.glb", "characterModel");
                this.updateStatus("Spawning players and zombies...");
                this.createEffects();
                this.createPlayers();
                this.createZombies(this.zombieCountFromUrl());
                this.setupSplitScreenViewports();
                this.computeCameraOffset();
                this.updateCameraPositions();
                this.setupInput();
                this.createFxLayer();
                // One behaviour drives the whole simulation; cameras follow after it
                this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "zombieGame", (_entity, tickDelta) => {
                    this.tick(Math.min(tickDelta / 1000, 0.1));
                });
                window.addEventListener("resize", () => this.updateViewportLayout());
                this.hideLoadingScreen();
                this.updateStatus("Playing");
                this.updatePlayerCount(this.players.length);
                setInterval(() => this.updateStats(), 250);
                this.log(`Zombie Game initialized - ${this.zombies.length} zombies, 4 player split screen`);
            }
            catch (error) {
                this.log(`Error initializing: ${error}`, "error");
                this.updateStatus(`Error: ${error}`);
            }
        });
    }
    lodFromUrl() {
        return new URLSearchParams(window.location.search).get("lod") !== "0";
    }
    zombieCountFromUrl() {
        const value = Number(new URLSearchParams(window.location.search).get("zombies"));
        return Number.isFinite(value) && value > 0 ? Math.min(1000, Math.floor(value)) : 120;
    }
    setupLights() {
        if (!this.scene || !this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        const ambient = new IgeWebGlLight_1.IgeAmbientLight();
        ambient.id("ambientLight");
        ambient.lightColor(0.35, 0.4, 0.55);
        ambient.intensity(0.45);
        ambient.mount(this.scene);
        lightManager.addLight(ambient);
        // Cold moonlight casting shadows. The shadow map follows each
        // viewport's camera target, so all four players get shadows wherever
        // they are in the level.
        const moon = new IgeWebGlLight_1.IgeDirectionalLight();
        moon.id("moonLight");
        moon.lightColor(0.6, 0.7, 1.0);
        moon.intensity(0.75);
        moon.direction(-0.45, -1.0, -0.35);
        moon.mount(this.scene);
        lightManager.addLight(moon);
        const shadowManager = this.renderer.shadowManager;
        if (shadowManager) {
            shadowManager.frustumSize(900);
            shadowManager.shadowPlanes(1, 3000);
        }
        this.renderer.enableShadows(moon, 2048);
    }
    createEffects() {
        if (!this.scene)
            return;
        // Dark blood that sprays out and falls to the floor
        this.bloodFx = new IgeParticleSystem3d_1.IgeParticleSystem3d({
            maxParticles: 1500,
            blending: "normal",
            lifetime: [0.45, 0.9],
            speed: [120, 320],
            spread: Math.PI / 2.5,
            gravity: { x: 0, y: -900, z: 0 },
            drag: 0.6,
            size: [14, 6],
            startColor: { r: 0.55, g: 0.02, b: 0.02, a: 1 },
            endColor: { r: 0.25, g: 0, b: 0, a: 0 }
        });
        this.bloodFx.id("bloodFx").mount(this.scene);
        // Bright additive sparks for weapon swings
        this.slashFx = new IgeParticleSystem3d_1.IgeParticleSystem3d({
            maxParticles: 600,
            blending: "additive",
            lifetime: [0.15, 0.3],
            speed: [200, 450],
            spread: Math.PI / 5,
            gravity: { x: 0, y: 0, z: 0 },
            drag: 2,
            size: [22, 4],
            startColor: { r: 1, g: 0.9, b: 0.6, a: 0.9 },
            endColor: { r: 1, g: 0.4, b: 0.1, a: 0 }
        });
        this.slashFx.id("slashFx").mount(this.scene);
    }
    createPlayers() {
        var _a, _b, _c, _d;
        if (!this.scene || !this.characterModel || !((_a = this.renderer) === null || _a === void 0 ? void 0 : _a.lightManager))
            return;
        const walkClip = (_c = (_b = this.characterModel.animations) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.name;
        for (let i = 0; i < PLAYER_CONFIGS.length; i++) {
            const config = PLAYER_CONFIGS[i];
            // model() sets up meshes, textures, skeleton and animation clips.
            const entity = new IgeEntity_1.IgeEntity()
                .id(`player_${i}`)
                .model(this.characterModel, { animation: walkClip })
                .translateTo(config.startPos.x, 0, config.startPos.z)
                .scaleTo(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE)
                .mount(this.scene);
            // Heroes animate at full frame rate rather than from the crowd cache
            (_d = entity.skeletalAnimation()) === null || _d === void 0 ? void 0 : _d.poseCache(false);
            // Each player carries a lantern so they can see in the dark
            const lantern = new IgeWebGlLight_1.IgePointLight();
            lantern.id(`lantern_${i}`);
            lantern.lightColor(1.0, 0.8, 0.55);
            lantern.intensity(1.6);
            lantern.range(420);
            lantern.decay(2);
            lantern.mount(this.scene);
            this.renderer.lightManager.addLight(lantern);
            const player = {
                index: i,
                entity,
                lantern,
                health: PLAYER_MAX_HEALTH,
                kills: 0,
                attackCooldown: 0,
                hitFlash: 0,
                respawnTimer: 0,
                invulnerable: 0,
                idleTime: 0,
                facingX: 0,
                facingZ: 1
            };
            this.applyPlayerMaterial(player);
            this.players.push(player);
        }
    }
    createZombies(count) {
        var _a, _b, _c, _d;
        if (!this.scene || !this.characterModel)
            return;
        const walkClip = (_b = (_a = this.characterModel.animations) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.name;
        const lod = this.lodFromUrl() ? ZOMBIE_LOD : undefined;
        for (let i = 0; i < count; i++) {
            const entity = new IgeEntity_1.IgeEntity()
                .id(`zombie_${i}`)
                .model(this.characterModel, { animation: walkClip, lod })
                .scaleTo(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE)
                .mount(this.scene);
            // Per-instance tint over the shared model material
            entity._materialData = { color: ZOMBIE_TINT };
            const zombie = {
                entity,
                health: ZOMBIE_HEALTH,
                speed: lerp(ZOMBIE_SPEED[0], ZOMBIE_SPEED[1], Math.random()),
                attackCooldown: Math.random() * ZOMBIE_ATTACK_COOLDOWN,
                hitFlash: 0,
                knockbackX: 0,
                knockbackZ: 0,
                respawnTimer: 0,
                alive: true
            };
            // Desynchronise the walk cycles; slower zombies shamble slower
            const state = (_d = (_c = entity.skeletalAnimation()) === null || _c === void 0 ? void 0 : _c._activeStates) === null || _d === void 0 ? void 0 : _d[0];
            if (state) {
                state.time = Math.random() * state.clip.duration;
                state.speed = zombie.speed / 80;
            }
            this.placeZombieAwayFromPlayers(zombie);
            this.zombies.push(zombie);
        }
    }
    placeZombieAwayFromPlayers(zombie) {
        for (let attempt = 0; attempt < 30; attempt++) {
            const x = lerp(level_1.ARENA.minX + 60, level_1.ARENA.maxX - 60, Math.random());
            const z = lerp(level_1.ARENA.minZ + 60, level_1.ARENA.maxZ - 60, Math.random());
            const tooClose = this.players.some((p) => {
                const dx = p.entity._translate.x - x, dz = p.entity._translate.z - z;
                return dx * dx + dz * dz < 450 * 450;
            });
            if (!tooClose || attempt === 29) {
                const pos = (0, level_1.resolveLevelCollision)(x, z, ZOMBIE_RADIUS, this.obstacles);
                zombie.entity.translateTo(pos.x, 0, pos.z);
                return;
            }
        }
    }
    // ------------------------------------------------------------------
    // Simulation
    // ------------------------------------------------------------------
    tick(dt) {
        for (const player of this.players)
            this.updatePlayer(player, dt);
        this.rebuildGrid();
        for (const zombie of this.zombies)
            this.updateZombie(zombie, dt);
        this.updateCameraPositions();
        this.updateDamageNumbers(dt);
        this.updatePlayerHud();
        this.keysPressed = {};
    }
    readPlayerInput(index) {
        var _a;
        let moveX = 0, moveZ = 0, attack = false;
        // Gamepad: left stick moves, A / X / right trigger attacks
        const pad = this.gamePad;
        if ((_a = pad === null || pad === void 0 ? void 0 : pad.states[index]) === null || _a === void 0 ? void 0 : _a.connected) {
            moveX = pad.axis(index, IgeGamePadComponent_1.IgeGamePadAxis.leftX);
            moveZ = pad.axis(index, IgeGamePadComponent_1.IgeGamePadAxis.leftY);
            attack = pad.justPressed(index, IgeGamePadComponent_1.IgeGamePadButton.a) ||
                pad.justPressed(index, IgeGamePadComponent_1.IgeGamePadButton.x) ||
                pad.justPressed(index, IgeGamePadComponent_1.IgeGamePadButton.rightTrigger);
        }
        // Keyboard fallback
        const keys = KEYBOARD_MAPS[index];
        if (this.keysDown[keys.left])
            moveX -= 1;
        if (this.keysDown[keys.right])
            moveX += 1;
        if (this.keysDown[keys.up])
            moveZ -= 1;
        if (this.keysDown[keys.down])
            moveZ += 1;
        if (this.keysPressed[keys.attack])
            attack = true;
        // The isometric camera looks along (-1, -1) on the ground, so rotate
        // stick/key input by 45 degrees to make "up" move away from the camera
        const s = Math.SQRT1_2;
        const worldX = (moveX + moveZ) * s;
        const worldZ = (moveZ - moveX) * s;
        const len = Math.hypot(worldX, worldZ);
        if (len > 1)
            return { moveX: worldX / len, moveZ: worldZ / len, attack };
        return { moveX: worldX, moveZ: worldZ, attack };
    }
    updatePlayer(player, dt) {
        const entity = player.entity;
        player.attackCooldown = Math.max(0, player.attackCooldown - dt);
        player.invulnerable = Math.max(0, player.invulnerable - dt);
        if (player.hitFlash > 0) {
            player.hitFlash -= dt;
            if (player.hitFlash <= 0)
                this.applyPlayerMaterial(player);
        }
        // Dead players wait, then respawn at their start position
        if (player.health <= 0) {
            player.respawnTimer -= dt;
            if (player.respawnTimer <= 0) {
                const start = PLAYER_CONFIGS[player.index].startPos;
                player.health = PLAYER_MAX_HEALTH;
                player.invulnerable = RESPAWN_INVULNERABLE_TIME;
                entity.translateTo(start.x, 0, start.z).show();
                player.lantern.intensity(1.6);
                this.shoveZombiesAway(start.x, start.z, 320);
            }
            return;
        }
        const input = this.readPlayerInput(player.index);
        const len = Math.hypot(input.moveX, input.moveZ);
        const anim = entity.skeletalAnimation();
        // Players nobody is controlling stand their ground and fight back,
        // so every view stays lively when fewer than four people are playing
        player.idleTime = len > 0.05 || input.attack ? 0 : player.idleTime + dt;
        if (player.idleTime > IDLE_AUTO_FIGHT_TIME) {
            const target = this.nearestZombie(entity._translate.x, entity._translate.z, ATTACK_RANGE * 0.9);
            if (target) {
                const dx = target.entity._translate.x - entity._translate.x;
                const dz = target.entity._translate.z - entity._translate.z;
                const d = Math.hypot(dx, dz) || 1;
                player.facingX = dx / d;
                player.facingZ = dz / d;
                entity.rotateTo(0, Math.atan2(player.facingX, player.facingZ), 0);
                input.attack = true;
            }
        }
        if (len > 0.05) {
            const pos = (0, level_1.resolveLevelCollision)(entity._translate.x + input.moveX * PLAYER_SPEED * dt, entity._translate.z + input.moveZ * PLAYER_SPEED * dt, PLAYER_RADIUS, this.obstacles);
            entity.translateTo(pos.x, 0, pos.z);
            player.facingX = input.moveX / len;
            player.facingZ = input.moveZ / len;
            // glTF models face +Z; a Y rotation of a turns +Z toward (sin a, cos a)
            entity.rotateTo(0, Math.atan2(player.facingX, player.facingZ), 0);
            anim === null || anim === void 0 ? void 0 : anim.setSpeed(1.4 * Math.min(1, len));
        }
        else {
            anim === null || anim === void 0 ? void 0 : anim.setSpeed(0);
        }
        // Lantern floats above the player's shoulder
        player.lantern.translateTo(entity._translate.x, 180, entity._translate.z);
        if (input.attack && player.attackCooldown <= 0) {
            player.attackCooldown = ATTACK_COOLDOWN;
            this.playerAttack(player);
        }
    }
    playerAttack(player) {
        var _a, _b;
        const px = player.entity._translate.x;
        const pz = player.entity._translate.z;
        // Swing sparks in front of the player
        (_a = this.slashFx) === null || _a === void 0 ? void 0 : _a.burst(18, { x: px + player.facingX * 60, y: 110, z: pz + player.facingZ * 60 }, {
            x: player.facingX,
            y: 0.2,
            z: player.facingZ
        });
        for (const zombie of this.zombies) {
            if (!zombie.alive)
                continue;
            const dx = zombie.entity._translate.x - px;
            const dz = zombie.entity._translate.z - pz;
            const dist = Math.hypot(dx, dz);
            if (dist > ATTACK_RANGE || dist < 1)
                continue;
            if ((dx * player.facingX + dz * player.facingZ) / dist < ATTACK_ARC)
                continue;
            const damage = Math.round(lerp(ATTACK_DAMAGE[0], ATTACK_DAMAGE[1], Math.random()));
            zombie.health -= damage;
            zombie.hitFlash = HIT_FLASH_TIME;
            zombie.knockbackX = (dx / dist) * 420;
            zombie.knockbackZ = (dz / dist) * 420;
            this.applyZombieMaterial(zombie);
            const hitPoint = { x: zombie.entity._translate.x, y: 110, z: zombie.entity._translate.z };
            (_b = this.bloodFx) === null || _b === void 0 ? void 0 : _b.burst(24, hitPoint, { x: dx / dist, y: 0.6, z: dz / dist });
            this.spawnDamageNumber(player.index, hitPoint.x, 190, hitPoint.z, damage);
            if (zombie.health <= 0) {
                this.killZombie(zombie);
                player.kills++;
                this.totalKills++;
            }
        }
    }
    nearestZombie(x, z, maxDist) {
        let best;
        let bestDistSq = maxDist * maxDist;
        for (const zombie of this.zombies) {
            if (!zombie.alive)
                continue;
            const dx = zombie.entity._translate.x - x, dz = zombie.entity._translate.z - z;
            const d = dx * dx + dz * dz;
            if (d < bestDistSq) {
                bestDistSq = d;
                best = zombie;
            }
        }
        return best;
    }
    shoveZombiesAway(x, z, radius) {
        for (const zombie of this.zombies) {
            if (!zombie.alive)
                continue;
            const dx = zombie.entity._translate.x - x, dz = zombie.entity._translate.z - z;
            const d = Math.hypot(dx, dz);
            if (d < radius && d > 1) {
                zombie.knockbackX = (dx / d) * 900;
                zombie.knockbackZ = (dz / d) * 900;
            }
        }
    }
    killZombie(zombie) {
        var _a;
        zombie.alive = false;
        zombie.respawnTimer = ZOMBIE_RESPAWN_TIME;
        const t = zombie.entity._translate;
        (_a = this.bloodFx) === null || _a === void 0 ? void 0 : _a.burst(70, { x: t.x, y: 80, z: t.z }, { x: 0, y: 1, z: 0 });
        zombie.entity.hide();
    }
    rebuildGrid() {
        this.grid.clear();
        for (const zombie of this.zombies) {
            if (!zombie.alive)
                continue;
            const key = gridKey(zombie.entity._translate.x, zombie.entity._translate.z);
            let cell = this.grid.get(key);
            if (!cell) {
                cell = [];
                this.grid.set(key, cell);
            }
            cell.push(zombie);
        }
    }
    updateZombie(zombie, dt) {
        const entity = zombie.entity;
        if (!zombie.alive) {
            zombie.respawnTimer -= dt;
            if (zombie.respawnTimer <= 0) {
                zombie.alive = true;
                zombie.health = ZOMBIE_HEALTH;
                zombie.hitFlash = 0;
                zombie.knockbackX = zombie.knockbackZ = 0;
                this.applyZombieMaterial(zombie);
                this.placeZombieAwayFromPlayers(zombie);
                entity.show();
            }
            return;
        }
        if (zombie.hitFlash > 0) {
            zombie.hitFlash -= dt;
            if (zombie.hitFlash <= 0)
                this.applyZombieMaterial(zombie);
        }
        zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
        // Shamble toward the nearest living player
        const zx = entity._translate.x, zz = entity._translate.z;
        let target;
        let bestDistSq = Infinity;
        for (const player of this.players) {
            if (player.health <= 0)
                continue;
            const dx = player.entity._translate.x - zx, dz = player.entity._translate.z - zz;
            const d = dx * dx + dz * dz;
            if (d < bestDistSq) {
                bestDistSq = d;
                target = player;
            }
        }
        let vx = 0, vz = 0;
        if (target) {
            const dx = target.entity._translate.x - zx, dz = target.entity._translate.z - zz;
            const dist = Math.sqrt(bestDistSq);
            if (dist > ZOMBIE_ATTACK_RANGE * 0.8) {
                vx = (dx / dist) * zombie.speed;
                vz = (dz / dist) * zombie.speed;
            }
            if (dist < ZOMBIE_ATTACK_RANGE && zombie.attackCooldown <= 0) {
                zombie.attackCooldown = ZOMBIE_ATTACK_COOLDOWN;
                this.damagePlayer(target, ZOMBIE_DAMAGE);
            }
            if (dist > 1) {
                entity.rotateTo(0, Math.atan2(dx, dz), 0);
            }
        }
        // Separation from nearby zombies so the horde spreads out
        const cx = Math.floor(zx / GRID_CELL), cz = Math.floor(zz / GRID_CELL);
        const minDist = ZOMBIE_RADIUS * 2;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
            for (let gz = cz - 1; gz <= cz + 1; gz++) {
                const cell = this.grid.get(gridKeyFromCell(gx, gz));
                if (!cell)
                    continue;
                for (const other of cell) {
                    if (other === zombie)
                        continue;
                    const dx = zx - other.entity._translate.x, dz = zz - other.entity._translate.z;
                    const d2 = dx * dx + dz * dz;
                    if (d2 > 0.01 && d2 < minDist * minDist) {
                        const d = Math.sqrt(d2);
                        const push = ((minDist - d) / minDist) * 160;
                        vx += (dx / d) * push;
                        vz += (dz / d) * push;
                    }
                }
            }
        }
        // Knockback decays quickly
        vx += zombie.knockbackX;
        vz += zombie.knockbackZ;
        const decay = Math.max(0, 1 - dt * 8);
        zombie.knockbackX *= decay;
        zombie.knockbackZ *= decay;
        const pos = (0, level_1.resolveLevelCollision)(zx + vx * dt, zz + vz * dt, ZOMBIE_RADIUS, this.obstacles);
        entity.translateTo(pos.x, 0, pos.z);
    }
    damagePlayer(player, damage) {
        var _a, _b;
        if (player.health <= 0 || player.invulnerable > 0)
            return;
        player.health = Math.max(0, player.health - damage);
        player.hitFlash = HIT_FLASH_TIME;
        this.applyPlayerMaterial(player);
        const t = player.entity._translate;
        (_a = this.bloodFx) === null || _a === void 0 ? void 0 : _a.burst(10, { x: t.x, y: 120, z: t.z });
        if (player.health <= 0) {
            player.respawnTimer = PLAYER_RESPAWN_TIME;
            player.entity.hide();
            player.lantern.intensity(0);
            (_b = this.bloodFx) === null || _b === void 0 ? void 0 : _b.burst(80, { x: t.x, y: 90, z: t.z }, { x: 0, y: 1, z: 0 });
        }
    }
    /** Player tint, or a red hit flash via the emissive override. */
    applyPlayerMaterial(player) {
        const c = PLAYER_CONFIGS[player.index].color;
        player.entity._materialData = player.hitFlash > 0
            ? { color: { r: c.r, g: c.g, b: c.b, a: 1 }, emissiveColor: { r: 1, g: 0.1, b: 0.1 }, emissiveIntensity: 0.9 }
            : { color: { r: c.r, g: c.g, b: c.b, a: 1 } };
    }
    applyZombieMaterial(zombie) {
        zombie.entity._materialData = zombie.hitFlash > 0
            ? { color: ZOMBIE_TINT, emissiveColor: { r: 1, g: 0.15, b: 0.1 }, emissiveIntensity: 1.2 }
            : { color: ZOMBIE_TINT };
    }
    // ------------------------------------------------------------------
    // Floating damage numbers (DOM, positioned with worldToScreen)
    // ------------------------------------------------------------------
    createFxLayer() {
        const layer = document.createElement("div");
        layer.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:40;overflow:hidden;";
        document.body.appendChild(layer);
        this.fxLayer = layer;
    }
    spawnDamageNumber(viewportIndex, x, y, z, damage) {
        if (!this.fxLayer)
            return;
        const el = document.createElement("div");
        el.textContent = String(damage);
        el.style.cssText = "position:absolute;left:0;top:0;font:bold 20px monospace;color:#ffd84d;" +
            "text-shadow:0 0 3px #000,0 0 6px #000;will-change:transform,opacity;";
        this.fxLayer.appendChild(el);
        this.damageNumbers.push({ el, viewportIndex, x: x + (Math.random() - 0.5) * 30, y, z, age: 0 });
    }
    updateDamageNumbers(dt) {
        const renderer = this.renderer;
        if (!renderer)
            return;
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const n = this.damageNumbers[i];
            n.age += dt;
            n.y += 90 * dt;
            if (n.age > 0.9) {
                n.el.remove();
                this.damageNumbers.splice(i, 1);
                continue;
            }
            // Only shown in the view of the player who dealt the damage
            const viewport = this.viewports[n.viewportIndex];
            const p = viewport && renderer.worldToScreen(viewport, n.x, n.y, n.z);
            if (!p || !p.visible) {
                n.el.style.opacity = "0";
                continue;
            }
            n.el.style.opacity = String(1 - n.age / 0.9);
            n.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
        }
    }
    // ------------------------------------------------------------------
    // Viewports and cameras
    // ------------------------------------------------------------------
    /**
     * Create 4 viewports arranged in a 2x2 grid.
     * All viewports share the same scene but each has its own camera.
     *
     * WebGL viewport coordinates use (0,0) at bottom-left, so:
     * - P1 (top-left):     x=0,       y=halfH
     * - P2 (top-right):    x=halfW,   y=halfH
     * - P3 (bottom-left):  x=0,       y=0
     * - P4 (bottom-right): x=halfW,   y=0
     */
    setupSplitScreenViewports() {
        if (!this.scene)
            return;
        for (let i = 0; i < 4; i++) {
            const viewport = new IgeViewport_1.IgeViewport();
            viewport.id(`viewport_${i}`);
            viewport.autoSize(false);
            viewport.scene(this.scene);
            const camera = viewport.camera;
            camera.projectionType("orthographic");
            camera.orthoSize(CAMERA_ORTHO_SIZE);
            camera.near(-1500);
            camera.far(3000);
            viewport.mount(instance_1.ige.engine);
            this.viewports.push(viewport);
        }
        this.updateViewportLayout();
    }
    updateViewportLayout() {
        const halfW = Math.floor(instance_1.ige.engine._bounds2d.x / 2);
        const halfH = Math.floor(instance_1.ige.engine._bounds2d.y / 2);
        const positions = [
            { x: 0, y: halfH },
            { x: halfW, y: halfH },
            { x: 0, y: 0 },
            { x: halfW, y: 0 }
        ];
        for (let i = 0; i < this.viewports.length; i++) {
            const vp = this.viewports[i];
            vp._bounds2d.x = halfW;
            vp._bounds2d.y = halfH;
            vp._translate.x = positions[i].x;
            vp._translate.y = positions[i].y;
        }
    }
    /** Pre-compute the isometric camera offset from a player. */
    computeCameraOffset() {
        const isoAngle = Math.atan(1 / Math.sqrt(2)); // ~35.264 degrees
        const angle45 = Math.PI / 4;
        const horizontalDist = CAMERA_DISTANCE * Math.cos(isoAngle);
        this.cameraOffset = {
            x: horizontalDist * Math.sin(angle45),
            y: CAMERA_DISTANCE * Math.sin(isoAngle),
            z: horizontalDist * Math.cos(angle45)
        };
    }
    /** Position each viewport's camera at its player's isometric offset. */
    updateCameraPositions() {
        const { x: ox, y: oy, z: oz } = this.cameraOffset;
        for (let i = 0; i < this.viewports.length; i++) {
            const player = this.players[i];
            const viewport = this.viewports[i];
            if (!player || !viewport)
                continue;
            const camera = viewport.camera;
            const p = player.entity._translate;
            camera._translate.x = p.x + ox;
            camera._translate.y = oy;
            camera._translate.z = p.z + oz;
            if (!camera._lookAt) {
                camera._lookAt = new IgePoint3d_1.IgePoint3d(p.x, 0, p.z);
            }
            else {
                camera._lookAt.x = p.x;
                camera._lookAt.y = 0;
                camera._lookAt.z = p.z;
            }
        }
    }
    // ------------------------------------------------------------------
    // Input and UI
    // ------------------------------------------------------------------
    setupInput() {
        window.addEventListener("keydown", (e) => {
            if (!this.keysDown[e.code])
                this.keysPressed[e.code] = true;
            this.keysDown[e.code] = true;
            if (e.code === "Space" || e.code.startsWith("Arrow"))
                e.preventDefault();
        });
        window.addEventListener("keyup", (e) => {
            this.keysDown[e.code] = false;
        });
    }
    updatePlayerHud() {
        for (const player of this.players) {
            const el = document.getElementById(`label-p${player.index + 1}`);
            if (!el)
                continue;
            const config = PLAYER_CONFIGS[player.index];
            const text = player.health > 0
                ? `P${player.index + 1} ${config.name} | HP ${player.health} | Kills ${player.kills}`
                : `P${player.index + 1} ${config.name} | DOWN - respawning`;
            if (el.textContent !== text)
                el.textContent = text;
        }
    }
    updateStatus(status) {
        const el = document.getElementById("status");
        if (el)
            el.textContent = status;
    }
    updatePlayerCount(count) {
        const el = document.getElementById("playerCount");
        if (el)
            el.textContent = count.toString();
    }
    updateStats() {
        var _a;
        const fpsEl = document.getElementById("fps");
        if (fpsEl)
            fpsEl.textContent = Math.round(instance_1.ige.engine._fps).toString();
        const zombiesEl = document.getElementById("zombieCount");
        if (zombiesEl)
            zombiesEl.textContent = `${this.zombies.filter((z) => z.alive).length} (${this.totalKills} killed)`;
        const drawEl = document.getElementById("drawCalls");
        const stats = (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.stats();
        if (drawEl && stats)
            drawEl.textContent = `${stats.drawCalls + stats.instancedDrawCalls} (${stats.instances} instanced)`;
        const trianglesEl = document.getElementById("triangles");
        if (trianglesEl && stats)
            trianglesEl.textContent = `${(stats.triangles / 1000).toFixed(0)}k (${stats.lodItems} LOD)`;
    }
    hideLoadingScreen() {
        document.querySelectorAll(".igeLoading").forEach((el) => {
            el.style.display = "none";
        });
    }
}
exports.Client = Client;
const GRID_CELL = 120;
function gridKeyFromCell(cx, cz) {
    return (cx + 1000) * 4096 + (cz + 1000);
}
function gridKey(x, z) {
    return gridKeyFromCell(Math.floor(x / GRID_CELL), Math.floor(z / GRID_CELL));
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
