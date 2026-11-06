/**
 * Particle fragment shader (IgeParticleSystem3d): texture * particle colour.
 */
export const particleFragmentShader = `
precision mediump float;

varying vec2 v_uv;
varying vec4 v_color;

uniform sampler2D u_texture;

void main() {
	vec4 color = texture2D(u_texture, v_uv) * v_color;
	if (color.a < 0.004) {
		discard;
	}
	gl_FragColor = color;
}
`;
