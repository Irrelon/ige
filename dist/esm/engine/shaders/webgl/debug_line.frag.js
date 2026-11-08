/**
 * Debug line fragment shader: flat vertex colour.
 */
export const debugLineFragmentShader = `
precision mediump float;

varying vec4 v_color;

void main() {
	gl_FragColor = v_color;
}
`;
