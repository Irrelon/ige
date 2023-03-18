import { IgeObject } from "../core/IgeObject";
import type { Mixin } from "../../types/Mixin";
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
         * @param {Number} px
         * @param {Boolean=} noUpdate
         * @return {Number}
         */
        left(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's x position relative to the right of
         * the canvas.
         * @param {Number} px
         * @param {Boolean=} noUpdate
         * @return {Number}
         */
        right(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the viewport's x position relative to the center of
         * the entity parent.
         * @param {Number} px
         * @param {Boolean=} noUpdate
         * @return {Number}
         */
        center(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's y position relative to the top of
         * the canvas.
         * @param {Number} px
         * @param {Boolean=} noUpdate
         * @return {Number}
         */
        top(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's y position relative to the bottom of
         * the canvas.
         * @param {Number} px
         * @param {Boolean=} noUpdate
         * @return {Number}
         */
        bottom(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the viewport's y position relative to the middle of
         * the canvas.
         * @param {Number} px
         * @param {Boolean=} noUpdate
         * @return {Number}
         */
        middle(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the geometry.x in pixels.
         * @param {Number, String=} px Either the width in pixels or a percentage
         * @param {Boolean=} lockAspect
         * @param {Number=} modifier A value to add to the final width. Useful when
         * you want to alter a percentage value by a certain number of pixels after
         * it has been calculated.
         * @param {Boolean=} noUpdate
         * @return {*}
         */
        width(px?: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): number | any;
        /**
         * Gets / sets the geometry.y in pixels.
         * @param {Number=} px
         * @param {Boolean=} lockAspect
         * @param {Number=} modifier A value to add to the final height. Useful when
         * you want to alter a percentage value by a certain number of pixels after
         * it has been calculated.
         * @param {Boolean=} noUpdate If passed, will not recalculate AABB etc from
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
        _anchor: import("..").IgePoint2d;
        _renderPos: {
            x: number;
            y: number;
        };
        _computedOpacity: number;
        _opacity: number;
        _cell: number | null;
        _deathTime?: number | undefined;
        _bornTime: number;
        _translate: import("..").IgePoint3d;
        /**
         * Gets / sets the entity's y position relative to the top of
         * the canvas.
         * @param {Number} px
         * @param {Boolean=} noUpdate
         * @return {Number}
         */
        _oldTranslate: import("..").IgePoint3d;
        _rotate: import("..").IgePoint3d;
        _scale: import("..").IgePoint3d;
        _origin: import("..").IgePoint3d;
        _bounds2d: import("..").IgePoint2d;
        _oldBounds2d: import("..").IgePoint2d;
        _bounds3d: import("..").IgePoint3d;
        _oldBounds3d: import("..").IgePoint3d;
        _highlight: boolean;
        _mouseEventsActive: boolean;
        _mouseStateDown: boolean;
        _mouseStateOver: boolean;
        _mouseAlwaysInside: boolean;
        _mouseOut?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _mouseOver?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _mouseMove?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _mouseWheel?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _mouseUp?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _mouseDown?: import("../../types/IgeInputEvent").IgeInputEvent | undefined;
        _velocity: import("..").IgePoint3d;
        _localMatrix: import("..").IgeMatrix2d;
        _worldMatrix: import("..").IgeMatrix2d;
        _oldWorldMatrix: import("..").IgeMatrix2d;
        _adjustmentMatrix: import("..").IgeMatrix2d;
        _hidden: boolean;
        _cache: boolean;
        _cacheCtx?: import("../../types/IgeCanvasRenderingContext2d").IgeCanvasRenderingContext2d | null | undefined;
        _cacheCanvas?: HTMLCanvasElement | import("..").IgeDummyCanvas | undefined;
        _cacheDirty: boolean;
        _cacheSmoothing: boolean;
        _aabbDirty: boolean;
        _aabb: import("..").IgeRect;
        _compositeAabbCache?: import("..").IgeRect | undefined;
        _noAabb?: boolean | undefined;
        _hasParent?: Record<string, boolean> | undefined;
        _texture?: import("..").IgeTexture | undefined;
        _indestructible: boolean;
        _shouldRender?: boolean | undefined;
        _smartBackground?: import("../../types/IgeSmartTexture").IgeSmartTexture<IgeObject> | undefined;
        _lastUpdate?: number | undefined;
        _tickBehaviours?: import("../../types/IgeEntityBehaviour").IgeEntityBehaviour[] | undefined;
        _updateBehaviours?: import("../../types/IgeEntityBehaviour").IgeEntityBehaviour[] | undefined;
        _birthMount?: string | undefined;
        _frameAlternatorCurrent: boolean;
        _backgroundPattern?: import("..").IgeTexture | undefined;
        _backgroundPatternRepeat: string | null;
        _backgroundPatternTrackCamera?: boolean | undefined;
        _backgroundPatternIsoTile?: boolean | undefined;
        _backgroundPatternFill?: CanvasPattern | null | undefined;
        _bounds3dPolygonDirty: boolean;
        _localBounds3dPolygon?: import("..").IgePoly2d | undefined;
        _bounds3dPolygon?: import("..").IgePoly2d | undefined;
        _localAabb?: import("..").IgeRect | undefined;
        _deathCallBack?: ((...args: any[]) => void) | undefined;
        _sortChildren: import("../../types/IgeChildSortFunction").IgeChildSortFunction;
        components: Record<string, import("..").IgeComponent<any>>;
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
        worldPosition(): import("..").IgePoint3d;
        worldRotationZ(): number;
        localToWorld(points: import("../../types/IgePoint").IgePoint[], viewport?: import("..").IgeViewport | null | undefined, inverse?: boolean): void;
        localToWorldPoint(point: import("..").IgePoint3d, viewport?: import("..").IgeViewport | null | undefined): void;
        screenPosition(): import("..").IgePoint3d;
        localIsoBoundsPoly(): void;
        localBounds3dPolygon(recalculate?: boolean): import("..").IgePoly2d;
        bounds3dPolygon(recalculate?: boolean): import("..").IgePoly2d;
        update(ctx: import("../../types/IgeCanvasRenderingContext2d").IgeCanvasRenderingContext2d, tickDelta: number): void;
        tick(ctx: import("../../types/IgeCanvasRenderingContext2d").IgeCanvasRenderingContext2d): void;
        updateTransform(): void;
        aabb(recalculate?: boolean, inverse?: boolean): import("..").IgeRect;
        _processUpdateBehaviours(...args: any[]): void;
        _processTickBehaviours(...args: any[]): void;
        parent(): IgeObject | import("..").IgeTileMap2d | null | undefined;
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
        _transformPoint(point: import("..").IgePoint3d): import("..").IgePoint3d;
        addBehaviour<ParentType extends IgeObject = IgeObject>(id: string, behaviour: import("../../types/IgeEntityBehaviour").IgeEntityBehaviourMethod<ParentType>, duringTick?: boolean): any;
        removeBehaviour(id: string, duringTick?: boolean): any | undefined;
        hasBehaviour(id?: string | undefined, duringTick?: boolean): boolean;
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
        _streamSync(recipientArr?: string[], streamRoomId?: string | undefined): void;
        streamForceUpdate(): any;
        sendStreamCreate(clientId?: string | string[] | undefined): boolean;
        streamSectionData(sectionId: string, data?: string | undefined, bypassTimeStream?: boolean, bypassChangeDetection?: boolean): string | undefined;
        streamDestroy(clientId?: string | undefined): boolean;
        _streamData(): string;
        destroyBehaviours(): void;
        destroy(): any;
        compositeAabb(inverse?: boolean): import("..").IgeRect;
        stringify(options?: Record<string, boolean>): string;
        _stringify(options?: Record<string, boolean>): string;
        addComponent(id: string, Component: typeof import("..").IgeComponent, options?: any): any;
        removeComponent(id: string): any;
        _eventsProcessing: boolean;
        _eventRemovalQueue: any[];
        _eventListeners?: import("./IgeEventingMixin").IgeEventListenerRegister | undefined;
        on(eventName: string | string[], callback: (...args: any) => void, context?: any, oneShot?: boolean, sendEventName?: boolean): import("./IgeEventingMixin").IgeEventListenerObject | import("./IgeEventingMixin").IgeMultiEventListenerObject | undefined;
        off(eventName: string, evtListener: import("./IgeEventingMixin").IgeEventListenerObject | import("./IgeEventingMixin").IgeMultiEventListenerObject | undefined, callback?: import("./IgeEventingMixin").IgeEventRemovalResultCallback | undefined): boolean | -1;
        emit(eventName: string, args?: any): number;
        eventList(): import("./IgeEventingMixin").IgeEventListenerRegister | undefined;
        _processRemovals(): void;
        _dependencyFulfilled: Record<string, boolean>;
        _dependsOnArr: import("..").IgeDependencyAction[];
        addDependency(dependencyName: string, dependencyPromise: Promise<any>): void;
        dependsOn(dependencyList: string[], actionToTake: (...args: any[]) => any): void;
        _onDependencySatisfied(dependencyName: string): void;
        _isDependencyListSatisfied(dependencyList: string[]): boolean;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
        _data: Record<string, any>;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
