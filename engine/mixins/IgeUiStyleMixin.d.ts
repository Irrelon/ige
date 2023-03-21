import { IgeTexture } from "../core/IgeTexture";
import { IgeObject } from "../core/IgeObject";
import type { Mixin } from "@/types/Mixin";
export type IgeRepeatType = "repeat" | "repeat-x" | "repeat-y" | "no-repeat";
export declare const WithUiStyleMixin: <BaseClassType extends Mixin<IgeObject>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _color: string | CanvasGradient | CanvasPattern;
        _patternRepeat?: IgeRepeatType | undefined;
        _patternTexture?: IgeTexture | undefined;
        _backgroundSize?: {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        _backgroundPosition?: {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        _patternWidth?: number | undefined;
        _patternHeight?: number | undefined;
        _patternFill?: CanvasPattern | undefined;
        _cell: number | null;
        _backgroundColor?: string | CanvasPattern | CanvasGradient | undefined;
        _borderColor?: string | undefined;
        _borderLeftColor?: string | undefined;
        _borderTopColor?: string | undefined;
        _borderRightColor?: string | undefined;
        _borderBottomColor?: string | undefined;
        _borderWidth?: number | undefined;
        _borderLeftWidth?: number | undefined;
        _borderTopWidth?: number | undefined;
        _borderRightWidth?: number | undefined;
        _borderBottomWidth?: number | undefined;
        _borderRadius?: number | undefined;
        _borderTopLeftRadius?: number | undefined;
        _borderTopRightRadius?: number | undefined;
        _borderBottomRightRadius?: number | undefined;
        _borderBottomLeftRadius?: number | undefined;
        _padding?: number | undefined;
        _paddingLeft?: number | undefined;
        _paddingTop?: number | undefined;
        _paddingRight?: number | undefined;
        _paddingBottom?: number | undefined;
        _margin?: number | undefined;
        _marginLeft?: number | undefined;
        _marginTop?: number | undefined;
        _marginRight?: number | undefined;
        _marginBottom?: number | undefined;
        /**
         * Gets / sets the color to use as the font color.
         * @param {CSSColor, CanvasGradient, CanvasPattern=} color
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        color(color: string | CanvasGradient | CanvasPattern): string | CanvasPattern | any | CanvasGradient;
        /**
         * Sets the current background texture and the repeatType
         * to determine in which axis the image should be repeated.
         * @param {IgeTexture=} texture
         * @param {String=} repeatType Accepts "repeat", "repeat-x",
         * "repeat-y" and "no-repeat".
         * @return {*} Returns this if any parameter is specified or
         * the current background image if no parameters are specified.
         */
        backgroundImage(texture?: IgeTexture, repeatType?: IgeRepeatType): CanvasPattern | any | undefined;
        backgroundSize(x?: number | string, y?: number | string): any | {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        /**
         * Gets / sets the color to use as a background when
         * rendering the UI element.
         * @param {CSSColor, CanvasGradient, CanvasPattern=} color
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        backgroundColor(color: string | CanvasGradient | CanvasPattern): string | CanvasPattern | any | CanvasGradient | undefined;
        /**
         * Gets / sets the position to start rendering the background image at.
         * @param {Number=} x
         * @param {Number=} y
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        backgroundPosition(x: number, y: number): any | {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        borderColor(color?: string): string | any | undefined;
        borderLeftColor(color: string): string | any | undefined;
        borderTopColor(color: string): string | any | undefined;
        borderRightColor(color: string): string | any | undefined;
        borderBottomColor(color: string): string | any | undefined;
        borderWidth(px?: number): number | any | undefined;
        borderLeftWidth(px?: number): number | any | undefined;
        borderTopWidth(px?: number): number | any | undefined;
        borderRightWidth(px?: number): number | any | undefined;
        borderBottomWidth(px?: number): number | any | undefined;
        borderRadius(px?: number): number | any | undefined;
        borderTopLeftRadius(px?: number): number | any | undefined;
        borderTopRightRadius(px?: number): number | any | undefined;
        borderBottomLeftRadius(px?: number): number | any | undefined;
        borderBottomRightRadius(px?: number): number | any | undefined;
        padding(args_0: number): this;
        padding(args_0: number, args_1: number, args_2: number, args_3: number): this;
        paddingLeft(px?: number): number | any | undefined;
        paddingTop(px?: number): number | any | undefined;
        paddingRight(px?: number): number | any | undefined;
        paddingBottom(px?: number): number | any | undefined;
        margin(args_0: number): this;
        margin(args_0: number, args_1: number, args_2: number, args_3: number): this;
        marginLeft(px?: number): number | any | undefined;
        marginTop(px?: number): number | any | undefined;
        marginRight(px?: number): number | any | undefined;
        marginBottom(px?: number): number | any | undefined;
        classId: string;
        _id?: string | undefined;
        _idRegistered: boolean;
        _categoryRegistered: boolean;
        _category: string;
        _drawBounds: boolean;
        _drawBoundsData: boolean;
        _drawMouse: boolean;
        _drawMouseData: boolean;
        _ignoreCamera: boolean;
        _parent: IgeObject | null;
        _children: IgeObject[];
        _transformChanged: boolean;
        _tileWidth: number;
        _tileHeight: number;
        _specialProp: string[];
        _streamMode?: import("../../enums/IgeStreamMode").IgeStreamMode | undefined;
        _streamRoomId?: string | undefined;
        _streamDataCache: string;
        _streamJustCreated?: boolean | undefined;
        _streamEmitCreated?: boolean | undefined;
        _streamSections: string[];
        _streamProperty: Record<string, any>;
        _streamSyncInterval?: number | undefined;
        _streamSyncDelta: number;
        _streamSyncSectionInterval: Record<string, number>;
        _streamSyncSectionDelta: Record<string, number>;
        _timeStreamCurrentInterpolateTime?: number | undefined;
        _timeStreamDataDelta?: number | undefined;
        _timeStreamOffsetDelta?: number | undefined;
        _timeStreamPreviousData?: import("../../types/IgeTimeStream").IgeTimeStreamPacket | undefined;
        _timeStreamNextData?: import("../../types/IgeTimeStream").IgeTimeStreamPacket | undefined;
        _timeStream: import("../../types/IgeTimeStream").IgeTimeStreamPacket[];
        _streamFloatPrecision: number;
        _floatRemoveRegExp: RegExp;
        _compositeStream: boolean;
        _disableInterpolation: boolean;
        _streamControl?: ((clientId: string, roomId?: string | undefined) => boolean) | undefined;
        _newBorn: boolean;
        _alive: boolean;
        _mountMode: import("../../enums/IgeMountMode").IgeMountMode;
        _layer: number;
        _depth: number;
        _depthSortMode: import("../../enums/IgeIsometricDepthSortMode").IgeIsometricDepthSortMode;
        _inView: boolean;
        _managed: number;
        _triggerPolygon?: "aabb" | "localBounds3dPolygon" | undefined;
        _compositeCache: boolean;
        _compositeParent: boolean;
        _anchor: import("../core/IgePoint2d").IgePoint2d;
        _renderPos: {
            x: number;
            y: number;
        };
        _computedOpacity: number;
        _opacity: number;
        _deathTime?: number | undefined;
        _bornTime: number;
        _translate: import("../core/IgePoint3d").IgePoint3d;
        _oldTranslate: import("../core/IgePoint3d").IgePoint3d;
        _rotate: import("../core/IgePoint3d").IgePoint3d;
        _scale: import("../core/IgePoint3d").IgePoint3d;
        _origin: import("../core/IgePoint3d").IgePoint3d;
        _bounds2d: import("../core/IgePoint2d").IgePoint2d;
        _oldBounds2d: import("../core/IgePoint2d").IgePoint2d;
        _bounds3d: import("../core/IgePoint3d").IgePoint3d;
        _oldBounds3d: import("../core/IgePoint3d").IgePoint3d;
        _highlight: boolean;
        _pointerEventsActive: boolean;
        _pointerStateDown: boolean;
        _pointerStateOver: boolean;
        _pointerAlwaysInside: boolean;
        _pointerOut?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _pointerOver?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _pointerMove?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _pointerWheel?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _pointerUp?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _pointerDown?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _velocity: import("../core/IgePoint3d").IgePoint3d;
        _localMatrix: import("../core/IgeMatrix2d").IgeMatrix2d;
        _worldMatrix: import("../core/IgeMatrix2d").IgeMatrix2d;
        _oldWorldMatrix: import("../core/IgeMatrix2d").IgeMatrix2d;
        _adjustmentMatrix: import("../core/IgeMatrix2d").IgeMatrix2d;
        _hidden: boolean;
        _cache: boolean;
        _cacheCtx?: import("../../types/IgeCanvasRenderingContext2d").IgeCanvasRenderingContext2d | null | undefined;
        _cacheCanvas?: HTMLCanvasElement | import("../core/IgeDummyCanvas").IgeDummyCanvas | undefined;
        _cacheDirty: boolean;
        _cacheSmoothing: boolean;
        _aabbDirty: boolean;
        _aabb: import("../core/IgeRect").IgeRect;
        _compositeAabbCache?: import("../core/IgeRect").IgeRect | undefined;
        _noAabb?: boolean | undefined;
        _hasParent?: Record<string, boolean> | undefined;
        _texture?: IgeTexture | undefined;
        _indestructible: boolean;
        _shouldRender?: boolean | undefined;
        _smartBackground?: import("../../types/IgeSmartTexture").IgeSmartTexture<IgeObject> | undefined;
        _lastUpdate?: number | undefined;
        _behaviours?: import("../../types/IgeBehaviourStore").IgeBehaviourStore | undefined;
        _birthMount?: string | undefined;
        _frameAlternatorCurrent: boolean;
        _backgroundPattern?: IgeTexture | undefined;
        _backgroundPatternRepeat: string | null;
        _backgroundPatternTrackCamera?: boolean | undefined;
        _backgroundPatternIsoTile?: boolean | undefined;
        _backgroundPatternFill?: CanvasPattern | null | undefined;
        _bounds3dPolygonDirty: boolean;
        _localBounds3dPolygon?: import("../core/IgePoly2d").IgePoly2d | undefined;
        _bounds3dPolygon?: import("../core/IgePoly2d").IgePoly2d | undefined;
        _localAabb?: import("../core/IgeRect").IgeRect | undefined;
        _deathCallBack?: ((...args: any[]) => void) | undefined;
        components: Record<string, import("../core/IgeComponent").IgeComponent<any>>;
        _sortChildren: import("../../types/IgeChildSortFunction").IgeChildSortFunction;
        id(id: string): any;
        id(): string;
        category(val: string): any;
        category(): string;
        drawBounds(id: boolean): any;
        drawBounds(): boolean;
        drawBoundsData(): boolean;
        drawBoundsData(val: boolean): any;
        drawMouse(): boolean;
        drawMouse(val: boolean): any;
        drawMouseData(): boolean;
        drawMouseData(val: boolean): any;
        worldPosition(): import("../core/IgePoint3d").IgePoint3d;
        worldRotationZ(): number;
        localToWorld(points: import("../../types/IgePoint").IgePoint[], viewport?: import("../core/IgeViewport").IgeViewport | null | undefined, inverse?: boolean): void;
        localToWorldPoint(point: import("../core/IgePoint3d").IgePoint3d, viewport?: import("../core/IgeViewport").IgeViewport | null | undefined): void;
        screenPosition(): import("../core/IgePoint3d").IgePoint3d;
        localIsoBoundsPoly(): void;
        localBounds3dPolygon(recalculate?: boolean): import("../core/IgePoly2d").IgePoly2d;
        bounds3dPolygon(recalculate?: boolean): import("../core/IgePoly2d").IgePoly2d;
        update(ctx: import("../../types/IgeCanvasRenderingContext2d").IgeCanvasRenderingContext2d, tickDelta: number): void;
        tick(ctx: import("../../types/IgeCanvasRenderingContext2d").IgeCanvasRenderingContext2d): void;
        updateTransform(): void;
        aabb(recalculate?: boolean, inverse?: boolean): import("../core/IgeRect").IgeRect;
        _processBehaviours(type: import("../../enums/IgeBehaviourType").IgeBehaviourType, ...args: any[]): void;
        parent(): IgeObject | import("../core/IgeTileMap2d").IgeTileMap2d | null | undefined;
        parent(id: string): IgeObject | null;
        children(): IgeObject[];
        mount(obj: IgeObject): any;
        unMount(): false | any;
        hasParent(parentId: string, fresh?: boolean): boolean;
        _childMounted(child: IgeObject): void;
        alive(val: boolean): any;
        alive(): boolean;
        indestructible(): boolean;
        indestructible(val: boolean): any;
        layer(): number;
        layer(val: number): any;
        depth(): number;
        depth(val: number): any;
        destroyChildren(): any;
        isometricMounts(): boolean;
        isometricMounts(val: boolean): any;
        depthSortMode(): import("../../enums/IgeIsometricDepthSortMode").IgeIsometricDepthSortMode;
        depthSortMode(val: import("../../enums/IgeIsometricDepthSortMode").IgeIsometricDepthSortMode): any;
        depthSortChildren(): void;
        _depthSortVisit(u: number, sortObj: import("../../types/IgeDepthSortObject").IgeDepthSortObject): void;
        _resizeEvent(event?: Event | undefined): void;
        _childUnMounted(obj: IgeObject): void;
        _mounted(obj: IgeObject): void;
        _unMounted(obj: IgeObject): void;
        isMounted(): boolean;
        childSortingAlgorithm(val: import("../../types/IgeChildSortFunction").IgeChildSortFunction): any;
        childSortingAlgorithm(): import("../../types/IgeChildSortFunction").IgeChildSortFunction;
        _transformPoint(point: import("../core/IgePoint3d").IgePoint3d): import("../core/IgePoint3d").IgePoint3d;
        addBehaviour<ParentType extends IgeObject = IgeObject>(type: import("../../enums/IgeBehaviourType").IgeBehaviourType, id: string, behaviour: import("../../types/IgeEntityBehaviour").IgeEntityBehaviourMethod<ParentType>): any;
        removeBehaviour(type: import("../../enums/IgeBehaviourType").IgeBehaviourType, id: string): any | undefined;
        hasBehaviour(type: import("../../enums/IgeBehaviourType").IgeBehaviourType, id: string): boolean;
        cache(val?: boolean | undefined, propagateToChildren?: boolean): boolean | any;
        compositeCache(val?: boolean | undefined, propagateToChildren?: boolean): boolean | any;
        cacheDirty(val: boolean): any;
        cacheDirty(): boolean;
        registerNetworkClass(): void;
        disableInterpolation(val?: boolean | undefined): boolean | any;
        compositeStream(val: boolean): any;
        compositeStream(): boolean;
        streamSections(sectionArray?: string[] | undefined): string[] | any;
        streamSectionsPush(sectionName: string): any;
        streamSectionsPull(sectionName: string): any;
        streamProperty(propName: string, propVal?: any): any;
        onStreamProperty(propName: string, propVal: any): any;
        streamMode(val: import("../../enums/IgeStreamMode").IgeStreamMode): any;
        streamMode(): import("../../enums/IgeStreamMode").IgeStreamMode;
        streamControl(method: (clientId: string, roomId?: string | undefined) => boolean): any;
        streamControl(): (clientId: string, roomId?: string | undefined) => boolean;
        streamSyncInterval(val?: number | undefined, sectionId?: string | undefined): number | any | undefined;
        streamFloatPrecision(val?: number | undefined): number | any;
        streamSync(clientIds?: string[] | undefined): any;
        streamCreateConstructorArgs(): any[] | undefined;
        streamCreateInitialData(): any;
        onStreamCreateInitialData(data: any): void;
        streamEmitCreated(val?: boolean | undefined): boolean | any | undefined;
        _queueStreamDataToSend(recipientArr?: string[], streamRoomId?: string | undefined): void;
        streamForceUpdate(): any;
        sendStreamCreate(clientId?: string | string[] | undefined): boolean;
        streamSectionData(sectionId: string, data?: string | undefined, bypassTimeStream?: boolean, bypassChangeDetection?: boolean): string | undefined;
        streamDestroy(clientId?: string | undefined): boolean;
        _generateStreamData(): string;
        destroyBehaviours(): void;
        destroy(): any;
        compositeAabb(inverse?: boolean): import("../core/IgeRect").IgeRect;
        stringify(options?: Record<string, boolean>): string;
        _stringify(options?: Record<string, boolean>): string;
        addComponent(id: string, Component: typeof import("../core/IgeComponent").IgeComponent, options?: any): any;
        removeComponent(id: string): any;
        _eventsProcessing: boolean;
        _eventRemovalQueue: any[];
        _eventListeners?: import("./IgeEventingMixin").IgeEventListenerRegister | undefined;
        on(eventName: string | string[], callback: (...args: any) => void, context?: any, oneShot?: boolean, sendEventName?: boolean): import("./IgeEventingMixin").IgeEventListenerObject | import("./IgeEventingMixin").IgeMultiEventListenerObject | undefined;
        off(eventName: string, evtListener: import("./IgeEventingMixin").IgeEventListenerObject | import("./IgeEventingMixin").IgeMultiEventListenerObject | undefined, callback?: import("./IgeEventingMixin").IgeEventRemovalResultCallback | undefined): boolean | -1;
        emit(eventName: string, args?: any): number;
        eventList(): import("./IgeEventingMixin").IgeEventListenerRegister | undefined;
        _processRemovals(): void;
        _data: Record<string, any>;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
