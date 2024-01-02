import type { Rotator } from "./Rotator";
import type { IgeEntity } from "@/engine/core/IgeEntity";

export declare const createChildRotators: (parent: IgeEntity, distance?: number, speed?: number) => Rotator[];
