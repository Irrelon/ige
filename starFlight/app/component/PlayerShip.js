import { ige } from "../../../engine/instance.js";
import { isClient, isServer } from "../../../engine/clientServer.js";
import { Target } from "./Target.js";
import { Ship } from "./Ship.js";
import { Inventory } from "./Inventory.js";
import { IgeInputDevice, IgeInputKeyboardMap } from "../../../enums/IgeInputDeviceMap.js";
import { degreesToRadians } from "../../../engine/utils.js";
import { PlayerControls } from "../../enums/PlayerControls.js";
import { registerClass } from "../../../engine/igeClassStore.js";
export class PlayerShip extends Ship {
    constructor(publicGameData) {
        super(publicGameData);
        this.classId = "PlayerShip";
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
            this.addControl(PlayerControls.braking, [
                [IgeInputDevice.keyboard, IgeInputKeyboardMap.KeyS]
            ]);
            this.target = new Target();
        }
        this._setup();
    }
    clientId(clientId) {
        if (clientId !== undefined) {
            this._clientId = clientId;
            return this;
        }
        return this._clientId;
    }
    addControl(controlCode, codes) {
        ige.input.mapAction(controlCode, codes);
        this._controls.push(controlCode);
    }
    selectTarget(targetEntity) {
        if (!this.target)
            return;
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
    update(ctx, tickDelta) {
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
            ige.$("stateBar_fuel")
                .min(this._publicGameData.state.fuel.min)
                .max(this._publicGameData.state.fuel.max)
                .progress(this._publicGameData.state.fuel.val);
            ige.$("stateBar_energy")
                .min(this._publicGameData.state.energy.min)
                .max(this._publicGameData.state.energy.max)
                .progress(this._publicGameData.state.energy.val);
            ige.$("stateBar_shield")
                .min(this._publicGameData.state.shield.min)
                .max(this._publicGameData.state.shield.max)
                .progress(this._publicGameData.state.shield.val);
            ige.$("stateBar_integrity")
                .min(this._publicGameData.state.integrity.min)
                .max(this._publicGameData.state.integrity.max)
                .progress(this._publicGameData.state.integrity.val);
            ige.$("stateBar_inventorySpace")
                .min(0)
                .max(this._publicGameData.state.inventorySpace.val)
                .progress(this._publicGameData.state.inventoryCount.val);
        }
    }
    _updatePhysics() {
        if (isClient)
            return;
        if (!this._box2dBody) {
            throw new Error("Physics body for PlayerShip does not exist!");
        }
        let thrusting = false;
        if (this._controlState[PlayerControls.left] && this._controlState[PlayerControls.right]) {
            this._box2dBody.SetAngularVelocity(0);
        }
        else {
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
            const thrustVector = new ige.box2d.b2Vec2(Math.cos(radians) * this._thrustPower, Math.sin(radians) * this._thrustPower);
            this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
            this._box2dBody.SetAwake(true);
            thrusting = true;
        }
        if (this._controlState[PlayerControls.reverse]) {
            const radians = this._rotate.z + degreesToRadians(-270);
            const thrustVector = new ige.box2d.b2Vec2(Math.cos(radians) * this._reversePower, Math.sin(radians) * this._reversePower);
            this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
            this._box2dBody.SetAwake(true);
            thrusting = true;
        }
        this.streamProperty("thrusting", thrusting);
        if (this._controlState[PlayerControls.braking]) {
            // Apply damping force until stopped
            this._box2dBody.SetLinearDamping(this._publicGameData.state.linearDamping.max);
        }
        else {
            this._box2dBody.SetLinearDamping(this._publicGameData.state.linearDamping.min);
        }
    }
    _updateInputs() {
        const arr = this._controls;
        const arrCount = arr.length;
        for (let arrIndex = 0; arrIndex < arrCount; arrIndex++) {
            const control = arr[arrIndex];
            if (ige.input.actionState(control)) {
                if (!this._controlState[control]) {
                    // Record the new state
                    this._controlState[control] = true;
                    // Tell the server about our control change
                    ige.network.send("playerShipControlChange", [control, true]);
                }
            }
            else {
                if (this._controlState[control]) {
                    // Record the new state
                    this._controlState[control] = false;
                    // Tell the server about our control change
                    ige.network.send("playerShipControlChange", [control, false]);
                }
            }
        }
    }
    _updateTarget() {
        const targetInfo = ige.$("targetInfo");
        if (!this.target || !this.target._targetEntity) {
            targetInfo.hide();
            return;
        }
        this.target._distance = this.distanceTo(this.target._targetEntity);
        // Update the on-screen target distance label
        ige.$("targetDistance").value("Distance: " + this.target._distance.toFixed(2) + " km");
        targetInfo.show();
    }
}
registerClass(PlayerShip);
