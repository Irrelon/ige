"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerShip = void 0;
const instance_1 = require("@/engine/instance");
const clientServer_1 = require("@/engine/clientServer");
const Target_1 = require("./Target");
const Ship_1 = require("./Ship");
const Inventory_1 = require("./Inventory");
const IgeInputDeviceMap_1 = require("@/enums/IgeInputDeviceMap");
const utils_1 = require("@/engine/utils");
const PlayerControls_1 = require("../../enums/PlayerControls");
const igeClassStore_1 = require("@/engine/igeClassStore");
class PlayerShip extends Ship_1.Ship {
    constructor(publicGameData) {
        super(publicGameData);
        this.classId = "PlayerShip";
        this.drawBounds(false);
        this.clientId(publicGameData.clientId);
        this._controls = [];
        this._controlState = {
            [PlayerControls_1.PlayerControls.left]: false,
            [PlayerControls_1.PlayerControls.right]: false,
            [PlayerControls_1.PlayerControls.thrust]: false,
            [PlayerControls_1.PlayerControls.reverse]: false,
            [PlayerControls_1.PlayerControls.braking]: false
        };
        this._inventory = new Inventory_1.Inventory();
        this._thrustPower = 1.5;
        this._reversePower = 1.5;
        if (clientServer_1.isClient) {
            // Define our client-side player keyboard controls
            this.addControl(PlayerControls_1.PlayerControls.left, [
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowLeft],
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.KeyA]
            ]);
            this.addControl(PlayerControls_1.PlayerControls.right, [
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowRight],
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.KeyD]
            ]);
            this.addControl(PlayerControls_1.PlayerControls.thrust, [
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowUp],
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.KeyW]
            ]);
            this.addControl(PlayerControls_1.PlayerControls.reverse, [
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowDown],
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.KeyS]
            ]);
            this.addControl(PlayerControls_1.PlayerControls.braking, [
                [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.KeyS]
            ]);
            this.target = new Target_1.Target();
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
        instance_1.ige.input.mapAction(controlCode, codes);
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
        if (clientServer_1.isServer) {
            this._updatePhysics();
        }
        if (clientServer_1.isClient) {
            // Loop the controls and check for a state change
            this._updateInputs();
            // Update target display
            this._updateTarget();
        }
        // Call the IgeEntity (super-class) tick() method
        super.update(ctx, tickDelta);
        if (clientServer_1.isClient && instance_1.ige.app.playerEntity === this) {
            // Update UI elements
            instance_1.ige.$("stateBar_fuel")
                .min(this._publicGameData.state.fuel.min)
                .max(this._publicGameData.state.fuel.max)
                .progress(this._publicGameData.state.fuel.val);
            instance_1.ige.$("stateBar_energy")
                .min(this._publicGameData.state.energy.min)
                .max(this._publicGameData.state.energy.max)
                .progress(this._publicGameData.state.energy.val);
            instance_1.ige.$("stateBar_shield")
                .min(this._publicGameData.state.shield.min)
                .max(this._publicGameData.state.shield.max)
                .progress(this._publicGameData.state.shield.val);
            instance_1.ige.$("stateBar_integrity")
                .min(this._publicGameData.state.integrity.min)
                .max(this._publicGameData.state.integrity.max)
                .progress(this._publicGameData.state.integrity.val);
            instance_1.ige.$("stateBar_inventorySpace")
                .min(0)
                .max(this._publicGameData.state.inventorySpace.val)
                .progress(this._publicGameData.state.inventoryCount.val);
        }
    }
    _updatePhysics() {
        if (clientServer_1.isClient)
            return;
        if (!this._box2dBody) {
            throw new Error("Physics body for PlayerShip does not exist!");
        }
        let thrusting = false;
        if (this._controlState[PlayerControls_1.PlayerControls.left] && this._controlState[PlayerControls_1.PlayerControls.right]) {
            this._box2dBody.SetAngularVelocity(0);
        }
        else {
            if (this._controlState[PlayerControls_1.PlayerControls.left]) {
                this._box2dBody.SetAngularVelocity(-2.5);
                this._box2dBody.SetAwake(true);
            }
            if (this._controlState[PlayerControls_1.PlayerControls.right]) {
                this._box2dBody.SetAngularVelocity(2.5);
                this._box2dBody.SetAwake(true);
            }
        }
        if (!this._controlState[PlayerControls_1.PlayerControls.left] && !this._controlState[PlayerControls_1.PlayerControls.right]) {
            this._box2dBody.SetAngularVelocity(0);
        }
        if (this._controlState[PlayerControls_1.PlayerControls.thrust]) {
            const radians = this._rotate.z + (0, utils_1.degreesToRadians)(-90);
            const thrustVector = new instance_1.ige.box2d.b2Vec2(Math.cos(radians) * this._thrustPower, Math.sin(radians) * this._thrustPower);
            this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
            this._box2dBody.SetAwake(true);
            thrusting = true;
        }
        if (this._controlState[PlayerControls_1.PlayerControls.reverse]) {
            const radians = this._rotate.z + (0, utils_1.degreesToRadians)(-270);
            const thrustVector = new instance_1.ige.box2d.b2Vec2(Math.cos(radians) * this._reversePower, Math.sin(radians) * this._reversePower);
            this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
            this._box2dBody.SetAwake(true);
            thrusting = true;
        }
        this.streamProperty("thrusting", thrusting);
        if (this._controlState[PlayerControls_1.PlayerControls.braking]) {
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
            if (instance_1.ige.input.actionState(control)) {
                if (!this._controlState[control]) {
                    // Record the new state
                    this._controlState[control] = true;
                    // Tell the server about our control change
                    instance_1.ige.network.send("playerShipControlChange", [control, true]);
                }
            }
            else {
                if (this._controlState[control]) {
                    // Record the new state
                    this._controlState[control] = false;
                    // Tell the server about our control change
                    instance_1.ige.network.send("playerShipControlChange", [control, false]);
                }
            }
        }
    }
    _updateTarget() {
        const targetInfo = instance_1.ige.$("targetInfo");
        if (!this.target || !this.target._targetEntity) {
            targetInfo.hide();
            return;
        }
        this.target._distance = this.distanceTo(this.target._targetEntity);
        // Update the on-screen target distance label
        instance_1.ige.$("targetDistance").value("Distance: " + this.target._distance.toFixed(2) + " km");
        targetInfo.show();
    }
}
exports.PlayerShip = PlayerShip;
(0, igeClassStore_1.registerClass)(PlayerShip);
