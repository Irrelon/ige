/**
 * Sprite fragment shader for 2D rendering.
 * Supports texture sampling, tint color, and opacity.
 */
export declare const spriteFragmentShader = "\nprecision mediump float;\n\n// Varyings\nvarying vec2 v_uv;\n\n// Uniforms\nuniform sampler2D u_texture; // Sprite texture\nuniform vec4 u_tint;         // Tint color (r, g, b, a)\nuniform float u_opacity;     // Overall opacity (0.0 to 1.0)\n\nvoid main() {\n\t// Sample texture\n\tvec4 texColor = texture2D(u_texture, v_uv);\n\n\t// Apply tint color (multiply)\n\tvec4 finalColor = texColor * u_tint;\n\n\t// Apply opacity\n\tfinalColor.a *= u_opacity;\n\n\t// Discard fully transparent pixels (optimization)\n\tif (finalColor.a < 0.01) {\n\t\tdiscard;\n\t}\n\n\tgl_FragColor = finalColor;\n}\n";
