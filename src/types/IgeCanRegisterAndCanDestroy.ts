import type { IgeCanBeDestroyed } from "@/types/IgeCanBeDestroyed";
import type { IgeCanRegisterById } from "@/types/IgeCanRegisterById";

export type IgeCanRegisterAndCanDestroy = IgeCanRegisterById & IgeCanBeDestroyed;
