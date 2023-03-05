import { ige } from "../instance.js";
import IgeEntity from "./IgeEntity.js";
/**
 * The engine's root entity that all the scenegraph lives from.
 */
class IgeRoot extends IgeEntity {
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
                        if (arr[arrCount]._scene) {
                            if (arr[arrCount]._scene._shouldRender) {
                                this.mouseOverList(arr[arrCount]._scene, entArr);
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
        return this._mousePos.clone();
    }
    _childMounted(child) {
        if (child.IgeViewport) {
            // The first mounted viewport gets set as the current
            // one before any rendering is done
            if (!this._currentViewport) {
                this._currentViewport = child;
                this._currentCamera = child.camera;
            }
        }
        super._childMounted(child);
    }
    updateSceneGraph(ctx) {
        let arr = this._children, arrCount, us, ud, tickDelta = ige._tickDelta;
        // Process any behaviours assigned to the engine
        this._processUpdateBehaviours(ctx, tickDelta);
        if (arr) {
            arrCount = arr.length;
            // Loop our viewports and call their update methods
            if (ige.config.debug._timing) {
                while (arrCount--) {
                    us = new Date().getTime();
                    arr[arrCount].update(ctx, tickDelta);
                    ud = new Date().getTime() - us;
                    if (arr[arrCount]) {
                        if (!ige._timeSpentInUpdate[arr[arrCount].id()]) {
                            ige._timeSpentInUpdate[arr[arrCount].id()] = 0;
                        }
                        if (!ige._timeSpentLastUpdate[arr[arrCount].id()]) {
                            ige._timeSpentLastUpdate[arr[arrCount].id()] = {};
                        }
                        ige._timeSpentInUpdate[arr[arrCount].id()] += ud;
                        ige._timeSpentLastUpdate[arr[arrCount].id()].ms = ud;
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
                this.root.depthSortChildren();
                td = new Date().getTime() - ts;
                if (!this._timeSpentLastTick[this.root.id()]) {
                    this._timeSpentLastTick[this.id()] = {};
                }
                this._timeSpentLastTick[this.id()].depthSortChildren = td;
            }
            else {
                this.root.depthSortChildren();
            }
        }
        ctx.save();
        ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
        //ctx.scale(this._globalScale.x, this._globalScale.y);
        // Process the current engine tick for all child objects
        let arr = this._children, arrCount;
        if (arr) {
            arrCount = arr.length;
            // Loop our viewports and call their tick methods
            if (ige.config.debug._timing) {
                while (arrCount--) {
                    ctx.save();
                    ts = new Date().getTime();
                    arr[arrCount].tick(ctx);
                    td = new Date().getTime() - ts;
                    if (arr[arrCount]) {
                        if (!ige._timeSpentInTick[arr[arrCount].id()]) {
                            ige._timeSpentInTick[arr[arrCount].id()] = 0;
                        }
                        if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
                            ige._timeSpentLastTick[arr[arrCount].id()] = {};
                        }
                        ige._timeSpentInTick[arr[arrCount].id()] += td;
                        ige._timeSpentLastTick[arr[arrCount].id()].ms = td;
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
export default IgeRoot;
