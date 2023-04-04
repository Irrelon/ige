import { ige } from "@/engine/instance";
import { IgeEffectFunction } from "@/types/IgeRouteDefinition";
import { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import { BuildingType } from "../enums/BuildingType";
import { IgeNetworkServerSideRequestHandler } from "@/types/IgeNetworkMessage";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { createFactoryBuilding, createMiningBuilding, createStorageBuilding } from "../services/createBuilding";
import { newIdHex } from "@/engine/utils";
import { FlagBuilding } from "../entities/FlagBuilding";
import { Road } from "../entities/Road";
import { StorageBuilding } from "../entities/StorageBuilding";
import { Transporter } from "../entities/Transporter";

export const controllerServer: IgeEffectFunction = async () => {
	const scene1 = ige.$("scene1") as IgeScene2d;

	const createBuilding: IgeNetworkServerSideRequestHandler = async (data, clientId, requestCallback) => {
		const buildingType: BuildingType = data.buildingType;
		const x: number = data.x;
		const y: number = data.y;

		switch (buildingType) {
		case BuildingType.storage: {
			const building = createStorageBuilding(scene1, newIdHex(), x, y);
			return requestCallback(building.id());
		}

		case BuildingType.flag: {
			const building = new FlagBuilding().id(newIdHex()).translateTo(x, y, 0).mount(scene1);
			return requestCallback(building.id());
		}

		case BuildingType.factory: {
			const building = createFactoryBuilding(scene1, newIdHex(), x, y);
			return requestCallback(building.id());
		}

		case BuildingType.mine: {
			const building = createMiningBuilding(scene1, newIdHex(), x, y, data.resourceType);
			return requestCallback(building.id());
		}
		}
	};

	const createRoad: IgeNetworkServerSideRequestHandler = async (data, clientId, requestCallback) => {
		const fromId: string = data.fromId;
		const toId: string = data.toId;

		const road = new Road(fromId, toId).mount(scene1);

		// Create the transporter
		const base = ige.$("base1") as StorageBuilding;
		new Transporter(base.id(), fromId, toId)
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		requestCallback(road.id());
	};

	(ige.network as IgeNetIoServerController).define("createBuilding", createBuilding);
	(ige.network as IgeNetIoServerController).define("createRoad", createRoad);

	return async () => {

	}
}
