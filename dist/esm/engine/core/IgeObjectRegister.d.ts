import type { IgeCanBeDestroyed } from "../../types/IgeCanBeDestroyed.js"
import type { IgeCanRegisterById } from "../../types/IgeCanRegisterById.js"
export declare class IgeObjectRegister {
    _store: Record<string, IgeCanRegisterById & IgeCanBeDestroyed>;
    get(id: string): IgeCanRegisterById & IgeCanBeDestroyed;
    all(): Record<string, IgeCanRegisterById & IgeCanBeDestroyed>;
    /**
     * Register an object with the engine object register. The
     * register allows you to access an object by its id with
     * a call to ige.$(objectId).
     * @param {Object} obj The object to register.
     * @return {*}
     */
    add(obj: IgeCanRegisterById & IgeCanBeDestroyed): this;
    /**
     * Un-register an object with the engine object register. The
     * object will no longer be accessible via ige.$().
     * @param {Object} obj The object to un-register.
     * @return {*}
     */
    remove(obj: IgeCanRegisterById): void;
}
