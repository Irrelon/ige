var appCore = require('../../../../ige');

appCore.module('AbilityButton', function ($ige, $textures, $game, $time, IgeUiEntity, IgeEntity, IgeUiButton, IgeUiLabel) {
	var AbilityButton = IgeUiEntity.extend({
		classId: 'AbilityButton',
		
		init: function (options) {
			var self = this;
			
			if ($ige.isServer) {
				throw new Error('This module should never be instantiated server-side!');
			}
			
			IgeUiEntity.prototype.init.call(this);
			
			if ($game.abilityCounter === undefined) {
				$game.abilityCounter = 0;
			}
			
			this._abilityId = options.abilityId;
			this._module = options.module;
			this._module.active = false;
			this._module.cooldown = false;
			
			// Define an ability button for this module
			this._button = new IgeUiButton()
				.id('abilityButton_' + options.abilityId)
				.width(50)
				.height(50);
			
			this._button._windowGradient = $ige.engine._ctx.createLinearGradient(0, 0, this._button.width(), this._button.height());
			this._button._windowGradient.addColorStop(0.0, "#04b7f9");
			this._button._windowGradient.addColorStop(0.5, "#005066");
			this._button._windowGradient.addColorStop(1.0, "#04b7f9");
			
			this._button.layer(0)
				.texture($textures.get('infoWindow'))
				.cache(true)
				.left(0)
				.top(((60) * $game.abilityCounter))
				.mount(this);
			
			this._label = new IgeUiLabel()
				.layer(1)
				.font('8px Verdana')
				.width(this._button.width())
				.height(this._button.height())
				.center(0)
				.middle(0)
				.textAlignX(1)
				.textAlignY(1)
				.textLineSpacing(12)
				.color('#7bdaf1')
				.value(options.label)
				.cache(true)
				.mount(this._button);
			
			this._timerCircle = new IgeUiEntity()
				.texture($textures.get('timerCircle'))
				.width(this._button.width())
				.height(this._button.height())
				.center(0)
				.middle(0)
				.opacity(0.5)
				.mount(this._button);
			
			this._button._mouseUp = function () {
				self.requestActivation();
			};
			
			// Define ability keyboard shortcut
			$ige.engine.input.on('keyUp', function (ev, keyCode) {
				if (keyCode === $ige.engine.input.key[String(options.abilityId)]) {
					self.requestActivation();
				}
			});
			
			$game.abilityCounter++;
		},
		
		active: function (val) {
			if (val !== undefined) {
				if (val === true && this._module.active === false) {
					// Make module active
					this._module._activeStartTime = $time._currentTime;
				} else if (val === false && this._module.active === true) {
					// Enable cooldown timer
					this.cooldown(true, $time._currentTime);
				}
				
				this._module.active = val;
				return this;
			}
			
			return this._module.active;
		},
		
		/**
		 * Gets / sets the cooldown flag for this ability. When called
		 * without a value to set (in getter mode) the method will check
		 * remaining cooldown period to see if cooldown has been deactivated
		 * or not before giving its answer.
		 * @param {Boolean=} val The boolean value to set.
		 * @returns {*}
		 */
		cooldown: function (val, startTime) {
			if (val !== undefined) {
				if (val === true && this._module.cooldown === false) {
					if (!this._module.cooldownDuration) {
						// Do nothing, there is no cooldown duration so never
						// enable cooldown period
						return this;
					}
					
					this._module._cooldownStartTime = startTime;
				}
				
				this._module.cooldown = val;
				return this;
			}
			
			return this._module.cooldown;
		},
		
		/**
		 * Sends a request to the server asking for this ability to
		 * be activated, via the useAbility() method on the player's
		 * entity instance.
		 */
		requestActivation: function () {
			if (this._disabled || this._module.active || this._module.cooldown) {
				return $ige.engine.audio.play('actionDenied');
			}
			
			$game.playerEntity.useAbility(this._abilityId);
		},
		
		update: function (tickDelta) {
			var activeTime,
				beenInCooldownFor,
				playerTargetData;
			
			IgeUiEntity.prototype.update.call(this, tickDelta);
			
			if (this._module.active) {
				this._timerCircle._timerColor = '#ffffff';
				
				// Check if we have finished being active
				activeTime = $time._currentTime - this._module._activeStartTime;
				this._timerCircle._timerValue = (1 / this._module.activeDuration) * activeTime;
				
				if (activeTime >= this._module.activeDuration) {
					this.active(false);
					
					beenInCooldownFor = activeTime - this._module.activeDuration;
					this.cooldown(true, $time._currentTime - beenInCooldownFor);
				}
			} else if (this._module.cooldown) {
				// Check if we have finished cooldown
				activeTime = $time._currentTime - this._module._cooldownStartTime;
				this._timerCircle._timerValue = (1 / this._module.cooldownDuration) * activeTime;
				this._timerCircle._timerColor = '#ff0000';
				
				if (activeTime >= this._module.cooldownDuration) {
					this.cooldown(false);
					this._timerCircle._timerValue = 0;
				}
			} else {
				// Ability is not active or on cooldown, check distance from
				// target to determine if it is in range of this ability
				playerTargetData = $game.playerEntity.target;
				
				if (this._module.range && this._module.requiresTarget && playerTargetData && playerTargetData._targetEntity) {
					if (playerTargetData._distance > this._module.range) {
						// Disable this ability button
						this.disabled(true);
						this.opacity(0.5);
					} else {
						// Enable this ability button
						this.disabled(false);
						this.opacity(1);
					}
				}
			}
		}
	});
	
	return AbilityButton;
});