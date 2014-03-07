/**
 * A component object for defining the bounds (2d, 3d, aabb) of Entities
 */

var IgeBoundsComponent = IgeClass.extend({
    classId: 'IgeBoundsComponent',
    componentId: 'bounds',

    init: function (entity, options) {
        var self = this;

        this._entity = entity;

        this._bounds2d = new IgePoint2d(40, 40);
        this._bounds3d = new IgePoint3d(0, 0, 0);

        this._oldBounds2d = new IgePoint2d(40, 40);
        this._oldBounds3d = new IgePoint3d(0, 0, 0);

        entity.addBehaviour("IgeBoundsComponent_update", function() {
            // Check if the geometry has changed and if so, update the aabb dirty
            if (!self._oldBounds2d.compare(self.bounds2d())) {
                self._entity._aabbDirty = true;

                // Record the new geometry to the oldGeometry data
                self._oldBounds2d.copy(self.bounds2d());

                self.log("Old Bounds 2d updated!")
            }

            // Check if the geometry has changed and if so, update the bounds3d polygon dirty
            if (!self._oldBounds3d.compare(self.bounds3d())) {
                self._entity._bounds3dPolygonDirty = true;

                // Record the new geometry to the oldGeometry data
                self._oldBounds3d.copy(self.bounds3d());
            }
        });
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