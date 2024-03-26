import type { IgeCanBeDestroyed } from "./IgeCanBeDestroyed.js"
import type { IgeCanRegisterById } from "./IgeCanRegisterById.js"
export type IgeCanRegisterAndCanDestroy = IgeCanRegisterById & IgeCanBeDestroyed;
