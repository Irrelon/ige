/**
 * Creates a new isometric 3d entity.
 */
var IgeEntity3d = IgeEntity.extend({
	classId: 'IgeEntity3d',

	init: function () {
		this._super();
	},

	/**
	 * Mounts the 3d entity to the passed object. If the parent
	 * sorts it's children isometrically (isometricMounts(true))
	 * then this entity will be set to isometrically positioned
	 * as well.
	 * @param obj
	 * @return {*}
	 */
	mount: function (obj) {
		if (obj !== undefined) {
			this._super(obj);

			// Set as isometrically positioned depending on parent mount setting
			this.isometric(this.parent().isometricMounts());
		}
		return this;
	},

	/**
	 * Gets / sets the entity that the Entity3d will use as it's billboard.
	 * @param {IgeEntity=} entity The entity to become the billboard entity.
	 */
	billboard: function (entity) {
		if (tex !== undefined) {
			// If we already have a child entity, remove it
			if (this._billboard) {
				this._billboard.destroy();
			}

			// Assign the new billboard entity
			this._billboard = entity;
			entity.mount(this);

			// Translate the billboard to rest at the base of the 3d bounds
			this.updateBillboard();

			return this;
		}

		return this._billboard;
	},

	/**
	 * Translates the billboard entity so that it is positioned at the base
	 * of the 3d bounds of this Entity3d.
	 */
	updateBillboard: function () {
		// Translate the billboard to rest at the base of the 3d bounds
		var item = this._billboard,
			basePoint = new IgePoint(0, 0, +(this.geometry.z / 2)).toIso();

		item.translateTo(item._translate.x, -basePoint.y, item._translate.z);

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity3d; }