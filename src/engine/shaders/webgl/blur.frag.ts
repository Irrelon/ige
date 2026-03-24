/**
 * Separable Gaussian blur fragment shader for VSM shadow maps.
 * Run twice: once with horizontal direction, once with vertical.
 * Uses a 9-tap Gaussian kernel for good quality/performance balance.
 */
export const blurFragmentShader = `
precision highp float;

varying vec2 v_uv;

uniform sampler2D u_texture;
uniform vec2 u_direction; // (1/width, 0) for horizontal, (0, 1/height) for vertical

void main() {
	// 9-tap Gaussian weights (sigma ~2.0)
	// Weights: 0.0162, 0.0540, 0.1216, 0.1945, 0.2274, 0.1945, 0.1216, 0.0540, 0.0162
	vec4 result = vec4(0.0);
	result += texture2D(u_texture, v_uv + u_direction * -4.0) * 0.0162;
	result += texture2D(u_texture, v_uv + u_direction * -3.0) * 0.0540;
	result += texture2D(u_texture, v_uv + u_direction * -2.0) * 0.1216;
	result += texture2D(u_texture, v_uv + u_direction * -1.0) * 0.1945;
	result += texture2D(u_texture, v_uv)                       * 0.2274;
	result += texture2D(u_texture, v_uv + u_direction *  1.0) * 0.1945;
	result += texture2D(u_texture, v_uv + u_direction *  2.0) * 0.1216;
	result += texture2D(u_texture, v_uv + u_direction *  3.0) * 0.0540;
	result += texture2D(u_texture, v_uv + u_direction *  4.0) * 0.0162;
	gl_FragColor = result;
}
`;
