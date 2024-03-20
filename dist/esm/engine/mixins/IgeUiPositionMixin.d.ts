import type { IgeObject } from "../core/IgeObject.js"
import type { IgeMixin } from "../../types/IgeMixin.js";
export declare const WithUiPositionMixin: <BaseClassType extends IgeMixin<IgeObject>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _uiLeft?: number | undefined;
        _uiLeftPercent?: string | undefined;
        _uiCenter?: number | undefined;
        _uiCenterPercent?: string | undefined;
        _uiRight?: number | undefined;
        _uiRightPercent?: string | undefined;
        _uiTop?: number | undefined;
        _uiTopPercent?: string | undefined;
        _uiMiddle?: number | undefined;
        _uiMiddlePercent?: string | undefined;
        _uiBottom?: number | undefined;
        _uiBottomPercent?: string | undefined;
        _uiWidth?: string | number | undefined;
        _widthModifier?: number | undefined;
        _uiHeight?: string | number | undefined;
        _heightModifier?: number | undefined;
        _autoScaleX?: string | undefined;
        _autoScaleY?: string | undefined;
        _autoScaleLockAspect?: boolean | undefined;
        _uiFlex?: number | undefined;
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
        _tileDepth: number;
        _orphans?: IgeObject[] | undefined;
        _specialProp: string[];
        _streamMode?: import("../../enums/index.js").IgeStreamMode | undefined;
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
        _timeStreamPreviousData?: import("../../index.js").IgeTimeStreamPacket | undefined;
        _timeStreamNextData?: import("../../index.js").IgeTimeStreamPacket | undefined;
        _timeStream: import("../../index.js").IgeTimeStreamPacket[];
        _streamFloatPrecision: number;
        _floatRemoveRegExp: RegExp;
        _compositeStream: boolean;
        _disableInterpolation: boolean;
        _streamControl?: ((clientId: string, roomId?: string | undefined) => boolean) | undefined;
        _newBorn: boolean;
        _alive: boolean;
        _mountMode: import("../../enums/index.js").IgeMountMode;
        _layer: number;
        _depth: number;
        _depthSortMode: import("../../enums/index.js").IgeIsometricDepthSortMode;
        _inView: boolean;
        _managed: number;
        _triggerPolygonFunctionName: import("../../index.js").IgeTriggerPolygonFunctionName;
        _compositeCache: boolean;
        _compositeParent: boolean;
        _anchor: import("../../index.js").IgePoint2d;
        _renderPos: {
            x: number;
            y: number;
        };
        _computedOpacity: number;
        _opacity: number;
        _cell: number | null;
        _deathTime?: number | undefined;
        _bornTime: number;
        _translate: import("../../index.js").IgePoint3d;
        _oldTranslate: import("../../index.js").IgePoint3d;
        _rotate: import("../../index.js").IgePoint3d;
        _scale: import("../../index.js").IgePoint3d;
        _origin: import("../../index.js").IgePoint3d;
        _bounds2d: import("../../index.js").IgePoint2d;
        _oldBounds2d: import("../../index.js").IgePoint2d;
        _bounds3d: import("../../index.js").IgePoint3d;
        _oldBounds3d: import("../../index.js").IgePoint3d;
        _highlight: boolean;
        _pointerEventsActive: boolean;
        _pointerStateDown: boolean;
        _pointerStateOver: boolean;
        _pointerAlwaysInside: boolean;
        _pointerOut?: import("../../index.js").IgeInputEventHandler | undefined;
        _pointerOver?: import("../../index.js").IgeInputEventHandler | undefined;
        _pointerMove?: import("../../index.js").IgeInputEventHandler | undefined;
        _pointerWheel?: import("../../index.js").IgeInputEventHandler | undefined;
        _pointerUp?: import("../../index.js").IgeInputEventHandler | undefined;
        _pointerDown?: import("../../index.js").IgeInputEventHandler | undefined;
        _velocity: import("../../index.js").IgePoint3d;
        _localMatrix: import("../../index.js").IgeMatrix2d;
        _worldMatrix: import("../../index.js").IgeMatrix2d;
        _oldWorldMatrix: import("../../index.js").IgeMatrix2d;
        _adjustmentMatrix?: import("../../index.js").IgeMatrix2d | undefined;
        _hidden: boolean;
        _cache: boolean;
        _cacheCtx?: import("../../index.js").IgeCanvasRenderingContext2d | null | undefined;
        _cacheCanvas?: import("../../index.js").IgeDummyCanvas | OffscreenCanvas | undefined;
        _cacheDirty: boolean;
        _cacheSmoothing: boolean;
        _aabbDirty: boolean;
        _aabb: import("../../index.js").IgeRect;
        _compositeAabbCache?: import("../../index.js").IgeRect | undefined;
        _noAabb?: boolean | undefined;
        _hasParent?: Record<string, boolean> | undefined;
        _texture?: import("../../index.js").IgeTexture | undefined;
        _indestructible: boolean;
        _shouldRender?: boolean | undefined;
        _smartBackground?: import("../../index.js").IgeSmartTexture<import("../../index.js").IgeEntity> | undefined;
        _lastUpdate?: number | undefined;
        _behaviours?: import("../../index.js").IgeBehaviourStore | undefined;
        _birthMount?: string | undefined;
        _frameAlternatorCurrent: boolean;
        _backgroundPattern?: import("../../index.js").IgeTexture | undefined;
        _backgroundPatternRepeat: string | null;
        _backgroundPatternTrackCamera?: boolean | undefined;
        _backgroundPatternIsoTile?: boolean | undefined;
        _backgroundPatternFill?: CanvasPattern | null | undefined;
        _bounds3dPolygonDirty: boolean;
        _localBounds3dPolygon?: import("../../index.js").IgePoly2d | undefined;
        _bounds3dPolygon?: import("../../index.js").IgePoly2d | undefined;
        _localAabb?: import("../../index.js").IgeRect | undefined;
        _deathCallBack?: ((...args: any[]) => void) | undefined;
        components: Record<string, import("../../index.js").IgeComponent<any>>;
        _sortChildren: import("../../index.js").IgeChildSortFunction;
        id(id: string): any;
        id(): string;
        category(val: string): any;
        category(): string;
        drawBounds(): boolean;
        drawBounds(val: boolean, recursive?: boolean | undefined): any;
        drawBoundsData(): boolean;
        drawBoundsData(val: boolean): any;
        drawMouse(): boolean;
        drawMouse(val: boolean): any;
        drawMouseData(): boolean;
        drawMouseData(val: boolean): any;
        worldPosition(): import("../../index.js").IgePoint3d;
        worldRotationZ(): number;
        localToWorld(points: import("../../index.js").IgePoint[], viewport?: import("../../index.js").IgeViewport | null | undefined, inverse?: boolean): void;
        localToWorldPoint(point: import("../../index.js").IgePoint3d, viewport?: import("../../index.js").IgeViewport | null | undefined): void;
        screenPosition(): import("../../index.js").IgePoint3d;
        localIsoBoundsPoly(): void;
        localBounds3dPolygon(recalculate?: boolean): import("../../index.js").IgePoly2d;
        bounds3dPolygon(recalculate?: boolean): import("../../index.js").IgePoly2d;
        update(tickDelta: number): void;
        tick(ctx: import("../../index.js").IgeCanvasRenderingContext2d): void;
        updateTransform(): void;
        aabb(recalculate?: boolean, inverse?: boolean): import("../../index.js").IgeRect;
        _processBehaviours(type: import("../../enums/index.js").IgeBehaviourType, ...args: any[]): void;
        parent(): IgeObject | import("../../index.js").IgeTileMap2d<any> | null | undefined;
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
        depthSortMode(): import("../../enums/index.js").IgeIsometricDepthSortMode;
        depthSortMode(val: import("../../enums/index.js").IgeIsometricDepthSortMode): any;
        depthSortChildren(): void;
        _depthSortVisit(u: number, sortObj: import("../../index.js").IgeDepthSortObject): void;
        _resizeEvent(event?: Event | undefined): void;
        _childUnMounted(obj: IgeObject): void;
        _mounted(obj: IgeObject): void;
        _unMounted(obj: IgeObject): void;
        isMounted(): boolean;
        childSortingAlgorithm(val: import("../../index.js").IgeChildSortFunction): any;
        childSortingAlgorithm(): import("../../index.js").IgeChildSortFunction;
        _transformPoint(point: import("../../index.js").IgePoint3d): import("../../index.js").IgePoint3d;
        addBehaviour<ParentType extends IgeObject = IgeObject>(type: import("../../enums/index.js").IgeBehaviourType, id: string, behaviour: import("../../index.js").IgeEntityBehaviourMethod<ParentType>): any;
        removeBehaviour(type: import("../../enums/index.js").IgeBehaviourType, id: string): any | undefined;
        hasBehaviour(type: import("../../enums/index.js").IgeBehaviourType, id: string): boolean;
        cache(val: boolean, propagateToChildren?: boolean | undefined): any;
        cache(): boolean;
        compositeCache(val: boolean, propagateToChildren?: boolean | undefined): any;
        compositeCache(): boolean;
        cacheDirty(val: boolean): any;
        cacheDirty(): boolean;
        registerNetworkClass(): void;
        translateTo(x: number, y: number, z: number): any;
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
        streamProperty(propName: string, propVal?: any): any;
        onStreamProperty(propName: string, propVal: any): any;
        streamMode(val: import("../../enums/index.js").IgeStreamMode): any;
        streamMode(): import("../../enums/index.js").IgeStreamMode;
        streamControl(method: (clientId: string, roomId?: string | undefined) => boolean): any;
        streamControl(): (clientId: string, roomId?: string | undefined) => boolean;
        streamSyncInterval(val: number, sectionId: string): any;
        streamSyncInterval(): number;
        streamFloatPrecision(val: number): any;
        streamFloatPrecision(): number;
        streamSync(clientIds?: string[] | undefined): any;
        streamCreateConstructorArgs(): any[] | undefined;
        streamCreateInitialData(): any;
        onStreamCreateInitialData(data: any): void;
        streamEmitCreated(val: boolean): any;
        streamEmitCreated(): boolean;
        _queueStreamDataToSend(recipientArr?: string[], streamRoomId?: string | undefined): void;
        streamForceUpdate(): any;
        sendStreamCreate(clientId?: string | string[] | undefined): boolean;
        streamSectionData(sectionId: string, data?: string | undefined, bypassTimeStream?: boolean, bypassChangeDetection?: boolean): string | undefined;
        streamDestroy(clientId?: string | undefined): boolean;
        _generateStreamData(): string;
        destroyBehaviours(): void;
        destroy(): any;
        compositeAabb(inverse?: boolean): import("../../index.js").IgeRect;
        stringify(options?: Record<string, boolean>): string;
        _stringify(options?: Record<string, boolean>): string;
        addComponent(id: string, Component: typeof import("../../index.js").IgeComponent, options?: any): any;
        removeComponent(id: string): any;
        _eventsEmitting: boolean;
        _eventRemovalQueue: any[];
        _eventListeners?: Record<string, Record<string, import("../../index.js").IgeEventListenerCallback[]>> | undefined;
        _eventStaticEmitters: Record<string, import("../../index.js").IgeEventStaticEmitterObject[]>;
        _eventsAllowDefer: boolean;
        _eventsDeferTimeouts: Record<any, number>;
        _on(eventName: string, id: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        _once(eventName: string, id: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        _off(eventName: string, id: string, listener?: import("../../index.js").IgeEventListenerCallback | undefined): any;
        on(eventName: string, id: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        on(eventName: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        once(eventName: string, id: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        once(eventName: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        overwrite(eventName: string, id: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        overwrite(eventName: string, listener: import("../../index.js").IgeEventListenerCallback): any;
        off(eventName: string, id: string, listener?: import("../../index.js").IgeEventListenerCallback | undefined): any;
        off(eventName: string, listener?: import("../../index.js").IgeEventListenerCallback | undefined): any;
        off(eventName: string): any;
        emit(eventName: string, ...data: any[]): import("../../enums/index.js").IgeEventReturnFlag;
        emitId(eventName: string, id: string, ...data: any[]): any;
        emitStatic(eventName: string, ...data: any[]): any;
        emitStaticId(eventName: string, id: string, ...data: any[]): any;
        cancelStatic(eventName: string): any;
        willEmit(eventName: string): boolean;
        willEmitId(eventName: string, id: string): boolean;
        deferEmit(eventName: string, ...data: any[]): any;
        _processRemovalQueue(): void;
        _data: Record<string, any>;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logInfo(message: string, ...args: any[]): any;
        logWarn(message: string, ...args: any[]): any;
        logError(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
