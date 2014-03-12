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
     * Gets / sets the 2d geometry of the component. The x and y values are
     * relative to the center of the component's entity. This geometry is used when
     * rendering textures for the entity and positioning in world space as
     * well as UI positioning calculations. It holds no bearing on isometric
     * positioning.
     * @param {Number=} x The new x value in pixels.
     * @param {Number=} y The new y value in pixels.
     * @example #Set the dimensions of the entity (width and height)
     *     entity.bounds.bounds2d(40, 40);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    bounds2d: function (x, y) {
        if (x !== undefined && y !== undefined) {
            this._bounds2d = new IgePoint2d(x, y, 0);
            return this;
        }

        if (x !== undefined && y === undefined) {
            // x is considered an IgePoint2d instance
            this._bounds2d = new IgePoint2d(x.x, x.y);
        }

        return this._bounds2d;
    },


    /**
     * Gets / sets the 3d geometry of the entity. The x and y values are
     * relative to the center of the entity and the z value is wholly
     * positive from the "floor". Used to define a 3d bounding cuboid for
     * the entity used in isometric depth sorting and hit testing.
     * @param {Number=} x The new x value in pixels.
     * @param {Number=} y The new y value in pixels.
     * @param {Number=} z The new z value in pixels.
     * @example #Set the dimensions of the entity (width, height and length)
     *     entity.bounds3d(40, 40, 20);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    bounds3d: function (x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._bounds3d = new IgePoint3d(x, y, z);
            return this;
        }

        return this._bounds3d;
    },

});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeBoundsComponent; }