export interface IgeCanRegisterByCategory {
	_categoryRegistered: boolean;
	_category?: string;

	category(): string;
	category(id: string): this;
	category(id?: string): this | string | undefined;
}
