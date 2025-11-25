import { InventorySystem } from '../world/Systems/InventorySystem';
import { WeaponType } from '../world/WeaponManager';

/**
 * GameUI - Complete UI system for The Nightman Cometh
 *
 * Features:
 * - HUD (health, stamina, ammo)
 * - Weapon hotbar
 * - Inventory panel (toggle with TAB)
 * - Crafting menu
 */

export class GameUI {
  private inventory: InventorySystem;

  // UI Elements
  private hudElement: HTMLElement;
  private weaponHotbarElement: HTMLElement;
  private inventoryPanelElement: HTMLElement;
  private craftingMenuElement: HTMLElement;

  // State
  private isInventoryOpen: boolean = false;
  private currentWeapon: WeaponType = 'flashlight';
  private playerHealth: number = 100;
  private playerStamina: number = 100;
  private onInventoryOpen?: () => void;
  private onInventoryClose?: () => void;

  constructor(inventory: InventorySystem) {
    this.inventory = inventory;

    // Create UI elements
    this.hudElement = this.createHUD();
    this.weaponHotbarElement = this.createWeaponHotbar();
    this.inventoryPanelElement = this.createInventoryPanel();
    this.craftingMenuElement = this.createCraftingMenu();

    // Append to body
    document.body.appendChild(this.hudElement);
    document.body.appendChild(this.weaponHotbarElement);
    document.body.appendChild(this.inventoryPanelElement);
    document.body.appendChild(this.craftingMenuElement);

    // Set up keyboard listener for TAB
    this.setupKeyboardListeners();

    // Initial update
    this.update();
  }

  /**
   * Create HUD (top-left corner)
   */
  private createHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 15px 20px;
      border: 2px solid #444;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      line-height: 1.8;
      min-width: 200px;
      z-index: 100;
      user-select: none;
    `;

    hud.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #666; padding-bottom: 5px;">
        STATUS
      </div>
      <div id="hud-health">❤️ Health: 100/100</div>
      <div id="hud-stamina">⚡ Stamina: 100/100</div>
      <div id="hud-ammo">🔫 Shells: 6</div>
      <div style="margin-top: 10px; font-size: 12px; color: #999;">
        Press TAB for inventory
      </div>
    `;

    return hud;
  }

  /**
   * Create weapon hotbar (bottom center)
   */
  private createWeaponHotbar(): HTMLElement {
    const hotbar = document.createElement('div');
    hotbar.id = 'weapon-hotbar';
    hotbar.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px 15px;
      border: 2px solid #444;
      z-index: 100;
      user-select: none;
    `;

    hotbar.innerHTML = `
      <div class="weapon-slot" data-weapon="flashlight" style="padding: 10px 15px; border: 2px solid #666; background: rgba(255, 255, 255, 0.1); cursor: pointer; font-family: 'Courier New', monospace;">
        <div style="font-size: 24px;">🔦</div>
        <div style="font-size: 11px; text-align: center; color: #ccc; margin-top: 5px;">1</div>
      </div>
      <div class="weapon-slot" data-weapon="hatchet" style="padding: 10px 15px; border: 2px solid #666; background: rgba(0, 0, 0, 0.5); cursor: pointer; font-family: 'Courier New', monospace;">
        <div style="font-size: 24px;">🪓</div>
        <div style="font-size: 11px; text-align: center; color: #ccc; margin-top: 5px;">2</div>
      </div>
      <div class="weapon-slot" data-weapon="shotgun" style="padding: 10px 15px; border: 2px solid #666; background: rgba(0, 0, 0, 0.5); cursor: pointer; font-family: 'Courier New', monospace;">
        <div style="font-size: 24px;">🔫</div>
        <div style="font-size: 11px; text-align: center; color: #ccc; margin-top: 5px;">3</div>
      </div>
    `;

    return hotbar;
  }

  /**
   * Create inventory panel (center screen, hidden by default)
   */
  private createInventoryPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'inventory-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      max-height: 600px;
      background: rgba(0, 0, 0, 0.95);
      border: 3px solid #666;
      padding: 20px;
      font-family: 'Courier New', monospace;
      color: #fff;
      z-index: 200;
      display: none;
      user-select: none;
    `;

    panel.innerHTML = `
      <div style="font-weight: bold; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #888; padding-bottom: 10px;">
        INVENTORY
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border: 1px solid #444;">
          <div style="font-size: 32px; text-align: center; margin-bottom: 10px;">🪵</div>
          <div style="text-align: center; font-weight: bold;">Wood Logs</div>
          <div id="inv-wood-count" style="text-align: center; font-size: 24px; color: #ff9; margin-top: 5px;">0</div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border: 1px solid #444;">
          <div style="font-size: 32px; text-align: center; margin-bottom: 10px;">🪚</div>
          <div style="text-align: center; font-weight: bold;">Boards</div>
          <div id="inv-board-count" style="text-align: center; font-size: 24px; color: #ff9; margin-top: 5px;">0</div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border: 1px solid #444;">
          <div style="font-size: 32px; text-align: center; margin-bottom: 10px;">🔫</div>
          <div style="text-align: center; font-weight: bold;">Shotgun Shells</div>
          <div id="inv-shell-count" style="text-align: center; font-size: 24px; color: #ff9; margin-top: 5px;">6</div>
        </div>

        <div id="craft-board-btn" style="background: rgba(139, 69, 19, 0.3); padding: 15px; border: 2px solid #8B4513; cursor: pointer; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: all 0.2s;">
          <div style="font-weight: bold; margin-bottom: 5px;">CRAFT BOARD</div>
          <div style="font-size: 12px; color: #ccc;">2 Wood → 1 Board</div>
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #444; text-align: center; font-size: 14px; color: #999;">
        Press TAB to close
      </div>
    `;

    // Add craft button click handler
    const craftBtn = panel.querySelector('#craft-board-btn') as HTMLElement;
    craftBtn.addEventListener('click', () => {
      this.craftBoard();
    });

    craftBtn.addEventListener('mouseenter', () => {
      craftBtn.style.background = 'rgba(139, 69, 19, 0.5)';
    });

    craftBtn.addEventListener('mouseleave', () => {
      craftBtn.style.background = 'rgba(139, 69, 19, 0.3)';
    });

    return panel;
  }

  /**
   * Create crafting menu (placeholder for now)
   */
  private createCraftingMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.id = 'crafting-menu';
    menu.style.display = 'none'; // Hidden for now, integrated into inventory
    return menu;
  }

  /**
   * Setup keyboard listeners
   */
  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleInventory();
      }
    });
  }

  /**
   * Toggle inventory panel
   */
  public toggleInventory(): void {
    this.isInventoryOpen = !this.isInventoryOpen;

    if (this.isInventoryOpen) {
      this.inventoryPanelElement.style.display = 'block';
      this.update(); // Refresh inventory counts
      if (this.onInventoryOpen) this.onInventoryOpen();
    } else {
      this.inventoryPanelElement.style.display = 'none';
      if (this.onInventoryClose) this.onInventoryClose();
    }
  }

  /**
   * Craft a board from wood
   */
  private craftBoard(): void {
    const success = this.inventory.craftBoard();
    if (success) {
      this.update();
      console.log('🔨 Board crafted successfully!');
    } else {
      console.warn('⚠️ Not enough wood to craft board (need 2 wood)');
    }
  }

  /**
   * Update UI with current state
   */
  public update(): void {
    // Update HUD
    const healthElement = document.getElementById('hud-health');
    const staminaElement = document.getElementById('hud-stamina');
    const ammoElement = document.getElementById('hud-ammo');

    if (healthElement) {
      healthElement.textContent = `❤️ Health: ${this.playerHealth}/100`;
      healthElement.style.color = this.playerHealth > 50 ? '#0f0' : this.playerHealth > 25 ? '#ff0' : '#f00';
    }

    if (staminaElement) {
      staminaElement.textContent = `⚡ Stamina: ${Math.round(this.playerStamina)}/100`;
      staminaElement.style.color = this.playerStamina > 50 ? '#0ff' : this.playerStamina > 25 ? '#ff0' : '#f00';
    }

    const inv = this.inventory.getInventory();
    if (ammoElement) {
      ammoElement.textContent = `🔫 Shells: ${inv.shells}`;
    }

    // Update inventory panel counts
    const woodCountElement = document.getElementById('inv-wood-count');
    const boardCountElement = document.getElementById('inv-board-count');
    const shellCountElement = document.getElementById('inv-shell-count');

    if (woodCountElement) woodCountElement.textContent = `${inv.wood}`;
    if (boardCountElement) boardCountElement.textContent = `${inv.boards}`;
    if (shellCountElement) shellCountElement.textContent = `${inv.shells}`;

    // Update weapon hotbar
    this.updateWeaponHotbar();
  }

  /**
   * Set current weapon (updates hotbar highlight)
   */
  public setCurrentWeapon(weapon: WeaponType): void {
    this.currentWeapon = weapon;
    this.updateWeaponHotbar();
  }

  /**
   * Update weapon hotbar highlighting
   */
  private updateWeaponHotbar(): void {
    const slots = this.weaponHotbarElement.querySelectorAll('.weapon-slot');
    slots.forEach((slot) => {
      const element = slot as HTMLElement;
      const weaponType = element.getAttribute('data-weapon');

      if (weaponType === this.currentWeapon) {
        element.style.background = 'rgba(255, 255, 255, 0.2)';
        element.style.borderColor = '#ff0';
      } else {
        element.style.background = 'rgba(0, 0, 0, 0.5)';
        element.style.borderColor = '#666';
      }
    });
  }

  /**
   * Set player health (for damage system)
   */
  public setPlayerHealth(health: number): void {
    this.playerHealth = Math.max(0, Math.min(100, health));
    this.update();
  }

  /**
   * Set player stamina
   */
  public setPlayerStamina(stamina: number): void {
    this.playerStamina = Math.max(0, Math.min(100, stamina));
    this.update();
  }

  /**
   * Check if inventory is open (should pause game/disable controls)
   */
  public isInventoryPanelOpen(): boolean {
    return this.isInventoryOpen;
  }

  /**
   * Allow external systems (SceneManager) to react to inventory open/close
   * for pointer lock and cursor visibility.
   */
  public setInventoryToggleHandlers(onOpen?: () => void, onClose?: () => void): void {
    this.onInventoryOpen = onOpen;
    this.onInventoryClose = onClose;
  }

  public dispose(): void {
    document.body.removeChild(this.hudElement);
    document.body.removeChild(this.weaponHotbarElement);
    document.body.removeChild(this.inventoryPanelElement);
    document.body.removeChild(this.craftingMenuElement);
  }
}
