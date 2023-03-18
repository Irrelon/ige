import { ige } from "../instance";
import { IgeEntity } from "./IgeEntity";
import { IgeViewport } from "./IgeViewport";
/**
 * The engine's root entity that all the scenegraph lives from.
 */
export class IgeRoot extends IgeEntity {
    constructor() {
        super();
        this.classId = "IgeRoot";
        this._viewportDepth = false;
        // The root entity is always "in view" as in, no occlusion will stop it from rendering
        // because it's only the child entities that need occlusion testing
        this._alwaysInView = true;
        this.basePath = "";
        /**
         * Walks the scenegraph and returns an array of all entities that the mouse
         * is currently over, ordered by their draw order from drawn last (above other
         * entities) to first (underneath other entities).
         */
        this.mouseOverList = (obj, entArr = []) => {
            let arr, arrCount, mp, mouseTriggerPoly, first = false;
            if (!obj) {
                obj = this;
                entArr = [];
                first = true;
            }
            if (obj === this) {
                // Loop viewports
                arr = obj._children;
                if (arr) {
                    arrCount = arr.length;
                    // Loop our children
                    while (arrCount--) {
                        const vp = arr[arrCount];
                        if (vp._scene) {
                            if (vp._scene._shouldRender) {
                                this.mouseOverList(vp._scene, entArr);
                            }
                        }
                    }
                }
            }
            else {
                // Check if the mouse is over this entity
                mp = this.mousePosWorld();
                if (mp && obj.aabb) {
                    // Trigger mode is against the AABB
                    mouseTriggerPoly = obj.aabb(); //this.localAabb();
                    // Check if the current mouse position is inside this aabb
                    if (mouseTriggerPoly.xyInside(mp.x, mp.y)) {
                        entArr.push(obj);
                    }
                }
                // Check if the entity has children
                arr = obj._children;
                if (arr) {
                    arrCount = arr.length;
                    // Loop our children
                    while (arrCount--) {
                        this.mouseOverList(arr[arrCount], entArr);
                    }
                }
            }
            if (first) {
                entArr.reverse();
            }
            return entArr;
        };
        this.id("root");
    }
    /**
     * Returns the mouse position relative to the main front buffer. Mouse
     * position is set by the this.input component (IgeInputComponent)
     * @return {IgePoint3d}
     */
    mousePos() {
        return ige._mousePos.clone();
    }
    _childMounted(child) {
        if (child instanceof IgeViewport) {
            // The first mounted viewport gets set as the current
            // one before any rendering is done
            if (!ige.engine._currentViewport) {
                ige.engine.currentViewport(child);
            }
        }
        super._childMounted(child);
    }
    updateSceneGraph(ctx) {
        const arr = this._children;
        const tickDelta = ige.engine._tickDelta;
        // Process any behaviours assigned to the engine
        this._processUpdateBehaviours(ctx, tickDelta);
        if (arr) {
            let arrCount = arr.length;
            // Loop our viewports and call their update methods
            if (ige.config.debug._timing) {
                while (arrCount--) {
                    const us = new Date().getTime();
                    arr[arrCount].update(ctx, tickDelta);
                    const ud = new Date().getTime() - us;
                    if (arr[arrCount]) {
                        if (!ige.engine._timeSpentInUpdate[arr[arrCount].id()]) {
                            ige.engine._timeSpentInUpdate[arr[arrCount].id()] = 0;
                        }
                        if (!ige.engine._timeSpentLastUpdate[arr[arrCount].id()]) {
                            ige.engine._timeSpentLastUpdate[arr[arrCount].id()] = {};
                        }
                        ige.engine._timeSpentInUpdate[arr[arrCount].id()] += ud;
                        ige.engine._timeSpentLastUpdate[arr[arrCount].id()].ms = ud;
                    }
                }
            }
            else {
                while (arrCount--) {
                    arr[arrCount].update(ctx, tickDelta);
                }
            }
        }
    }
    renderSceneGraph(ctx) {
        let ts, td;
        // Process any behaviours assigned to the engine
        this._processTickBehaviours(ctx);
        // Depth-sort the viewports
        if (this._viewportDepth) {
            if (ige.config.debug._timing) {
                ts = new Date().getTime();
                this.depthSortChildren();
                td = new Date().getTime() - ts;
                if (!ige.engine._timeSpentLastTick[this.id()]) {
                    ige.engine._timeSpentLastTick[this.id()] = {};
                }
                ige.engine._timeSpentLastTick[this.id()].depthSortChildren = td;
            }
            else {
                this.depthSortChildren();
            }
        }
        ctx.save();
        ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
        //ctx.scale(this._globalScale.x, this._globalScale.y);
        // Process the current engine tick for all child objects
        const arr = this._children;
        if (arr) {
            let arrCount = arr.length;
            // Loop our viewports and call their tick methods
            if (ige.config.debug._timing) {
                while (arrCount--) {
                    ctx.save();
                    ts = new Date().getTime();
                    arr[arrCount].tick(ctx);
                    td = new Date().getTime() - ts;
                    if (arr[arrCount]) {
                        if (!ige.engine._timeSpentInTick[arr[arrCount].id()]) {
                            ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
                        }
                        if (!ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
                            ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
                        }
                        ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
                        ige.engine._timeSpentLastTick[arr[arrCount].id()].ms = td;
                    }
                    ctx.restore();
                }
            }
            else {
                while (arrCount--) {
                    ctx.save();
                    arr[arrCount].tick(ctx);
                    ctx.restore();
                }
            }
        }
        ctx.restore();
    }
    destroy() {
        // Call class destroy() super method
        return super.destroy();
    }
}
