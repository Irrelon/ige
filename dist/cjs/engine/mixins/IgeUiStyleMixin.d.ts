import type { IgeObject } from "../core/IgeObject.js"
import type { IgeTexture } from "../core/IgeTexture.js";
import type { IgeMixin } from "../../types/IgeMixin.js"
import type { IgeRepeatType } from "../../types/IgeRepeatType.js"
export declare const WithUiStyleMixin: <BaseClassType extends IgeMixin<IgeObject>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _color: string | CanvasGradient | CanvasPattern;
        _patternRepeat?: IgeRepeatType;
        _patternTexture?: IgeTexture;
        _backgroundSize?: {
            x: number | "auto";
            y: number | "auto";
        };
        _backgroundPosition?: {
            x: number | "auto";
            y: number | "auto";
        };
        _patternWidth?: number;
        _patternHeight?: number;
        _patternFill?: CanvasPattern;
        _cell: number;
        _backgroundColor?: string | CanvasGradient | CanvasPattern;
        _borderColor?: string;
        _borderLeftColor?: string;
        _borderTopColor?: string;
        _borderRightColor?: string;
        _borderBottomColor?: string;
        _borderWidth?: number;
        _borderLeftWidth?: number;
        _borderTopWidth?: number;
        _borderRightWidth?: number;
        _borderBottomWidth?: number;
        _borderRadius?: number;
        _borderTopLeftRadius?: number;
        _borderTopRightRadius?: number;
        _borderBottomRightRadius?: number;
        _borderBottomLeftRadius?: number;
        _padding?: number;
        _paddingLeft?: number;
        _paddingTop?: number;
        _paddingRight?: number;
        _paddingBottom?: number;
        _margin?: number;
        _marginLeft?: number;
        _marginTop?: number;
        _marginRight?: number;
        _marginBottom?: number;
        /**
         * Gets / sets the color to use as the font color.
         * @param {CSSColor, CanvasGradient, CanvasPattern=} color
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        color(color: string | CanvasGradient | CanvasPattern): string | CanvasGradient | CanvasPattern | any;
        /**
         * Sets the current background texture and the repeatType
         * to determine in which axis the image should be repeated.
         * @param {IgeTexture=} texture
         * @param {string=} repeatType Accepts "repeat", "repeat-x",
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
        backgroundColor(color: string | CanvasGradient | CanvasPattern): any;
        /**
         * Gets / sets the color to use as a background when
         * rendering the UI element.
         * @param {CSSColor, CanvasGradient, CanvasPattern=} color
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        backgroundColor(): string | CanvasGradient | CanvasPattern | undefined;
        /**
         * Gets / sets the position to start rendering the background image at.
         * @param {number=} x
         * @param {number=} y
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
        padding(args_0: number): any;
        padding(args_0: number, args_1: number, args_2: number, args_3: number): any;
        paddingLeft(px?: number): number | any | undefined;
        paddingTop(px?: number): number | any | undefined;
        paddingRight(px?: number): number | any | undefined;
        paddingBottom(px?: number): number | any | undefined;
        margin(args_0: number): any;
        margin(args_0: number, args_1: number, args_2: number, args_3: number): any;
        marginLeft(px?: number): number | any | undefined;
        marginTop(px?: number): number | any | undefined;
        marginRight(px?: number): number | any | undefined;
        marginBottom(px?: number): number | any | undefined;
        classId: string;
        _id?: string;
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
        _tileDepth: number;
        _orphans?: IgeObject[];
        _streamMode?: import("../..").IgeStreamMode;
        _streamRoomId?: string;
        _streamDataCache: string;
        _streamJustCreated?: boolean;
        _streamEmitCreated?: boolean;
        _streamSections: string[];
        _streamProperty: Record<string, any>;
        _streamSyncInterval?: number;
        _streamSyncDelta: number;
        _streamSyncSectionInterval: Record<string, number>;
        _streamSyncSectionDelta: Record<string, number>;
        _timeStreamCurrentInterpolateTime?: number;
        _timeStreamDataDelta?: number;
        _timeStreamOffsetDelta?: number;
        _timeStreamPreviousData?: import("../..").IgeTimeStreamPacket;
        _timeStreamNextData?: import("../..").IgeTimeStreamPacket;
        _timeStream: import("../..").IgeTimeStreamPacket[];
        _streamFloatPrecision: number;
        _floatRemoveRegExp: RegExp;
        _compositeStream: boolean;
        _disableInterpolation: boolean;
        _streamControl?: ((clientId: string, roomId?: string) => boolean) | undefined;
        _newBorn: boolean;
        _alive: boolean;
        _mountMode: import("../..").IgeMountMode;
        _layer: number;
        _depth: number;
        _depthSortMode: import("../..").IgeIsometricDepthSortMode;
        _inView: boolean;
        _managed: number;
        _triggerPolygonFunctionName: import("../..").IgeTriggerPolygonFunctionName;
        _compositeCache: boolean;
        _compositeParent: boolean;
        _anchor: import("../..").IgePoint2d;
        _renderPos: {
            x: number;
            y: number;
        };
        _computedOpacity: number;
        _opacity: number;
        _deathTime?: number;
        _bornTime: number;
        _translate: import("../..").IgePoint3d;
        _oldTranslate: import("../..").IgePoint3d;
        _rotate: import("../..").IgePoint3d;
        _scale: import("../..").IgePoint3d;
        _origin: import("../..").IgePoint3d;
        _bounds2d: import("../..").IgePoint2d;
        _oldBounds2d: import("../..").IgePoint2d;
        _bounds3d: import("../..").IgePoint3d;
        _oldBounds3d: import("../..").IgePoint3d;
        _highlight: boolean;
        _pointerEventsActive: boolean;
        _pointerStateDown: boolean;
        _pointerStateOver: boolean;
        _pointerAlwaysInside: boolean;
        _pointerOut?: import("../..").IgeInputEventHandler<PointerEvent | TouchEvent>;
        _pointerOver?: import("../..").IgeInputEventHandler<PointerEvent | TouchEvent>;
        _pointerMove?: import("../..").IgeInputEventHandler<PointerEvent | TouchEvent>;
        _pointerWheel?: import("../..").IgeInputEventHandler<WheelEvent>;
        _pointerUp?: import("../..").IgeInputEventHandler<PointerEvent | TouchEvent>;
        _pointerDown?: import("../..").IgeInputEventHandler<PointerEvent | TouchEvent>;
        _velocity: import("../..").IgePoint3d;
        _localMatrix: import("../..").IgeMatrix2d;
        _worldMatrix: import("../..").IgeMatrix2d;
        _oldWorldMatrix: import("../..").IgeMatrix2d;
        _adjustmentMatrix?: import("../..").IgeMatrix2d;
        _hidden: boolean;
        _cache: boolean;
        _cacheCtx?: import("../..").IgeCanvasRenderingContext2d | null;
        _cacheCanvas?: OffscreenCanvas | import("../..").IgeDummyCanvas;
        _cacheDirty: boolean;
        _cacheSmoothing: boolean;
        _aabbDirty: boolean;
        _aabb: import("../..").IgeBounds;
        _compositeAabbCache?: import("../..").IgeBounds;
        _noAabb?: boolean;
        _hasParent?: Record<string, boolean>;
        _texture?: IgeTexture;
        _indestructible: boolean;
        _shouldRender?: boolean;
        _smartBackground?: import("../..").IgeSmartTexture;
        _lastUpdate?: number;
        _behaviours?: import("../..").IgeBehaviourStore;
        _birthMount?: string;
        _frameAlternatorCurrent: boolean;
        _backgroundPattern?: IgeTexture;
        _backgroundPatternRepeat: string | null;
        _backgroundPatternTrackCamera?: boolean;
        _backgroundPatternIsoTile?: boolean;
        _backgroundPatternFill?: CanvasPattern | null;
        _bounds3dPolygonDirty: boolean;
        _localBounds3dPolygon?: import("../..").IgePoly2d;
        _bounds3dPolygon?: import("../..").IgePoly2d;
        _localAabb?: import("../..").IgeBounds;
        _geometryData: import("../../types/IgeGeometryData3d").IgeGeometryData3d | null;
        _materialData: import("../../types/IgeMaterialData").IgeMaterialData | null;
        _meshData: import("../../types/IgeMeshData3d").IgeMeshData3d | null;
        _deathCallBack?: ((...args: any[]) => void) | undefined;
        components: Record<string, import("../..").IgeComponent<IgeObject>>;
        _sortChildren: import("../..").IgeChildSortFunction;
        id(id: string): any;
        id(): string;
        category(val: string): any;
        category(): string;
        drawBounds(): boolean;
        drawBounds(val: boolean, recursive?: boolean): any;
        drawBoundsData(): boolean;
        drawBoundsData(val: boolean): any;
        drawMouse(): boolean;
        drawMouse(val: boolean): any;
        drawMouseData(val: boolean): any;
        drawMouseData(): boolean;
        worldPosition(): import("../..").IgePoint3d;
        worldRotationZ(): number;
        localToWorld(points: import("../..").IgePoint[], viewport?: import("../..").IgeViewport | null, inverse?: boolean): void;
        localToWorldPoint(point: import("../..").IgePoint3d, viewport?: import("../..").IgeViewport | null): void;
        screenPosition(): import("../..").IgePoint3d;
        localBounds3dPolygon(recalculate?: boolean): import("../..").IgePoly2d;
        bounds3dPolygon(recalculate?: boolean): import("../..").IgePoly2d;
        statStart(funcName: string, statType: string): number;
        statEnd(funcName: string, statType: string): number;
        statCutOff(): void;
        update(tickDelta: number): void;
        tick(ctx: import("../..").IgeCanvasRenderingContext2d): void;
        updateTransform(): void;
        aabb(recalculate?: boolean, inverse?: boolean): import("../..").IgeBounds;
        _processBehaviours(type: import("../..").IgeBehaviourType, ...args: any[]): void;
        parent(): IgeObject | import("../..").IgeTileMap2d | null | undefined;
        parent(id: string): IgeObject | null;
        children(): IgeObject[];
        mount(obj: IgeObject): any;
        unMount(): any;
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
        depthSortMode(): import("../..").IgeIsometricDepthSortMode;
        depthSortMode(val: import("../..").IgeIsometricDepthSortMode): any;
        depthSortChildren(): void;
        _depthSortVisit(u: number, sortObj: import("../..").IgeDepthSortObject): void;
        _resizeEvent(event?: Event): void;
        _childUnMounted(obj: IgeObject): void;
        _mounted(obj: IgeObject): void;
        _unMounted(obj: IgeObject): void;
        isMounted(): boolean;
        childSortingAlgorithm(val: import("../..").IgeChildSortFunction): any;
        childSortingAlgorithm(): import("../..").IgeChildSortFunction;
        _transformPoint(point: import("../..").IgePoint3d): import("../..").IgePoint3d;
        addBehaviour<ParentType extends IgeObject = IgeObject>(type: import("../..").IgeBehaviourType, id: string, behaviour: import("../..").IgeEntityBehaviourMethod<ParentType>): any;
        removeBehaviour(type: import("../..").IgeBehaviourType, id: string): any | undefined;
        hasBehaviour(type: import("../..").IgeBehaviourType, id: string): boolean;
        cache(val: boolean, propagateToChildren?: boolean): any;
        cache(): boolean;
        compositeCache(val: boolean, propagateToChildren?: boolean): any;
        compositeCache(): boolean;
        cacheDirty(val: boolean): any;
        cacheDirty(): boolean;
        registerNetworkClass(): void;
        translateTo(x?: number, y?: number, z?: number): any;
        translateBy(x: number, y: number, z: number): any;
        scaleTo(x: number, y: number, z: number): any;
        scaleBy(x: number, y: number, z: number): any;
        rotateBy(x: number, y: number, z: number): any;
        rotateTo(x: number, y: number, z: number): any;
        originTo(x: number, y: number, z: number): any;
        disableInterpolation(val: boolean): any;
        disableInterpolation(): boolean;
        compositeStream(val: boolean): any;
        compositeStream(): boolean;
        streamSections(sectionArray: string[]): any;
        streamSections(): string[];
        streamSectionsPush(sectionName: string): any;
        streamSectionsPull(sectionName: string): any;
        streamProperty(propName: string, propVal: any): any;
        streamProperty(propName: string): any;
        onStreamProperty(propName: string, propVal: any): any;
        streamMode(val: import("../..").IgeStreamMode): any;
        streamMode(): import("../..").IgeStreamMode;
        streamControl(method: (clientId: string, roomId?: string) => boolean): any;
        streamControl(): (clientId: string, roomId?: string) => boolean;
        streamSyncInterval(val: number, sectionId: string): any;
        streamSyncInterval(): number;
        streamFloatPrecision(val: number): any;
        streamFloatPrecision(): number;
        streamSync(clientIds?: string[]): any;
        streamCreateConstructorArgs(): any[] | undefined;
        streamCreateInitialData(): any;
        onStreamCreateInitialData(data: any): void;
        streamEmitCreated(val: boolean): any;
        streamEmitCreated(): boolean;
        _queueStreamDataToSend(recipientArr?: string[], streamRoomId?: string): void;
        streamForceUpdate(): any;
        sendStreamCreate(clientId?: string | string[]): boolean;
        streamSectionData(sectionId: string, data?: string, bypassTimeStream?: boolean, bypassChangeDetection?: boolean): string | undefined;
        streamDestroy(clientId?: string): boolean;
        _generateStreamData(): string;
        destroyBehaviours(): void;
        destroy(): any;
        compositeAabb(inverse?: boolean): import("../..").IgeBounds;
        stringify(options?: Record<keyof IgeObject | string, boolean>): string;
        _stringify(options?: Record<keyof IgeObject | string, boolean>): string;
        addComponent(id: string, Component: {
            new (parent: IgeObject, options?: any): import("../..").IgeComponent<IgeObject>;
        }, options?: any): any;
        removeComponent(id: string): any;
        geometryData(): import("../../types/IgeGeometryData3d").IgeGeometryData3d | null;
        geometryData(val: import("../../types/IgeGeometryData3d").IgeGeometryData3d): any;
        geometryData(val?: import("../../types/IgeGeometryData3d").IgeGeometryData3d): any | import("../../types/IgeGeometryData3d").IgeGeometryData3d | null;
        materialData(): import("../../types/IgeMaterialData").IgeMaterialData | null;
        materialData(val: import("../../types/IgeMaterialData").IgeMaterialData): any;
        materialData(val?: import("../../types/IgeMaterialData").IgeMaterialData): any | import("../../types/IgeMaterialData").IgeMaterialData | null;
        meshData(): import("../../types/IgeMeshData3d").IgeMeshData3d | null;
        meshData(val: import("../../types/IgeMeshData3d").IgeMeshData3d): any;
        meshData(val?: import("../../types/IgeMeshData3d").IgeMeshData3d): any | import("../../types/IgeMeshData3d").IgeMeshData3d | null;
        _eventsEmitting: boolean;
        _eventRemovalQueue: any[];
        _eventListeners?: Record<string, Record<string, import("../..").IgeEventListenerCallback[]>>;
        _eventStaticEmitters: Record<string, import("../..").IgeEventStaticEmitterObject[]>;
        _eventsAllowDefer: boolean;
        _eventsDeferTimeouts: Record<any, number>;
        _on(eventName: string, id: string, listener: import("../..").IgeEventListenerCallback): any;
        _once(eventName: string, id: string, listener: import("../..").IgeEventListenerCallback): any;
        _off(eventName: string, id: string, listener?: import("../..").IgeEventListenerCallback): any;
        on(eventName: string, id: string, listener: import("../..").IgeEventListenerCallback): any;
        on(eventName: string, listener: import("../..").IgeEventListenerCallback): any;
        once(eventName: string, id: string, listener: import("../..").IgeEventListenerCallback): any;
        once(eventName: string, listener: import("../..").IgeEventListenerCallback): any;
        overwrite(eventName: string, id: string, listener: import("../..").IgeEventListenerCallback): any;
        overwrite(eventName: string, listener: import("../..").IgeEventListenerCallback): any;
        off(eventName: string, id: string, listener?: import("../..").IgeEventListenerCallback): any;
        off(eventName: string, listener?: import("../..").IgeEventListenerCallback): any;
        off(eventName: string): any;
        emit(eventName: string, ...data: any[]): import("../..").IgeEventReturnFlag;
        emitId(eventName: string, id: string, ...data: any[]): any;
        emitStatic(eventName: string, ...data: any[]): any;
        emitStaticId(eventName: string, id: string, ...data: any[]): any;
        cancelStatic(eventName: string): any;
        willEmit(eventName: string): boolean;
        willEmitId(eventName: string, id: string): boolean;
        deferEmit(eventName: string, ...data: any[]): any;
        _processRemovalQueue(): void;
        _data: Record<string, any>;
        _logEnabled: boolean;
        getClassId(): string;
        logEnabled(val?: boolean): any | boolean;
        log(message: string, ...args: any[]): any | undefined;
        logInfo(message: string, ...args: any[]): any | undefined;
        logWarn(message: string, ...args: any[]): any | undefined;
        logError(message: string, ...args: any[]): any | undefined;
        logIndent(): void;
        logOutdent(): void;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
