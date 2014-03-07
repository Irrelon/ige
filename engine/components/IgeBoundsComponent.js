/**
 * A component object for defining the bounds (2d, 3d, aabb) of Entities
 */

var IgeBoundsComponent = IgeClass.extend({
    classId: 'IgeBoundsComponent',
    componentId: 'bounds',

    init: function (entity, options) {
        this._entity = entity;

        this._bounds2d = new IgePoint2d(40, 40);
        this._bounds3d = new IgePoint3d(0, 0, 0);
    },

    /**
     * Gets / sets the 2d bounds of this component.
     * @param {IgePoint2d=} bounds The new 2d bounds of this component.
     * @return {*} "this" when a bounds argument is passed to allow method
     * chaining or the current value if no bounds argument is specified.
     */
    bounds2d: function (bounds) {
        if (bounds !== undefined) {
            this._bounds2d = bounds;
            return this;
        }

        return this._bounds2d;
    },


    /**
     * Gets / sets the 3d bounds of this component.
     * @param {IgePoint2d=} bounds The new 3d bounds of this component.
     * @return {*} "this" when a bounds argument is passed to allow method
     * chaining or the current value if no bounds argument is specified.
     */
    bounds3d: function (bounds) {
        if (bounds !== undefined) {
            this._bounds3d = bounds;
            return this;
        }

        return this._bounds3d;
    },

});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeBoundsComponent; }