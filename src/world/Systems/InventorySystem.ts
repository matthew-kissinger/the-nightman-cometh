/**
 * InventorySystem - Manages player inventory
 *
 * Items:
 * - Wood (raw logs from chopped trees)
 * - Boards (crafted from wood, used for boarding)
 * - Shotgun Shells (ammo)
 */

export interface InventoryState {
  wood: number;      // Raw wood logs
  boards: number;    // Crafted boards
  shells: number;    // Shotgun ammo
}

export class InventorySystem {
  private inventory: InventoryState;
  private uiElement: HTMLElement | null = null;

  // Crafting recipes
  private readonly WOOD_PER_BOARD = 2; // 2 wood = 1 board

  constructor() {
    this.inventory = {
      wood: 0,
      boards: 0,
      shells: 6, // Start with 6 shells
    };

    this.uiElement = document.getElementById('inventory-ui');
    this.updateUI();
  }

  /**
   * Add wood to inventory
   */
  public addWood(amount: number): void {
    this.inventory.wood += amount;
    console.log(`📦 +${amount} wood (total: ${this.inventory.wood})`);
    this.updateUI();
  }

  /**
   * Remove wood from inventory
   */
  public removeWood(amount: number): boolean {
    if (this.inventory.wood >= amount) {
      this.inventory.wood -= amount;
      this.updateUI();
      return true;
    }
    return false;
  }

  /**
   * Craft boards from wood
   */
  public craftBoard(): boolean {
    if (this.inventory.wood >= this.WOOD_PER_BOARD) {
      this.inventory.wood -= this.WOOD_PER_BOARD;
      this.inventory.boards += 1;
      console.log(`🔨 Crafted 1 board (${this.inventory.boards} total)`);
      this.updateUI();
      return true;
    }
    console.warn('⚠️ Not enough wood to craft board');
    return false;
  }

  /**
   * Use a board (for boarding windows/doors)
   */
  public useBoard(): boolean {
    if (this.inventory.boards > 0) {
      this.inventory.boards -= 1;
      console.log(`🪵 Used 1 board (${this.inventory.boards} remaining)`);
      this.updateUI();
      return true;
    }
    return false;
  }

  /**
   * Add shotgun shells
   */
  public addShells(amount: number): void {
    this.inventory.shells += amount;
    this.updateUI();
  }

  /**
   * Use shotgun shell
   */
  public useShell(): boolean {
    if (this.inventory.shells > 0) {
      this.inventory.shells -= 1;
      this.updateUI();
      return true;
    }
    return false;
  }

  /**
   * Get current inventory state
   */
  public getInventory(): Readonly<InventoryState> {
    return { ...this.inventory };
  }

  /**
   * Update UI display
   */
  private updateUI(): void {
    if (!this.uiElement) {
      // Create UI element if it doesn't exist
      this.uiElement = document.createElement('div');
      this.uiElement.id = 'inventory-ui';
      this.uiElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 15px;
        border: 2px solid #444;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.6;
        min-width: 150px;
        z-index: 100;
      `;
      document.body.appendChild(this.uiElement);
    }

    this.uiElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #666; padding-bottom: 4px;">
        INVENTORY
      </div>
      <div>🪵 Wood: ${this.inventory.wood}</div>
      <div>🪚 Boards: ${this.inventory.boards}</div>
      <div>🔫 Shells: ${this.inventory.shells}</div>
    `;
  }

  public dispose(): void {
    if (this.uiElement && this.uiElement.parentElement) {
      this.uiElement.parentElement.removeChild(this.uiElement);
    }
  }
}
