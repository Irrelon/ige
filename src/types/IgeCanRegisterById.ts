export interface IgeCanRegisterById {
	_idRegistered: boolean;
	_id?: string;

	id(): string;
	id(id: string): this;
	id(id?: string): this | string | undefined;
}
