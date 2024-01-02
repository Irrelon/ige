import type { AreaInteriorFeature } from "./AreaInteriorFeature.js"
export interface AreaInteriorDefinition {
    _id: string;
    name: string;
    width: number;
    height: number;
    floorTiles: number[];
    wallTiles: number[];
    features: AreaInteriorFeature[];
}
