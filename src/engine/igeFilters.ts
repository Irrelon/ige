// See the ige/engine/filters folder for the individual filter source
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeSmartFilter } from "@/types/IgeSmartFilter";

export type IgeFilterHelperFunction = (...args: any[]) => any;

export class IgeFilters {
	filter: Record<string, IgeSmartFilter> = {};
	helper: Record<string, IgeFilterHelperFunction> = {};
	tmpCanvas?: OffscreenCanvas;
	tmpCtx?: IgeCanvasRenderingContext2d | null;

	constructor() {
		if (typeof window === "undefined") {
			return;
		}

		this.tmpCanvas = new OffscreenCanvas(2, 2);
		this.tmpCtx = this.tmpCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
	}

	getFilter(name: string): IgeSmartFilter | undefined {
		return this.filter[name];
	}

	registerFilter(name: string, filter: IgeSmartFilter) {
		this.filter[name] = filter;
	}

	getHelper(name: string): IgeFilterHelperFunction | undefined {
		return this.helper[name];
	}

	registerHelper(name: string, filter: IgeFilterHelperFunction) {
		this.helper[name] = filter;
	}
}

export const igeFilters = new IgeFilters();
