// jest runs the engine as CommonJS, which can't require meshoptimizer's ES module decoder: tests get the same decoder
// from its CommonJS build (whose module.exports is the decoder itself)
module.exports = { MeshoptDecoder: require("meshoptimizer/decoder.cjs") };
