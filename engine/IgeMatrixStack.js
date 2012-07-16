var IgeMatrixStack = function() {
	this.stack = [];
	this.saved = [];
};

IgeMatrixStack.prototype= {
	stack: null,
	saved: null,

	/**
	 * Add a matrix to the transformation stack.
	 * @return this
	 */
	pushMatrix: function(matrix) {
		this.stack.push(matrix);
		return this;
	},

	/**
	 * Remove the last matrix from this stack.
	 * @return {IgeMatrix2d} the poped matrix.
	 */
	popMatrix: function()	{
		return this.stack.pop();
	},

	/**
	 * Create a restoration point of pushed matrices.
	 * @return this
	 */
	save: function() {
		this.saved.push(this.stack.length);
		return this;
	},

	/**
	 * Restore from the last restoration point set.
	 * @return this
	 */
	restore: function() {
		var pos= this.saved.pop();
		while( this.stack.length!==pos ) {
			this.popMatrix();
		}
		return this;
	},

	/**
	 * Return the concatenation (multiplication) matrix of all the matrices contained in this stack.
	 * @return {IgeMatrix2d} a new matrix.
	 */
	getMatrix: function() {
		var matrix= new IgeMatrix2d();

		for( var i=0; i<this.stack.length; i++ ) {
			var matrixStack= this.stack[i];
			matrix.multiply( matrixStack );
		}

		return matrix;
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMatrixStack; }
