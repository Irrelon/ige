import { IgeComponent } from "../engine/core/IgeComponent";

export interface IgeCanAcceptComponents {
	components: Record<string, IgeComponent>;

	addComponent: (id: string, component: typeof IgeComponent) => this;
	removeComponent: (id: string) => this;
}
