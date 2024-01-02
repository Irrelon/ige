export interface IgeCanRegisterByGroup {
	_groupRegistered: boolean;
	_group?: string;
	group(): string;
	group(id: string): this;
	group(id?: string): this | string | undefined;
}
