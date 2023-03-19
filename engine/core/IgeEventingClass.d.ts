import { IgeBaseClass } from "./IgeBaseClass";
declare const IgeEventingClass_base: {
    new (...args: any[]): {
        _eventsProcessing: boolean;
        _eventRemovalQueue: any[];
        _eventListeners?: import("../mixins/IgeEventingMixin").IgeEventListenerRegister | undefined;
        on(eventName: string | string[], callback: (...args: any) => void, context?: any, oneShot?: boolean, sendEventName?: boolean): import("../mixins/IgeEventingMixin").IgeEventListenerObject | import("../mixins/IgeEventingMixin").IgeMultiEventListenerObject | undefined;
        off(eventName: string, evtListener: import("../mixins/IgeEventingMixin").IgeEventListenerObject | import("../mixins/IgeEventingMixin").IgeMultiEventListenerObject | undefined, callback?: import("../mixins/IgeEventingMixin").IgeEventRemovalResultCallback | undefined): boolean | -1;
        emit(eventName: string, args?: any): number;
        eventList(): import("../mixins/IgeEventingMixin").IgeEventListenerRegister | undefined;
        _processRemovals(): void;
        classId: string;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
        _data: Record<string, any>;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & typeof IgeBaseClass;
/**
 * Creates a new class with the capability to emit events.
 */
export declare class IgeEventingClass extends IgeEventingClass_base {
}
export {};
