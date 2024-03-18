import type { vec4 } from "gl-matrix";
export declare const hashToExtents: (hash: string) => vec4;
export declare const extentsToHash: ([x1, y1, x2, y2]: [number, number, number, number], level?: number) => string;
