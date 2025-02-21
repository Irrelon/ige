import type { IgeDestructorFunction } from "./IgeDestructorFunction.js"
export type IgeEffectFunction<PropType extends any[] = any[]> = (...props: PropType) => Promise<void | IgeDestructorFunction>;
