import * as THREE from 'three';

/**
 * Combat System - Handles damage, health, and weapon interactions
 *
 * Design Philosophy: Attrition-based survival combat
 * - Nightman has 100 HP (can't be killed easily)
 * - Shotgun: 15-25 damage, limited ammo (6 start, 12 max)
 * - Hatchet: 10 damage, unlimited, risky (close range)
 * - Player: 100 HP, can take 4-5 hits before death
 * - Ammo pickups: 2-4 shells, scattered in cabin/forest
 */

export interface DamageEvent {
  attacker: 'player' | 'nightman';
  weapon: 'shotgun' | 'hatchet' | 'grab' | 'melee';
  damage: number;
  position: THREE.Vector3;
  timestamp: number;
}

export interface CombatStats {
  health: number;
  maxHealth: number;
  isDead: boolean;
  lastDamageTime: number;
  totalDamageTaken: number;
}

// Weapon damage configuration
export const WEAPON_DAMAGE = {
  shotgun: {
    min: 15,
    max: 25,
    range: 15.0,          // Effective range in meters
    spread: 0.1,          // Cone spread (radians)
    knockback: 5.0,       // Knockback force
    shellsPerShot: 1
  },
  hatchet: {
    damage: 10,
    range: 2.5,           // Melee range
    attackCooldown: 0.8,  // Seconds between swings
    knockback: 2.0
  },
  nightman_grab: {
    damage: 20,           // Reaching through window
    range: 2.0
  },
  nightman_melee: {
    damage: 25,           // Direct melee inside cabin
    range: 2.5
  }
};

// Ammo configuration
export const AMMO_CONFIG = {
  shotgun: {
    startingAmmo: 6,      // Start with 6 shells
    maxAmmo: 12,          // Can carry max 12
    pickupMin: 2,         // Pickup gives 2-4 shells
    pickupMax: 4
  }
};

export class CombatSystem {
  // Nightman stats
  private nightmanHealth: number = 100;
  private nightmanMaxHealth: number = 100;
  private nightmanInvulnerable: boolean = false;
  private nightmanLastHitTime: number = 0;
  private nightmanHitCooldown: number = 0.5; // Can't damage more than once per 0.5s

  // Player stats
  private playerHealth: number = 100;
  private playerMaxHealth: number = 100;
  private playerInvulnerable: boolean = false;
  private playerLastHitTime: number = 0;
  private playerHitCooldown: number = 1.0; // 1 second invulnerability after hit

  // Ammo tracking
  private shotgunAmmo: number = AMMO_CONFIG.shotgun.startingAmmo;
  private maxShotgunAmmo: number = AMMO_CONFIG.shotgun.maxAmmo;

  // Event callbacks
  public onNightmanDamaged?: (damage: number, health: number) => void;
  public onNightmanDeath?: () => void;
  public onPlayerDamaged?: (damage: number, health: number) => void;
  public onPlayerDeath?: () => void;
  public onAmmoChanged?: (current: number, max: number) => void;
  public onWeaponFired?: (weapon: string, ammoLeft: number) => void;

  constructor() {
    console.log('⚔️ Combat System initialized');
    console.log(`   Nightman: ${this.nightmanHealth} HP`);
    console.log(`   Player: ${this.playerHealth} HP`);
    console.log(`   Shotgun Ammo: ${this.shotgunAmmo}/${this.maxShotgunAmmo}`);
  }

  /**
   * Player attacks with shotgun
   * Returns true if shot was fired (had ammo), false if no ammo
   */
  public fireShot(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    nightmanPosition: THREE.Vector3,
    _nightmanForm?: 'exterior' | 'interior' | 'transforming'
  ): boolean {
    // Check ammo
    if (this.shotgunAmmo <= 0) {
      console.log('🔫 CLICK - No ammo!');
      if (this.onWeaponFired) {
        this.onWeaponFired('shotgun_empty', 0);
      }
      return false;
    }

    // Consume ammo
    this.shotgunAmmo--;
    console.log(`🔫 Shotgun fired! Ammo: ${this.shotgunAmmo}/${this.maxShotgunAmmo}`);

    if (this.onWeaponFired) {
      this.onWeaponFired('shotgun', this.shotgunAmmo);
    }

    if (this.onAmmoChanged) {
      this.onAmmoChanged(this.shotgunAmmo, this.maxShotgunAmmo);
    }

    // Check if Nightman is in range and cone
    const toNightman = new THREE.Vector3().subVectors(nightmanPosition, origin);
    const distance = toNightman.length();
    toNightman.normalize();

    const angle = direction.angleTo(toNightman);
    const inCone = angle < WEAPON_DAMAGE.shotgun.spread;
    const inRange = distance < WEAPON_DAMAGE.shotgun.range;

    if (inCone && inRange) {
      // Hit! Calculate damage (random between min/max)
      const damage = THREE.MathUtils.randInt(
        WEAPON_DAMAGE.shotgun.min,
        WEAPON_DAMAGE.shotgun.max
      );

      // Reduce damage based on distance (falloff)
      const distanceFactor = 1.0 - (distance / WEAPON_DAMAGE.shotgun.range);
      const finalDamage = Math.round(damage * distanceFactor);

      this.damageNightman(finalDamage, origin, 'shotgun');

      console.log(`💥 HIT! Distance: ${distance.toFixed(1)}m, Damage: ${finalDamage}`);
      return true;
    } else {
      console.log(`❌ MISS! (angle: ${(angle * 57.3).toFixed(1)}°, distance: ${distance.toFixed(1)}m)`);
      return true; // Still fired, just missed
    }
  }

  /**
   * Player attacks with hatchet
   */
  public swingHatchet(
    playerPosition: THREE.Vector3,
    playerDirection: THREE.Vector3,
    nightmanPosition: THREE.Vector3
  ): boolean {
    const toNightman = new THREE.Vector3().subVectors(nightmanPosition, playerPosition);
    const distance = toNightman.length();
    toNightman.normalize();

    // Check if in front of player
    const angle = playerDirection.angleTo(toNightman);
    const inFront = angle < Math.PI / 3; // 60 degree cone

    if (inFront && distance < WEAPON_DAMAGE.hatchet.range) {
      this.damageNightman(WEAPON_DAMAGE.hatchet.damage, playerPosition, 'hatchet');
      console.log(`🪓 Hatchet HIT! Damage: ${WEAPON_DAMAGE.hatchet.damage}`);
      return true;
    } else {
      console.log(`🪓 Hatchet MISS!`);
      return false;
    }
  }

  /**
   * Nightman attacks player (grab or melee)
   */
  public nightmanAttack(
    nightmanPosition: THREE.Vector3,
    playerPosition: THREE.Vector3,
    attackType: 'grab' | 'melee'
  ): boolean {
    const distance = nightmanPosition.distanceTo(playerPosition);
    const config = attackType === 'grab'
      ? WEAPON_DAMAGE.nightman_grab
      : WEAPON_DAMAGE.nightman_melee;

    if (distance < config.range) {
      this.damagePlayer(config.damage, nightmanPosition);
      console.log(`👹 Nightman ${attackType} HIT! Damage: ${config.damage}`);
      return true;
    }

    return false;
  }

  /**
   * Damage the Nightman
   */
  private damageNightman(damage: number, _source: THREE.Vector3, _weapon: string): void {
    // Check invulnerability (hit cooldown)
    const now = Date.now();
    if (this.nightmanInvulnerable || (now - this.nightmanLastHitTime) < (this.nightmanHitCooldown * 1000)) {
      console.log('🛡️ Nightman invulnerable (hit cooldown)');
      return;
    }

    // Apply damage
    this.nightmanHealth = Math.max(0, this.nightmanHealth - damage);
    this.nightmanLastHitTime = now;

    console.log(`💔 Nightman took ${damage} damage! Health: ${this.nightmanHealth}/${this.nightmanMaxHealth}`);

    // Callback
    if (this.onNightmanDamaged) {
      this.onNightmanDamaged(damage, this.nightmanHealth);
    }

    // Check death
    if (this.nightmanHealth <= 0) {
      this.nightmanDeath();
    }
  }

  /**
   * Damage the player
   */
  private damagePlayer(damage: number, _source: THREE.Vector3): void {
    // Check invulnerability
    const now = Date.now();
    if (this.playerInvulnerable || (now - this.playerLastHitTime) < (this.playerHitCooldown * 1000)) {
      return;
    }

    // Apply damage
    this.playerHealth = Math.max(0, this.playerHealth - damage);
    this.playerLastHitTime = now;

    console.log(`💔 Player took ${damage} damage! Health: ${this.playerHealth}/${this.playerMaxHealth}`);

    // Callback
    if (this.onPlayerDamaged) {
      this.onPlayerDamaged(damage, this.playerHealth);
    }

    // Check death
    if (this.playerHealth <= 0) {
      this.playerDeath();
    }
  }

  /**
   * Add ammo to player inventory
   */
  public addAmmo(amount: number): boolean {
    if (this.shotgunAmmo >= this.maxShotgunAmmo) {
      console.log('🔫 Ammo full! Cannot pick up.');
      return false;
    }

    const ammoAdded = Math.min(amount, this.maxShotgunAmmo - this.shotgunAmmo);
    this.shotgunAmmo += ammoAdded;

    console.log(`📦 Picked up ${ammoAdded} shells! Ammo: ${this.shotgunAmmo}/${this.maxShotgunAmmo}`);

    if (this.onAmmoChanged) {
      this.onAmmoChanged(this.shotgunAmmo, this.maxShotgunAmmo);
    }

    return true;
  }

  /**
   * Nightman death
   */
  private nightmanDeath(): void {
    console.log('💀 THE NIGHTMAN HAS BEEN DEFEATED!');

    if (this.onNightmanDeath) {
      this.onNightmanDeath();
    }
  }

  /**
   * Player death
   */
  private playerDeath(): void {
    console.log('💀 YOU DIED');

    if (this.onPlayerDeath) {
      this.onPlayerDeath();
    }
  }

  // Public getters
  public getNightmanHealth(): number {
    return this.nightmanHealth;
  }

  public getNightmanHealthPercent(): number {
    return this.nightmanHealth / this.nightmanMaxHealth;
  }

  public getPlayerHealth(): number {
    return this.playerHealth;
  }

  public getPlayerHealthPercent(): number {
    return this.playerHealth / this.playerMaxHealth;
  }

  public getShotgunAmmo(): number {
    return this.shotgunAmmo;
  }

  public getMaxShotgunAmmo(): number {
    return this.maxShotgunAmmo;
  }

  public isNightmanDead(): boolean {
    return this.nightmanHealth <= 0;
  }

  public isPlayerDead(): boolean {
    return this.playerHealth <= 0;
  }

  // Cheat codes / debug
  public setNightmanHealth(health: number): void {
    this.nightmanHealth = THREE.MathUtils.clamp(health, 0, this.nightmanMaxHealth);
  }

  public setPlayerHealth(health: number): void {
    this.playerHealth = THREE.MathUtils.clamp(health, 0, this.playerMaxHealth);
  }

  public setShotgunAmmo(ammo: number): void {
    this.shotgunAmmo = THREE.MathUtils.clamp(ammo, 0, this.maxShotgunAmmo);
    if (this.onAmmoChanged) {
      this.onAmmoChanged(this.shotgunAmmo, this.maxShotgunAmmo);
    }
  }
}
