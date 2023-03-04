import IgeEntity from "../../engine/core/IgeEntity";

export class Square extends IgeEntity {
	classId = 'Square';

	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	// tick (ctx: CanvasRenderingContext2D) {
	// 	// Rotate this entity by 0.1 degrees.
	// 	this.rotateBy(0, 0, (this._rSpeed * ige._tickDelta) * Math.PI / 180);
	//
	// 	// Call the IgeEntity (super-class) tick() method
	// 	super.tick(ctx);
	// }
}
