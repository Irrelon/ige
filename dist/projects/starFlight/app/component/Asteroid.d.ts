import type { EntityPublicGameData } from "./GameEntity.js"
import { GameEntity } from "./GameEntity.js"
import { IgePoly2d } from "../../../../engine/core/IgePoly2d.js"
export declare class Asteroid extends GameEntity {
    classId: string;
    _oreCount: number;
    _ore: Record<string, number>;
    _oreTypeCount: number;
    _triangles: IgePoly2d[];
    constructor(publicGameData: EntityPublicGameData);
    streamCreateConstructorArgs(): EntityPublicGameData[];
    ore(): Record<string, number>;
    handleAcceptedAction(actionId: string, tickDelta: number): void;
    removeRandomOreType(): number;
    applyDamage(val: number): this;
    spawnMinedOre(oreType: number): void;
    _pointerUp(): boolean;
}
