import type { IgeDestructorFunction } from "@/types/IgeDestructorFunction";

export type IgeEffectFunction<PropType extends any[] = any[]> = (...props: PropType) => Promise<void | IgeDestructorFunction>;
