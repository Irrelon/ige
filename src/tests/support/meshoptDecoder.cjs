// jest runs the engine as CommonJS, which can't require meshoptimizer's ES module build: tests get the same decoder
// from its UMD build (whose module.exports is the decoder itself)
module.exports = { MeshoptDecoder: require("meshoptimizer/meshopt_decoder.js") };
