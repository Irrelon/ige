import { Circle } from "./base/Circle";
import { ResourceType } from "../enums/ResourceType";
import { Building } from "./base/Building";
import { ige } from "../../engine/instance";
import { registerClass } from "../../engine/services/igeClassStore";

export class Resource extends Circle {
	_type: ResourceType;
	_destinationId: string;
	_destination?: Building;

	constructor (type: ResourceType, destinationId: string) {
		super();

		const destination = ige.$(destinationId);

		this._type = type;
		this._destinationId = destinationId;
		this._destination = destination as Building;
	}

	streamCreateData () {
		return [this._type, this._destinationId];
	}


}

registerClass(Resource);