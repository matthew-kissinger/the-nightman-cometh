# Head Bob and Camera Effects for FPS Games

**Source URLs**:
- https://discourse.threejs.org/t/are-there-any-methods-to-activate-head-bob-effect-in-first-person-camera/37687
- https://gamedev.stackexchange.com/questions/24850/whats-the-best-head-bob-formula
- https://gamedev.stackexchange.com/questions/109056/how-to-implement-view-bobbing
**Date**: 2024 best practices
**Stack**:
- Three.js: Framework agnostic
- Mathematics: Sine wave oscillation

**License**: N/A (Mathematical patterns)

## What This Example Demonstrates

Head bobbing creates natural, immersive first-person movement by simulating the subtle up-down motion of walking. Proper implementation is subtle - players shouldn't consciously notice it, but should feel the difference between moving and sliding.

**Key Principle**: Keep it subtle. The goal is to make motion feel natural, not to make players nauseous.

## Key Implementation Patterns

### Basic Sine Wave Head Bob

```typescript
class HeadBob {
  private bobSpeed: number = 10; // How fast the bob cycles
  private bobAmount: number = 0.05; // How much vertical movement
  private bobTimer: number = 0;
  private defaultCameraY: number;

  constructor(camera: THREE.Camera) {
    this.defaultCameraY = camera.position.y;
  }

  public update(deltaTime: number, velocity: number, camera: THREE.Camera): void {
    // Only bob when moving
    if (velocity > 0.1) {
      this.bobTimer += deltaTime * this.bobSpeed * velocity;

      // Sine wave creates smooth oscillation
      const bobOffset = Math.sin(this.bobTimer) * this.bobAmount;

      // Apply to camera Y position
      camera.position.y = this.defaultCameraY + bobOffset;
    } else {
      // Smoothly return to default position when stopped
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        this.defaultCameraY,
        deltaTime * 5
      );
      this.bobTimer = 0;
    }
  }
}
```

### Advanced: Velocity-Based Head Bob

```typescript
// More sophisticated approach based on player velocity
class VelocityHeadBob {
  private bobFrequency: number = 2 * Math.PI; // One complete cycle per unit time
  private bobAmplitude: number = 0.08;
  private bobTimer: number = 0;
  private defaultY: number;

  constructor(cameraY: number) {
    this.defaultY = cameraY;
  }

  public update(
    deltaTime: number,
    velocity: THREE.Vector3,
    camera: THREE.Camera
  ): void {
    // Calculate horizontal velocity
    const horizontalVelocity = new THREE.Vector2(velocity.x, velocity.z).length();

    if (horizontalVelocity > 0.5) {
      // Increment timer based on velocity and time
      // Formula: bobOscillate = sin(time * velocity * (2 * PI))
      this.bobTimer += deltaTime * horizontalVelocity * this.bobFrequency;

      // Calculate bob offset (-1 to 1) * amplitude
      const bobOffset = Math.sin(this.bobTimer) * this.bobAmplitude;

      // Apply to camera
      camera.position.y = this.defaultY + bobOffset;
    } else {
      // Lerp back to default when stopped
      const returnSpeed = 8.0;
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        this.defaultY,
        deltaTime * returnSpeed
      );

      // Reset timer
      this.bobTimer = 0;
    }
  }
}
```

### Two-Axis Head Bob (Vertical + Horizontal)

```typescript
class TwoAxisHeadBob {
  private verticalBobSpeed: number = 10;
  private horizontalBobSpeed: number = 8;
  private verticalBobAmount: number = 0.05;
  private horizontalBobAmount: number = 0.03;
  private bobTimer: number = 0;
  private defaultPosition: THREE.Vector3;

  constructor(camera: THREE.Camera) {
    this.defaultPosition = camera.position.clone();
  }

  public update(
    deltaTime: number,
    isMoving: boolean,
    camera: THREE.Camera
  ): void {
    if (isMoving) {
      this.bobTimer += deltaTime;

      // Vertical bob (up and down)
      const verticalOffset = Math.sin(this.bobTimer * this.verticalBobSpeed)
        * this.verticalBobAmount;

      // Horizontal bob (side to side, half the frequency of vertical)
      const horizontalOffset = Math.sin(this.bobTimer * this.horizontalBobSpeed * 0.5)
        * this.horizontalBobAmount;

      // Apply to camera
      camera.position.y = this.defaultPosition.y + verticalOffset;
      camera.position.x = this.defaultPosition.x + horizontalOffset;
    } else {
      // Return to default
      camera.position.lerp(this.defaultPosition, deltaTime * 5);
      this.bobTimer = 0;
    }
  }
}
```

### Sprint vs Walk Head Bob

```typescript
class AdaptiveHeadBob {
  private walkBobSpeed: number = 8;
  private sprintBobSpeed: number = 12;
  private walkBobAmount: number = 0.04;
  private sprintBobAmount: number = 0.08;
  private bobTimer: number = 0;
  private defaultY: number;

  constructor(cameraY: number) {
    this.defaultY = cameraY;
  }

  public update(
    deltaTime: number,
    isMoving: boolean,
    isSprinting: boolean,
    camera: THREE.Camera
  ): void {
    if (isMoving) {
      // Adjust bob parameters based on sprint state
      const bobSpeed = isSprinting ? this.sprintBobSpeed : this.walkBobSpeed;
      const bobAmount = isSprinting ? this.sprintBobAmount : this.walkBobAmount;

      this.bobTimer += deltaTime * bobSpeed;

      // Calculate bob
      const bobOffset = Math.sin(this.bobTimer) * bobAmount;
      camera.position.y = this.defaultY + bobOffset;
    } else {
      // Smooth return to default
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        this.defaultY,
        deltaTime * 6
      );
      this.bobTimer = 0;
    }
  }
}
```

### Integration with PointerLockControls

```typescript
// Complete example showing integration
class FPSController {
  private controls: PointerLockControls;
  private headBob: HeadBob;
  private velocity: THREE.Vector3;
  private eyeHeight: number = 1.6;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new PointerLockControls(camera, domElement);
    this.headBob = new HeadBob(camera);
    this.velocity = new THREE.Vector3();

    // Set camera to eye height
    this.controls.getObject().position.y = this.eyeHeight;
  }

  public update(deltaTime: number): void {
    // Calculate horizontal velocity magnitude
    const horizontalSpeed = Math.sqrt(
      this.velocity.x * this.velocity.x +
      this.velocity.z * this.velocity.z
    );

    // Update head bob
    this.headBob.update(deltaTime, horizontalSpeed, this.controls.getObject());

    // ... rest of movement logic
  }
}
```

## Implementation Notes

- **Subtlety is Key**: Most implementations fail by being too aggressive
- **Don't Change Pitch**: Avoid changing camera rotation, only position
- **Use Y-axis Only**: Pure vertical deflection feels most natural
- **Velocity Correlation**: Bob speed should match movement speed
- **Smooth Returns**: Always lerp back to default position when stopped

## Gotchas

- **Sea Sickness**: Too much bob amplitude causes motion sickness
- **Rotation vs Position**: NEVER bob the camera rotation (pitch), only position
- **Sprinting**: Sprint bob should be faster AND slightly larger amplitude
- **Crouching**: Should reduce bob amount or disable entirely
- **Landing**: Consider adding landing impact (one-time bob spike)

## Performance Tips

- Simple sine calculations are extremely cheap
- No need to optimize head bob - it's negligible performance impact
- Can be disabled entirely for performance mode or accessibility

## Mathematical Deep Dive

### Best Head Bob Formula (from GameDev StackExchange)

```typescript
// Formula: sin(time * velocity * (2 * PI))
// This creates one oscillation cycle at the same rate as velocity

function calculateHeadBob(time: number, velocity: number): number {
  const frequency = 2 * Math.PI;
  return Math.sin(time * velocity * frequency);
}

// Why this works:
// - time * velocity creates timer that advances faster when moving faster
// - 2 * PI creates one complete sine wave cycle (0 to 2π)
// - Result is oscillation from -1 to 1 that naturally matches movement
```

### Alternate Approach: Step Counter

```typescript
class StepBasedHeadBob {
  private stepDistance: number = 1.5; // Distance between steps
  private distanceTraveled: number = 0;
  private bobPhase: number = 0;
  private bobHeight: number = 0.05;

  public update(deltaTime: number, velocity: THREE.Vector3, camera: THREE.Camera): void {
    const speed = new THREE.Vector2(velocity.x, velocity.z).length();

    if (speed > 0.1) {
      // Accumulate distance
      this.distanceTraveled += speed * deltaTime;

      // Trigger bob when step distance reached
      if (this.distanceTraveled >= this.stepDistance) {
        this.distanceTraveled = 0;
        this.bobPhase = 0; // Reset phase for new step
      }

      // Sine wave for current step
      this.bobPhase += deltaTime * 10; // Adjust for step duration
      const bobOffset = Math.sin(this.bobPhase) * this.bobHeight;

      camera.position.y += bobOffset;
    }
  }
}
```

## Horror Game Specific: Fear/Breathing Camera

```typescript
// Additional camera effects for horror atmosphere
class HorrorCameraEffects {
  private breathingSpeed: number = 1.5; // Slow breathing
  private breathingAmount: number = 0.02; // Very subtle
  private fearLevel: number = 0; // 0-1, increases near threats
  private breathingTimer: number = 0;

  public update(deltaTime: number, camera: THREE.Camera, fearLevel: number): void {
    this.fearLevel = fearLevel;

    // Breathing effect (always present)
    this.breathingTimer += deltaTime * this.breathingSpeed;

    // Fear increases breathing rate and amount
    const fearMultiplier = 1 + this.fearLevel * 2;
    const breathingOffset = Math.sin(this.breathingTimer * fearMultiplier)
      * this.breathingAmount * (1 + this.fearLevel);

    camera.position.y += breathingOffset;

    // Add subtle camera shake when fear is high
    if (this.fearLevel > 0.5) {
      const shakeAmount = (this.fearLevel - 0.5) * 0.01;
      camera.position.x += (Math.random() - 0.5) * shakeAmount;
      camera.position.z += (Math.random() - 0.5) * shakeAmount;
    }
  }
}
```

## Relevance to Our Project

**Essential for Immersion**:
- Head bob makes first-person movement feel grounded
- Horror games benefit from subtle environmental feedback
- Breathing effects enhance atmospheric tension

**Direct Applications**:
- Basic head bob for walking movement
- Enhanced bob for sprinting (when stamina available)
- Breathing camera effect for ambient horror feel
- Fear-based camera effects near threats

**Integration Points**:
- Works with PointerLockControls
- Uses velocity from Rapier physics
- Integrates with stamina/sprint system
- Can be tied to horror game state (fear level)

**Recommended Implementation for Nightman Cometh**:
1. Start with basic sine wave head bob
2. Make it velocity-based (faster when sprinting)
3. Add breathing effect for ambient horror
4. Consider fear-based camera shake for jump scares

**Accessibility Considerations**:
- Should have toggle to disable (motion sickness)
- Default amounts should be conservative
- Some players need zero camera effects
