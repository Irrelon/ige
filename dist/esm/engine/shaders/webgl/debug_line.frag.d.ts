/**
 * Debug line fragment shader: flat vertex colour.
 */
export declare const debugLineFragmentShader = "\nprecision mediump float;\n\nvarying vec4 v_color;\n\nvoid main() {\n\tgl_FragColor = v_color;\n}\n";
