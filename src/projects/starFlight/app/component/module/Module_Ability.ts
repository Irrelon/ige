import { Module_Generic } from "./Module_Generic";
import { isServer } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "@/engine/instance";
import { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import { EntityAbilityModuleDefinition } from "../../../types/EntityAbilityModuleDefinition";
import { EntityModuleStates } from "../../../types/EntityModuleDefinition";
import { GameEntity } from "../GameEntity";

export class Module_Ability extends Module_Generic {
	classId = "Module_Ability";
	_definition: EntityAbilityModuleDefinition;
	_cooldown: boolean = false;
	_cooldownStartTime: number = 0;
	_action?: string;
	_target: GameEntity | null = null;

	constructor(definition: EntityAbilityModuleDefinition) {
		super(definition);

		this._definition = definition;
		this._action = definition.action;
		this._cooldown = false;
	}

	action(val: string): this;
	action(): string;
	action(val?: string) {
		if (val !== undefined) {
			this._action = val;
			return this;
		}

		return this._action;
	}

	active(val: boolean, states?: EntityModuleStates): this;
	active(): boolean;
	active(val?: boolean, states?: EntityModuleStates) {
		if (val !== undefined && states !== undefined) {
			if (val && !this._active) {
				this._activeStartTime = ige.engine.currentTime();
				this._onActive(states);
			} else if (!val && this._active) {
				this._onInactive(states);
			}

			this._active = val;
			return this;
		}

		return this._active;
	}

	/**
	 * Determines if the active flag can transition from false
	 * to true. This is useful for checking pre-flight conditions
	 * for allowing an ability to activate etc.
	 * @param {Object} states The current states that we read values
	 * from to determine if the module can activate.
	 * @returns {boolean} If true, allows the active flag to become
	 * true. If false, denies it.
	 */
	canBeActive(states: EntityModuleStates): boolean {
		return !this.cooldown() && (states.energy.val || 0) + this._definition.usageCost.energy > 0;
	}

	/**
	 * Determines if the active flag can transition from true
	 * to false. This is useful for checking post-flight conditions
	 * for allowing an ability to deactivate etc.
	 * @returns {boolean} If true, allows the active flag to become
	 * false. If false, denies it.
	 */
	canBeInactive(states: EntityModuleStates): boolean {
		return !this.cooldown() && (states.energy.val || 0) + this._definition.usageCost.energy > 0;
	}

	/**
	 * Called when an ability's active flag has been set to true
	 * when it was previously set to false.
	 * @private
	 */
	_onActive(states: EntityModuleStates) {
		// Abilities simply debit the usage of usageCosts they need
		// up front and then apply their output over time based
		// on their activeDuration setting.
		const usageCosts = this._definition.usageCost;

		// Debit usage costs from input in definition
		for (const stateName in usageCosts) {
			if (usageCosts.hasOwnProperty(stateName) && states.hasOwnProperty(stateName)) {
				states[stateName].val = (states[stateName].val || 0) + usageCosts[stateName];
			}
		}

		// Activate effects
		this.processEffects("onActive");
		this.processAudio("onActive");
	}

	/**
	 * Called when an ability's active flag has been set to false
	 * when it was previously set to true.
	 * @private
	 */
	_onInactive(states: EntityModuleStates) {
		// Deactivate effects
		this.processEffects("onInactive");
		this.processAudio("onInactive");

		// Enable cooldown timer
		this.cooldown(true);
	}

	complete() {
		this.processEffects("onComplete");
		this.processAudio("onComplete");

		super.complete();
	}

	/**
	 * Gets / sets the cooldown flag for this ability. When called
	 * without a value to set (in getter mode) the method will check
	 * remaining cooldown period to see if cooldown has been deactivated
	 * or not before giving its answer.
	 * @param {Boolean=} val The boolean value to set.
	 * @returns {*}
	 */
	cooldown(val: boolean): this;
	cooldown(): boolean;
	cooldown(val?: boolean) {
		if (val !== undefined) {
			if (val && !this._cooldown) {
				if (!this._definition.cooldownDuration) {
					// Do nothing, there is no cooldown duration so never
					// enable cooldown period
					return this;
				}

				this._cooldownStartTime = ige.engine.currentTime();
			}

			this._cooldown = val;
			return this;
		}

		// Check if we should be cancelling cooldown
		if (this._cooldown) {
			if (ige.engine.currentTime() - this._cooldownStartTime >= this._definition.cooldownDuration) {
				this._cooldown = false;
			}
		}

		return this._cooldown;
	}

	/**
	 * Takes the states in the module's definition for input and output
	 * and based on the tickDelta, calculates the amount of input and
	 * amount of output the module should provide for this tick.
	 * @param {Object} states The current states and their values.
	 * @param {Number} tickDelta The tick delta for this tick.
	 */
	resolve(states: EntityModuleStates, tickDelta: number) {
		if (this.active()) {
			// Check if the module has a max range to target
			if (this._definition.requiresTarget && this._definition.range && this._target) {
				const attachedTo = this._attachedTo;
				if (!attachedTo) return;

				// Module has a max range, check if we are inside that range
				if (Math.abs(attachedTo.distanceTo(this._target)) > this._definition.range) {
					// Deactivate the module
					this.active(false);

					if (isServer) {
						// Send network message to client telling them their ability went out of range
						(ige.network as IgeNetIoServerController).send(
							"ability_" + this._definition._id + ".active",
							false,
							attachedTo.clientId()
						);
					}
				}
			}

			if (this._definition.activeDuration) {
				if (ige.engine.currentTime() - this._activeStartTime >= this._definition.activeDuration) {
					this.active(false);

					// Adjust tick delta to exactly match what is left of the allowed active duration
					tickDelta =
						tickDelta -
						(ige.engine.currentTime() - this._activeStartTime - this._definition.activeDuration);

					this.complete();
				}
			}
		}

		super.resolve(states, tickDelta);
	}
}

registerClass(Module_Ability);
