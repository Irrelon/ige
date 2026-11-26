import { colorSpaceChunk } from "@/engine/shaders/webgl/chunks";

/**
 * Debug line fragment shader: flat vertex colour (sRGB-encoded for the screen under IGE_SRGB_OUTPUT).
 */
export const debugLineFragmentShader = `
precision mediump float;

varying vec4 v_color;
${colorSpaceChunk}

void main() {
#ifdef IGE_SRGB_OUTPUT
	gl_FragColor = vec4(igeLinearToSrgb(v_color.rgb), v_color.a);
#else
	gl_FragColor = v_color;
#endif
}
`;
