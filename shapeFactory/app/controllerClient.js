var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../engine/instance.js";
import { IgeFSM } from "../../engine/core/IgeFSM.js";
import { BuildingType } from "../enums/BuildingType.js";
import { StorageBuilding } from "../entities/StorageBuilding.js";
import { IgeBehaviourType } from "../../enums/IgeBehaviourType.js";
export const controllerClient = () => __awaiter(void 0, void 0, void 0, function* () {
    const fsm = new IgeFSM();
    ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
        const tmpBuilding = ige.$("tmpBuilding");
        if (!tmpBuilding)
            return;
        const gridX = Math.round(ige._pointerPos.x / 100) * 100;
        const gridY = Math.round(ige._pointerPos.y / 100) * 100;
        tmpBuilding.translateTo(gridX, gridY, 0);
    });
    fsm.defineState("idle", {
        enter: () => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Entered idle");
            const uiCreateStorage = ige.$("uiCreateStorage");
            uiCreateStorage.pointerUp(() => {
                fsm.enterState("createBuilding", BuildingType.storage);
            });
        })
    });
    fsm.defineState("createBuilding", {
        enter: (buildingType) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Entered createBuilding", buildingType);
            // Get the scene to mount to
            const scene1 = ige.$("scene1");
            // Remove any existing temp building
            const existingTmpBuilding = ige.$("tempBuilding");
            if (existingTmpBuilding) {
                existingTmpBuilding.destroy();
            }
            // Set the temporary cursor-following building
            let tmpBuilding;
            switch (buildingType) {
                case BuildingType.storage:
                    tmpBuilding = new StorageBuilding()
                        .id("tmpBuilding")
                        .mount(scene1);
                    break;
            }
        })
    });
    fsm.defineState("createRoad");
    fsm.defineState("destroyObject");
    yield fsm.initialState("idle");
    return () => __awaiter(void 0, void 0, void 0, function* () {
    });
});
