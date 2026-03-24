/**
 * Full-screen quad vertex shader for post-process blur passes.
 */
export declare const blurVertexShader = "\nprecision highp float;\n\nattribute vec2 a_position;\nvarying vec2 v_uv;\n\nvoid main() {\n\tv_uv = a_position * 0.5 + 0.5;\n\tgl_Position = vec4(a_position, 0.0, 1.0);\n}\n";
