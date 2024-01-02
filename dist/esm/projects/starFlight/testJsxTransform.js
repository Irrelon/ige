import { jsx as _jsx } from "ige-jsx/jsx-runtime";
import { IgeUiEntity } from "../../engine/core/IgeUiEntity.js";

export const Scene = () => {
	return _jsx(IgeUiEntity, {
		left: 10,
		bottom: 10,
		width: 200,
		height: 50,
		children: _jsx(IgeEntity, { texture: "fairy" })
	});
};
