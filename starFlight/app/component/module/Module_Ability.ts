var appCore = require('../../../../ige'),
	path = require('path');

appCore.module('Module_Ability', function ($ige, $textures, $game, Module_Generic) {
	var Module_Ability = Module_Generic.extend({
		classId: 'Module_Ability',
		
		init: function (definition) {
			var self = this;
			
			Module_Generic.prototype.init.call(this, definition);
			
			this._cooldown = false;
		},
		
		active: function (val, states) {
			if (val !== undefined) {
				if (val === true && this._active === false) {
					this._activeStartTime = $ige.engine.currentTime();
					this._onActive(states);
				} else if (val === false && this._active === true) {
					this._onInactive(states);
				}
				
				this._active = val;
				return this;
			}
			
			return this._active;
		},
		
		/**
		 * Determines if the active flag can transition from false
		 * to true. This is useful for checking pre-flight conditions
		 * for allowing an ability to activate etc.
		 * @param {Object} states The current states that we read values
		 * from to determine if the module can activate.
		 * @returns {boolean} If true, allows the active flag to become
		 * true. If false, denies it.
		 */
		canBeActive: function (states) {
			// Check if the module definition has a custom method
			if (this._definition.canBeActive) {
				return (require(path.resolve('./app/data', this._definition.canBeActive)))(this, states, $ige);
			}
			
			return true;
		},
		
		/**
		 * Determines if the active flag can transition from true
		 * to false. This is useful for checking post-flight conditions
		 * for allowing an ability to deactivate etc.
		 * @returns {boolean} If true, allows the active flag to become
		 * false. If false, denies it.
		 */
		canBeInactive: function (states) {
			// Check if the module definition has a custom method
			if (this._definition.canBeInactive) {
				return (require(path.resolve('./app/data', this._definition.canBeInactive)))(this, states, $ige);
			}
			
			return true;
		},
		
		/**
		 * Called when an ability's active flag has been set to true
		 * when it was previously set to false.
		 * @private
		 */
		_onActive: function (states) {
			// Abilities simply debit the usage of usageCosts they need
			// up front and then apply their output over time based
			// on their activeDuration setting.
			var usageCosts,
				stateName;
			
			usageCosts = this._definition.usageCost;
			
			// Debit usage costs from input in definition
			for (stateName in usageCosts) {
				if (usageCosts.hasOwnProperty(stateName) && states.hasOwnProperty(stateName)) {
					states[stateName].val += usageCosts[stateName];
				}
			}
			
			// Activate effects
			this.processEffects('onActive');
			this.processAudio('onActive');
		},
		
		/**
		 * Called when an ability's active flag has been set to false
		 * when it was previously set to true.
		 * @private
		 */
		_onInactive: function (states) {
			// Deactivate effects
			this.processEffects('onInactive');
			this.processAudio('onInactive');
			
			// Enable cooldown timer
			this.cooldown(true);
		},
		
		complete: function () {
			this.processEffects('onComplete');
			this.processAudio('onComplete');
			
			Module_Generic.prototype.complete.call(this);
		},
		
		/**
		 * Gets / sets the cooldown flag for this ability. When called
		 * without a value to set (in getter mode) the method will check
		 * remaining cooldown period to see if cooldown has been deactivated
		 * or not before giving its answer.
		 * @param {Boolean=} val The boolean value to set.
		 * @returns {*}
		 */
		cooldown: function (val) {
			if (val !== undefined) {
				if (val === true && this._cooldown === false) {
					if (!this._definition.cooldownDuration) {
						// Do nothing, there is no cooldown duration so never
						// enable cooldown period
						return this;
					}
					
					this._cooldownStartTime = $ige.engine.currentTime();
				}
				
				this._cooldown = val;
				return this;
			}
			
			// Check if we should be cancelling cooldown
			if (this._cooldown) {
				if ($ige.engine.currentTime() - this._cooldownStartTime >= this._definition.cooldownDuration) {
					this._cooldown = false;
				}
			}
			
			return this._cooldown;
		},
		
		/**
		 * Takes the states in the module's definition for input and output
		 * and based on the tickDelta, calculates the amount of input and
		 * amount of output the module should provide for this tick.
		 * @param {Object} states The current states and their values.
		 * @param {Number} tickDelta The tick delta for this tick.
		 */
		resolve: function (states, tickDelta) {
			if (this.active()) {
				// Check if the module has a max range to target
				if (this._definition.requiresTarget && this._definition.range) {
					// Module has a max range, check if we are inside that range
					if (Math.abs(this._attachedTo.distanceTo(this._target)) > this._definition.range) {
						// Deactivate the module
						this.active(false);
						
						if ($ige.isServer) {
							// Send network message to client telling them their ability when
							// out of range
							$ige.engine.network.send('ability_' + this._definition.abilityId + '.active', false, this._attachedTo.clientId())
						}
					}
				}
			}
			
			Module_Generic.prototype.resolve.call(this, states, tickDelta);
		}
	});
	
	return Module_Ability;
});