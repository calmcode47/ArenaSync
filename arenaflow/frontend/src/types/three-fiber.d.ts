/**
 * three-fiber.d.ts
 * Extends @react-three/fiber's ThreeElements to include all custom shader materials
 * defined in ArenaFlow's Three.js components.
 *
 * This file eliminates "Property X does not exist on type IntrinsicElements" errors
 * when using custom materials registered via extend({}).
 */

/// <reference types="vite/client" />
/// <reference types="google.maps" />

import { Object3DNode, MaterialNode } from "@react-three/fiber"

declare module "@react-three/fiber" {
  interface ThreeElements {
    heatmapShaderMaterial: MaterialNode<any, any>
  }
}

declare global {
  interface Window {
    google: typeof google;
  }
}
