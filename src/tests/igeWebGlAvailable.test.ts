type Check = () => boolean;

/** Load the check fresh (it caches its answer) with a fake document whose canvas supports only the given contexts. */
function check (supported: string[]): Check {
	const g = globalThis as unknown as { document?: unknown };
	g.document = { createElement: () => ({ getContext: (kind: string) => supported.includes(kind) ? {} : null }) };
	let fn!: Check;
	jest.isolateModules(() => {
		fn = require("@/engine/core/igeCreateRenderer").igeWebGlAvailable;
	});
	return fn;
}

describe("igeWebGlAvailable", () => {
	afterEach(() => {
		delete (globalThis as unknown as { document?: unknown }).document;
	});

	it("is true when WebGL 2 is available", () => {
		expect(check(["webgl2", "webgl"])()).toBe(true);
	});

	it("is false on a WebGL 1 only browser, so the game falls back to Canvas 2D", () => {
		expect(check(["webgl"])()).toBe(false);
	});

	it("is false with no WebGL", () => {
		expect(check([])()).toBe(false);
	});
});
