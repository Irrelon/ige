import { IgeEventingClass } from "./IgeEventingClass";
import assert from "assert";

let expectedAssertions = 0;
let actualAssertions = 0;

function expect(val: number) {
	expectedAssertions = val;
}

function reset() {
	expectedAssertions = 0;
	actualAssertions = 0;
}

function countAssertion() {
	actualAssertions++;
}

function check() {
	if (expectedAssertions === undefined || expectedAssertions === actualAssertions) {
		return;
	}
	throw new Error("expected " + expectedAssertions + " assertions, got " + actualAssertions);
}

beforeEach(reset);
afterEach(check);

describe("IgeEventingClass", () => {
	it("on()", () => {
		const myClass = new IgeEventingClass();

		myClass.on("moo", () => {});

		assert.strictEqual(myClass._eventListeners?.moo["*"].length, 1, "Listener registered on event");

		myClass.off("moo");

		assert.strictEqual(
			!myClass._eventListeners.moo ||
				!myClass._eventListeners.moo["*"] ||
				myClass._eventListeners.moo["*"].length,
			true,
			"Listeners all removed from event"
		);
	});

	describe("once()", () => {
		it("Only calls a listener once for the event", async () => {
			const myClass = new IgeEventingClass();

			let callCount = 0;

			myClass.once("moo", () => {
				callCount++;
			});

			myClass.emit("moo");
			myClass.emit("moo");

			assert.strictEqual(callCount, 1, "Number of times listener called is correct");
			assert.strictEqual(
				!myClass._eventListeners?.moo ||
					!myClass._eventListeners?.moo["*"] ||
					!myClass._eventListeners?.moo["*"].length,
				true,
				"Listeners all removed from event"
			);
		});

		it("The correct arguments are emitted", async () => {
			const myClass = new IgeEventingClass();

			let callCount = 0;
			let receivedArg1: number;
			let receivedArg2: string;

			myClass.once("moo", (arg1: number, arg2: string) => {
				callCount++;
				receivedArg1 = arg1;
				receivedArg2 = arg2;
			});

			myClass.emit("moo", 1, "one");
			myClass.emit("moo", 1, "one");

			assert.strictEqual(callCount, 1, "Number of times listener called is correct");
			// @ts-ignore
			assert.strictEqual(receivedArg1, 1, "Argument 1 was correct");
			// @ts-ignore
			assert.strictEqual(receivedArg2, "one", "Argument 2 was correct");
			assert.strictEqual(
				!myClass._eventListeners?.moo ||
					!myClass._eventListeners?.moo["*"] ||
					!myClass._eventListeners?.moo["*"].length,
				true,
				"Listeners all removed from event"
			);
		});
	});

	describe("off()", () => {
		it("Cancels all listeners (event)", () => {
			const myClass = new IgeEventingClass();
			const listener1 = () => {};
			const listener2 = () => {};

			myClass.on("moo", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 1, "Listeners registered on event");
			myClass.on("moo", "testId", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 1, "Listeners registered on event");
			myClass.on("moo", listener1);
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 2, "Listeners registered on event");
			myClass.on("moo", "testId", listener2);
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 2, "Listeners registered on event");

			myClass.off("moo");

			assert.strictEqual(
				!myClass._eventListeners?.moo ||
					(myClass._eventListeners?.moo["*"].length === 0 &&
						myClass._eventListeners?.moo["testId"].length === 0),
				true,
				"Listeners all removed from event"
			);
		});

		it("Cancels id-based listeners (event, id)", () => {
			const myClass = new IgeEventingClass();
			const listener1 = () => {};
			const listener2 = () => {};

			myClass.on("moo", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 1, "Listeners registered on event");
			myClass.on("moo", "testId", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 1, "Listeners registered on event");
			myClass.on("moo", listener1);
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 2, "Listeners registered on event");
			myClass.on("moo", "testId", listener2);
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 2, "Listeners registered on event");

			myClass.off("moo", "testId");

			assert.strictEqual(
				myClass._eventListeners?.moo["*"].length === 2,
				true,
				"Listeners all removed from event"
			);
			assert.strictEqual(
				!myClass._eventListeners?.moo["testId"] || myClass._eventListeners?.moo["testId"].length === 0,
				true,
				"Listeners all removed from event"
			);
		});

		it("Cancels listener-based listeners (event, listener)", () => {
			const myClass = new IgeEventingClass();
			const listener1 = () => {};
			const listener2 = () => {};

			myClass.on("moo", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 1, "Listeners registered on event");
			myClass.on("moo", "testId", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 1, "Listeners registered on event");
			myClass.on("moo", listener1);
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 2, "Listeners registered on event");
			myClass.on("moo", "testId", listener2);
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 2, "Listeners registered on event");

			myClass.off("moo", listener1);

			assert.strictEqual(
				myClass._eventListeners?.moo["*"].length === 1,
				true,
				"Listeners all removed from event"
			);
			assert.strictEqual(
				myClass._eventListeners?.moo["testId"].length === 2,
				true,
				"Listeners all removed from event"
			);
		});

		it("Cancels id-based + listener-based listeners (event, id, listener)", () => {
			const myClass = new IgeEventingClass();
			const listener1 = () => {};
			const listener2 = () => {};

			myClass.on("moo", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 1, "Listeners registered on event");
			myClass.on("moo", "testId", () => {});
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 1, "Listeners registered on event");
			myClass.on("moo", listener1);
			assert.strictEqual(myClass._eventListeners?.moo["*"].length, 2, "Listeners registered on event");
			myClass.on("moo", "testId", listener2);
			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 2, "Listeners registered on event");

			myClass.off("moo", "testId", listener2);

			assert.strictEqual(
				myClass._eventListeners?.moo["*"].length === 2,
				true,
				"Listeners all removed from event"
			);
			assert.strictEqual(
				myClass._eventListeners?.moo["testId"].length === 1,
				true,
				"Listeners all removed from event"
			);
		});
	});

	describe("emitStatic()", () => {
		it("Static emitter will emit when a new listener is added", (resolve) => {
			class MyClass extends IgeEventingClass {}

			expect(1);

			const myClass = new MyClass();
			myClass.emitStatic("moo");
			myClass.on("moo", () => {
				countAssertion();
				assert.ok(true, "Callback was fired");
				resolve();
			});
		});
	});

	describe("cancelStatic()", () => {
		it("Removes static emitter", (resolve) => {
			class MyClass extends IgeEventingClass {}

			expect(1);

			const myClass = new MyClass();
			myClass.emitStatic("moo");
			myClass.on("moo", () => {
				countAssertion();
				assert.ok(true, "Callback was fired");
			});

			myClass.cancelStatic("moo");
			myClass.on("moo", () => {
				countAssertion();
				assert.ok(false, "Callback was fired");
			});

			setTimeout(() => {
				resolve();
			}, 10);
		});
	});

	describe("overwrite()", () => {
		it("Only fires the last listener added, cancelling all other listeners before it", (resolve) => {
			class MyClass extends IgeEventingClass {}

			expect(1);

			const myClass = new MyClass();
			myClass.on("moo", () => {
				countAssertion();
				assert.ok(false, "Correct callback was fired");
			});
			myClass.on("moo", () => {
				countAssertion();
				assert.ok(false, "Correct callback was fired");
			});
			myClass.overwrite("moo", () => {
				countAssertion();
				assert.ok(true, "Correct callback was fired");
			});
			myClass.emit("moo");

			setTimeout(() => {
				resolve();
			}, 10);
		});
	});

	describe("emitId()", () => {
		it("Fires an id-based event first followed by a catch-all event", () => {
			const myClass = new IgeEventingClass();
			let emitCount = 0;

			// Register id-based listener
			myClass.on("moo", "testId", () => {
				emitCount++;
			});

			// Register non-id-based listener
			myClass.on("moo", () => {
				emitCount++;
			});

			assert.strictEqual(myClass._eventListeners?.moo["testId"].length, 1, "Listener registered on event");

			myClass.emitId("moo", "testId", "foo");

			assert.strictEqual(emitCount, 2, "Event fired correctly");

			myClass.off("moo", "testId");

			assert.strictEqual(
				!myClass._eventListeners?.moo ||
					!myClass._eventListeners?.moo["testId"] ||
					myClass._eventListeners?.moo["testId"].length,
				true,
				"Listeners all removed from event"
			);
			assert.strictEqual(
				myClass._eventListeners?.moo &&
					myClass._eventListeners?.moo["*"] &&
					myClass._eventListeners?.moo["*"].length === 1,
				true,
				"Global listener still there"
			);

			myClass.off("moo");

			assert.strictEqual(
				!myClass._eventListeners?.moo ||
					!myClass._eventListeners?.moo["*"] ||
					myClass._eventListeners?.moo["*"].length === 0,
				true,
				"Listeners all removed from event"
			);
		});
	});
});
