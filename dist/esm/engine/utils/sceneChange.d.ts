/**
 * Counts changes that affect the rendered image (entity transforms,
 * visibility, animation poses, particles, decals, texture loads, canvas
 * size). IgeEngine.renderOnDemand() draws a frame only when the count has
 * moved (or the view changed) since the last frame. Kept in its own module
 * so any engine class can report a change without importing the engine.
 */
export declare const igeSceneChange: {
    count: number;
};
/** Report that something visible changed and a new frame is needed. */
export declare function markSceneChanged(): void;
