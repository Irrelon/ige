import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { IgeEntity } from "../../../core/IgeEntity";

export declare class IgeBox2dDebugPainter extends IgeEntity {
	classId: string;
	_entity: IgeEntity;
	_options?: Record<any, any>;
	constructor(entity: IgeEntity, options?: Record<any, any>);
	tick(ctx: IgeCanvasRenderingContext2d): void;
}
