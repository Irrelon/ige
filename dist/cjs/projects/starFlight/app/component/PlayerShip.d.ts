import { EntityPublicGameData } from "./GameEntity";
import { Inventory } from "./Inventory";
import { Ship } from "./Ship";
import { Target } from "./Target";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeInputDevice } from "@/enums/IgeInputDeviceMap";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

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
