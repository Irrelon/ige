import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeFSM } from "@/engine/core/IgeFSM";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeCanInit } from "@/types/IgeCanInit";

export declare class Client extends IgeBaseClass implements IgeCanInit {
	classId: string;
	fsm: IgeFSM;
	gameTextures: Record<string, IgeTexture>;
	cursorTile?: IgePoint3d;
	constructor();
	init(): Promise<void>;
	start(): Promise<void>;
	defineFSM(): void;
	loadTextures(): void;
	/**
	 * Creates the UI entities that the user can interact with to
	 * perform certain tasks like placing and removing buildings.
	 */
	setupUi(): void;
	setupUi_BuildingsMenu(): void;
	setupEntities(): void;
	/**
	 * Place a building on the map.
	 * @param type
	 * @param tileX
	 * @param tileY
	 * @return {*}
	 */
	placeItem(type: string, tileX: number, tileY: number): any;
	/**
	 * Removes an item from the tile map and destroys the entity
	 * from memory.
	 * @param tileX
	 * @param tileY
	 */
	removeItem(tileX: number, tileY: number): void;
	/**
	 * Returns the item occupying the tile co-ordinates of the tile map.
	 * @param tileX
	 * @param tileY
	 */
	itemAt(tileX: number, tileY: number): any;
	/**
	 * Creates and returns a temporary item that can be used
	 * to indicate to the player where their item will be built.
	 * @param type
	 */
	createTemporaryItem(type: string): any;
	/**
	 * Handles when the mouse up event occurs on our map (tileMap1).
	 * @param x
	 * @param y
	 * @private
	 */
	_mapOnPointerUp(x: number, y: number): void;
	/**
	 * Handles when the mouse over event occurs on our map (tileMap1).
	 * @param event
	 * @param evc
	 * @private
	 */
	_mapOnPointerOver(event: any, evc: any): void;
}
