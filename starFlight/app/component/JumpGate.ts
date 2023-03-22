import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { JumpGateDefinition } from "../../types/JumpGateDefinition";

export class JumpGate extends IgeEntity {
	classId = "JumpGate";
	_publicGameData: Record<string, any>;

	constructor (publicGameData: JumpGateDefinition["public"]) {
		super();

		this._publicGameData = publicGameData;

		this.layer(0)
			.width(400)
			.height(380);

		if (isClient) {
			this.texture(ige.textures.get(publicGameData.texture));
		}
	}

	streamCreateData () {
		return this._publicGameData;
	}
}
