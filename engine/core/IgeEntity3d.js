/**
 * Creates a new isometric 3d entity.
 */
var IgeEntity3d = IgeEntity.extend({
	classId: 'IgeEntity',

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
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity3d; }