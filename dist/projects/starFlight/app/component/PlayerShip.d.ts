import type { EntityPublicGameData } from "./GameEntity.js"
import { Inventory } from "./Inventory.js"
import { Ship } from "./Ship.js"
import { Target } from "./Target.js"
import type { IgeEntity } from "../../../../engine/core/IgeEntity.js"
import { IgeInputDevice } from "../../../../enums/IgeInputDeviceMap.js"
import type { IgeCanvasRenderingContext2d } from "../../../../types/IgeCanvasRenderingContext2d.js"
export declare class PlayerShip extends Ship {
    classId: string;
    target?: Target;
    _clientId?: string;
    _controls: number[];
    _controlState: Record<string, boolean>;
    _inventory: Inventory;
    _thrustPower: number;
    _reversePower: number;
    constructor(publicGameData: EntityPublicGameData);
    clientId(clientId?: string): string | this | undefined;
    addControl(controlCode: number, codes: [IgeInputDevice, number][]): void;
    selectTarget(targetEntity: IgeEntity | null): void;
    /**
     * Called every frame by the engine when this entity is mounted to the
     * scenegraph.
     * @param ctx The canvas context to render to.
     * @param tickDelta
     */
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    _updatePhysics(): void;
    _updateInputs(): void;
    _updateTarget(): void;
}
