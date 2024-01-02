import { isServer } from "../../../../../engine/clientServer.js";
import { IgeUiEntity } from "../../../../../engine/core/IgeUiEntity.js";
import { ige } from "../../../../../engine/instance.js";
import { IgeUiButton } from "../../../../../engine/ui/IgeUiButton.js";
import { IgeUiLabel } from "../../../../../engine/ui/IgeUiLabel.js";

export class AbilityButton extends IgeUiEntity {
	classId = "AbilityButton";
	_abilityId;
	_button;
	_module;
	_label;
	_timerCircle;
	constructor(options) {
		if (isServer) {
			throw new Error("This module should never be instantiated server-side!");
		}
		super();
		if (ige.app.abilityCounter === undefined) {
			ige.app.abilityCounter = 0;
		}
		this._abilityId = options.abilityId;
		this._module = options.module;
		this._module.active = false;
		this._module.cooldown = false;
		// Define an ability button for this module
		this._button = new IgeUiButton()
			.id("abilityButton_" + options.abilityId)
			.width(50)
			.height(50);
		// this._button._windowGradient = (ige.engine._ctx as IgeCanvasRenderingContext2d).createLinearGradient(0, 0, this._button.width(), this._button.height());
		// this._button._windowGradient.addColorStop(0.0, "#04b7f9");
		// this._button._windowGradient.addColorStop(0.5, "#005066");
		// this._button._windowGradient.addColorStop(1.0, "#04b7f9");
		this._button
			.layer(0)
			.texture(ige.textures.get("infoWindow"))
			.cache(true)
			.left(0)
			.top(60 * ige.app.abilityCounter)
			.mount(this);
		this._label = new IgeUiLabel()
			.layer(1)
			.font("8px Verdana")
			.width(this._button.width())
			.height(this._button.height())
			.center(0)
			.middle(0)
			.textAlignX(1)
			.textAlignY(1)
			.textLineSpacing(12)
			.color("#7bdaf1")
			.value(options.label)
			.cache(true)
			.mount(this._button);
		this._timerCircle = new IgeUiEntity()
			.texture(ige.textures.get("timerCircle"))
			.width(this._button.width())
			.height(this._button.height())
			.center(0)
			.middle(0)
			.opacity(0.5)
			.mount(this._button);
		this._button.pointerUp(() => {
			this.requestActivation();
		});
		ige.input.on("keyUp", (ev, code) => {
			//console.log("Key up, code", code, `Digit${options.abilityId}`);
			if (code === `Digit${options.abilityId}`) {
				this.requestActivation();
			}
		});
		ige.app.abilityCounter++;
	}
	active(val) {
		if (val !== undefined) {
			if (val && !this._module.active) {
				// Make module active
				this._module._activeStartTime = ige.engine._currentTime;
			} else if (!val && this._module.active) {
				// Enable cooldown timer
				this.cooldown(true, ige.engine._currentTime);
			}
			this._module.active = val;
			return this;
		}
		return this._module.active;
	}
	/**
	 * Gets / sets the cooldown flag for this ability. When called
	 * without a value to set (in getter mode) the method will check
	 * remaining cooldown period to see if cooldown has been deactivated
	 * or not before giving its answer.
	 * @param {Boolean=} val The boolean value to set.
	 * @param startTime
	 * @returns {*}
	 */
	cooldown(val, startTime) {
		if (val !== undefined) {
			if (val && !this._module.cooldown) {
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
	}
	/**
	 * Sends a request to the server asking for this ability to
	 * be activated, via the useAbility() method on the player's
	 * entity instance.
	 */
	requestActivation() {
		if (this._disabled || this._module.active || this._module.cooldown) {
			return ige.audio.play("actionDenied");
		}
		ige.app.playerEntity.useAbility(this._abilityId);
	}
	update(ctx, tickDelta) {
		let activeTime, beenInCooldownFor, playerTargetData;
		super.update(ctx, tickDelta);
		if (this._module.active) {
			this._timerCircle._timerColor = "#ffffff";
			// Check if we have finished being active
			activeTime = ige.engine._currentTime - (this._module._activeStartTime || 0);
			this._timerCircle._timerValue = (1 / this._module.activeDuration) * activeTime;
			if (activeTime >= this._module.activeDuration) {
				this.active(false);
				beenInCooldownFor = activeTime - this._module.activeDuration;
				this.cooldown(true, ige.engine._currentTime - beenInCooldownFor);
			}
		} else if (this._module.cooldown) {
			// Check if we have finished cooldown
			activeTime = ige.engine._currentTime - (this._module._cooldownStartTime || 0);
			this._timerCircle._timerValue = (1 / this._module.cooldownDuration) * activeTime;
			this._timerCircle._timerColor = "#ff0000";
			if (activeTime >= this._module.cooldownDuration) {
				this.cooldown(false);
				this._timerCircle._timerValue = 0;
			}
		} else {
			// Ability is not active or on cooldown, check distance from
			// target to determine if it is in range of this ability
			playerTargetData = ige.app.playerEntity.target;
			if (
				this._module.range &&
				this._module.requiresTarget &&
				playerTargetData &&
				playerTargetData._targetEntity
			) {
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
}
