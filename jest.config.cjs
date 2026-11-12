const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	transform: {
		// The WebGL code's DOM typings (texImage2D's sources) disagree with ts-jest's: tsc checks it, the tests leave it to tsc
		"^.+\\.tsx?$": ["ts-jest", { diagnostics: { exclude: ["**/engine/core/IgeWebGl*.ts", "**/engine/webgl/**"] } }]
	},
	// Add any other Jest configuration options here
	modulePaths: [compilerOptions.baseUrl],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1"
	}
};
