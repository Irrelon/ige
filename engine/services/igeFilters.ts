// See the ige/engine/filters folder for the individual filter source
import { IgeSmartFilter } from "../../types/IgeSmartFilter";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";

export type IgeFilterHelperFunction = (...args: any[]) => any;

class IgeFilters {
	filter: Record<string, IgeSmartFilter> = {};
	helper: Record<string, IgeFilterHelperFunction> = {};
	tmpCanvas?: HTMLCanvasElement;
	tmpCtx?: IgeCanvasRenderingContext2d;

	constructor () {
		if (typeof window === "undefined") {
			return;
		}

		this.tmpCanvas = document.createElement("canvas");
		this.tmpCtx = this.tmpCanvas.getContext("2d");
	}

	getFilter (name: string): IgeSmartFilter | undefined {
		return this.filter[name];
	}

	registerFilter (name: string, filter: IgeSmartFilter) {
		this.filter[name] = filter;
	}

	getHelper (name: string): IgeFilterHelperFunction | undefined {
		return this.helper[name];
	}

	registerHelper (name: string, filter: IgeFilterHelperFunction) {
		this.helper[name] = filter;
	}
}

export default new IgeFilters();
