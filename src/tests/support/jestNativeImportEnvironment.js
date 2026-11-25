/**
 * A jest environment for tests of ESM-only packages (the WebTransport library): it hands the
 * test a real dynamic import as `igeNativeImport`, which jest's CommonJS require can't do.
 * Use it with `@jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js`.
 */
const { TestEnvironment } = require("jest-environment-node");

class NativeImportEnvironment extends TestEnvironment {
	constructor (config, context) {
		super(config, context);
		this.global.igeNativeImport = (name) => import(name);
		// The WebAssembly those modules load with (this realm's, not the test's)
		this.global.igeNativeWebAssembly = WebAssembly;
	}
}

module.exports = NativeImportEnvironment;
