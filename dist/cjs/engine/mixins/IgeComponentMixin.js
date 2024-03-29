"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithComponentMixin = void 0;
const arrays_1 = require("../utils/arrays.js");
const WithComponentMixin = (Base) => class extends Base {
    constructor(...args) {
        super(...args);
        this.components = {};
        this._components = []; // TODO: Rename this to _componentsArr
        this._componentBase = this;
    }
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
    addComponent(component, options) {
        const newComponentInstance = new component(this._componentBase, options);
        this.components[newComponentInstance.componentId] = newComponentInstance;
        // Add the component reference to the class component array
        this._components = this._components || [];
        this._components.push(newComponentInstance);
        return this;
    }
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
    removeComponent(componentId) {
        // If the component has a destroy method, call it
        const component = this.components[componentId];
        if (component && component.destroy) {
            component.destroy();
        }
        // Remove the component from the class component array
        if (this._components) {
            (0, arrays_1.arrPull)(this._components, component);
        }
        // Remove the component from the class object
        delete this.components[componentId];
        return this;
    }
};
exports.WithComponentMixin = WithComponentMixin;
