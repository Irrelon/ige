import type { IgeObject } from "../core/IgeObject.js"
import type { IgeMixin } from "../../types/IgeMixin.js"
export declare const WithUiPositionMixin: <BaseClassType extends IgeMixin<IgeObject>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _uiLeft?: number;
        _uiLeftPercent?: string;
        _uiCenter?: number;
        _uiCenterPercent?: string;
        _uiRight?: number;
        _uiRightPercent?: string;
        _uiTop?: number;
        _uiTopPercent?: string;
        _uiMiddle?: number;
        _uiMiddlePercent?: string;
        _uiBottom?: number;
        _uiBottomPercent?: string;
        _uiWidth?: number | string;
        _widthModifier?: number;
        _uiHeight?: number | string;
        _heightModifier?: number;
        _autoScaleX?: string;
        _autoScaleY?: string;
        _autoScaleLockAspect?: boolean;
        _uiFlex?: number;
        /**
         * Gets / sets the entity's x position relative to the left of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        left(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's x position relative to the right of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        right(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the viewport's x position relative to the center of
         * the entity parent.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        center(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's y position relative to the top of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        top(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's y position relative to the bottom of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        bottom(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the viewport's y position relative to the middle of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        middle(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the geometry.x in pixels.
         * @param {number, String=} px Either the width in pixels or a percentage
         * @param {boolean=} lockAspect
         * @param {number=} modifier A value to add to the final width. Useful when
         * you want to alter a percentage value by a certain number of pixels after
         * it has been calculated.
         * @param {boolean=} noUpdate
         * @return {*}
         */
        width(px?: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): number | any;
        /**
         * Gets / sets the geometry.y in pixels.
         * @param {number=} px
         * @param {boolean=} lockAspect
         * @param {number=} modifier A value to add to the final height. Useful when
         * you want to alter a percentage value by a certain number of pixels after
         * it has been calculated.
         * @param {boolean=} noUpdate If passed, will not recalculate AABB etc from
         * this call. Useful for performance if you intend to make subsequent calls
         * to other functions that will also cause a re-calculation, meaning we can
         * reduce the overall re-calculations to only one at the end. You must manually
         * call ._updateUiPosition() when you have made your changes.
         *
         * @return {*}
         */
        height(px?: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): number | any;
        flex(val?: number): number | any | undefined;
        autoScaleX(val?: string, lockAspect?: boolean): string | any | undefined;
        autoScaleY(val?: string, lockAspect?: boolean): string | any | undefined;
        /**
         * Updates the UI position of every child entity down the scenegraph
         * for this UI entity.
         * @return {*}
         */
        updateUiChildren(): any;
        /**
         * Sets the correct translation x and y for the viewport's left, right
         * top and bottom co-ordinates.
         * @private
         */
        _updateUiPosition(): void;
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
        _cell: number;
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
        _localMatrix4?: import("../core/IgeMatrix4").IgeMatrix4;
        _worldMatrix4?: import("../core/IgeMatrix4").IgeMatrix4;
        _oldWorldMatrix4?: import("../core/IgeMatrix4").IgeMatrix4;
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
        _texture?: import("../..").IgeTexture;
        _indestructible: boolean;
        _shouldRender?: boolean;
        _smartBackground?: import("../..").IgeSmartTexture;
        _lastUpdate?: number;
        _behaviours?: import("../..").IgeBehaviourStore;
        _birthMount?: string;
        _frameAlternatorCurrent: boolean;
        _backgroundPattern?: import("../..").IgeTexture;
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
        _model?: import("../webgl/IgeGltfLoader").IgeGltfModel;
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
