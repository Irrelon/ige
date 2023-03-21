import { isServer } from "@/engine/clientServer";
import { IgeUiButton } from "@/engine/ui/IgeUiButton";
import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { ige } from "@/engine/instance";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { GameEntityAbilityModuleDefinition } from "../module/Module_Ability";

export interface AbilityButtonOptions {
	abilityId: string;
	module: GameEntityAbilityModuleDefinition;
}

export class AbilityButton extends IgeUiEntity {
	classId = "AbilityButton";
	_abilityId: string;
	_button: IgeUiButton;
	_module: GameEntityAbilityModuleDefinition;

	constructor (options: AbilityButtonOptions) {
		if (isServer) {
			throw new Error("This module should never be instantiated server-side!");
		}

		super();

		if (ige.game.abilityCounter === undefined) {
			ige.game.abilityCounter = 0;
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

		this._button._windowGradient = (ige.engine._ctx as IgeCanvasRenderingContext2d).createLinearGradient(0, 0, this._button.width(), this._button.height());
		this._button._windowGradient.addColorStop(0.0, "#04b7f9");
		this._button._windowGradient.addColorStop(0.5, "#005066");
		this._button._windowGradient.addColorStop(1.0, "#04b7f9");

		this._button.layer(0)
			.texture(ige.textures.get("infoWindow"))
			.cache(true)
			.left(0)
			.top(((60) * ige.game.abilityCounter))
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

		// Define ability keyboard shortcut
		ige.input.on("keyUp", (ev, keyCode) => {
			if (keyCode === ige.input.key[String(options.abilityId)]) {
				this.requestActivation();
			}
		});

		ige.game.abilityCounter++;
	}

	active (val) {
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
	}

	/**
	 * Gets / sets the cooldown flag for this ability. When called
	 * without a value to set (in getter mode) the method will check
	 * remaining cooldown period to see if cooldown has been deactivated
	 * or not before giving its answer.
	 * @param {Boolean=} val The boolean value to set.
	 * @returns {*}
	 */
	cooldown (val, startTime) {
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
	}

	/**
	 * Sends a request to the server asking for this ability to
	 * be activated, via the useAbility() method on the player's
	 * entity instance.
	 */
	requestActivation () {
		if (this._disabled || this._module.active || this._module.cooldown) {
			return $ige.engine.audio.play("actionDenied");
		}

		ige.game.playerEntity.useAbility(this._abilityId);
	}

	update (tickDelta) {
		let activeTime,
			beenInCooldownFor,
			playerTargetData;

		IgeUiEntity.prototype.update.call(this, tickDelta);

		if (this._module.active) {
			this._timerCircle._timerColor = "#ffffff";

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
			this._timerCircle._timerColor = "#ff0000";

			if (activeTime >= this._module.cooldownDuration) {
				this.cooldown(false);
				this._timerCircle._timerValue = 0;
			}
		} else {
			// Ability is not active or on cooldown, check distance from
			// target to determine if it is in range of this ability
			playerTargetData = ige.game.playerEntity.target;

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
}