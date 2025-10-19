# Three.js r180 Migration Guide - PointerLockControls

**Source URL**: https://github.com/mrdoob/three.js/wiki/Migration-Guide
**Three.js Version**: r179 → r180
**Date**: 2024-2025

## Overview

This guide covers breaking changes and updates specific to PointerLockControls and related controls when migrating to Three.js r180.

## Breaking Changes in r180

### 1. Mandatory domElement Parameter

**All control classes now require the domElement parameter in their constructor.**

#### PointerLockControls

```typescript
// ❌ BEFORE (r179 and earlier)
const controls = new PointerLockControls(camera);

// ✅ AFTER (r180)
const controls = new PointerLockControls(camera, document.body);
```

**Affected Controls:**
- `PointerLockControls`
- `OrbitControls`
- `TrackballControls`
- `TransformControls`
- `FlyControls`
- `FirstPersonControls`

**Migration Steps:**

1. Find all control instantiations in your codebase:

```bash
# Search for controls without domElement
grep -r "new PointerLockControls(camera)" .
grep -r "new OrbitControls(camera)" .
```

2. Add the domElement parameter:

```typescript
// Common patterns
const controls = new PointerLockControls(camera, document.body);
const controls = new PointerLockControls(camera, renderer.domElement);
const controls = new PointerLockControls(camera, canvas);
```

### 2. Deprecated getObject() Method

The `getObject()` method is deprecated. Use the `object` property instead.

```typescript
// ❌ DEPRECATED (still works in r180 but will be removed)
const camera = controls.getObject();
camera.position.y += 10;

// ✅ RECOMMENDED
const camera = controls.object;
camera.position.y += 10;
```

**Migration Script:**

```typescript
// Find and replace in your codebase
// Before: controls.getObject()
// After: controls.object

// Example sed command (Unix/Linux/Mac)
sed -i 's/controls\.getObject()/controls.object/g' **/*.ts
```

### 3. Import Path Changes

The import path uses `three/addons/` not `three/examples/jsm/`.

```typescript
// ❌ OLD (may still work but deprecated)
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// ✅ NEW (r160+, required for r180)
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
```

**Migration Steps:**

```bash
# Find old import paths
grep -r "three/examples/jsm" .

# Replace with new paths (Unix/Linux/Mac)
find . -name "*.ts" -o -name "*.js" | xargs sed -i 's/three\/examples\/jsm/three\/addons/g'
```

## Code Migration Examples

### Example 1: Basic Controller Setup

**Before (r179):**

```typescript
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new PointerLockControls(camera);

scene.add(controls.getObject());

function animate() {
  if (controls.isLocked) {
    controls.getObject().position.y += 0.1;
  }
}
```

**After (r180):**

```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new PointerLockControls(camera, document.body); // domElement now required

scene.add(controls.object); // Use .object instead of .getObject()

function animate() {
  if (controls.isLocked) {
    controls.object.position.y += 0.1; // Use .object instead of .getObject()
  }
}
```

### Example 2: Custom Wrapper Class

**Before (r179):**

```typescript
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

class PlayerController {
  controls: PointerLockControls;

  constructor(camera: THREE.Camera) {
    this.controls = new PointerLockControls(camera);
  }

  update() {
    const camera = this.controls.getObject();
    // Update camera position
  }
}
```

**After (r180):**

```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class PlayerController {
  controls: PointerLockControls;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new PointerLockControls(camera, domElement); // Add domElement parameter
  }

  update() {
    const camera = this.controls.object; // Use .object property
    // Update camera position
  }
}

// Usage
const player = new PlayerController(camera, document.body);
```

### Example 3: React Component

**Before (r179):**

```typescript
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

function PlayerControls() {
  const { camera } = useThree();
  const controlsRef = useRef<PointerLockControls>();

  useEffect(() => {
    controlsRef.current = new PointerLockControls(camera);

    return () => {
      controlsRef.current?.dispose();
    };
  }, [camera]);

  return null;
}
```

**After (r180):**

```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

function PlayerControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<PointerLockControls>();

  useEffect(() => {
    // Use gl.domElement for canvas reference
    controlsRef.current = new PointerLockControls(camera, gl.domElement);

    return () => {
      controlsRef.current?.dispose();
    };
  }, [camera, gl.domElement]); // Add gl.domElement to dependencies

  return null;
}
```

### Example 4: Multiple Controls

**Before (r179):**

```typescript
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let activeControls: PointerLockControls | OrbitControls;

function switchToFirstPerson() {
  if (activeControls) activeControls.dispose();
  activeControls = new PointerLockControls(camera);
  activeControls.lock();
}

function switchToOrbit() {
  if (activeControls) activeControls.dispose();
  activeControls = new OrbitControls(camera, renderer.domElement);
}
```

**After (r180):**

```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let activeControls: PointerLockControls | OrbitControls;

function switchToFirstPerson() {
  if (activeControls) activeControls.dispose();
  // domElement now required for PointerLockControls
  activeControls = new PointerLockControls(camera, document.body);
  activeControls.lock();
}

function switchToOrbit() {
  if (activeControls) activeControls.dispose();
  // domElement was always required for OrbitControls, no change here
  activeControls = new OrbitControls(camera, renderer.domElement);
}
```

## TypeScript Migration

### Update Type Definitions

If you're using custom type definitions, update them:

**Before:**

```typescript
declare module 'three/examples/jsm/controls/PointerLockControls' {
  export class PointerLockControls {
    constructor(camera: THREE.Camera, domElement?: HTMLElement);
    getObject(): THREE.Camera;
  }
}
```

**After:**

```typescript
declare module 'three/addons/controls/PointerLockControls' {
  export class PointerLockControls {
    constructor(camera: THREE.Camera, domElement: HTMLElement); // Required
    object: THREE.Camera; // New property
    getObject(): THREE.Camera; // Deprecated
  }
}
```

### Update package.json

Ensure you're using the correct Three.js version:

```json
{
  "dependencies": {
    "three": "^0.180.0"
  },
  "devDependencies": {
    "@types/three": "^0.180.0"
  }
}
```

## Automated Migration Script

```typescript
/**
 * Automated migration script for r179 to r180
 * Run with: ts-node migrate-r180.ts
 */
import fs from 'fs';
import path from 'path';
import glob from 'glob';

function migrateFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 1. Update import paths
  if (content.includes('three/examples/jsm')) {
    content = content.replace(/three\/examples\/jsm/g, 'three/addons');
    modified = true;
    console.log(`✓ Updated import paths in ${filePath}`);
  }

  // 2. Replace getObject() with .object
  const getObjectRegex = /\.getObject\(\)/g;
  if (getObjectRegex.test(content)) {
    content = content.replace(getObjectRegex, '.object');
    modified = true;
    console.log(`✓ Replaced getObject() calls in ${filePath}`);
  }

  // 3. Check for controls without domElement (manual fix needed)
  const controlsWithoutDomElement = /new (PointerLockControls|OrbitControls|TrackballControls|TransformControls|FlyControls|FirstPersonControls)\s*\(\s*\w+\s*\)/g;
  if (controlsWithoutDomElement.test(content)) {
    console.warn(`⚠ WARNING: ${filePath} may have controls without domElement parameter - manual review needed`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

// Find all TypeScript and JavaScript files
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', { ignore: 'node_modules/**' });

console.log(`Found ${files.length} files to check`);

files.forEach(migrateFile);

console.log('\nMigration complete! Please review the warnings and test your application.');
```

## Testing Checklist

After migration, test the following:

- [ ] Controls initialize without errors
- [ ] Pointer lock works on user interaction
- [ ] Camera movement responds to mouse input
- [ ] WASD movement works correctly
- [ ] Jump and gravity physics work
- [ ] Collision detection functions properly
- [ ] Lock/unlock events fire correctly
- [ ] Controls dispose without memory leaks
- [ ] No TypeScript errors
- [ ] No console warnings about deprecated methods

## Compatibility Notes

### Backwards Compatibility

- `getObject()` still works in r180 but is deprecated
- Old import paths may still work but should be updated
- Controls without domElement will throw an error

### Forward Compatibility

Code written for r180 will work in future versions:

```typescript
// This pattern is future-proof
const controls = new PointerLockControls(camera, document.body);
const camera = controls.object;
```

## Common Migration Errors

### Error 1: Missing domElement

```
TypeError: Cannot read property 'addEventListener' of undefined
```

**Fix:**

```typescript
// Add the domElement parameter
const controls = new PointerLockControls(camera, document.body);
```

### Error 2: Module not found

```
Module not found: Error: Can't resolve 'three/examples/jsm/controls/PointerLockControls'
```

**Fix:**

```typescript
// Update import path
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
```

### Error 3: TypeScript errors with getObject()

```
Property 'getObject' is deprecated. Use 'object' instead.
```

**Fix:**

```typescript
// Replace getObject() with .object
const camera = controls.object;
```

## Migration Timeline

| Version | Status | Notes |
|---------|--------|-------|
| r179 | Old API | getObject() works, domElement optional |
| r180 | **Current** | getObject() deprecated, domElement required |
| r181+ | Future | getObject() may be removed |

## Additional Resources

- [Official Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [r180 Release Notes](https://github.com/mrdoob/three.js/releases/tag/r180)
- [PointerLockControls Documentation](https://threejs.org/docs/#examples/en/controls/PointerLockControls)

## Summary

**Key Changes:**
1. **domElement is now mandatory** - Add `document.body` or `renderer.domElement` as second parameter
2. **Use `.object` instead of `.getObject()`** - Direct property access replaces method call
3. **Update import paths** - Use `three/addons/` instead of `three/examples/jsm/`

**Migration Priority:**
1. High: Add domElement parameter (app will break without this)
2. Medium: Update import paths (for future compatibility)
3. Low: Replace getObject() calls (still works but deprecated)
