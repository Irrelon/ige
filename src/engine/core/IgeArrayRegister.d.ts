export declare class IgeArrayRegister<RegisterType extends Record<string, any>> {
    _store: Record<string, RegisterType[]>;
    _field: string;
    _registeredField: string;
    constructor(field: string, registeredField: string);
    get(id: string): RegisterType[];
    /**
     * Register an object with the engine array register.
     * @param {Object} obj The object to register.
     * @return {*}
     */
    add(obj: RegisterType): this;
    /**
     * Un-register an object with the engine array register.
     * @param {Object} obj The object to un-register.
     * @return {*}
     */
    remove(obj: RegisterType): this;
}
