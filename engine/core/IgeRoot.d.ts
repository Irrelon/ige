import { IgeEntity } from "./IgeEntity";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { IgeObject } from "./IgeObject";
/**
 * The engine's root entity that all the scenegraph lives from.
 */
export declare class IgeRoot extends IgeEntity {
    classId: string;
    _viewportDepth: boolean;
    _alwaysInView: boolean;
    basePath: string;
    constructor();
    /**
     * Returns the mouse position relative to the main front buffer. Mouse
     * position is set by the this.input component (IgeInputComponent)
     * @return {IgePoint3d}
     */
    mousePos(): import("./IgePoint3d").IgePoint3d;
    /**
     * Walks the scenegraph and returns an array of all entities that the mouse
     * is currently over, ordered by their draw order from drawn last (above other
     * entities) to first (underneath other entities).
     */
    mouseOverList: (obj?: IgeEntity | IgeRoot, entArr?: IgeEntity[]) => IgeEntity[];
    _childMounted(child: IgeObject): void;
    updateSceneGraph(ctx: IgeCanvasRenderingContext2d): void;
    renderSceneGraph(ctx: IgeCanvasRenderingContext2d): void;
    destroy(): this;
}
