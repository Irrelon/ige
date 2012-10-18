var IgeWebGlShaderBasic = IgeClass.extend({
	classId:'IgeWebGlShaderBasic',

	init:function (gl) {
		// Setup shader source
		var vertexShaderSource = "attribute vec3 aVertexPosition;\n" +
				"void main() {\n" +
				"gl_Position = vec4(aVertexPosition, 1.0);\n" +
				"}\n",

			fragmentShaderSource = "precision mediump float;\n" +
				"void main() {\n" +
				"gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n" +
				"}\n",

			// Load the shaders
			vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource),
			fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource),

			// Create the shader program
			shaderProgram = gl.createProgram();

		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			this.log('Failed to setup shaders!', 'error');
			return false;
		}

		gl.useProgram(shaderProgram);
		shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
	},

	loadShader: function (gl, type, shaderSource) {
		var shader = gl.createShader(type);

		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			this.log('Error	compiling shader: ' + gl.getShaderInfoLog(shader), 'error');

			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}
});