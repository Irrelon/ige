import { SpaceClientScene } from "./SpaceClientScene";
import { SpaceServerScene } from "./SpaceServerScene";
import { IgeCellSheet } from "@/engine/core/IgeCellSheet";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { ige } from "@/engine/instance";
import { nebulaFieldSmartTexture } from "../../assets/backgrounds/nebulaFieldSmartTexture";
import { starFieldSmartTexture } from "../../assets/backgrounds/starFieldSmartTexture";
import { laserSmartTexture } from "../../assets/sprites/laser1";
import { igeButton } from "../../assets/ui/igeButton";
import { radarSmartTexture } from "../../assets/ui/radarSmartTexture";
import { targetSmartTexture } from "../../assets/ui/targetSmartTexture";

ige.router.route("app/space", {
	client: async () => {
		const textures = [
			// UI
			new IgeTexture("title", "assets/ui/title.png"),
			new IgeTexture("button", igeButton),
			new IgeTexture("irrelon", "assets/ui/irrelon.png"),
			new IgeTexture("windowLocalScan", "assets/ui/windowLocalScan3.png"),
			new IgeTexture("windowStats", "assets/ui/windowStats2.png"),
			new IgeTexture("windowControls", "assets/ui/windowControls5.png"),
			new IgeTexture("windowTargetData", "assets/ui/windowTargetData.png"),

			// Game
			new IgeTexture("ship1", "assets/sprites/ship1.png"),
			new IgeTexture("asteroid1", "assets/sprites/asteroid1.png"),
			new IgeTexture("asteroid2", "assets/sprites/asteroid2.png"),
			new IgeTexture("asteroid3", "assets/sprites/asteroid3.png"),
			new IgeTexture("asteroid4", "assets/sprites/asteroid4.png"),
			new IgeTexture("asteroid5", "assets/sprites/asteroid5.png"),
			new IgeTexture("asteroid6", "assets/sprites/asteroid6.png"),
			new IgeTexture("asteroid7", "assets/sprites/asteroid7.png"),
			new IgeTexture("asteroid8", "assets/sprites/asteroid8.png"),
			new IgeTexture("spaceStation1", "assets/sprites/spaceStation1.png"),
			new IgeTexture("starfield", starFieldSmartTexture),
			new IgeTexture("neb1", "assets/backgrounds/neb1.png"),
			new IgeTexture("neb2", "assets/backgrounds/neb2.png"),
			new IgeTexture("neb3", "assets/backgrounds/neb3.png"),
			new IgeTexture("neb4", "assets/backgrounds/neb4.png"),
			new IgeTexture("nebula", nebulaFieldSmartTexture),
			new IgeTexture("radar", radarSmartTexture),
			new IgeTexture("target", targetSmartTexture),
			new IgeTexture("laser1", laserSmartTexture),
			new IgeCellSheet("explosions1", "assets/sprites/explosions.png", 8, 22),
			new IgeCellSheet("ore1", "assets/sprites/ore1.png", 8, 2),
			new IgeTexture("jumpGate1", "assets/sprites/jumpGate1.png"),
			new IgeTexture("jumpGate2", "assets/sprites/jumpGate2.png"),
			new IgeTexture("abilityButton", "assets/ui/abilityButton.png")
		];

		await ige.textures.whenLoaded();
		await ige.engine.addGraph(SpaceClientScene);

		return async () => {
			await ige.engine.removeGraph(SpaceClientScene);
			ige.textures.removeList(textures);
		};
	},
	server: async () => {
		ige.box2d.createWorld().start();
		await ige.engine.addGraph(SpaceServerScene);

		return async () => {
			await ige.engine.removeGraph(SpaceServerScene);
		};
	}
});
