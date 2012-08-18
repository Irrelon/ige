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
	 * Creates a new image "on top" of the IgeEntity3d instance via a
	 * child entity. This allows both to operate together but have
	 * separate transforms.
	 * @param tex
	 */
	billboard: function (tex) {
		if (tex !== undefined) {
			// If we already have a child entity, change the texture directly
			if (this._billboard) {
				this._billboard.texture(tex);
			} else {
				// Create a new billboard entity and assign it the texture
				this._billboard = new IgeEntity()
					.id(this.id() + '_billboard')
					.texture(tex)
					.dimensionsFromCell()
					.mount(this);
			}
		}
	},

	/**
	 * Modifies the context so that the child entities of this entity
	 * are drawn with the parent origin at the base of the 3d bounds.
	 * @param ctx
	 */
	tick: function (ctx) {
		var i, item, basePoint = new IgePoint(0, 0, +(this.geometry.z / 2)).toIso();
		for (i = 0; i < this._children.length; i++) {
			item = this._children[i];
			item.translateTo(item._translate.x, -basePoint.y, item._translate.z);
		}
		//ctx.translate(0, Math.floor(this.geometry.z / 2));
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity3d; }