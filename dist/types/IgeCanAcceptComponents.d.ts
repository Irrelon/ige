import type { IgeComponent } from "../engine/core/IgeComponent.js"
export interface IgeCanAcceptComponents {
    components: Record<string, IgeComponent>;
    addComponent: (id: string, component: typeof IgeComponent) => this;
    removeComponent: (id: string) => this;
}
