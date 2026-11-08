import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgeViewport } from "../core/IgeViewport.js";
import type { IgeWebGlRenderer } from "../core/IgeWebGlRenderer.js"
type Vec3 = {
    x: number;
    y: number;
    z: number;
};
export interface IgeOverlayMarkerOptions {
    /** Follow this entity's world position (markers hide while it is hidden). */
    entity?: IgeEntity;
    /** Or stay at a fixed world position. */
    position?: Vec3;
    /** World-space offset from the entity or position, e.g. above a head. */
    offset?: Vec3;
    /** Only show in these viewports (default: every viewport). */
    viewports?: IgeViewport[];
    /**
     * Create the element for one viewport. Called once for each viewport
     * the marker is shown in, so split-screen views each get their own.
     * The element is centred on the marker's screen position.
     */
    create: (viewport: IgeViewport) => HTMLElement;
    /** Called each update while the marker is on screen, e.g. to set a bar's width. */
    update?: (element: HTMLElement, viewport: IgeViewport) => void;
}
export interface IgeOverlayMarker {
    options: IgeOverlayMarkerOptions;
    /** The marker's element in each viewport it has been shown in. */
    elements: Map<IgeViewport, HTMLElement>;
    /** Last position written per element, to skip unchanged style writes. */
    lastTransform: Map<HTMLElement, string>;
    /** Remove the marker and its elements. */
    remove: () => void;
}
/**
 * DOM elements (health bars, name tags, damage numbers, waypoint markers)
 * kept over world positions in each viewport of an IgeWebGlRenderer.
 *
 * Every viewport gets its own clipping layer over its area of the canvas,
 * so in split screen a marker never spills into a neighbouring view, and
 * each view gets its own copy of a marker. Markers are positioned after
 * every rendered frame; ones behind the camera or outside the view are
 * hidden.
 * @example #A name tag over every player in every view
 *     const overlay = new IgeViewportOverlay(renderer);
 *     overlay.add({
 *         entity: player,
 *         offset: { x: 0, y: 180, z: 0 },
 *         create: () => Object.assign(document.createElement("div"), { textContent: "P1", className: "tag" })
 *     });
 */
export declare class IgeViewportOverlay {
    protected _renderer: IgeWebGlRenderer;
    protected _root: HTMLElement;
    protected _layers: Map<IgeViewport, HTMLElement>;
    protected _layerRects: Map<IgeViewport, string>;
    protected _markers: Set<IgeOverlayMarker>;
    protected _behaviourId: string;
    /**
     * @param renderer The renderer whose viewports to follow.
     * @param container Element to put the overlay in (default: the
     * canvas's parent). It should be positioned so the overlay can sit over
     * the canvas.
     */
    constructor(renderer: IgeWebGlRenderer, container?: HTMLElement);
    /** Add a marker. Returns a handle with remove(). */
    add(options: IgeOverlayMarkerOptions): IgeOverlayMarker;
    /** Remove a marker and its elements. */
    remove(marker: IgeOverlayMarker): void;
    /** Remove every marker. */
    clear(): void;
    /** Remove the overlay from the page and stop updating it. */
    destroy(): void;
    /**
     * Position every marker. Called automatically after each engine tick;
     * call it yourself only if you move things between ticks.
     */
    update(): void;
    /** World position of a marker, or null when its entity is hidden or gone. */
    protected _worldPosition(o: IgeOverlayMarkerOptions): Vec3 | null;
    /** The clipping layer covering a viewport's area of the canvas. */
    protected _layerFor(viewport: IgeViewport, canvasHeight: number): HTMLElement;
}
export {};
