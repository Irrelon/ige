const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	// Add any other Jest configuration options here
	modulePaths: [compilerOptions.baseUrl],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1"
	}
};
