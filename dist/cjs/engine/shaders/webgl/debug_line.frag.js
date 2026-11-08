"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLineFragmentShader = void 0;
/**
 * Debug line fragment shader: flat vertex colour.
 */
exports.debugLineFragmentShader = `
precision mediump float;

varying vec4 v_color;

void main() {
	gl_FragColor = v_color;
}
`;
