import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgePanelViewport } from "@/engine/core/IgePanelViewport";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeAudioSource } from "@/engine/components/audio/IgeAudioSource";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { igeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { IgeParticleSystem3d } from "@/engine/webgl/IgeParticleSystem3d";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import { timeline } from "@/engine/timeline/IgeTimelineBuilder";
import { IgeTimeline } from "@/engine/timeline/IgeTimeline";
import { IgeRecorderEffect } from "@/engine/webgl/IgeRecorderEffect";
import type { IgeCanInit } from "@/types/IgeCanInit";

// @ts-ignore
window.ige = ige;

/** A short decaying sine as a WAV file (so the example needs no sound files): a blob URL the audio source loads. */
function toneUrl (freq: number, seconds: number, decay: boolean, volume = 0.5): string {
	const rate = 22050;
	const n = Math.floor(rate * seconds);
	const buf = new ArrayBuffer(44 + n * 2);
	const v = new DataView(buf);
	const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
	str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt ");
	v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
	v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
	str(36, "data"); v.setUint32(40, n * 2, true);
	for (let i = 0; i < n; i++) {
		const env = decay ? Math.exp((-4 * i) / n) : 1;
		// A looping hum has whole cycles, so it loops without a click
		v.setInt16(44 + i * 2, Math.sin((2 * Math.PI * freq * i) / rate) * env * volume * 32767, true);
	}
	return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

/**
 * Timeline example (guides/timeline.md): a scripted scene in a panel over the game's own view. The panel's scene
 * is played from timeline data: a man walking (a skeletal animation track), a beacon that appears, moves, changes
 * colour and fades (position, visibility, colour, opacity), a cube turning by quaternion, sparks (particle cues,
 * which replay the same when you scrub), camera cuts, captions, a sound and an event. Play, pause, rewind and
 * drag the bar to scrub; the picture at a time is the same however you get there.
 * The panel has a recorder look (IgeRecorderEffect, guides/recorder-effect.md): P cycles the presets (site recorder,
 * warship camera, precursor memory, none). Its grain, flicker and random dropouts come from the timeline's time, so a
 * paused frame holds still and scrubbing back gives the same picture; the scene spikes a dropout at 3.2s.
 * ?t=4.6 starts at a time, ?paused=1 starts paused, ?preset=warshipCamera starts on a preset.
 */
export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	playback?: IgeTimeline;

	constructor () {
		super();
		void this.init();
	}

	async init () {
		const renderer = new IgeWebGlRenderer();
		ige.engine.renderer(renderer);
		await renderer.setup();
		renderer.createFrontBuffer(true);
		await ige.engine.start();

		this.mainView(renderer);
		const { panel, playScene } = await this.playbackPanel(renderer);
		this.controls(panel, playScene);
	}

	/** The "game": a floor with a few cubes circling, which the panel sits over. */
	mainView (renderer: IgeWebGlRenderer) {
		const scene = new IgeScene2d().id("mainScene");
		const viewport = new IgeViewport().id("mainView").autoSize(true).scene(scene).mount(ige.engine);
		const camera = viewport.camera;
		camera.projectionType("perspective");
		camera.fov(55);
		camera.near(1);
		camera.far(5000);
		camera.translateTo(0, 260, 520);
		camera.lookAtPoint(new IgePoint3d(0, 20, 0));

		const lights = renderer.lightManager!;
		const ambient = new IgeAmbientLight();
		ambient.intensity(0.6);
		ambient.mount(scene);
		lights.addLight(ambient);
		const sun = new IgeDirectionalLight();
		sun.intensity(1.1);
		sun.direction(-0.4, -0.8, -0.5);
		sun.mount(scene);
		lights.addLight(sun);

		const floor = new IgeEntity();
		floor._geometryData = { ...IgePrimitiveGeometry.createPlane(1200, 1200, "tl_main_floor"), id: "tl_main_floor" };
		floor.material({ color: { r: 0.18, g: 0.22, b: 0.3, a: 1 }, metallic: 0, roughness: 0.9 });
		floor.rotateTo(-Math.PI / 2, 0, 0).mount(scene);

		for (let i = 0; i < 5; i++) {
			const cube = new IgeEntity();
			cube._geometryData = { ...IgePrimitiveGeometry.createCube(50, `tl_main_cube${i}`), id: `tl_main_cube${i}` };
			cube.material({ color: { r: 0.3 + i * 0.12, g: 0.6, b: 1 - i * 0.15, a: 1 } });
			cube.mount(scene);
			let a = (i / 5) * Math.PI * 2;
			cube.addBehaviour(IgeBehaviourType.preUpdate, "circle", () => {
				a += 0.004 + i * 0.0006;
				cube.translateTo(Math.cos(a) * (200 + i * 40), 25, Math.sin(a) * (200 + i * 40));
				cube.rotateTo(0, a * 2, 0);
			});
		}
	}

	async playbackPanel (renderer: IgeWebGlRenderer) {
		const playScene = new IgeScene2d().id("playbackScene");
		const panel = new IgePanelViewport({ right: 16, top: 16, width: "42%", aspect: 16 / 9 });
		panel.scene(playScene);
		panel.samples = 4;

		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.55, 0.6, 0.7);
		ambient.intensity(0.55);
		const sun = new IgeDirectionalLight();
		sun.intensity(1.2);
		sun.direction(-0.4, -0.8, -0.3);
		sun.shadowBias(0);
		panel.lights.addLight(ambient);
		panel.lights.addLight(sun);

		// Three cameras for cuts; the panel's camera is fixed otherwise
		const look = new IgePoint3d(0, 50, 0);
		panel.camera.projectionType("perspective");
		panel.camera.translateTo(0, 160, 420);
		panel.camera.lookAtPoint(look);
		const wide = panel.newCamera("wide");
		wide.projectionType("perspective");
		wide.translateTo(-230, 120, 190);
		wide.lookAtPoint(look);
		const close = panel.newCamera("close");
		close.projectionType("perspective");
		close.translateTo(70, 110, 200);
		close.lookAtPoint(new IgePoint3d(0, 60, 0));
		panel.fog({ mode: "linear", color: { r: 0.05, g: 0.07, b: 0.1 }, near: 500, far: 1400 });

		// The scene's things, named for the timeline
		const floor = new IgeEntity();
		floor._geometryData = { ...IgePrimitiveGeometry.createPlane(900, 900, "tl_floor"), id: "tl_floor" };
		floor.material({ color: { r: 0.25, g: 0.27, b: 0.3, a: 1 }, metallic: 0, roughness: 0.95 });
		floor.rotateTo(-Math.PI / 2, 0, 0).mount(playScene);

		const beacon = new IgeEntity().id("beacon");
		beacon._geometryData = { ...IgePrimitiveGeometry.createCube(40, "tl_beacon"), id: "tl_beacon" };
		beacon.material({ color: { r: 1, g: 0.3, b: 0.2, a: 1 }, metallic: 0.1, roughness: 0.5 });
		beacon.mount(playScene);

		const spinner = new IgeEntity().id("spinner");
		spinner._geometryData = { ...IgePrimitiveGeometry.createCube(50, "tl_spinner"), id: "tl_spinner" };
		spinner.material({ color: { r: 0.9, g: 0.8, b: 0.2, a: 1 }, metallic: 0.3, roughness: 0.4 });
		spinner.translateTo(-150, 30, -120).mount(playScene);

		// rate 0: the timeline's particle cues do the emitting (and replay it when you scrub)
		const sparks = new IgeParticleSystem3d({
			rate: 0,
			maxParticles: 300,
			spread: 1.2,
			speed: [60, 220],
			lifetime: [0.5, 1.2],
			gravity: { x: 0, y: -260, z: 0 },
			size: [14, 3],
			emitterRadius: 6
		}).mount(playScene) as IgeParticleSystem3d;

		const manModel = await igeGltfLoader.load("../../assets/models/CesiumMan.glb", "tlMan");
		const clip = (manModel.animations?.[0]?.name || manModel.animations?.[0]?.id) as string;
		const man = new IgeEntity().model(manModel, { animation: clip }).scaleTo(100, 100, 100).mount(playScene) as IgeEntity;
		// Exact poses while scrubbing (the shared pose cache is for crowds)
		man.skeletalAnimation()?.poseCache(false);

		// A sound to cue (made here so there are no files to ship)
		new IgeAudioSource("tlPing", toneUrl(880, 0.5, true));
		new IgeAudioSource("tlHum", toneUrl(110, 2, false, 0.15));

		// The scene, as data. build() gives plain JSON; this could as well be loaded from a file.
		const data = timeline({ duration: 10 })
			.track("man", (t) =>
				t
					.at(0, { position: { x: -220, y: 0, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, animation: { clip, time: 0 } })
					.at(4, { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } })
					// He stops and turns to face us (the clip holds a pose), then walks off
					.at(5, { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, animation: { clip, time: 0.4, speed: 0 } }, "smooth")
					.at(5.8, { animation: { clip, time: 0.4, speed: 1 } })
					.at(10, { position: { x: 160, y: 0, z: 140 }, rotation: { x: 0, y: Math.PI / 4, z: 0 } })
			)
			.track("beacon", (t) =>
				t
					.at(0, { visible: false, opacity: 0, position: { x: 120, y: 20, z: -150 }, color: { r: 1, g: 0.25, b: 0.2 } })
					.at(1.5, { visible: true, opacity: 0 }, "smooth")
					.at(2.5, { opacity: 1, position: { x: 120, y: 20, z: -150 } }, "smooth")
					.at(7, { position: { x: 120, y: 90, z: 100 }, color: { r: 0.2, g: 0.9, b: 1 }, scale: { x: 1, y: 1, z: 1 } }, "smooth")
					.at(9, { opacity: 0 })
					.at(9.5, { visible: false })
			)
			.track("spinner", (t) =>
				t
					.at(0, { quaternion: { x: 0, y: 0, z: 0, w: 1 } })
					.at(3, { quaternion: { x: 0, y: Math.sin(Math.PI / 3), z: 0, w: Math.cos(Math.PI / 3) } }, "smooth")
					.at(6, { quaternion: { x: Math.sin(Math.PI / 3) * 0.7, y: 0.4, z: 0, w: Math.cos(Math.PI / 3) } }, "smooth")
					.at(10, { quaternion: { x: 0, y: 0, z: 0, w: 1 } })
			)
			// The recorder look's dropout, spiked by the scene when the hatch blows at 3.2s (and a small one at the last cut)
			.track("panel", (t) =>
				t
					.at(0, { effect: { dropout: 0 } })
					.at(3.2, { effect: { dropout: 1 } }, "smooth")
					.at(3.55, { effect: { dropout: 0.55 } }, "smooth")
					.at(3.9, { effect: { dropout: 0 } }, "step")
					.at(6.5, { effect: { dropout: 0.45 } })
					.at(6.6, { effect: { dropout: 0 } })
			)
			.cut("panel", 0, "main")
			.cut("panel", 3.5, "wide")
			.cut("panel", 6.5, "close")
			.cut("panel", 8.5, "main")
			.caption(0.4, 3, "Recorder", "Site 7 camera two. Recording.")
			.caption(3.2, 6, "Foreman", "Did you hear that? Something's down there.")
			.caption(6.2, 9.4, "Foreman", "Log it. We're pulling out.")
			.sound(3, "tlPing")
			.sound(1, "tlHum", { loop: true, end: 9, volume: 0.6 })
			.event(3, "sparks", { where: "hatch" })
			.particles("sparks", 3, { count: 60, position: { x: 0, y: 30, z: -40 }, direction: { x: 0, y: 1, z: 0 }, seed: 11 })
			.particles("sparks", 5, { rate: 50, until: 6.5, position: { x: 60, y: 30, z: 0 }, direction: { x: 0, y: 1, z: 0.3 } })
			.build();

		// The recorder look: its noise follows the timeline's time (the timeline sets it when bound to the panel)
		const params = new URLSearchParams(window.location.search);
		const presets = ["siteRecorder", "warshipCamera", "precursorMemory"];
		let presetIndex = Math.max(0, presets.indexOf(params.get("preset") || ""));
		panel.effect = new IgeRecorderEffect(presets[presetIndex]);
		(window as any).recorderPreset = (name: string | null) => {
			if (name === null) panel.effect = null;
			else if (panel.effect instanceof IgeRecorderEffect) panel.effect.preset(name);
			else panel.effect = new IgeRecorderEffect(name);
			this.playback?.apply();
			const label = document.getElementById("preset");
			if (label) label.textContent = name ?? "none";
		};
		window.addEventListener("keydown", (e) => {
			if (e.key !== "p" && e.key !== "P") return;
			// site, warship, memory, none, ...
			presetIndex = (presetIndex + 1) % (presets.length + 1);
			(window as any).recorderPreset(presets[presetIndex] ?? null);
		});

		this.playback = new IgeTimeline(data).bind({ man, beacon, spinner, sparks, panel }).attach(playScene);
		this.playback.on("event", (cue: any) => {
			const log = document.getElementById("log");
			if (log) log.textContent = `event "${cue.name}" ${JSON.stringify(cue.data)} at ${cue.at}s`;
		});

		renderer.addPanel(panel);
		panel.enableShadows(sun, 1024);
		panel.show();
		(window as any).timeline = this.playback;
		(window as any).panel = panel;
		return { panel, playScene };
	}

	controls (panel: IgePanelViewport, _playScene: IgeScene2d) {
		const playback = this.playback!;
		const bar = document.createElement("div");
		bar.id = "bar";
		bar.innerHTML = `
			<div>
				<button id="rewind">&#9198; Rewind</button>
				<button id="play">Pause</button>
				<button id="loop">Loop: off</button>
				<span>Look (P): <b id="preset">${new URLSearchParams(window.location.search).get("preset") || "siteRecorder"}</b></span>
				<span id="time" style="float:right"></span>
			</div>
			<input id="scrub" type="range" min="0" max="${playback.duration()}" step="0.01" value="0" />
			<div id="log">Drag the bar to scrub.</div>`;
		document.body.appendChild(bar);
		const caption = document.createElement("div");
		caption.id = "caption";
		document.body.appendChild(caption);

		const $ = (id: string) => document.getElementById(id) as HTMLElement;
		const scrub = $("scrub") as HTMLInputElement;
		let dragging = false;

		$("play").onclick = () => {
			(ige as any).audio?.interact?.();
			if (playback.playing()) playback.pause();
			else playback.play();
		};
		$("rewind").onclick = () => playback.seek(0);
		$("loop").onclick = () => {
			playback.loop(!playback.loop());
			$("loop").textContent = `Loop: ${playback.loop() ? "on" : "off"}`;
		};
		scrub.oninput = () => {
			dragging = true;
			playback.seek(parseFloat(scrub.value));
		};
		scrub.onchange = () => (dragging = false);

		const text = (list: Array<{ speaker?: string; text: string }>) =>
			list.map((c) => (c.speaker ? `<b>${c.speaker}:</b> ` : "") + c.text).join("<br>");
		playback.on("captions", (list: any[]) => {
			caption.innerHTML = text(list);
			caption.style.display = list.length ? "block" : "none";
		});

		const tick = () => {
			if (!dragging) scrub.value = String(playback.time());
			$("time").textContent = `${playback.time().toFixed(2)} / ${playback.duration().toFixed(1)}s`;
			$("play").textContent = playback.playing() ? "Pause" : "Play";
			// The caption sits along the bottom of the panel
			const r = panel.rect();
			caption.style.left = `${r.x}px`;
			caption.style.width = `${r.width}px`;
			caption.style.top = `${r.y + r.height - 56}px`;
			requestAnimationFrame(tick);
		};
		tick();

		const params = new URLSearchParams(window.location.search);
		const start = parseFloat(params.get("t") || "0");
		if (start > 0) playback.seek(start);
		if (params.get("paused") !== "1") playback.play();
		else playback.apply();
		playback.apply();
	}
}
