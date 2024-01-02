import type { IgePoly2d } from "@/engine/core/IgePoly2d";
import { IgeBox2dFixtureShapeType } from "@/enums/IgeBox2dFixtureShapeType";

export interface IgeBox2dFixtureDefShapeCircle {
	type: IgeBox2dFixtureShapeType.circle;
	data?: {
		x?: number;
		y?: number;
		radius?: number;
	};
}

export interface IgeBox2dFixtureDefShapeRectangle {
	type: IgeBox2dFixtureShapeType.rectangle;
	data?: {
		x?: number;
		y?: number;
		width?: number;
		height?: number;
	};
}

export interface IgeBox2dFixtureDefShapeBox {
	type: IgeBox2dFixtureShapeType.box;
}

export interface IgeBox2dFixtureDefShapePolygon {
	type: IgeBox2dFixtureShapeType.polygon;
	data: IgePoly2d;
}

export type IgeBox2dFixtureDefShape =
	| IgeBox2dFixtureDefShapeBox
	| IgeBox2dFixtureDefShapeCircle
	| IgeBox2dFixtureDefShapePolygon
	| IgeBox2dFixtureDefShapeRectangle;
