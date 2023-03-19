import { registerClass } from "@/engine/igeClassStore";
import { Square } from "./base/Square";

export class StorageBuilding extends Square {
	classId = "StorageBuilding";

	constructor () {
		super();

		this.depth(1);
	}

	streamCreateConstructorArgs () {
		return [];
	}
}

registerClass(StorageBuilding);
