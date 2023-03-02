export interface BehaviourDefinition {
	id: string;
	method: (...args: any[]) => any;
}