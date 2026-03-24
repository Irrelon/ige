"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blurFragmentShader = void 0;
/**
 * Separable Gaussian blur fragment shader for VSM shadow maps.
 * Run twice: once with horizontal direction, once with vertical.
 * Uses a 9-tap Gaussian kernel with UV clamping to prevent face seam bleeding.
 */
exports.blurFragmentShader = `
precision highp float;

varying vec2 v_uv;

uniform sampler2D u_texture;
uniform vec2 u_direction;  // (1/width, 0) for horizontal, (0, 1/height) for vertical
uniform vec4 u_faceUVBounds; // (minU, minV, maxU, maxV) - clamp samples to this face region

void main() {
	// 9-tap Gaussian weights (sigma ~2.0)
	vec4 result = vec4(0.0);
	result += texture2D(u_texture, clamp(v_uv + u_direction * -4.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.0162;
	result += texture2D(u_texture, clamp(v_uv + u_direction * -3.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.0540;
	result += texture2D(u_texture, clamp(v_uv + u_direction * -2.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.1216;
	result += texture2D(u_texture, clamp(v_uv + u_direction * -1.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.1945;
	result += texture2D(u_texture, v_uv)                                                                    * 0.2274;
	result += texture2D(u_texture, clamp(v_uv + u_direction *  1.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.1945;
	result += texture2D(u_texture, clamp(v_uv + u_direction *  2.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.1216;
	result += texture2D(u_texture, clamp(v_uv + u_direction *  3.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.0540;
	result += texture2D(u_texture, clamp(v_uv + u_direction *  4.0, u_faceUVBounds.xy, u_faceUVBounds.zw)) * 0.0162;
	gl_FragColor = result;
}
`;
