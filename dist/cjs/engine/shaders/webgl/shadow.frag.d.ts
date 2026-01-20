/**
 * Shadow map depth fragment shader.
 * Outputs depth value for shadow mapping.
 *
 * For WebGL 1 we pack depth into RGBA since depth textures
 * may not be supported. For WebGL 2 we can use depth textures directly.
 */
export declare const shadowFragmentShader = "\nprecision highp float;\n\n// Pack depth into RGBA for WebGL 1 compatibility\nvec4 packDepth(float depth) {\n\tconst vec4 bitShift = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);\n\tconst vec4 bitMask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);\n\tvec4 comp = fract(depth * bitShift);\n\tcomp -= comp.xxyz * bitMask;\n\treturn comp;\n}\n\nvoid main() {\n\t// Output depth value\n\t// gl_FragCoord.z is already in [0, 1] range\n\tgl_FragColor = packDepth(gl_FragCoord.z);\n}\n";
/**
 * WebGL 2 shadow fragment shader - just outputs depth directly
 * (used when depth textures are supported)
 */
export declare const shadowFragmentShaderWebGL2 = "#version 300 es\nprecision highp float;\n\nvoid main() {\n\t// Depth is written automatically to the depth buffer\n\t// No color output needed when using depth texture\n}\n";
