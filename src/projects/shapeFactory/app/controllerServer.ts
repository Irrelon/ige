import type { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";
import { ige } from "@/engine/instance";
import type { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import { newIdHex } from "@/engine/utils";
import {
	createFactoryBuilding1,
	createFactoryBuilding2,
	createFlagBuilding,
	createHouseBuilding1,
	createMiningBuilding,
	createStorageBuilding
} from "../services/createBuilding";
import { BuildingType } from "../enums/BuildingType";
import { Road } from "../entities/Road";
import type { StorageBuilding } from "../entities/StorageBuilding";
import { Transporter } from "../entities/Transporter";
import type { IgeNetworkServerSideRequestHandler } from "@/types/IgeNetworkMessage";
import type { IgeEffectFunction } from "@/types/IgeRouteDefinition";

export const controllerServer: IgeEffectFunction = async () => {
	const tileMap1 = ige.$("tileMap1") as IgeTileMap2d;

	const createBuilding: IgeNetworkServerSideRequestHandler = async (data, clientId, requestCallback) => {
		const buildingType: BuildingType = data.buildingType;
		const x: number = data.x;
		const y: number = data.y;

		switch (buildingType) {
		case BuildingType.storage: {
			const building = createStorageBuilding(tileMap1, newIdHex(), x, y);
			return requestCallback(building.id());
		}

		case BuildingType.flag: {
			const building = createFlagBuilding(tileMap1, newIdHex(), x, y);
			return requestCallback(building.id());
		}

		case BuildingType.factory1: {
			const building = createFactoryBuilding1(tileMap1, newIdHex(), x, y);
			return requestCallback(building.id());
		}

		case BuildingType.factory2: {
			const building = createFactoryBuilding2(tileMap1, newIdHex(), x, y);
			return requestCallback(building.id());
		}

		case BuildingType.mine: {
			console.log("Create mine", data.resourceType);
			const building = createMiningBuilding(tileMap1, newIdHex(), x, y, data.resourceType);
			return requestCallback(building.id());
		}

		case BuildingType.house1: {
			console.log("Create house 1", data.resourceType);
			const building = createHouseBuilding1(tileMap1, newIdHex(), x, y, data.resourceType);
			return requestCallback(building.id());
		}
		}
	};

	const createRoad: IgeNetworkServerSideRequestHandler = async (data, clientId, requestCallback) => {
		const fromId: string = data.fromId;
		const toId: string = data.toId;

		const road = new Road(fromId, toId).mount(tileMap1);

		// Create the transporter
		const base = ige.$("base1") as StorageBuilding;
		new Transporter(base.id(), fromId, toId).translateTo(base._translate.x, base._translate.y, 0).mount(tileMap1);

		requestCallback(road.id());
	};

	const debug = () => {
		const resources = ige.$$("resource");
		debugger;
	};

	(ige.network as IgeNetIoServerController).define("createBuilding", createBuilding);
	(ige.network as IgeNetIoServerController).define("createRoad", createRoad);
	(ige.network as IgeNetIoServerController).define("debug", debug);

	return async () => {};
};
