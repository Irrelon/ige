import { IgeGeometryUploadQueue } from "@/engine/webgl/IgeGeometryUploadQueue";

/** A queue whose uploads take `msPerMb` of a fake clock per megabyte, recording what went up in each frame. */
function setup (msPerMb = 4) {
	let clock = 0;
	const sizes = new Map<string, number>();
	const uploaded: string[] = [];
	const queue = new IgeGeometryUploadQueue<string>((id) => {
		uploaded.push(id);
		clock += (sizes.get(id)! / 1e6) * msPerMb;
	}, () => clock);
	const ask = (id: string, bytes: number, priority = 0) => {
		sizes.set(id, bytes);
		return queue.request(id, id, bytes, priority);
	};
	return { queue, uploaded, ask };
}

describe("IgeGeometryUploadQueue", () => {
	it("uploads at once when there's no budget (the default)", () => {
		const { queue, uploaded, ask } = setup();
		queue.beginFrame();
		for (let i = 0; i < 20; i++) expect(ask(`chunk${i}`, 2e6)).toBe(true);
		expect(uploaded).toHaveLength(20);
		expect(queue.length).toBe(0);
		expect(queue.frame.bytes).toBe(40e6);
	});

	it("spreads uploads over frames by bytes, in the order asked", () => {
		const { queue, uploaded, ask } = setup();
		queue.budget = { bytes: 1e6, ms: Infinity };
		queue.beginFrame();
		expect(ask("a", 400e3)).toBe(true);
		expect(ask("b", 400e3)).toBe(true);
		expect(ask("c", 400e3)).toBe(false); // 1.2 MB would be over
		expect(ask("d", 100e3)).toBe(false); // fits, but waits behind c: order is kept
		expect(uploaded).toEqual(["a", "b"]);
		expect(queue.length).toBe(2);
		queue.beginFrame();
		expect(uploaded).toEqual(["a", "b", "c", "d"]);
		expect(queue.frame).toMatchObject({ uploads: 2, bytes: 500e3 });
	});

	it("always lets a frame's first upload go, however big", () => {
		const { queue, uploaded, ask } = setup();
		queue.budget = { bytes: 1e6, ms: Infinity };
		queue.beginFrame();
		expect(ask("huge", 5e6)).toBe(true);
		expect(ask("small", 1e3)).toBe(false);
		queue.beginFrame();
		expect(uploaded).toEqual(["huge", "small"]);
	});

	it("keeps to a time budget, predicting each upload's time from those measured", () => {
		const { queue, uploaded, ask } = setup(4); // 4 ms a megabyte
		queue.budget = { bytes: Infinity, ms: 5 };
		queue.beginFrame();
		expect(ask("a", 500e3)).toBe(true); // 2 ms, measured: 4 ms a MB from now on
		expect(ask("b", 500e3)).toBe(true); // 2 + 2 = 4 ms
		expect(ask("c", 500e3)).toBe(false); // 6 ms would be over
		expect(queue.frame.ms).toBeCloseTo(4);
		expect(queue.predictMs(250e3)).toBeCloseTo(1);
		queue.beginFrame();
		expect(uploaded).toEqual(["a", "b", "c"]);
		// 32 chunks of 600 kB at 2.4 ms each, two a frame: never more than 5 ms of uploading in a frame
		for (let i = 0; i < 32; i++) ask(`chunk${i}`, 600e3);
		let frames = 0, worst = 0;
		while (queue.length > 0) {
			queue.beginFrame();
			worst = Math.max(worst, queue.frame.ms);
			frames++;
		}
		expect(worst).toBeLessThanOrEqual(5);
		expect(frames).toBeGreaterThanOrEqual(16);
	});

	it("puts lower priorities first and lets a waiting one be moved up", () => {
		const { queue, uploaded, ask } = setup();
		queue.budget = { bytes: 1, ms: Infinity };
		queue.beginFrame();
		ask("first", 10); // the frame's first: goes now
		ask("far", 10, 300);
		ask("near", 10, 20);
		ask("middle", 10, 100);
		ask("far", 10, 5); // the camera turned: now the nearest
		const order: string[] = [];
		while (queue.length) {
			queue.beginFrame();
			order.push(uploaded[uploaded.length - 1]);
		}
		expect(order).toEqual(["far", "near", "middle"]);
	});

	it("forgets what's taken out before its turn", () => {
		const { queue, uploaded, ask } = setup();
		queue.budget = { bytes: 1, ms: Infinity };
		queue.beginFrame();
		ask("a", 10);
		ask("b", 10);
		ask("c", 10);
		expect(queue.has("b")).toBe(true);
		expect(queue.remove("b")).toBe(true);
		expect(queue.remove("b")).toBe(false);
		expect(queue.queuedBytes).toBe(10);
		queue.beginFrame();
		queue.beginFrame();
		expect(uploaded).toEqual(["a", "c"]);
	});
});
