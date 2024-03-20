import { IgeDummyContext } from "@/engine/core/IgeDummyContext";

export class IgeDummyCanvas {
	dummy = true;
	width = 0;
	height = 0;

	getContext = (type: string) => {
		return new IgeDummyContext();
	};
}
