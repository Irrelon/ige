import type { IgeConfig } from "@/types/IgeConfig";

export const igeConfig: IgeConfig = {
	debug: {
		_enabled: true,
		// Off by default: timing every entity's update and draw each frame costs a lot in big scenes
		// (ige.engine.debugTiming(true) to turn it on)
		_timing: false
	}
};
