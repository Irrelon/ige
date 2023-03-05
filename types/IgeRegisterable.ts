export interface IgeRegisterable {
    _registered: boolean;
    _id?: string;

    id (): string;
    id (id: string): this;
    id (id?: string): this | string | undefined;
}
