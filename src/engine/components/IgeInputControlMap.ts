import { ige } from "@/engine/instance";
import { IgeInputDevice } from "@/enums/IgeInputDeviceMap";

export class IgeInputControlMap {
	_inputMap: [IgeInputDevice, number][] = [];

	push(inputMap: [IgeInputDevice, number]) {
		this._inputMap.push(inputMap);
	}

	state() {
		if (this._inputMap.length === 1) {
			return Boolean(ige.input._state[this._inputMap[0][0]][this._inputMap[0][1]]);
		}

		for (let i = 0; i < this._inputMap.length; i++) {
			if (ige.input._state[this._inputMap[i][0]][this._inputMap[i][1]]) {
				return true;
			}
		}
	}

	val() {
		if (this._inputMap.length === 1) {
			return ige.input._state[this._inputMap[0][0]][this._inputMap[0][1]];
		}

		for (let i = 0; i < this._inputMap.length; i++) {
			if (ige.input._state[this._inputMap[i][0]][this._inputMap[i][1]]) {
				return ige.input._state[this._inputMap[i][0]][this._inputMap[i][1]];
			}
		}
	}
}
