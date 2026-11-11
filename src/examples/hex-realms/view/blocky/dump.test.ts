import { writeFileSync } from "fs";
import { CHARACTERS, RIDERS } from "./characters";
import { type DepositLook, depositVox } from "./deposits";
import { separatedBoxes, type Vox } from "./mesh";
import { PROPS } from "./props";

// Writes every blocky model's boxes (and the rigged ones' idle pose) to JSON for tools/blocky_sheet.py, a contact sheet. Skipped unless BLOCKY_DUMP names the file.
const out = process.env.BLOCKY_DUMP;
(out ? test : test.skip)("dump blocky boxes", () => {
	const all: Record<string, unknown> = {};
	const boxes = (v: Vox) => separatedBoxes(v.boxes).map(([lo, hi], i) => [lo, hi, v.boxes[i].c, v.boxes[i].bone]);
	for (const [id, make] of Object.entries({ ...CHARACTERS, ...RIDERS })) {
		const r = make();
		const idle = r.clips.find((c) => c.name === "idle");
		all[id] = { boxes: boxes(r.vox), bones: r.bones, pose: idle ? idle.pose(0) : {} };
	}
	for (const [id, make] of Object.entries(PROPS)) all[id] = { boxes: boxes(make()) };
	for (const look of ["ore", "coal", "gold", "fish", "game", "horses"] as DepositLook[]) all[`deposit:${look}`] = { boxes: boxes(depositVox(look)) };
	writeFileSync(out as string, JSON.stringify(all));
});
