import { ige } from "@/engine/instance";
import { Module_Ability } from "./Module_Ability";

export class Module_MiningLaser extends Module_Ability {
	classId = "Module_MiningLaser";

	/**
	 * Called when the module has been active for a set period of time
	 * and completes its task.
	 */
	complete () {
		const target = this._target;
		const inventorySpace = this.attachedTo()._publicGameData.state.inventorySpace;
		const inventoryCount = this.attachedTo()._inventory.count();

		// Remove the mining laser target entity
		delete this._target;

		// Get new ore type randomly
		oreType = target.removeRandomOreType();

		// Check if the player's hold has space for our mined ore
		if (inventorySpace && inventorySpace.val > 0 && inventorySpace.val - inventoryCount > 0) {
			// The ship has cargo space available, add the ore directly to inventory
			this.attachedTo()._inventory.post({
				"type": "ore",
				"meta": {
					"type": target.removeRandomOreType()
				}
			});

			ige.network.send("msg", { msg: "Mined " + oreType + ", in cargo hold" }, this.attachedTo().clientId());

			return;
		}

		// Generate ore from asteroid (which is stored in this._target)
		target.spawnMinedOre(oreType);
		ige.network.send("msg", { msg: "Mined " + oreType + ", no space in cargo hold" }, this.attachedTo().clientId());
	}
}