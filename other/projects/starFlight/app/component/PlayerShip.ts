import type { EntityPublicGameData } from "./GameEntity";
import { Inventory } from "./Inventory";
import { Ship } from "./Ship";
import { Target } from "./Target";
import type { InfoWindow } from "./ui/InfoWindow";
import { isClient, isServer } from "@/engine/clientServer";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "@/engine/exports";
import type { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import type { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import type { IgeUiProgressBar } from "@/engine/ui/IgeUiProgressBar";
import { degreesToRadians } from "@/engine/utils";
import { b2Vec2 } from "@/engine/components/physics/box2d/lib/common/b2_math";
import { PlayerControls } from "../../enums/PlayerControls";
import { IgeInputDevice, IgeInputKeyboardMap } from "@/enums/IgeInputDeviceMap";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export class PlayerShip extends Ship {
	classId = "PlayerShip";
	target?: Target;

	_clientId?: string;
	_controls: number[];
	_controlState: Record<string, boolean>;
	_inventory: Inventory;
	_thrustPower: number;
	_reversePower: number;

	constructor (publicGameData: EntityPublicGameData) {
		super(publicGameData);

		this.drawBounds(false);
		this.clientId(publicGameData.clientId);

		this._controls = [];
		this._controlState = {
			[PlayerControls.left]: false,
			[PlayerControls.right]: false,
			[PlayerControls.thrust]: false,
			[PlayerControls.reverse]: false,
			[PlayerControls.braking]: false
		};

		this._inventory = new Inventory();
		this._thrustPower = 1.5;
		this._reversePower = 1.5;

		if (isClient) {
			// Define our client-side player keyboard controls
			this.addControl(PlayerControls.left, [
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowLeft],
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.KeyA]
			]);
			this.addControl(PlayerControls.right, [
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowRight],
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.KeyD]
			]);
			this.addControl(PlayerControls.thrust, [
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowUp],
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.KeyW]
			]);
			this.addControl(PlayerControls.reverse, [
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowDown],
				[IgeInputDevice.keyboard, IgeInputKeyboardMap.KeyS]
			]);
			this.addControl(PlayerControls.braking, [[IgeInputDevice.keyboard, IgeInputKeyboardMap.KeyS]]);

			this.target = new Target();
		}

		this._setup();
	}

	clientId (clientId?: string) {
		if (clientId !== undefined) {
			this._clientId = clientId;
			return this;
		}

		return this._clientId;
	}

	addControl (controlCode: number, codes: [IgeInputDevice, number][]) {
		ige.input.mapAction(controlCode, codes);
		this._controls.push(controlCode);
	}

	selectTarget (targetEntity: IgeEntity | null) {
		if (!this.target) return;

		if (targetEntity === null) {
			this.target._targetEntity = undefined;
			return;
		}

		this.target._targetEntity = targetEntity;
		this.target.translateTo(targetEntity._translate.x, targetEntity._translate.y, 0);
	}

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 * @param tickDelta
	 */
	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (isServer) {
			this._updatePhysics();
		}

		if (isClient) {
			// Loop the controls and check for a state change
			this._updateInputs();

			// Update target display
			this._updateTarget();
		}

		// Call the IgeEntity (super-class) tick() method
		super.update(ctx, tickDelta);

		if (isClient && ige.app.playerEntity === this) {
			// Update UI elements
			(ige.$("stateBar_fuel") as IgeUiProgressBar)
				.min(this._publicGameData.state.fuel.min)
				.max(this._publicGameData.state.fuel.max)
				.progress(this._publicGameData.state.fuel.val);

			(ige.$("stateBar_energy") as IgeUiProgressBar)
				.min(this._publicGameData.state.energy.min)
				.max(this._publicGameData.state.energy.max)
				.progress(this._publicGameData.state.energy.val);

			(ige.$("stateBar_shield") as IgeUiProgressBar)
				.min(this._publicGameData.state.shield.min)
				.max(this._publicGameData.state.shield.max)
				.progress(this._publicGameData.state.shield.val);

			(ige.$("stateBar_integrity") as IgeUiProgressBar)
				.min(this._publicGameData.state.integrity.min)
				.max(this._publicGameData.state.integrity.max)
				.progress(this._publicGameData.state.integrity.val);

			(ige.$("stateBar_inventorySpace") as IgeUiProgressBar)
				.min(0)
				.max(this._publicGameData.state.inventorySpace.val)
				.progress(this._publicGameData.state.inventoryCount.val);
		}
	}

	_updatePhysics () {
		if (isClient) return;
		if (!this._box2dBody) {
			throw new Error("Physics body for PlayerShip does not exist!");
		}

		let thrusting = false;

		if (this._controlState[PlayerControls.left] && this._controlState[PlayerControls.right]) {
			this._box2dBody.SetAngularVelocity(0);
		} else {
			if (this._controlState[PlayerControls.left]) {
				this._box2dBody.SetAngularVelocity(-2.5);
				this._box2dBody.SetAwake(true);
			}

			if (this._controlState[PlayerControls.right]) {
				this._box2dBody.SetAngularVelocity(2.5);
				this._box2dBody.SetAwake(true);
			}
		}

		if (!this._controlState[PlayerControls.left] && !this._controlState[PlayerControls.right]) {
			this._box2dBody.SetAngularVelocity(0);
		}

		if (this._controlState[PlayerControls.thrust]) {
			const radians = this._rotate.z + degreesToRadians(-90);
			const thrustVector = new b2Vec2(
				Math.cos(radians) * this._thrustPower,
				Math.sin(radians) * this._thrustPower
			);

			this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
			this._box2dBody.SetAwake(true);

			thrusting = true;
		}

		if (this._controlState[PlayerControls.reverse]) {
			const radians = this._rotate.z + degreesToRadians(-270);
			const thrustVector = new b2Vec2(
				Math.cos(radians) * this._reversePower,
				Math.sin(radians) * this._reversePower
			);

			this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
			this._box2dBody.SetAwake(true);

			thrusting = true;
		}

		this.streamProperty("thrusting", thrusting);

		if (this._controlState[PlayerControls.braking]) {
			// Apply damping force until stopped
			this._box2dBody.SetLinearDamping(this._publicGameData.state.linearDamping.max);
		} else {
			this._box2dBody.SetLinearDamping(this._publicGameData.state.linearDamping.min);
		}
	}

	_updateInputs () {
		const arr = this._controls;
		const arrCount = arr.length;

		for (let arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			const control = arr[arrIndex];

			if (ige.input.actionState(control)) {
				if (!this._controlState[control]) {
					// Record the new state
					this._controlState[control] = true;

					// Tell the server about our control change
					(ige.network as IgeNetIoClientController).send("playerShipControlChange", [control, true]);
				}
			} else {
				if (this._controlState[control]) {
					// Record the new state
					this._controlState[control] = false;

					// Tell the server about our control change
					(ige.network as IgeNetIoClientController).send("playerShipControlChange", [control, false]);
				}
			}
		}
	}

	_updateTarget () {
		const targetInfo = ige.$("targetInfo") as InfoWindow;

		if (!this.target || !this.target._targetEntity) {
			targetInfo.hide();
			return;
		}

		this.target._distance = this.distanceTo(this.target._targetEntity);

		// Update the on-screen target distance label
		(ige.$("targetDistance") as IgeUiLabel).value("Distance: " + this.target._distance.toFixed(2) + " km");

		targetInfo.show();
	}
}

registerClass(PlayerShip);
