import type { StarSystemDefinition } from "../../../types/StarSystemDefinition";

export const orhaan: StarSystemDefinition = {
	_id: "orhaan",
	name: "Orhaan",
	jumpGate: [
		{
			_id: "orhaanToValeria",
			name: "Valeria Jumpgate",
			classId: "JumpGate",
			visible: true,
			position: [1550, 9, 0],
			public: {
				texture: "jumpGate1"
			},
			destination: {
				_id: "valeria",
				name: "Valeria"
			}
		}
	]
};
