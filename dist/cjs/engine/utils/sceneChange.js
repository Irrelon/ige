"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeSceneChange = void 0;
exports.markSceneChanged = markSceneChanged;
/**
 * Counts changes that affect the rendered image (entity transforms,
 * visibility, animation poses, particles, decals, texture loads, canvas
 * size). IgeEngine.renderOnDemand() draws a frame only when the count has
 * moved (or the view changed) since the last frame. Kept in its own module
 * so any engine class can report a change without importing the engine.
 */
exports.igeSceneChange = { count: 0 };
/** Report that something visible changed and a new frame is needed. */
function markSceneChanged() {
    exports.igeSceneChange.count++;
}
