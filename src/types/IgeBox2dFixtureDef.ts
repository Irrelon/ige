import type { IgeBox2dFixtureDefShape } from "./IgeBox2dFixtureDefShape";

export interface IgeBox2dFixtureDef {
	isSensor?: boolean;
	density?: number;
	friction?: number;
	restitution?: number;
	filter?: {
		categoryBits: number;
		maskBits: number;
		categoryIndex?: number;
	};
	shape: IgeBox2dFixtureDefShape;
	igeId?: string;
}
