import { IgeMatrix4 } from "../engine/core/IgeMatrix4.js"
import { IgePoint3d } from "../engine/core/IgePoint3d.js"
/**
 * Shared utilities for coordinate system visual tests.
 */
export interface TestResult {
    name: string;
    passed: boolean;
    expected: string;
    actual: string;
}
/**
 * Check if a pixel at (x, y) in the given pixel buffer matches the expected color.
 * @param pixels Raw pixel buffer from gl.readPixels (bottom-left origin) or getImageData
 * @param x Screen X (0 = left)
 * @param y Screen Y (0 = top, DOM convention)
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @param expectedR Expected red (0-255)
 * @param expectedG Expected green (0-255)
 * @param expectedB Expected blue (0-255)
 * @param tolerance Per-channel tolerance (default 40)
 * @param isWebGl If true, pixel buffer is in WebGL bottom-left origin format
 */
export declare function assertPixelColor(pixels: Uint8Array | Uint8ClampedArray, x: number, y: number, canvasWidth: number, canvasHeight: number, expectedR: number, expectedG: number, expectedB: number, tolerance?: number, isWebGl?: boolean): TestResult;
/**
 * Read all pixels from a WebGL context.
 */
export declare function readAllPixels(gl: WebGLRenderingContext, width: number, height: number): Uint8Array;
/**
 * Project a world-space point through view and projection matrices to screen coordinates.
 * Returns screen position with (0,0) at top-left (DOM convention).
 */
export declare function worldToScreen(worldPoint: IgePoint3d, viewMatrix: IgeMatrix4, projMatrix: IgeMatrix4, canvasWidth: number, canvasHeight: number): {
    x: number;
    y: number;
};
/**
 * Display test results in a DOM element and log to console.
 */
export declare function displayResults(results: TestResult[], containerId?: string): void;
