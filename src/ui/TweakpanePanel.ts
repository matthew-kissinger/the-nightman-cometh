import { Pane } from 'tweakpane';

/**
 * TweakpanePanel - Debug UI for tweaking game parameters
 * TODO: Add controls for lighting, fog, post-processing, and AI
 * Note: Tweakpane v4 removed some features - keeping this as a stub for future implementation
 */
export class TweakpanePanel {
  private pane: Pane;
  public params: any;

  constructor() {
    this.pane = new Pane({
      title: '🕯 Debug Panel'
    });

    // Default parameters
    this.params = {
      lighting: {
        flashlightIntensity: 2.0,
        flashlightDistance: 20,
        ambientIntensity: 0.1
      },
      fog: {
        density: 0.02,
        color: '#000000'
      },
      postFx: {
        noiseOpacity: 0.15,
        vignetteDarkness: 0.6,
        vignetteOffset: 0.3
      },
      player: {
        moveSpeed: 5.0,
        sprintMultiplier: 1.5
      }
    };

    this.buildUI();
  }

  private buildUI(): void {
    // TODO: Add Tweakpane bindings when implementing features
    // For now, just displaying the pane for future use
    console.log('Debug panel initialized. Parameters:', this.params);
  }

  public dispose(): void {
    this.pane.dispose();
  }
}
