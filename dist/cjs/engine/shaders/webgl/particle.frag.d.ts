/**
 * Particle fragment shader (IgeParticleSystem3d): texture * particle colour.
 */
export declare const particleFragmentShader = "\nprecision mediump float;\n\nvarying vec2 v_uv;\nvarying vec4 v_color;\n\nuniform sampler2D u_texture;\n\nvoid main() {\n\tvec4 color = texture2D(u_texture, v_uv) * v_color;\n\tif (color.a < 0.004) {\n\t\tdiscard;\n\t}\n\tgl_FragColor = color;\n}\n";
