import { registerClass } from "../../engine/services/igeClassStore";
import { Square } from "./base/Square";

export class StorageBuilding extends Square {
	classId = "StorageBuilding";

	constructor () {
		super();
	}

	streamCreateData () {
		return [];
	}
}

registerClass(StorageBuilding);