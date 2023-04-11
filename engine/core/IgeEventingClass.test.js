var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { IgeEventingClass } from "./IgeEventingClass";
import assert from "assert";
let expectedAssertions = 0;
let actualAssertions = 0;
function expect(val) {
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
        var _a;
        const myClass = new IgeEventingClass();
        myClass.on("moo", () => {
        });
        assert.strictEqual((_a = myClass._eventListeners) === null || _a === void 0 ? void 0 : _a.moo["*"].length, 1, "Listener registered on event");
        myClass.off("moo");
        assert.strictEqual(!myClass._eventListeners.moo || !myClass._eventListeners.moo["*"] || myClass._eventListeners.moo["*"].length, true, "Listeners all removed from event");
    });
    describe("once()", () => {
        it("Only calls a listener once for the event", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const myClass = new IgeEventingClass();
            let callCount = 0;
            myClass.once("moo", () => {
                callCount++;
            });
            myClass.emit("moo");
            myClass.emit("moo");
            assert.strictEqual(callCount, 1, "Number of times listener called is correct");
            assert.strictEqual(!((_a = myClass._eventListeners) === null || _a === void 0 ? void 0 : _a.moo) || !((_b = myClass._eventListeners) === null || _b === void 0 ? void 0 : _b.moo["*"]) || !((_c = myClass._eventListeners) === null || _c === void 0 ? void 0 : _c.moo["*"].length), true, "Listeners all removed from event");
        }));
        it("The correct arguments are emitted", () => __awaiter(void 0, void 0, void 0, function* () {
            var _d, _e, _f;
            const myClass = new IgeEventingClass();
            let callCount = 0;
            let receivedArg1;
            let receivedArg2;
            myClass.once("moo", (arg1, arg2) => {
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
            assert.strictEqual(!((_d = myClass._eventListeners) === null || _d === void 0 ? void 0 : _d.moo) || !((_e = myClass._eventListeners) === null || _e === void 0 ? void 0 : _e.moo["*"]) || !((_f = myClass._eventListeners) === null || _f === void 0 ? void 0 : _f.moo["*"].length), true, "Listeners all removed from event");
        }));
    });
    describe("off()", () => {
        it("Cancels all listeners (event)", () => {
            var _a, _b, _c, _d, _e, _f, _g;
            const myClass = new IgeEventingClass();
            const listener1 = () => {
            };
            const listener2 = () => {
            };
            myClass.on("moo", () => {
            });
            assert.strictEqual((_a = myClass._eventListeners) === null || _a === void 0 ? void 0 : _a.moo["*"].length, 1, "Listeners registered on event");
            myClass.on("moo", "testId", () => {
            });
            assert.strictEqual((_b = myClass._eventListeners) === null || _b === void 0 ? void 0 : _b.moo["testId"].length, 1, "Listeners registered on event");
            myClass.on("moo", listener1);
            assert.strictEqual((_c = myClass._eventListeners) === null || _c === void 0 ? void 0 : _c.moo["*"].length, 2, "Listeners registered on event");
            myClass.on("moo", "testId", listener2);
            assert.strictEqual((_d = myClass._eventListeners) === null || _d === void 0 ? void 0 : _d.moo["testId"].length, 2, "Listeners registered on event");
            myClass.off("moo");
            assert.strictEqual(!((_e = myClass._eventListeners) === null || _e === void 0 ? void 0 : _e.moo) || (((_f = myClass._eventListeners) === null || _f === void 0 ? void 0 : _f.moo["*"].length) === 0 && ((_g = myClass._eventListeners) === null || _g === void 0 ? void 0 : _g.moo["testId"].length) === 0), true, "Listeners all removed from event");
        });
        it("Cancels id-based listeners (event, id)", () => {
            var _a, _b, _c, _d, _e, _f, _g;
            const myClass = new IgeEventingClass();
            const listener1 = () => {
            };
            const listener2 = () => {
            };
            myClass.on("moo", () => {
            });
            assert.strictEqual((_a = myClass._eventListeners) === null || _a === void 0 ? void 0 : _a.moo["*"].length, 1, "Listeners registered on event");
            myClass.on("moo", "testId", () => {
            });
            assert.strictEqual((_b = myClass._eventListeners) === null || _b === void 0 ? void 0 : _b.moo["testId"].length, 1, "Listeners registered on event");
            myClass.on("moo", listener1);
            assert.strictEqual((_c = myClass._eventListeners) === null || _c === void 0 ? void 0 : _c.moo["*"].length, 2, "Listeners registered on event");
            myClass.on("moo", "testId", listener2);
            assert.strictEqual((_d = myClass._eventListeners) === null || _d === void 0 ? void 0 : _d.moo["testId"].length, 2, "Listeners registered on event");
            myClass.off("moo", "testId");
            assert.strictEqual(((_e = myClass._eventListeners) === null || _e === void 0 ? void 0 : _e.moo["*"].length) === 2, true, "Listeners all removed from event");
            assert.strictEqual(!((_f = myClass._eventListeners) === null || _f === void 0 ? void 0 : _f.moo["testId"]) || ((_g = myClass._eventListeners) === null || _g === void 0 ? void 0 : _g.moo["testId"].length) === 0, true, "Listeners all removed from event");
        });
        it("Cancels listener-based listeners (event, listener)", () => {
            var _a, _b, _c, _d, _e, _f;
            const myClass = new IgeEventingClass();
            const listener1 = () => {
            };
            const listener2 = () => {
            };
            myClass.on("moo", () => {
            });
            assert.strictEqual((_a = myClass._eventListeners) === null || _a === void 0 ? void 0 : _a.moo["*"].length, 1, "Listeners registered on event");
            myClass.on("moo", "testId", () => {
            });
            assert.strictEqual((_b = myClass._eventListeners) === null || _b === void 0 ? void 0 : _b.moo["testId"].length, 1, "Listeners registered on event");
            myClass.on("moo", listener1);
            assert.strictEqual((_c = myClass._eventListeners) === null || _c === void 0 ? void 0 : _c.moo["*"].length, 2, "Listeners registered on event");
            myClass.on("moo", "testId", listener2);
            assert.strictEqual((_d = myClass._eventListeners) === null || _d === void 0 ? void 0 : _d.moo["testId"].length, 2, "Listeners registered on event");
            myClass.off("moo", listener1);
            assert.strictEqual(((_e = myClass._eventListeners) === null || _e === void 0 ? void 0 : _e.moo["*"].length) === 1, true, "Listeners all removed from event");
            assert.strictEqual(((_f = myClass._eventListeners) === null || _f === void 0 ? void 0 : _f.moo["testId"].length) === 2, true, "Listeners all removed from event");
        });
        it("Cancels id-based + listener-based listeners (event, id, listener)", () => {
            var _a, _b, _c, _d, _e, _f;
            const myClass = new IgeEventingClass();
            const listener1 = () => {
            };
            const listener2 = () => {
            };
            myClass.on("moo", () => {
            });
            assert.strictEqual((_a = myClass._eventListeners) === null || _a === void 0 ? void 0 : _a.moo["*"].length, 1, "Listeners registered on event");
            myClass.on("moo", "testId", () => {
            });
            assert.strictEqual((_b = myClass._eventListeners) === null || _b === void 0 ? void 0 : _b.moo["testId"].length, 1, "Listeners registered on event");
            myClass.on("moo", listener1);
            assert.strictEqual((_c = myClass._eventListeners) === null || _c === void 0 ? void 0 : _c.moo["*"].length, 2, "Listeners registered on event");
            myClass.on("moo", "testId", listener2);
            assert.strictEqual((_d = myClass._eventListeners) === null || _d === void 0 ? void 0 : _d.moo["testId"].length, 2, "Listeners registered on event");
            myClass.off("moo", "testId", listener2);
            assert.strictEqual(((_e = myClass._eventListeners) === null || _e === void 0 ? void 0 : _e.moo["*"].length) === 2, true, "Listeners all removed from event");
            assert.strictEqual(((_f = myClass._eventListeners) === null || _f === void 0 ? void 0 : _f.moo["testId"].length) === 1, true, "Listeners all removed from event");
        });
    });
    describe("emitStatic()", () => {
        it("Static emitter will emit when a new listener is added", (resolve) => {
            class MyClass extends IgeEventingClass {
            }
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
            class MyClass extends IgeEventingClass {
            }
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
            class MyClass extends IgeEventingClass {
            }
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
            assert.strictEqual((_a = myClass._eventListeners) === null || _a === void 0 ? void 0 : _a.moo["testId"].length, 1, "Listener registered on event");
            myClass.emitId("moo", "testId", "foo");
            assert.strictEqual(emitCount, 2, "Event fired correctly");
            myClass.off("moo", "testId");
            assert.strictEqual(!((_b = myClass._eventListeners) === null || _b === void 0 ? void 0 : _b.moo) || !((_c = myClass._eventListeners) === null || _c === void 0 ? void 0 : _c.moo["testId"]) || ((_d = myClass._eventListeners) === null || _d === void 0 ? void 0 : _d.moo["testId"].length), true, "Listeners all removed from event");
            assert.strictEqual(((_e = myClass._eventListeners) === null || _e === void 0 ? void 0 : _e.moo) && ((_f = myClass._eventListeners) === null || _f === void 0 ? void 0 : _f.moo["*"]) && ((_g = myClass._eventListeners) === null || _g === void 0 ? void 0 : _g.moo["*"].length) === 1, true, "Global listener still there");
            myClass.off("moo");
            assert.strictEqual(!((_h = myClass._eventListeners) === null || _h === void 0 ? void 0 : _h.moo) || !((_j = myClass._eventListeners) === null || _j === void 0 ? void 0 : _j.moo["*"]) || ((_k = myClass._eventListeners) === null || _k === void 0 ? void 0 : _k.moo["*"].length) === 0, true, "Listeners all removed from event");
        });
    });
});
