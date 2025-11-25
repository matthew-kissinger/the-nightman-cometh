export type PromptOwner = 'door' | 'boarding' | 'tree' | 'firepit' | 'generic';

const PROMPT_PRIORITY: Record<PromptOwner, number> = {
  door: 3,
  boarding: 2,
  firepit: 1,
  tree: 1,
  generic: 0
};

/**
 * Centralized interaction prompt manager. Keeps different systems from
 * overwriting each other's messages by tracking an active owner.
 */
class InteractionPrompt {
  private element: HTMLElement | null = null;
  private activeOwner: PromptOwner | null = null;

  /**
   * Attach the DOM element backing the prompt. Safe to call multiple times.
   */
  attach(element?: HTMLElement | null): void {
    if (element) {
      this.element = element;
    } else if (!this.element) {
      this.element = document.getElementById('interaction-prompt');
    }
  }

  /**
   * Show a prompt for a given owner.
   */
  show(owner: PromptOwner, text: string, element?: HTMLElement | null): void {
    if (element || !this.element) {
      this.attach(element);
    }
    if (!this.element) return;

    const currentPriority = this.activeOwner ? this.getPriority(this.activeOwner) : -Infinity;
    const nextPriority = this.getPriority(owner);

    // Only allow equal or higher priority prompts to replace the active one
    if (this.activeOwner && this.activeOwner !== owner && nextPriority < currentPriority) {
      return;
    }

    this.activeOwner = owner;
    if (this.element.textContent !== text) {
      this.element.textContent = text;
    }
    if (!this.element.classList.contains('visible')) {
      this.element.classList.add('visible');
    }
  }

  /**
   * Hide the prompt, but only if it is owned by the caller.
   */
  hide(owner: PromptOwner): void {
    if (!this.element) return;
    if (this.activeOwner !== owner) return;

    this.activeOwner = null;
    if (this.element.classList.contains('visible')) {
      this.element.classList.remove('visible');
    }
    this.element.textContent = '';
  }

  private getPriority(owner: PromptOwner): number {
    return PROMPT_PRIORITY[owner] ?? 0;
  }
}

export const interactionPrompt = new InteractionPrompt();
