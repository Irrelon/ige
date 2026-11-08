export interface IgeRay {
    origin: {
        x: number;
        y: number;
        z: number;
    };
    direction: {
        x: number;
        y: number;
        z: number;
    };
}
export interface IgeHeightfieldRayOptions {
    /** Lowest ground height anywhere in the heightfield. */
    minHeight: number;
    /** Highest ground height anywhere in the heightfield. */
    maxHeight: number;
    /**
     * Horizontal distance between samples in world units (default: 1/256
     * of the band crossing). Small enough not to jump over narrow peaks.
     */
    step?: number;
}
/**
 * Find where a ray first meets a heightfield. The ray is sampled through
 * the height band [minHeight, maxHeight], then the first crossing is
 * refined by bisection. Returns null if the ray misses the band or the
 * ground. Used by IgeWebGlRenderer.screenToHeightfield().
 * @param heightAt Ground height at a world X/Z position.
 */
export declare function intersectHeightfield(ray: IgeRay, heightAt: (x: number, z: number) => number, options: IgeHeightfieldRayOptions): {
    x: number;
    y: number;
    z: number;
} | null;
