export declare class IgeArrayRegister<RegisterType extends Record<string, any>> {
    _store: Record<string, RegisterType[]>;
    _field: string;
    _registeredField: string;
    constructor(field: string, registeredField: string);
    /**
     * Returns the reference to the store array for the
     * specified id. Warning, you are given the actual
     * reference to the array so mutating it will affect
     * all other references. Use getImmutable() to get
     * a mutation-safe version.
     * @param id
     */
    get(id: string): RegisterType[];
    /**
     * Gets an array of the store data by id. The returned
     * array is not by reference, so you can mutate it safely.
     * @param id
     */
    getImmutable(id: string): RegisterType[];
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
