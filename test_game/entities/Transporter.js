import { ige } from "../../engine/instance.js";
import { WorkerUnitType } from "../enums/WorkerUnitType.js";
import { WorkerUnit } from "./base/WorkerUnit.js";
import { registerClass } from "../../engine/igeClassStore.js";
import { IgeTween } from "../../engine/core/IgeTween.js";
import { IgeTimeout } from "../../engine/core/IgeTimeout.js";
export class Transporter extends WorkerUnit {
    constructor(depotAId, depotBId) {
        super(WorkerUnitType.transporter);
        this.classId = "Transporter";
        this._state = "idle";
        this._depotAId = depotAId;
        this._depotBId = depotBId;
        this.setDepots();
    }
    setDepots() {
        this._depotA = ige.$(this._depotAId);
        this._depotB = ige.$(this._depotBId);
        if (!this._depotA || !this._depotB) {
            // Create a timeout to re-check
            new IgeTimeout(() => {
                this.setDepots();
            }, 50);
            return;
        }
    }
    retrieveResource(resource) {
        if (!resource)
            return;
        // Go pick up the item
        this._targetResource = resource;
        this._state = "retrieving";
        // Move the transporter towards the target resource
        new IgeTween(this._translate, {
            x: resource._translate.x,
            y: resource._translate.y
        }, 3000).afterTween(() => {
            this.pickUpResource(resource);
        }).start();
    }
    pickUpResource(resource) {
        if (!resource || !resource._destination)
            return;
        resource.mount(this);
        resource.translateTo(0, 0, 0);
        this._state = "transporting";
        // Move the transporter towards the target transport destination
        new IgeTween(this._translate, {
            x: resource._destination._translate.x,
            y: resource._destination._translate.y
        }, 3000).afterTween(() => {
            this.dropResource(resource);
        }).start();
    }
    dropResource(resource) {
        if (!resource || !resource._destination)
            return;
        resource.mount(ige.$("scene1"));
        resource.translateTo(this._translate.x, this._translate.y, 0);
        resource.onDropped(resource._destination.id());
        this._state = "returning";
        // Move the transporter back to center of road
        // new IgeTween(this._translate, {
        // 	x: resource._destination._translate.x,
        // 	y: resource._destination._translate.y
        // }, 6000).afterTween( () => {
        // 	this.dropResource(resource);
        // }).start();
    }
    update(ctx, tickDelta) {
        if (!this._depotA)
            return;
        if (!this._depotB)
            return;
        if (this._state === "idle") {
            // Determine if we should be transporting anything
            if (this._depotA.transportQueue.length) {
                this.retrieveResource(this._depotA.transportQueue.shift());
            }
        }
        super.update(ctx, tickDelta);
    }
    streamCreateConstructorArgs() {
        return [this._depotAId, this._depotBId];
    }
}
registerClass(Transporter);
