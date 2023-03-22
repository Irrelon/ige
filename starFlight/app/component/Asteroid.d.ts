import { IgePoly2d } from "@/engine/core/IgePoly2d";
import { GameEntity, GameEntityPublicGameData } from "./GameEntity";
export declare class Asteroid extends GameEntity {
    classId: string;
    _oreCount: number;
    _ore: Record<string, number>;
    _oreTypeCount: number;
    _triangles: IgePoly2d[];
    constructor(publicGameData?: GameEntityPublicGameData);
    streamCreateData(): GameEntityPublicGameData;
    ore(): Record<string, number>;
    handleAcceptedAction(actionId: string, tickDelta: number): void;
    removeRandomOreType(): string;
    applyDamage(val: number): this;
    spawnMinedOre(oreType: number): void;
    _mouseUp(): boolean;
}
