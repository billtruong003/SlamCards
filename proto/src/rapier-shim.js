// Stands in for Rapier's own "rapier_wasm3d.js" (which imports the .wasm as an ES module,
// something browsers and Vite cannot do without plugins). world.js instantiates the wasm itself.
export * from '@dimforge/rapier3d/rapier_wasm3d_bg.js';
