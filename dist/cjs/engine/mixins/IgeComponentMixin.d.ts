import type { IgeBaseClass } from "../../export/exports.js"
import type { IgeComponent } from "../../export/exports.js"
import type { IgeMixin } from "../../export/exports.js"
export declare const WithComponentMixin: <ComponentTargetType, MixinBaseClassType extends IgeMixin<IgeBaseClass> = IgeMixin<IgeBaseClass>>(Base: MixinBaseClassType) => {
    new (...args: any[]): {
        components: Record<string, IgeComponent>;
        _components: IgeComponent[];
        _componentBase: ComponentTargetType | any;
        /**
     * Creates a new instance of the component argument passing
     * the options argument to the component as it is initialised.
     * The new component instance is then added to "this" via
     * a property name that is defined in the component class as
     * "componentId".
     * @param {IgeBaseClass} component The class definition of the component.
     * @param {Object=} options An options parameter to pass to the component
     * on init.
     * @example #Add the velocity component to an entity
     *     var entity = new IgeEntity();
     *     entity.addComponent(IgeVelocityComponent);
     *
     *     // Now that the component is added, we can access
     *     // the component via its namespace. Call the
     *     // "byAngleAndPower" method of the velocity component:
     *     entity.velocity.byAngleAndPower(degreesToRadians(20), 0.1);
     */
        addComponent(component: typeof IgeComponent, options?: any): any;
        /**
     * Removes a component by its id.
     * @param {string} componentId The id of the component to remove.
     * @example #Remove a component by its id (namespace)
     *     var entity = new IgeEntity();
     *
     *     // Let's add the velocity component
     *     entity.addComponent(IgeVelocityComponent);
     *
     *     // Now that the component is added, let's remove
     *     // it via it's id ("velocity")
     *     entity.removeComponent('velocity');
     */
        removeComponent(componentId: string): any;
        classId: string;
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
} & MixinBaseClassType;
