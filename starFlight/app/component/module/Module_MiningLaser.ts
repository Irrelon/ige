var appCore = require('../../../../ige');

appCore.module('Module_MiningLaser', function ($ige, $textures, $game, Module_Ability, IgePoly2d, Ore, calculateModifierRatio, roundNumber) {
	var Module_MiningLaser = Module_Ability.extend({
		classId: 'Module_MiningLaser',
		
		init: function (definition) {
			Module_Ability.prototype.init.call(this, definition);
		},
		
		/**
		 * Called when the module has been active for a set period of time
		 * and completes it's task.
		 */
		complete: function () {
			var target,
				inventorySpace,
				inventoryCount,
				oreType;
			
			target = this._target;
			inventorySpace = this.attachedTo()._publicGameData.state.inventorySpace;
			inventoryCount = this.attachedTo()._inventory.count();
			
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
				
				$ige.engine.network.send('msg', {msg: 'Mined ' + oreType + ', in cargo hold'}, this.attachedTo().clientId());
				
				return;
			}
			
			// Generate ore from asteroid (which is stored in this._target)
			target.spawnMinedOre(oreType);
			$ige.engine.network.send('msg', {msg: 'Mined ' + oreType + ', no space in cargo hold'}, this.attachedTo().clientId());
		}
	});
	
	return Module_MiningLaser;
});