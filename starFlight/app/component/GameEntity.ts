var appCore = require('../../../ige'),
	acceptedAction;

acceptedAction = require('../data/acceptedAction.json');
require('./module/Module_Generic');
require('./module/Module_Ability');
require('./module/Module_MiningLaser');
require('./ui/AbilityButton');

appCore.module('GameEntity', function ($ige, $textures, $game, IgeEntityBox2d, AbilityButton) {
	var GameEntity = IgeEntityBox2d.extend({
		classId: 'GameEntity',
		
		init: function (publicGameData) {
			var thisAcceptedActionsArr,
				module,
				i;
			
			publicGameData = publicGameData || {};
			IgeEntityBox2d.prototype.init.call(this);
			
			publicGameData.state = publicGameData.state || {};
			publicGameData.module = publicGameData.module || {};
			publicGameData.ability = publicGameData.ability || {};
			publicGameData.acceptsActionObj = publicGameData.acceptsActionObj || {};
			
			this._publicGameData = publicGameData;
			this._privateGameData = {
				module: {}
			};
			
			// Define the data sections that will be included in the stream
			this.streamSections(['transform', 'props']);
			
			if ($ige.isServer) {
				// Define the actions that are accepted by this instance
				thisAcceptedActionsArr = acceptedAction[this.classId()];
				
				if (thisAcceptedActionsArr && thisAcceptedActionsArr.length) {
					for (i = 0; i < thisAcceptedActionsArr.length; i++) {
						this.acceptsAction(thisAcceptedActionsArr[i], true);
					}
				}
				
				this._tickTime = 0;
			}
			
			// Apply the basic ship modules
			if (publicGameData && publicGameData.module) {
				for (i in publicGameData.module) {
					if (publicGameData.module.hasOwnProperty(i)) {
						module = publicGameData.module[i];
						
						if (module && !module._id) {
							this.log('Attempted to add module to game entity but module has no _id field!', 'error', module);
						}
						
						this.module(i, module);
						
						if ($ige.isServer || ($ige.isClient && publicGameData.clientId === $ige.engine.network._id)) {
							// Check if this module has an ability id
							if (module.abilityId !== undefined) {
								this.ability(module.abilityId, module._id);
							}
						}
					}
				}
			}
		},
		
		streamCreateData: function () {
			return this._publicGameData;
		},
		
		/**
		 * Override the default IgeEntity class streamSectionData() method
		 * so that we can check for custom sections and handle how we deal
		 * with them.
		 * @param {String} sectionId A string identifying the section to
		 * handle data get / set for.
		 * @param {*=} data If present, this is the data that has been sent
		 * from the server to the client for this entity.
		 * @return {*}
		 */
		streamSectionData: function (sectionId, data) {
			var stateName;
			
			if (!sectionId) {
				debugger;
			}
			
			// Check if the section is one that we are handling
			if (sectionId.indexOf('state:') === 0) {
				stateName = sectionId.substr(6, sectionId.length - 6);
				
				if (data) {
					// This is a setter
					this._publicGameData.state[stateName].val = parseFloat(data);
				} else {
					// This is a getter
					return this._publicGameData.state[stateName].val;
				}
			} else {
				// The section was not one that we handle here, so pass this
				// to the super-class streamSectionData() method - it handles
				// the "transform" section by itself
				return IgeEntityBox2d.prototype.streamSectionData.call(this, sectionId, data);
			}
		},
		
		/**
		 * Gets / sets an ability id to module id mapping.
		 * @param abilityId
		 * @param moduleId
		 * @returns {*}
		 */
		ability: function (abilityId, moduleId) {
			var self = this,
				module,
				abilityButton;
			
			if (abilityId !== undefined) {
				if (moduleId !== undefined) {
					this._publicGameData.ability[abilityId] = moduleId;
					
					if ($ige.isClient) {
						module = self.module(moduleId);
						
						abilityButton = $game.scene['action' + abilityId] = new AbilityButton({
								abilityId: abilityId,
								label: abilityId + '\n' + module.abilityTitle,
								module: module
							})
							.top(10)
							.left(10)
							.mount($game.scene.uiScene);
						
						$ige.engine.network.on('ability_' + abilityId + '.active', function (data) {
							abilityButton.active(data);
						});
					}
					
					return this;
				}
				
				return this._publicGameData.ability[abilityId];
			}
			
			return this._publicGameData.ability;
		},
		
		/* CEXCLUDE */
		/**
		 * Gets / sets the module by slot number.
		 * @param {Number} moduleId The slot number to get / set component for.
		 * @param {Object=} moduleDefinition The component object to set to the slot.
		 * Set to null to remove the existing component.
		 * @returns {*}
		 */
		module: function (moduleId, moduleDefinition) {
			var self = this,
				stateId,
				modulesObj,
				state;
			
			modulesObj = this._publicGameData.module;
			
			if (moduleId !== undefined) {
				if (moduleDefinition !== undefined) {
					if (moduleDefinition !== null) {
						self.log('Adding module to game entity: ' + moduleDefinition.name);
						
						appCore.require(moduleDefinition.classId, function (err, moduleClass) {
							modulesObj[moduleId] = moduleDefinition;
							
							if ($ige.isServer) {
								self._privateGameData.module[moduleId] = new moduleClass(moduleDefinition)
									.attachedTo(self);
							}
							
							// Setup the state values from the module
							for (stateId in moduleDefinition.state) {
								if (moduleDefinition.state.hasOwnProperty(stateId)) {
									state = self._publicGameData.state[stateId] = self._publicGameData.state[stateId] || {};
									
									if (state.min === undefined || moduleDefinition.state[stateId].min < state.min) {
										state.min = moduleDefinition.state[stateId].min;
									}
									
									if (state.max === undefined || moduleDefinition.state[stateId].max > state.max) {
										state.max = moduleDefinition.state[stateId].max;
									}
									
									if (typeof moduleDefinition.state[stateId].initial === 'number' && state.val !== undefined) {
										// Add to existing state value
										state.val += moduleDefinition.state[stateId].initial;
									} else {
										// Set value as not number or existing value not defined
										state.val = moduleDefinition.state[stateId].initial;
									}
									
									self.log('Registering state ' + stateId + ' is now ' + state.val);
									
									if (self.streamSections().indexOf('state:' + stateId) === -1) {
										// Define the data sections that will be included in the stream
										self.streamSectionsPush('state:' + stateId);
									}
								}
							}
						});
					} else {
						delete modulesObj[moduleId];
					}
					
					return this;
				}
				
				return modulesObj[moduleId];
			}
			
			return modulesObj;
		},
		/* CEXCLUDE */
		
		/**
		 * Gets the private module data by slot number.
		 * @param {Number} moduleId The slot number to get / set component for.
		 * Set to null to remove the existing component.
		 * @returns {*}
		 */
		privateModule: function (moduleId) {
			if (moduleId !== undefined) {
				return this._privateGameData.module[moduleId];
			}
		},
		
		/**
		 * Checks if this entity can accept the given action or sets the
		 * accept value for an action.
		 * @param {String} action
		 * @param {Boolean=} val Optional, if supplied sets the action's
		 * accepted flag rather than getting it.
		 * @returns {Boolean|*}
		 */
		acceptsAction: function (action, val) {
			if (action !== undefined) {
				if (val !== undefined) {
					//this.log('Accepts action "' + action + '": ' + val);
					this._publicGameData.acceptsActionObj = this._publicGameData.acceptsActionObj || {};
					this._publicGameData.acceptsActionObj[action] = val;
					
					return this;
				}
				
				return this._publicGameData && this._publicGameData.acceptsActionObj && this._publicGameData.acceptsActionObj[action];
			}
			
			return this._publicGameData.acceptsActionObj;
		},
		
		update: function (ctx, tickDelta) {
			if ($ige.isServer) {
				this._resolveModules(tickDelta);
			}
			
			if ($ige.isClient) {
				// Update ability button UIs
				
			}
			
			// Call the super-class update() method
			IgeEntityBox2d.prototype.update.call(this, ctx);
		},
		
		/* CEXCLUDE */
		/**
		 * Updates the modules for this entity based on the tick delta.
		 * This does things like add to state values (e.g. energy + 1)
		 * and also drains state values (e.g. fuel -5) etc.
		 * @param {Number} tickDelta The number of milliseconds since
		 * the last tick.
		 * @private
		 */
		_resolveModules: function (tickDelta) {
			var modulesObj,
				moduleIndex,
				module;
			
			modulesObj = this._privateGameData.module;
			
			if (modulesObj) {
				for (moduleIndex in modulesObj) {
					if (modulesObj.hasOwnProperty(moduleIndex)) {
						module = modulesObj[moduleIndex];
						
						if (module.enabled() && module.active()) {
							module.resolve(this._publicGameData.state, tickDelta);
						}
					}
				}
			}
		},
		
		/**
		 * Called by the client requesting ability usage. Activates a ability if
		 * the ability is not already active or on cooldown.
		 * @param {Object} data Arbitrary data that the ability usage might need
		 * and is sent by the client.
		 * @param {Function} callback The callback to send the result to.
		 * @returns {*}
		 * @private
		 */
		_onAbilityUseRequest: function (data, callback) {
			var targetEntity,
				module;
			
			// Grab the component in the ship's module
			module = this.privateModule(this.ability(data.abilityId));
			
			if (!module) {
				//console.log('Player tried to activate empty ability: ' + data.abilityId);
				return callback('abilityEmpty');
			}
			
			if (module.active()) {
				// Module already active, ignore the request
				//console.log('Player tried to activate already activated ability: ' + data.abilityId);
				return callback("alreadyActive");
			}
			
			// Check if the action requires a target
			if (module._definition.requiresTarget) {
				// Check if we were sent a target and the target is valid
				if (!data.targetId) {
					// No target was provided
					//console.log('Player tried to activate ability that requires target: ' + data.abilityId);
					return callback('targetRequired');
				}
				
				targetEntity = $ige.engine.$(data.targetId);
				
				if (!targetEntity.acceptsAction(module.action())) {
					//console.log('Player tried to activate ability against invalid target: ' + data.abilityId);
					return callback('invalidTarget');
				}
				
				// Check distance to target
				if (module._definition.range && Math.abs(this.distanceTo(targetEntity)) > module._definition.range) {
					return callback('targetOutOfRange', Math.abs(this.distanceTo(targetEntity)));
				}
				
				// Set the target for the module
				//console.log('Accepted target for ability: ' + data.abilityId);
				module.target(targetEntity);
			}
			
			// Check if the ability can be activated
			if (!module.canBeActive(this._publicGameData.state)) {
				return callback("canBeActiveDenied");
			}
			
			// Activate the module
			//console.log('Activating ability: ' + data.abilityId);
			module.active(true, this._publicGameData.state);
			
			// Tell the client this ability use was accepted
			callback(false);
		},
		/* CEXCLUDE */
		
		/**
		 * Sends a request to the server to use an ability.
		 * @param {String} abilityId The ID of the ability to use.
		 * @param {String=} targetId Optional. The ID of the entity
		 * that is targeted by the ability (if any).
		 */
		useAbility: function (abilityId, targetId) {
			var self = this,
				module,
				target;
			
			if ($ige.isClient) {
				if (this.target && this.target._targetEntity) {
					// Ask the server to start mining this asteroid
					$ige.engine.network.send('useAbility', {
						targetId: this.target._targetEntity.id(),
						abilityId: abilityId
					}, function (err, data) {
						if (err) {
							// Display error to UI
							switch (err) {
								case 'noAbilityId':
									console.warn('useAbility ERROR CODE: noAbilityId');
									break;
								
								case 'noPlayer':
									console.warn('useAbility ERROR CODE: noPlayer');
									break;
								
								case 'abilityEmpty':
									console.warn('useAbility ERROR CODE: abilityEmpty');
									break;
								
								case 'invalidTarget':
									console.warn('useAbility ERROR CODE: invalidTarget');
									break;
									
								case 'targetOutOfRange':
									console.warn('useAbility ERROR CODE: targetOutOfRange: ' + data);
									break;
								
								case 'targetRequired':
									console.warn('useAbility ERROR CODE: targetRequired');
									break;
								
								case 'alreadyActive':
									console.warn('useAbility ERROR CODE: alreadyActive');
									// TODO: Flash the ability icon to let the user know it is already active
									break;
							}
							
							$ige.engine.audio.play('actionDenied');
							
							return;
						}
						
						// Access the AbilityButton instance for this ability
						// and tell it to become active
						$game.scene['action' + abilityId].active(true);
						$ige.engine.audio.play('actionAllowed');
					});
				}
			}
		}
	});
	
	return GameEntity;
});