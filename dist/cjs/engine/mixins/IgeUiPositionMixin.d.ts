import type { IgeObject } from "../../export/exports.js"
import type { Mixin } from "../../export/exports.js"
export declare const WithUiPositionMixin: <BaseClassType extends Mixin<IgeObject>>(Base: BaseClassType) => {
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
        _orphans?: IgeObject[] | undefined;
        _specialProp: string[];
        _streamMode?: import("../../export/exports.js").IgeStreamMode | undefined;
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
        _timeStreamPreviousData?: import("../../export/exports.js").IgeTimeStreamPacket | undefined;
        _timeStreamNextData?: import("../../export/exports.js").IgeTimeStreamPacket | undefined;
        _timeStream: import("../../export/exports.js").IgeTimeStreamPacket[];
        _streamFloatPrecision: number;
        _floatRemoveRegExp: RegExp;
        _compositeStream: boolean;
        _disableInterpolation: boolean;
        _streamControl?: ((clientId: string, roomId?: string | undefined) => boolean) | undefined;
        _newBorn: boolean;
        _alive: boolean;
        _mountMode: import("../../export/exports.js").IgeMountMode;
        _layer: number;
        _depth: number;
        _depthSortMode: import("../../export/exports.js").IgeIsometricDepthSortMode;
        _inView: boolean;
        _managed: number;
        _triggerPolygonFunctionName: "localBounds3dPolygon" | "bounds3dPolygon" | "aabb";
        _compositeCache: boolean;
        _compositeParent: boolean;
        _anchor: import("../../export/exports.js").IgePoint2d;
        _renderPos: {
            x: number;
            y: number;
        };
        _computedOpacity: number;
        _opacity: number;
        _cell: number | null;
        _deathTime?: number | undefined;
        _bornTime: number;
        _translate: import("../../export/exports.js").IgePoint3d;
        _oldTranslate: import("../../export/exports.js").IgePoint3d;
        _rotate: import("../../export/exports.js").IgePoint3d;
        _scale: import("../../export/exports.js").IgePoint3d;
        _origin: import("../../export/exports.js").IgePoint3d;
        _bounds2d: import("../../export/exports.js").IgePoint2d;
        _oldBounds2d: import("../../export/exports.js").IgePoint2d;
        _bounds3d: import("../../export/exports.js").IgePoint3d;
        _oldBounds3d: import("../../export/exports.js").IgePoint3d;
        _highlight: boolean;
        _pointerEventsActive: boolean;
        _pointerStateDown: boolean;
        _pointerStateOver: boolean;
        _pointerAlwaysInside: boolean;
        _pointerOut?: import("../../export/exports.js").IgeInputEvent | undefined;
        _pointerOver?: import("../../export/exports.js").IgeInputEvent | undefined;
        _pointerMove?: import("../../export/exports.js").IgeInputEvent | undefined;
        _pointerWheel?: import("../../export/exports.js").IgeInputEvent | undefined;
        _pointerUp?: import("../../export/exports.js").IgeInputEvent | undefined;
        _pointerDown?: import("../../export/exports.js").IgeInputEvent | undefined;
        _velocity: import("../../export/exports.js").IgePoint3d;
        _localMatrix: import("../../export/exports.js").IgeMatrix2d;
        _worldMatrix: import("../../export/exports.js").IgeMatrix2d;
        _oldWorldMatrix: import("../../export/exports.js").IgeMatrix2d;
        _adjustmentMatrix?: import("../../export/exports.js").IgeMatrix2d | undefined;
        _hidden: boolean;
        _cache: boolean;
        _cacheCtx?: import("../../export/exports.js").IgeCanvasRenderingContext2d | null | undefined;
        _cacheCanvas?: OffscreenCanvas | import("../../export/exports.js").IgeDummyCanvas | undefined;
        _cacheDirty: boolean;
        _cacheSmoothing: boolean;
        _aabbDirty: boolean;
        _aabb: import("../../export/exports.js").IgeRect;
        _compositeAabbCache?: import("../../export/exports.js").IgeRect | undefined;
        _noAabb?: boolean | undefined;
        _hasParent?: Record<string, boolean> | undefined;
        _texture?: import("../../export/exports.js").IgeTexture | undefined;
        _indestructible: boolean;
        _shouldRender?: boolean | undefined;
        _smartBackground?: import("../../export/exports.js").IgeSmartTexture<import("../../export/exports.js").IgeEntity> | undefined;
        _lastUpdate?: number | undefined;
        _behaviours?: import("../../export/exports.js").IgeBehaviourStore | undefined;
        _birthMount?: string | undefined;
        _frameAlternatorCurrent: boolean;
        _backgroundPattern?: import("../../export/exports.js").IgeTexture | undefined;
        _backgroundPatternRepeat: string | null;
        _backgroundPatternTrackCamera?: boolean | undefined;
        _backgroundPatternIsoTile?: boolean | undefined;
        _backgroundPatternFill?: CanvasPattern | null | undefined;
        _bounds3dPolygonDirty: boolean;
        _localBounds3dPolygon?: import("../../export/exports.js").IgePoly2d | undefined;
        _bounds3dPolygon?: import("../../export/exports.js").IgePoly2d | undefined;
        _localAabb?: import("../../export/exports.js").IgeRect | undefined;
        _deathCallBack?: ((...args: any[]) => void) | undefined;
        components: Record<string, import("../../export/exports.js").IgeComponent<any>>;
        _sortChildren: import("../../export/exports.js").IgeChildSortFunction;
        id(id: string): any;
        id(): string;
        category(val: string): any;
        category(): string;
        drawBounds(val: boolean, recursive?: boolean | undefined): any;
        drawBounds(): boolean;
        drawBoundsData(): boolean;
        drawBoundsData(val: boolean): any;
        drawMouse(): boolean;
        drawMouse(val: boolean): any;
        drawMouseData(): boolean;
        drawMouseData(val: boolean): any;
        worldPosition(): import("../../export/exports.js").IgePoint3d;
        worldRotationZ(): number;
        localToWorld(points: import("../../export/exports.js").IgePoint[], viewport?: import("../../export/exports.js").IgeViewport | null | undefined, inverse?: boolean): void;
        localToWorldPoint(point: import("../../export/exports.js").IgePoint3d, viewport?: import("../../export/exports.js").IgeViewport | null | undefined): void;
        screenPosition(): import("../../export/exports.js").IgePoint3d;
        localIsoBoundsPoly(): void;
        localBounds3dPolygon(recalculate?: boolean): import("../../export/exports.js").IgePoly2d;
        bounds3dPolygon(recalculate?: boolean): import("../../export/exports.js").IgePoly2d;
        update(ctx: import("../../export/exports.js").IgeCanvasRenderingContext2d, tickDelta: number): void;
        tick(ctx: import("../../export/exports.js").IgeCanvasRenderingContext2d): void;
        updateTransform(): void;
        aabb(recalculate?: boolean, inverse?: boolean): import("../../export/exports.js").IgeRect;
        _processBehaviours(type: import("../../export/exports.js").IgeBehaviourType, ...args: any[]): void;
        parent(): IgeObject | import("../../export/exports.js").IgeTileMap2d | null | undefined;
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
        depthSortMode(): import("../../export/exports.js").IgeIsometricDepthSortMode;
        depthSortMode(val: import("../../export/exports.js").IgeIsometricDepthSortMode): any;
        depthSortChildren(): void;
        _depthSortVisit(u: number, sortObj: import("../../export/exports.js").IgeDepthSortObject): void;
        _resizeEvent(event?: Event | undefined): void;
        _childUnMounted(obj: IgeObject): void;
        _mounted(obj: IgeObject): void;
        _unMounted(obj: IgeObject): void;
        isMounted(): boolean;
        childSortingAlgorithm(val: import("../../export/exports.js").IgeChildSortFunction): any;
        childSortingAlgorithm(): import("../../export/exports.js").IgeChildSortFunction;
        _transformPoint(point: import("../../export/exports.js").IgePoint3d): import("../../export/exports.js").IgePoint3d;
        addBehaviour<ParentType extends IgeObject = IgeObject>(type: import("../../export/exports.js").IgeBehaviourType, id: string, behaviour: import("../../export/exports.js").IgeEntityBehaviourMethod<ParentType>): any;
        removeBehaviour(type: import("../../export/exports.js").IgeBehaviourType, id: string): any | undefined;
        hasBehaviour(type: import("../../export/exports.js").IgeBehaviourType, id: string): boolean;
        cache(val: boolean, propagateToChildren?: boolean | undefined): any;
        cache(): boolean;
        compositeCache(val: boolean, propagateToChildren?: boolean | undefined): any;
        compositeCache(): boolean;
        cacheDirty(val: boolean): any;
        cacheDirty(): boolean;
        registerNetworkClass(): void;
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
        streamMode(val: import("../../export/exports.js").IgeStreamMode): any;
        streamMode(): import("../../export/exports.js").IgeStreamMode;
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
        compositeAabb(inverse?: boolean): import("../../export/exports.js").IgeRect;
        stringify(options?: Record<string, boolean>): string;
        _stringify(options?: Record<string, boolean>): string;
        addComponent(id: string, Component: typeof import("../../export/exports.js").IgeComponent, options?: any): any;
        removeComponent(id: string): any;
        _eventsEmitting: boolean;
        _eventRemovalQueue: any[];
        _eventListeners?: Record<string, Record<string, import("../../export/exports.js").IgeEventListenerCallback[]>> | undefined;
        _eventStaticEmitters: Record<string, import("../../export/exports.js").IgeEventStaticEmitterObject[]>;
        _eventsAllowDefer: boolean;
        _eventsDeferTimeouts: Record<any, number>;
        _on(eventName: string, id: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        _once(eventName: string, id: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        _off(eventName: string, id: string, listener?: import("../../export/exports.js").IgeEventListenerCallback | undefined): any;
        on(eventName: string, id: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        on(eventName: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        once(eventName: string, id: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        once(eventName: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        overwrite(eventName: string, id: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        overwrite(eventName: string, listener: import("../../export/exports.js").IgeEventListenerCallback): any;
        off(eventName: string, id: string, listener?: import("../../export/exports.js").IgeEventListenerCallback | undefined): any;
        off(eventName: string, listener?: import("../../export/exports.js").IgeEventListenerCallback | undefined): any;
        off(eventName: string): any;
        emit(eventName: string, ...data: any[]): import("../../export/exports.js").IgeEventReturnFlag;
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
        logIndent(): void;
        logOutdent(): void;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
